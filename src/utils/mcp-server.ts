import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v3';
import { writeBlockFile, pollForResponse, cleanupMcpFiles } from './mcp-ipc.js';

export interface BlockData {
  task: string;
  reason: string;
  question: string;
}

export interface SprintTaskEntry {
  id: string;
  file: string;
  status: 'pending' | 'active' | 'completed' | 'blocked' | 'pushed';
}

export interface SprintManifestData {
  id: string;
  name: string;
  status: string;
  tasks: SprintTaskEntry[];
}

export interface SprintContextResponse {
  sprint: {
    id: string;
    name: string;
    status: string;
    tasks: SprintTaskEntry[];
  };
  currentTask: {
    id: string;
    file: string;
    status: string;
    content: string | null;
  } | null;
  guidance: {
    previousQuestion: string;
    humanResponse: string;
  } | null;
  sprintDir: string;
}

export interface UpdateTaskStatusResponse {
  success: boolean;
  taskId: string;
  previousStatus: string;
  newStatus: string;
}

export interface CompleteSprintResponse {
  success: boolean;
  sprintId: string;
  sprintName?: string;
  completedAt?: string;
  summary?: string | null;
  taskCount?: number;
  note?: string;
  reason?: string;
  tasks?: Array<{ id: string; status: string }>;
}

interface PendingBlock {
  data: BlockData;
  resolve: (response: string) => void;
}
// ---------------------------------------------------------------------------
// Exported handler for get_sprint_context (testable standalone)
// ---------------------------------------------------------------------------
// Exported handler for get_sprint_context (testable standalone)
// ---------------------------------------------------------------------------


/**
 * Builds the sprint context response for a given sprint directory.
 * Reads the manifest, identifies the current task, loads its content,
 * and checks ASM storage for human guidance from previous attempts.
 */
export function buildSprintContext(
  sprintDir: string
): { content: Array<{ type: 'text'; text: string }> } {
  const resolvedDir = path.resolve(process.cwd(), sprintDir);
  const manifestPath = path.join(resolvedDir, 'manifest.json');

  // Check if manifest exists
  if (!fs.existsSync(manifestPath)) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Sprint manifest not found at ${manifestPath}`,
        }, null, 2),
      }],
    };
  }

  // Read and parse manifest
  let manifest: SprintManifestData;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw) as SprintManifestData;
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Failed to parse manifest at ${manifestPath}: ${String(err)}`,
        }, null, 2),
      }],
    };
  }

  // Find the current task — first pending or active
  const currentTaskEntry = manifest.tasks.find(
    (t) => t.status === 'pending' || t.status === 'active'
  ) ?? null;

  let currentTask: SprintContextResponse['currentTask'] = null;
  let guidance: SprintContextResponse['guidance'] = null;

  if (currentTaskEntry) {
    // Read task markdown content
    const taskFilePath = path.join(resolvedDir, currentTaskEntry.file);
    let taskContent: string | null = null;

    if (fs.existsSync(taskFilePath)) {
      try {
        taskContent = fs.readFileSync(taskFilePath, 'utf8');
      } catch {
        taskContent = null;
      }
    }

    currentTask = {
      id: currentTaskEntry.id,
      file: currentTaskEntry.file,
      status: currentTaskEntry.status,
      content: taskContent,
    };
  }

  const response: SprintContextResponse = {
    sprint: {
      id: manifest.id,
      name: manifest.name,
      status: manifest.status,
      tasks: manifest.tasks,
    },
    currentTask,
    guidance,
    sprintDir,
  };

  // Add a note when no pending/active task exists
  if (!currentTask) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          ...response,
          note: 'All tasks completed or no pending tasks',
        }, null, 2),
      }],
    };
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(response),
    }],
  };
}

/**
 * Appends a summary of the completed sprint to the project CHANGELOG.md.
 * Only include entries for features added, features removed, or breaking changes.
 * Respects the changelog setting in clifford.json.
 */
export function updateChangelog(
  sprintId: string,
  sprintName: string,
  entries: string[],
): { content: Array<{ type: 'text'; text: string }> } {
  // Check clifford.json config
  const configPath = path.resolve(process.cwd(), 'clifford.json');
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);
      if (config.changelog === false) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ success: true, skipped: true, reason: 'Changelog updates disabled in clifford.json' }),
          }],
        };
      }
    }
  } catch { /* default to enabled if config missing or unparseable */ }

  const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const entriesMarkdown = entries.map(e => `- ${e}`).join('\n');

  const section = `\n## [${sprintId}] ${sprintName} — ${date}\n\n${entriesMarkdown}\n`;

  if (fs.existsSync(changelogPath)) {
    // Read existing, insert new section after the first heading (or at top)
    const existing = fs.readFileSync(changelogPath, 'utf8');
    // Find the first ## heading and insert before it, or append if none
    const firstHeadingIndex = existing.indexOf('\n## ');
    if (firstHeadingIndex > -1) {
      const updated = existing.slice(0, firstHeadingIndex) + section + existing.slice(firstHeadingIndex);
      fs.writeFileSync(changelogPath, updated, 'utf8');
    } else {
      fs.appendFileSync(changelogPath, section, 'utf8');
    }
  } else {
    // Create new CHANGELOG.md
    const header = `# Changelog\n`;
    fs.writeFileSync(changelogPath, header + section, 'utf8');
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ success: true, path: changelogPath }),
    }],
  };
}


// ---------------------------------------------------------------------------
// Valid task status transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<string, string[]> = {
  'pending':   ['active'],
  'active':    ['completed', 'blocked'],
  'blocked':   ['active'],
  'completed': [],  // terminal state — no going back
  'pushed':    [],  // terminal state
};

// ---------------------------------------------------------------------------
// Exported handler for update_task_status (testable standalone)
// ---------------------------------------------------------------------------

/**
 * Validates and transitions a task's status in the sprint manifest.
 * Enforces the state machine defined by VALID_TRANSITIONS, preventing
 * illegal transitions like completed→pending or pending→completed.
 */
export function updateTaskStatus(
  sprintDir: string,
  taskId: string,
  status: 'active' | 'completed' | 'blocked'
): { content: Array<{ type: 'text'; text: string }> } {
  const resolvedDir = path.resolve(process.cwd(), sprintDir);
  const manifestPath = path.join(resolvedDir, 'manifest.json');

  // Check if manifest exists
  if (!fs.existsSync(manifestPath)) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Sprint manifest not found at ${manifestPath}`,
        }),
      }],
    };
  }

  // Read and parse manifest
  let manifest: SprintManifestData;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw) as SprintManifestData;
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Failed to parse manifest at ${manifestPath}: ${String(err)}`,
        }),
      }],
    };
  }

  // Find the task by ID
  const task = manifest.tasks.find((t) => t.id === taskId);
  if (!task) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Task '${taskId}' not found in manifest`,
        }),
      }],
    };
  }

  // Validate the transition
  const currentStatus = task.status;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(status)) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Invalid transition: ${currentStatus} → ${status}. Allowed: [${allowed.join(', ')}]`,
        }),
      }],
    };
  }

  // Apply the transition
  task.status = status;

  // Write the manifest back
  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Failed to write manifest: ${String(err)}`,
        }),
      }],
    };
  }

  const response: UpdateTaskStatusResponse = {
    success: true,
    taskId,
    previousStatus: currentStatus,
    newStatus: status,
  };

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(response),
    }],
  };
}

// ---------------------------------------------------------------------------
// Exported handler for report_uat (testable standalone)
// ---------------------------------------------------------------------------

/**
 * Appends verification steps for a completed task to the sprint's `uat.md`.
 * Creates the file with a header if it doesn't exist. Matches the format
 * expected by human reviewers.
 */
export function reportUatMarkdown(
  sprintDir: string,
  taskId: string,
  title: string,
  changes: string,
  verificationSteps: string[],
): { content: Array<{ type: 'text'; text: string }> } {
  const resolvedDir = path.resolve(process.cwd(), sprintDir);
  const uatPath = path.join(resolvedDir, 'uat.md');
  const manifestPath = path.join(resolvedDir, 'manifest.json');

  // Read manifest for sprint name (best-effort)
  let sprintName = 'Unknown Sprint';
  let sprintId = 'sprint-??';
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    sprintName = manifest.name || sprintName;
    sprintId = manifest.id || sprintId;
  } catch { /* use defaults */ }

  // Build the section
  const stepsMarkdown = verificationSteps
    .map((step, i) => `${i + 1}. ${step}`)
    .join('\n');

  const section = `\n## ${taskId}: ${title}\n\n### Changes\n${changes}\n\n### Verification Steps\n${stepsMarkdown}\n`;

  // Create or append
  if (!fs.existsSync(uatPath)) {
    const header = `# ${sprintId} — ${sprintName} — UAT\n`;
    fs.writeFileSync(uatPath, header + section, 'utf8');
  } else {
    fs.appendFileSync(uatPath, section, 'utf8');
  }

  return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, taskId, path: uatPath }) }] };
}


// ---------------------------------------------------------------------------
// Exported handler for complete_sprint (testable standalone)
// ---------------------------------------------------------------------------

/**
 * Marks a sprint as completed after validating that all tasks are done.
 * All tasks must have status 'completed' or 'pushed' for the sprint to
 * be marked complete. Guards against double-completion gracefully.
 */
export function completeSprint(
  sprintDir: string,
  summary?: string
): { content: Array<{ type: 'text'; text: string }> } {
  const resolvedDir = path.resolve(process.cwd(), sprintDir);
  const manifestPath = path.join(resolvedDir, 'manifest.json');

  // Check if manifest exists
  if (!fs.existsSync(manifestPath)) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Sprint manifest not found at ${manifestPath}`,
        }),
      }],
    };
  }

  // Read and parse manifest
  let manifest: SprintManifestData;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw) as SprintManifestData;
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Failed to parse manifest at ${manifestPath}: ${String(err)}`,
        }),
      }],
    };
  }

  // Guard against double-completion
  if (manifest.status === 'completed') {
    const response: CompleteSprintResponse = {
      success: true,
      sprintId: manifest.id,
      note: 'Sprint was already marked as completed',
    };
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(response),
      }],
    };
  }

  // Check all tasks: every task must have status 'completed' or 'pushed'
  const unfinishedTasks = manifest.tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'pushed'
  );

  if (unfinishedTasks.length > 0) {
    const response: CompleteSprintResponse = {
      success: false,
      sprintId: manifest.id,
      reason: `Cannot complete sprint: ${unfinishedTasks.length} task(s) not finished`,
      tasks: manifest.tasks.map((t) => ({ id: t.id, status: t.status })),
    };
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(response),
      }],
    };
  }

  // All tasks are done — mark sprint as completed
  manifest.status = 'completed';

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Failed to write manifest: ${String(err)}`,
        }),
      }],
    };
  }

  const response: CompleteSprintResponse = {
    success: true,
    sprintId: manifest.id,
    sprintName: manifest.name,
    completedAt: new Date().toISOString(),
    summary: summary || null,
    taskCount: manifest.tasks.length,
  };

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(response),
    }],
  };
}

/**
 * MCP server that exposes a `request_help` tool for agent↔human communication.
 *
 * When the agent calls `request_help`, the tool blocks until the human responds
 * via `resolveCurrentBlock()` — keeping the agent process alive through the
 * entire blocker cycle.
 *
 * **File-based IPC (Sprint 12):** When `request_help` is invoked, the server
 * writes a block notification to `.clifford/mcp-block.json` and polls
 * `.clifford/mcp-response.json` for the human's answer. This allows the
 * SprintRunner/TUI (running in a separate process) to detect blocks and
 * provide responses without any networking.
 *
 * Events:
 * - `'block'`          — { task, reason, question } when request_help is invoked
 * - `'block-resolved'` — { task, response } when resolveCurrentBlock() is called
 * - `'block-dismissed'`— { task } when dismissCurrentBlock() is called
 */
export class CliffordMcpServer extends EventEmitter {
  private mcpServer: McpServer;
  private transport: StdioServerTransport | null = null;
  private pending: PendingBlock | null = null;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    super();

    this.projectRoot = projectRoot || process.env.CLIFFORD_PROJECT_ROOT || process.cwd();

    this.mcpServer = new McpServer(
      { name: 'clifford', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.registerTools();
  }

  // ---------------------------------------------------------------------------
  // Tool registration
  // ---------------------------------------------------------------------------

  private registerTools(): void {
    const inputSchema = {
      task: z.string().describe("The task ID that is blocked (e.g. 'task-3')"),
      reason: z.string().describe('Brief description of why you are blocked'),
      question: z.string().describe('The specific question you need answered'),
    };

    this.mcpServer.registerTool(
      'request_help',
      {
        description:
          'Signal that the current task is blocked and wait for human guidance. ' +
          'The call will not return until the human provides a response.',
        inputSchema,
      },
      async ({ task, reason, question }: { task: string; reason: string; question: string }) => {
        const blockData: BlockData = { task, reason, question };

        // CRITICAL: all logging to stderr — stdout is the JSON-RPC channel
        console.error(`[clifford-mcp] request_help called: task=${task}`);

        this.emit('block', blockData);

        // Write the block file for the SprintRunner/TUI to detect
        writeBlockFile(this.projectRoot, task, reason, question);

        const response = await new Promise<string>((resolve) => {
          this.pending = { data: blockData, resolve };

          pollForResponse(this.projectRoot).then((fileResponse) => {
            if (this.pending?.data === blockData) {
              this.pending = null;
              this.emit('block-resolved', { task: blockData.task, response: fileResponse });
              resolve(fileResponse);
            }
          });
        });

        return { content: [{ type: 'text' as const, text: response }] };
      }
    );

    // -------------------------------------------------------------------------
    // get_sprint_context — read-only tool returning sprint + task context
    // -------------------------------------------------------------------------
    this.mcpServer.registerTool(
      'get_sprint_context',
      {
        description:
          'Returns the current sprint manifest, the next pending task\'s content, and any human guidance from previous attempts. ' +
          'Call this at the start of each task to understand what to do.',
        inputSchema: {
          sprintDir: z.string().describe('The sprint directory path (from CURRENT_SPRINT_DIR)'),
        },
      },
      async ({ sprintDir }: { sprintDir: string }) => {
        return buildSprintContext(sprintDir);
      }
    );

    // -------------------------------------------------------------------------
    // update_task_status — validate and transition task status in manifest
    // -------------------------------------------------------------------------
    this.mcpServer.registerTool(
      'update_task_status',
      {
        description:
          'Update a task\'s status in the sprint manifest. Valid transitions: ' +
          'pending→active, active→completed, active→blocked, blocked→active. ' +
          'The tool validates the transition and writes the manifest.',
        inputSchema: {
          sprintDir: z.string().describe('The sprint directory path'),
          taskId: z.string().describe("The task ID to update (e.g., 'task-1')"),
          status: z.enum(['active', 'completed', 'blocked']).describe('The new status to set'),
        },
      },
      async ({ sprintDir, taskId, status }: { sprintDir: string; taskId: string; status: 'active' | 'completed' | 'blocked' }) => {
        return updateTaskStatus(sprintDir, taskId, status);
      }
    );

    // -------------------------------------------------------------------------
    // report_uat — append verification steps to the sprint's uat.md
    // -------------------------------------------------------------------------
    this.mcpServer.registerTool(
      'report_uat',
      {
        description:
          'Log a UAT (User Acceptance Testing) entry after completing task verification. ' +
          'Writes verification steps to the sprint\'s uat.md file.',
        inputSchema: {
          sprintDir: z.string().describe('The sprint directory path (from CURRENT_SPRINT_DIR)'),
          taskId: z.string().describe('The task ID this UAT entry is for (e.g. "task-1")'),
          title: z.string().describe('Task title for the section header'),
          changes: z.string().describe('Markdown description of what was changed'),
          verificationSteps: z.array(z.string()).describe('Step-by-step verification instructions'),
        },
      },
      async ({ sprintDir, taskId, title, changes, verificationSteps }: {
        sprintDir: string;
        taskId: string;
        title: string;
        changes: string;
        verificationSteps: string[];
      }) => {
        return reportUatMarkdown(sprintDir, taskId, title, changes, verificationSteps);
      }
    );


    // -------------------------------------------------------------------------
    // complete_sprint — validate all tasks done, then mark sprint completed
    // -------------------------------------------------------------------------
    this.mcpServer.registerTool(
      'complete_sprint',
      {
        description:
          'Mark the current sprint as completed. Only succeeds if all tasks have status ' +
          "'completed' or 'pushed'. Call this after finishing the final task.",
        inputSchema: {
          sprintDir: z.string().describe('The sprint directory path'),
          summary: z.string().optional().describe('Optional completion summary'),
        },
      },
      async ({ sprintDir, summary }: { sprintDir: string; summary?: string }) => {
        return completeSprint(sprintDir, summary);
      }
    );

    // -------------------------------------------------------------------------
    // update_changelog — append summary to CHANGELOG.md
    // -------------------------------------------------------------------------
    this.mcpServer.registerTool(
      'update_changelog',
      {
        description:
          'Append a summary of the completed sprint to the project CHANGELOG.md. ' +
          'Call this after complete_sprint. Respects the changelog setting in clifford.json. ' +
          'Only include entries for features added, features removed, or breaking changes.',
        inputSchema: {
          sprintId: z.string().describe('The sprint ID (e.g. "sprint-16")'),
          sprintName: z.string().describe('The sprint name'),
          entries: z.array(z.string()).describe('List of changelog entries. Only include entries for features added, features removed, or breaking changes.'),
        },
      },
      async ({ sprintId, sprintName, entries }: {
        sprintId: string;
        sprintName: string;
        entries: string[];
      }) => {
        return updateChangelog(sprintId, sprintName, entries);
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Start the MCP server (connects the stdio transport). */
  async start(): Promise<void> {
    this.transport = new StdioServerTransport();
    await this.mcpServer.connect(this.transport);
    console.error('[clifford-mcp] Server started on stdio');
  }

  /**
   * Resolve the currently pending block with a human response.
   * Returns `false` if no block is pending.
   */
  resolveCurrentBlock(response: string): boolean {
    if (!this.pending) return false;

    const { data, resolve } = this.pending;
    this.pending = null;

    resolve(response);
    this.emit('block-resolved', { task: data.task, response });

    // Also clean up IPC files in case the file poll is still running
    cleanupMcpFiles(this.projectRoot);

    return true;
  }

  /**
   * Dismiss / cancel the current block.
   * The agent receives a cancellation message.
   * Returns `false` if no block is pending.
   */
  dismissCurrentBlock(): boolean {
    if (!this.pending) return false;

    const { data, resolve } = this.pending;
    this.pending = null;

    resolve('[DISMISSED] The human dismissed this block without providing guidance.');
    this.emit('block-dismissed', { task: data.task });

    // Clean up IPC files
    cleanupMcpFiles(this.projectRoot);

    return true;
  }

  /** Check whether there is an active (unresolved) block. */
  isBlocked(): boolean {
    return this.pending !== null;
  }

  /** Get the current block data, or `null` if none is pending. */
  getCurrentBlock(): BlockData | null {
    return this.pending?.data ?? null;
  }

  /** Gracefully shut down the server and transport. */
  async stop(): Promise<void> {
    // Dismiss any lingering block so the agent isn't stuck forever
    if (this.pending) {
      this.dismissCurrentBlock();
    }

    // Clean up any stale IPC files
    cleanupMcpFiles(this.projectRoot);

    await this.mcpServer.close();
    console.error('[clifford-mcp] Server stopped');
  }
}

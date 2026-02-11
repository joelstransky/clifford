import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v3';
import { writeBlockFile, pollForResponse, cleanupMcpFiles } from './mcp-ipc.js';
import { getMemory } from './asm-storage.js';

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

export interface UatEntry {
  taskId: string;
  description: string;
  steps: string[];
  result: 'pass' | 'fail' | 'partial';
  notes?: string;
  timestamp: string;
}

export interface ReportUatResponse {
  success: boolean;
  taskId: string;
  result: 'pass' | 'fail' | 'partial';
  totalEntries: number;
}

interface PendingBlock {
  data: BlockData;
  resolve: (response: string) => void;
}

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

    // Check ASM storage for human guidance
    const memory = getMemory(currentTaskEntry.id);
    guidance = memory
      ? { previousQuestion: memory.question, humanResponse: memory.answer }
      : null;

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
      text: JSON.stringify(response, null, 2),
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
 * Appends a structured UAT (User Acceptance Testing) entry to `.clifford/uat.json`.
 * Creates the file and directory if they do not exist. Handles malformed JSON
 * gracefully by resetting to an empty array.
 */
export function reportUat(
  taskId: string,
  description: string,
  steps: string[],
  result: 'pass' | 'fail' | 'partial',
  notes?: string,
): { content: Array<{ type: 'text'; text: string }> } {
  const cliffordDir = path.resolve(process.cwd(), '.clifford');
  const uatPath = path.join(cliffordDir, 'uat.json');

  // Ensure .clifford/ directory exists
  if (!fs.existsSync(cliffordDir)) {
    try {
      fs.mkdirSync(cliffordDir, { recursive: true });
    } catch (err) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            error: `Failed to create .clifford directory: ${String(err)}`,
          }),
        }],
      };
    }
  }

  // Read existing entries or start fresh
  let entries: UatEntry[] = [];
  if (fs.existsSync(uatPath)) {
    try {
      const raw = fs.readFileSync(uatPath, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        entries = parsed as UatEntry[];
      } else {
        console.error('[clifford-mcp] uat.json was not an array — resetting to []');
        entries = [];
      }
    } catch {
      console.error('[clifford-mcp] uat.json was malformed JSON — resetting to []');
      entries = [];
    }
  }

  // Construct and append the new entry
  const entry: UatEntry = {
    taskId,
    description,
    steps,
    result,
    timestamp: new Date().toISOString(),
  };

  if (notes !== undefined && notes !== '') {
    entry.notes = notes;
  }

  entries.push(entry);

  // Write back
  try {
    fs.writeFileSync(uatPath, JSON.stringify(entries, null, 2), 'utf8');
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          error: `Failed to write uat.json: ${String(err)}`,
        }),
      }],
    };
  }

  const response: ReportUatResponse = {
    success: true,
    taskId,
    result,
    totalEntries: entries.length,
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

        // Wait for human response — either via file-based IPC or direct API call
        const response = await new Promise<string>((resolve) => {
          this.pending = { data: blockData, resolve };

          // Also poll for file-based response in parallel
          pollForResponse(this.projectRoot).then((fileResponse) => {
            // Only resolve if this block is still pending (not already resolved via API)
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
    // report_uat — append structured UAT entries to .clifford/uat.json
    // -------------------------------------------------------------------------
    this.mcpServer.registerTool(
      'report_uat',
      {
        description:
          'Log a UAT (User Acceptance Testing) entry after completing task verification. ' +
          'Records what was tested and the result.',
        inputSchema: {
          taskId: z.string().describe('The task ID this UAT entry is for'),
          description: z.string().describe('Brief description of what was tested'),
          steps: z.array(z.string()).describe('List of verification steps performed'),
          result: z.enum(['pass', 'fail', 'partial']).describe('Overall test result'),
          notes: z.string().optional().describe('Additional notes or observations'),
        },
      },
      async ({ taskId, description, steps, result, notes }: {
        taskId: string;
        description: string;
        steps: string[];
        result: 'pass' | 'fail' | 'partial';
        notes?: string;
      }) => {
        return reportUat(taskId, description, steps, result, notes);
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

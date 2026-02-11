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

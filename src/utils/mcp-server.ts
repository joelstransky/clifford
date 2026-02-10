import { EventEmitter } from 'events';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v3';

export interface BlockData {
  task: string;
  reason: string;
  question: string;
}

interface PendingBlock {
  data: BlockData;
  resolve: (response: string) => void;
}

/**
 * MCP server that exposes a `request_help` tool for agent↔human communication.
 *
 * When the agent calls `request_help`, the tool blocks until the human responds
 * via `resolveCurrentBlock()` — keeping the agent process alive through the
 * entire blocker cycle.
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

  constructor() {
    super();

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

        const response = await new Promise<string>((resolve) => {
          this.pending = { data: blockData, resolve };
        });

        return { content: [{ type: 'text' as const, text: response }] };
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

    await this.mcpServer.close();
    console.error('[clifford-mcp] Server stopped');
  }
}

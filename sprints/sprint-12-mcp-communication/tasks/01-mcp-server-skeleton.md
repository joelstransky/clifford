# Task 1: MCP Server Skeleton

## Title
Create the Clifford MCP Server with `request_help` tool

## Context
Clifford currently uses an HTTP-based CommsBridge (`src/utils/bridge.ts`) for agent↔TUI communication. The Developer agent must `curl` an HTTP endpoint to signal a blocker, which is fragile and requires prompt instructions the agent may not follow. We are replacing this with an MCP server that exposes a `request_help` tool. The agent calls this tool natively (it appears in its tool list), and the tool **blocks** until the human responds — meaning the agent stays alive through the entire blocker cycle. No kill-and-restart.

## Dependencies
- Install `@modelcontextprotocol/sdk` and `zod` as production dependencies.

## Step-by-Step

### 1. Install the MCP SDK
```bash
npm install @modelcontextprotocol/sdk zod
```
Note: The project uses Bun, so `bun add` is also acceptable. The SDK is v1.x (`@modelcontextprotocol/sdk`), NOT the v2 split packages.

### 2. Create `src/utils/mcp-server.ts`

This module exports a `CliffordMcpServer` class that:

- **Extends `EventEmitter`** so the TUI layer can subscribe to events.
- Creates an `McpServer` instance from `@modelcontextprotocol/sdk/server/mcp.js` with name `"clifford"` and version from package.json or `"1.0.0"`.
- Creates a `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`.
- Registers a single tool: **`request_help`**.

### 3. `request_help` Tool Design

**Input Schema** (using zod):
```typescript
{
  task: z.string().describe("The task ID that is blocked (e.g. 'task-3')"),
  reason: z.string().describe("Brief description of why you are blocked"),
  question: z.string().describe("The specific question you need answered")
}
```

**Behavior:**
1. When called, emit a `'block'` event with `{ task, reason, question }` (same shape as the old `BlockRequest`).
2. Store a pending Promise resolver internally (`pendingResolve`).
3. **Return a Promise that does not resolve until `resolveCurrentBlock(response)` is called externally.**
4. When resolved, return `{ content: [{ type: "text", text: response }] }` to the agent.

This is the critical mechanism: the MCP tool call is synchronous from the agent's perspective. The agent's execution pauses at the tool call boundary until the human provides guidance.

### 4. Public API

```typescript
export class CliffordMcpServer extends EventEmitter {
  // Start the server (connects transport)
  async start(): Promise<void>;

  // Resolve the currently pending block with a human response.
  // Returns false if no block is pending.
  resolveCurrentBlock(response: string): boolean;

  // Dismiss/cancel the current block (agent receives a cancellation message).
  dismissCurrentBlock(): boolean;

  // Check if there's an active block
  isBlocked(): boolean;

  // Get the current block data (or null)
  getCurrentBlock(): { task: string; reason: string; question: string } | null;

  // Clean shutdown
  async stop(): Promise<void>;
}
```

**Events emitted:**
- `'block'` — `{ task: string, reason: string, question: string }` — when `request_help` is invoked.
- `'block-resolved'` — `{ task: string, response: string }` — when `resolveCurrentBlock()` is called.
- `'block-dismissed'` — `{ task: string }` — when `dismissCurrentBlock()` is called.

### 5. Important: stdio Logging

**CRITICAL:** MCP stdio servers must NEVER write to stdout. All logging must go to stderr (`console.error()`). `console.log()` will corrupt the JSON-RPC messages.

### 6. Entry Point Script

The MCP server will be spawned as a separate child process by OpenCode (via the `opencode.json` config). It needs a standalone entry point that OpenCode can execute. Create `src/mcp-entry.ts`:

```typescript
#!/usr/bin/env node
import { CliffordMcpServer } from './utils/mcp-server.js';

const server = new CliffordMcpServer();
server.start().catch((err) => {
  console.error('Clifford MCP Server failed to start:', err);
  process.exit(1);
});
```

This file must be included in the build output (`dist/mcp-entry.js`) and the `package.json` `"files"` array so it ships with the package.

Update the `bun build` command in `package.json` scripts to also produce `dist/mcp-entry.js`, OR create a separate build entry. The simplest approach: add `src/mcp-entry.ts` as an additional entrypoint to the existing bun build, or build it separately.

## Verification

1. `npm run build` (or `bun run build`) succeeds with no type errors.
2. `node dist/mcp-entry.js` starts and listens on stdio without crashing.
3. Write a basic test (`src/utils/mcp-server.test.ts`) that:
   - Creates a `CliffordMcpServer` instance.
   - Verifies `isBlocked()` returns false initially.
   - Verifies `resolveCurrentBlock()` returns false when no block is pending.
   - (Full integration test with actual MCP client can be deferred — the tool registration is validated by SDK type-checking.)

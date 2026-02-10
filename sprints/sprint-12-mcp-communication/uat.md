# Sprint 12 — MCP Communication Layer: UAT Walkthrough

## Task 1: MCP Server Skeleton

### What Changed
- Installed `@modelcontextprotocol/sdk` (v1.26.0) and `zod` (v3.25.x) as production dependencies.
- Created `src/utils/mcp-server.ts` — `CliffordMcpServer` class extending `EventEmitter` that wraps the MCP SDK's `McpServer` with a `request_help` tool. The tool blocks until human guidance is provided via `resolveCurrentBlock()`.
- Created `src/mcp-entry.ts` — standalone entry point for the MCP server process (spawned by OpenCode).
- Updated `package.json` build script to produce both `dist/index.js` and `dist/mcp-entry.js`.
- Created `src/utils/mcp-server.test.ts` — unit tests for the public API surface.

### Verification Steps

1. **Build succeeds**:
   ```bash
   bun run build
   ```
   Expect: Both `dist/index.js` and `dist/mcp-entry.js` are produced with no errors.

2. **MCP entry point starts**:
   ```bash
   timeout 3 bun run dist/mcp-entry.js 2>&1 || true
   ```
   Expect: Stderr prints `[clifford-mcp] Server started on stdio` — confirms the server binds to stdio transport without crashing.

3. **Tests pass**:
   ```bash
   bun test src/utils/mcp-server.test.ts
   ```
   Expect: 6 tests pass:
   - `isBlocked()` returns `false` initially
   - `getCurrentBlock()` returns `null` when no block pending
   - `resolveCurrentBlock()` returns `false` when no block pending
   - `dismissCurrentBlock()` returns `false` when no block pending
   - Event emission smoke test (no transport-dependent integration)
   - `stop()` does not throw even when not started

4. **Dependencies present**:
   ```bash
   ls node_modules/@modelcontextprotocol/sdk/package.json && ls node_modules/zod/package.json
   ```
   Expect: Both files exist.

5. **No regressions** (pre-existing test in `discovery.test.ts` fails independently):
   ```bash
   bun test
   ```
   Expect: 107 pass, 1 fail (pre-existing `discovery.test.ts` issue).

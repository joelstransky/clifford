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

## Task 2: Template `opencode.json` into Target Projects

### What Changed
- **Refactored scaffolder path resolution**: Extracted `resolveCliffordRoot()` and `resolveTemplateDir()` helpers from the inline template-finding logic in `scaffold()`. This eliminates duplicated path-resolution code and makes the root discoverable for other functions.
- **Added `ensureOpenCodeConfig(projectRoot)`**: Resolves the Clifford MCP server entry point (`dist/mcp-entry.js` in production, `src/mcp-entry.ts` in dev) and writes/merges a `mcpServers.clifford` entry into `opencode.json`. Existing keys in `opencode.json` are preserved (deep-merge). Handles both fresh creation and idempotent update.
- **Added `copyAgentTemplates(projectRoot, templateDir)`**: Copies `.opencode/agent/` persona templates (Developer.md, Architect.md) into the target project. Only copies files that do NOT already exist at the destination, preserving user customizations.
- **Wired both into `scaffold()`**: After the existing scaffolding steps (`.clifford/`, `.gitignore`), the main function now calls `ensureOpenCodeConfig()` and `copyAgentTemplates()`.
- **Typed interfaces**: Added `OpenCodeConfig` and `McpServerEntry` interfaces for type-safe JSON manipulation (zero `any`).

### Verification Steps

1. **Review the scaffolder source**:
   ```bash
   cat src/utils/scaffolder.ts
   ```
   Expect: Functions `resolveCliffordRoot()`, `resolveTemplateDir()`, `resolveMcpEntry()`, `ensureOpenCodeConfig()`, and `copyAgentTemplates()` are present with full TypeScript types.

2. **Run in a temp directory to verify `opencode.json` creation**:
   ```bash
   TMPDIR=$(mktemp -d)
   bun run src/index.ts init "$TMPDIR" 2>&1 || true
   cat "$TMPDIR/opencode.json"
   ```
   Expect: JSON file containing `mcpServers.clifford` with `command` (either `"node"` or `"bun"`) and `args` pointing to an absolute path ending in `mcp-entry.js` or `mcp-entry.ts`.

3. **Verify idempotent update (no clobber)**:
   ```bash
   # Add a custom key to opencode.json first
   echo '{"$schema": "test", "mcpServers": {"other": {"command": "echo", "args": ["hi"]}}}' > "$TMPDIR/opencode.json"
   bun run src/index.ts init "$TMPDIR" 2>&1 || true
   cat "$TMPDIR/opencode.json"
   ```
   Expect: Both `mcpServers.other` and `mcpServers.clifford` are present. The `$schema` key is preserved.

4. **Verify agent template copy (non-destructive)**:
   ```bash
   ls "$TMPDIR/.opencode/agent/"
   ```
   Expect: `Developer.md` and `Architect.md` are present.

   ```bash
   # Modify one, re-run, verify it wasn't overwritten
   echo "CUSTOM" > "$TMPDIR/.opencode/agent/Developer.md"
   bun run src/index.ts init "$TMPDIR" 2>&1 || true
   head -1 "$TMPDIR/.opencode/agent/Developer.md"
   ```
   Expect: Output is `CUSTOM` (the file was NOT overwritten).

5. **Entry point file exists**:
   ```bash
   ls src/mcp-entry.ts
   ```
   Expect: File exists (dev mode target). In production after `bun run build`, `dist/mcp-entry.js` would exist instead.

6. **Tests still pass** (no regressions):
   ```bash
   bun test
   ```
    Expect: 107 pass, 1 fail (same pre-existing `discovery.test.ts` issue — unchanged).

## Task 3: Wire MCP Server into SprintRunner

### What Changed

- **Created `src/utils/mcp-ipc.ts`**: New file-based IPC module for communication between the MCP server (spawned by OpenCode as a child process) and the Clifford TUI/SprintRunner (parent process). Provides:
  - `writeBlockFile()` — writes `.clifford/mcp-block.json` when `request_help` is called
  - `pollForResponse()` — polls `.clifford/mcp-response.json` every 500ms for the human's answer
  - `writeResponseFile()` — writes the response file (called by TUI)
  - `readBlockFile()` — reads the block file (called by SprintRunner)
  - `cleanupMcpFiles()` — removes stale IPC files on exit
- **Updated `src/utils/mcp-server.ts`**: Integrated file-based IPC into the `request_help` tool handler. When `request_help` is called, the server now writes a block file AND polls for a response file in parallel with the in-process `resolveCurrentBlock()` API. Also accepts `projectRoot` as constructor parameter (defaults to `CLIFFORD_PROJECT_ROOT` env var or `cwd()`).
- **Updated `src/mcp-entry.ts`**: Reads `CLIFFORD_PROJECT_ROOT` from environment and passes it to the MCP server constructor.
- **Refactored `src/utils/sprint.ts` (SprintRunner)**:
  - **Removed** all `CommsBridge` imports and references
  - **Removed** `bridge` constructor parameter — constructor is now `(sprintDir, quietMode?)`
  - **Removed** `bridge.start()/stop()` calls, `bridge.checkPaused()` polling, `bridge.triggerBlock()`, `bridge.setActiveChild()/killActiveChild()`
  - **Added** MCP block file polling (`readBlockFile()`) during agent execution — polls every 1 second alongside stdout/stderr monitoring
  - **Added** `cleanupMcpFiles()` calls on agent exit and sprint end
  - **Simplified** `checkForPrompts()` to emit `'halt'` directly instead of calling `bridge.triggerBlock()`
  - **Simplified** `stop()` to kill the child process directly (no bridge)
  - **Removed** `CLIFFORD_BRIDGE_PORT` from prompt injection — agent discovers `request_help` via MCP protocol
- **Refactored `src/tui/DashboardController.ts`**:
  - **Removed** `CommsBridge` dependency from constructor — now `(sprintDir, runner)`
  - **Removed** `wireBridgeEvents()` — all blockers now come through runner's `'halt'` event
  - **Added** `writeResponseFile()` call in `handleBlockerSubmit()` and `handleBlockerDismiss()` to send responses back to the MCP server via file-based IPC
  - **Added** `saveMemory()` call in `handleBlockerSubmit()` for ASM storage (previously in bridge)
  - **Added** `findProjectRoot()` helper for resolving the `.clifford/` directory
  - **Moved** `BlockRequest` type to be defined locally (no longer imported from bridge)
- **Updated `src/tui/Dashboard.ts`**: Removed `CommsBridge` import and parameter from `launchDashboard()` — now `(sprintDir, runner)`
- **Updated `src/index.ts`**:
  - Removed `CommsBridge` import and instantiation from the default action
  - Updated `resolve` command to use file-based IPC (`writeResponseFile`/`readBlockFile`) instead of HTTP POST
- **Created `src/utils/mcp-ipc.test.ts`**: 9 unit tests covering all IPC functions including an integration test for `pollForResponse()`
- **Updated `src/tui/DashboardController.test.ts`**: Removed all `CommsBridge` mock factory and references — tests now construct `DashboardController` with just `(sprintDir, runner)`

### Verification Steps

1. **Build succeeds with zero CommsBridge references in sprint.ts**:
   ```bash
   bun run build
   ```
   Expect: Both `dist/index.js` and `dist/mcp-entry.js` are produced with no errors.

2. **No CommsBridge/bridge references in sprint.ts**:
   ```bash
   grep -E "CommsBridge|bridge" src/utils/sprint.ts
   ```
   Expect: No output (exit code 1).

3. **No CommsBridge references in DashboardController.ts**:
   ```bash
   grep "CommsBridge" src/tui/DashboardController.ts
   ```
   Expect: No output.

4. **No CommsBridge references in Dashboard.ts or index.ts**:
   ```bash
   grep "CommsBridge" src/tui/Dashboard.ts src/index.ts
   ```
   Expect: No output.

5. **MCP IPC tests pass**:
   ```bash
   bun test src/utils/mcp-ipc.test.ts
   ```
   Expect: 9 tests pass:
   - Block file creation and structure
   - Block file creation with missing `.clifford/` directory
   - Reading non-existent block file returns null
   - Reading existing block file
   - Handling malformed JSON gracefully
   - Response file creation and structure
   - Cleanup removes both files
   - Cleanup doesn't throw when files don't exist
   - `pollForResponse` resolves when response file is written

6. **DashboardController tests pass (with CommsBridge removed)**:
   ```bash
   bun test src/tui/DashboardController.test.ts
   ```
   Expect: 50 tests pass.

7. **MCP server tests still pass**:
   ```bash
   bun test src/utils/mcp-server.test.ts
   ```
   Expect: 6 tests pass.

8. **Full test suite (no regressions)**:
   ```bash
   bun test
   ```
   Expect: 113 pass, 1 fail (same pre-existing `discovery.test.ts` issue — unchanged).

9. **Verify the `resolve` CLI command uses file-based IPC**:
   ```bash
   grep -A5 "command('resolve" src/index.ts
   ```
   Expect: Uses `writeResponseFile`/`readBlockFile` from `mcp-ipc.js` instead of HTTP.

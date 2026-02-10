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

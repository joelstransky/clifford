# Task 2: Template `opencode.json` into Target Projects

## Title
Scaffolder writes `opencode.json` with Clifford MCP server config

## Context
For the Developer agent (OpenCode) to discover and use the `request_help` MCP tool, its `opencode.json` config must declare the Clifford MCP server. This config tells OpenCode: "when you start, also spawn this MCP server and connect to it via stdio."

The scaffolder (`src/utils/scaffolder.ts`) currently creates `.clifford/` and copies `prompt.md`, but does NOT touch `opencode.json`. We need to add this.

## Dependencies
- Task 1 must be complete (we need to know the entry point path: `dist/mcp-entry.js`).

## Step-by-Step

### 1. Determine the MCP Server Entry Point Path

When Clifford is installed (globally or locally via npm/bun), the entry point will be at a path relative to the package. The scaffolder needs to resolve this dynamically:

```typescript
// Find where the clifford package is installed
// Option A: Use require.resolve or import.meta to find the package root
// Option B: Use the same discovery logic that finds the templates/ directory
// The entry point is: <clifford-package-root>/dist/mcp-entry.js
```

The path must be **absolute** in the generated `opencode.json` because OpenCode spawns it from the target project's working directory.

### 2. Update `src/utils/scaffolder.ts`

Add a new function `ensureOpenCodeConfig(projectRoot: string)`:

1. Resolve the absolute path to `dist/mcp-entry.js` within the Clifford package.
2. Read `opencode.json` from `projectRoot` if it exists, otherwise start with `{}`.
3. Deep-merge the `mcpServers.clifford` entry:
   ```json
   {
     "mcpServers": {
       "clifford": {
         "command": "node",
         "args": ["/absolute/path/to/dist/mcp-entry.js"]
       }
     }
   }
   ```
4. Write the result back to `opencode.json`.
5. Do NOT clobber existing keys (other MCP servers, plugins, `$schema`, etc.).

Call `ensureOpenCodeConfig()` from the main `scaffold()` function.

### 3. Handle Development Mode

When running from source (`npm run dev` / `bun run src/index.ts`), the entry point is `src/mcp-entry.ts`, not `dist/mcp-entry.js`. The scaffolder should detect this and use the appropriate path. One approach:

```typescript
const mcpEntry = fs.existsSync(path.join(cliffordRoot, 'dist', 'mcp-entry.js'))
  ? path.join(cliffordRoot, 'dist', 'mcp-entry.js')
  : path.join(cliffordRoot, 'src', 'mcp-entry.ts');

// If it's a .ts file, use bun or tsx to run it:
const command = mcpEntry.endsWith('.ts') ? 'bun' : 'node';
```

### 4. Also Copy `.opencode/agent/` Templates

The scaffolder currently does NOT copy the agent persona templates (`templates/.opencode/agent/Developer.md`, `Architect.md`). Add this:

1. If `templates/.opencode/agent/` exists, copy its contents to `.opencode/agent/` in the target project.
2. Do NOT overwrite existing files (the user may have customized them). Only copy if the destination file doesn't exist.

This ensures the Developer agent persona (which will be updated in Task 5 to reference MCP tools) is available in target projects.

## Verification

1. Run `clifford init` in the sandbox (`clifford-sandbox/`).
2. Verify `opencode.json` is created with the `mcpServers.clifford` entry.
3. Verify the `command` and `args[0]` path is valid and the file exists.
4. Run `clifford init` again — verify existing config is preserved and `mcpServers.clifford` is updated (not duplicated).
5. Verify `.opencode/agent/Developer.md` is copied if it didn't already exist.

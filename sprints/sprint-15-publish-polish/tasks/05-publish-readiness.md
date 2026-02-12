# Task 5: NPM Publish Readiness

## Title
Audit and fix package.json, dist output, and template bundling for clean `npx clifford init`

## Context
Clifford needs to be installable and runnable via `npx clifford init` from a fresh project. This means the published package must include everything needed: the compiled dist, templates, and correct bin/entry config. The build currently targets Bun, which means consumers need Bun installed — we should consider whether that's acceptable or if we need a Node-compatible build.

## Step-by-Step

### 1. Audit `package.json`

Review and fix:

- **`bin` entry**: Currently `"clifford": "./dist/index.js"`. Verify the dist output is a single file or that all chunks are included. The bun build produces `dist/index.js` and `dist/mcp-entry.js`. The bin entry is correct.
- **`files` array**: Currently `["dist", "templates"]`. This is correct — it includes compiled code and scaffolding templates.
- **`main`**: Currently `"dist/index.js"`. Fine for programmatic use.
- **`type: "module"`**: The dist output uses ESM. Consumers running via `npx` should handle this fine on modern Node.
- **Shebang**: Check if `dist/index.js` has a `#!/usr/bin/env node` or `#!/usr/bin/env bun` shebang. If it targets Bun (`--target bun`), Node may not be able to run it. **This is the critical question.**

### 2. Evaluate the Bun dependency

The build command is:
```
bun build src/index.ts src/mcp-entry.ts --outdir dist --target bun --external @opentui/core*
```

`--target bun` produces output that uses Bun-specific APIs. If the code only uses standard Node APIs (fs, path, child_process, events), the output may still work on Node. But if Bun injects runtime-specific code, it won't.

**Check**: Read `dist/index.js` after building and look for Bun-specific imports (`bun:*`). If there are none, Node compatibility is likely fine. If there are, we need to either:
- Change `--target bun` to `--target node` in the build command.
- Or accept Bun as a runtime requirement and document it.

If changing to `--target node`, also verify:
- The shebang becomes `#!/usr/bin/env node`.
- `@opentui/core` still works (it may use native bindings that are platform-specific).
- Tests still pass when run with `bun test` (test runner stays Bun, only dist changes).

### 3. Verify template inclusion

After building, simulate what npm would publish:
```bash
npm pack --dry-run
```

Check the output includes:
- `dist/index.js`
- `dist/mcp-entry.js`
- `templates/.clifford/prompt.md`
- `templates/.opencode/agent/Developer.md`
- `templates/.opencode/agent/Architect.md`

Verify NO stale templates are included (the ones deleted in Sprint 14: `clifford-approve.sh`, `sprint-verify.sh`, `clifford-sprint.sh`).

### 4. Verify `scaffolder.ts` path resolution

The scaffolder uses `resolveCliffordRoot()` which checks:
1. Dev: `__dirname` → `../../` for templates
2. Dist: `__dirname` → `../` for templates
3. Fallback: `process.cwd()`

When installed globally via npm, `__dirname` will be inside `node_modules/clifford/dist/`. The dist resolution (`../`) should land at `node_modules/clifford/` which contains `templates/`. Verify this path chain works.

### 5. Verify MCP entry resolution

`ensureOpenCodeConfig()` resolves the MCP entry point:
- Dist: `<cliffordRoot>/dist/mcp-entry.js` → command: `node`
- Dev: `<cliffordRoot>/src/mcp-entry.ts` → command: `bun`

When installed from npm, only `dist/` exists, so it should resolve to the dist path. But the command is `node` — if we kept `--target bun`, this is a conflict. Ensure the MCP entry target matches the command written to `opencode.json`.

### 6. Add a `version` field update

The current version is `1.0.0`. Consider whether this should stay or be bumped. If this is the first real publish, `1.0.0` is fine. If it's been published before at `1.0.0`, bump to `1.1.0`.

Check npm registry:
```bash
npm view clifford version 2>/dev/null || echo "Not published yet"
```

### 7. Test the full flow locally

```bash
npm run build
npm pack
# In a temp directory:
mkdir /tmp/test-clifford && cd /tmp/test-clifford
npm init -y
npm install /path/to/clifford-1.0.0.tgz
npx clifford init --yolo
# Verify .clifford/ and .opencode/ are created correctly
# Verify opencode.json points to the correct mcp-entry.js path
```

## Verification
1. `npm run build` succeeds.
2. `npm pack --dry-run` shows expected files, no stale templates.
3. Local install + `npx clifford init --yolo` creates correct scaffolding.
4. `opencode.json` MCP entry path resolves to an existing file.
5. If target was changed from bun to node: `node dist/index.js --help` works.

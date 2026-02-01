# Task 01: Bun Migration

## Title
Migrate Clifford from Node.js to Bun runtime.

## Context
OpenTUI is built natively for Bun, using Bun's FFI capabilities for terminal rendering. The current codebase has extensive workarounds to make it run on Node.js, which results in degraded functionality. By switching to Bun as the primary runtime, we eliminate these hacks and gain native OpenTUI support.

## Step-by-Step

1. **Update `package.json` scripts** to use Bun:
   ```json
   "scripts": {
     "build": "bun build src/index.ts --outdir dist --target bun",
     "start": "bun run dist/index.js",
     "dev": "bun run src/index.ts",
     "lint": "eslint .",
     "test": "bun test"
   }
   ```

2. **Update the shebang** in `src/index.ts`:
   - Change `#!/usr/bin/env node` to `#!/usr/bin/env bun`

3. **Remove Node-specific dependencies** from `package.json`:
   - Remove `ts-node` (Bun has native TypeScript support)
   - Remove `ts-jest` (Bun has native test runner)
   - Keep `typescript` for type checking only

4. **Update `tsconfig.json`** for Bun compatibility:
   - Set `"moduleResolution": "bundler"` 
   - Set `"types": ["bun-types"]`

5. **Add Bun types** as a dev dependency:
   ```bash
   bun add -d bun-types
   ```

6. **Remove the `scm-loader.mjs`** file if it exists - this was a Node.js workaround.

7. **Verify existing commands work**:
   - `bun run dev hello`
   - `bun run dev discover`
   - `bun run dev init` (test the interactive prompts)
   - `bun test` (ensure tests pass)

## Verification
- Run `bun run dev hello` and confirm "Hello from Clifford!" prints.
- Run `bun run dev discover` and confirm tool discovery works.
- Run `bun test` and confirm all existing tests pass.
- Confirm no `node` or `ts-node` commands remain in `package.json`.

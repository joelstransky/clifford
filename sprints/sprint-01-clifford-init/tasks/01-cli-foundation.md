# Task 01: CLI Foundation & Binary Setup

## Context
Clifford needs to be an executable CLI that users can run via `npx`. This task establishes the project structure and ensures the `bin` configuration is correct for global/npx execution.

## Step-by-Step
1. Initialize `package.json` with `name: "clifford"`.
2. Add a `bin` field: `"clifford": "./dist/index.js"`.
3. Set up a TypeScript environment (or pure Node if preferred) to handle CLI logic.
4. Create the entry point `src/index.ts` (or `index.js`) with a shebang: `#!/usr/bin/env node`.
5. Implement a basic argument parser (e.g., using `commander` or a simple `switch`).

## Verification
- Run `npm link` and verify that typing `clifford` in the terminal works.
- Verify `package.json` contains all necessary metadata for publishing.

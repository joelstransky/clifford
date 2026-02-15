# Clifford Agent Guidelines

Welcome, Clifford Agent. This document defines the standards, workflows, and conventions for developing the Clifford recursive implementation agent. Adhere to these guidelines to ensure consistency, reliability, and safety across the codebase.

## 🚀 Commands

### Build & Development (in /clifford)
- **Build Project**: `npm run build`
  - Compiles TypeScript source to CommonJS in `dist/`.
- **Direct Run (Source)**: `npm run dev -- [args]`
  - Runs `src/index.ts` via `ts-node`. Essential for testing changes without rebuilding.
- **Run Compiled**: `npm start -- [args]`
  - Runs the entry point from `dist/index.js`.

### Linting & Code Quality
- **Lint Code**: `npm run lint`
  - Uses ESLint with `@typescript-eslint/recommended`.
  - **Rule**: `no-explicit-any` is set to `error`. Always define types.

### Testing (Jest)
- **Run All Tests**: `npm test`
- **Single Test File**: `npm test -- path/to/file.test.ts`
- **Coverage**: `npm test -- --coverage`

### Sandbox Operations (in /clifford-sandbox)
- **Clean Sandbox**: `npm run clifford:clean`
  - Wipes `.clifford`, `.opencode`, and `sprints`.
- **Init Sandbox**: `npm run clifford:init`
  - Scaffolds the environment using the local `clifford` build.
- **Sync Test Sprints**: `npm run copy:sprints`
  - Copies templates from `uatstuff/sprints` to `sprints/`.

---

## 🛠 Coding Standards

### Language & Runtime
- **TypeScript**: 100% TypeScript codebase. Target ESNext.
- **Module System**: Use ESM `import`/`export` in source files. The `tsconfig.json` handles CommonJS interop for the `dist/` output.
- **Runtime**: Node.js (Latest LTS).

### Naming Conventions
- **Filenames**: `kebab-case.ts` (e.g., `sprint-runner.ts`).
- **Variables & Functions**: `camelCase`.
- **Classes & Interfaces**: `PascalCase`.
- **Constants**: `UPPER_SNAKE_CASE`.
- **Interfaces**: Do NOT prefix with `I`. Use descriptive names like `SprintManifest`.

### Types & Safety
- **Strict Typing**: Explicitly define types for all function parameters and return values.
- **Error Handling**: 
  - Wrap filesystem and network operations in `try/catch`.
  - Provide human-readable error messages prefixed with status emojis (🚀, ✅, ❌, 🛑).
- **Null Safety**: Use optional chaining (`?.`) and nullish coalescing (`??`).

---

## 📂 Project Structure

- `clifford/src/`: Core logic.
  - `utils/`: Reusable logic (Discovery, Sprint, MCP, etc.).
- `clifford/sprints/`: Storage for core sprint manifests and task definitions.
- `clifford-sandbox/`: The primary UAT environment. Isolated from core code.

---

## 🤖 Agent Workflow Guidelines

### Safety Protocol
- **Git**: Never `push --force`. Commits must be atomic per task.
- **Isolation**: Use `clifford-sandbox/` for all verification testing. NEVER modify files in `clifford/` while running tests.
- **Pushing**: No `git push` unless explicitly requested by the Human.

### Task Lifecycle
1. **Selection**: Call `get_sprint_context` with the active sprint directory. Identify the first `pending` task.
2. **Activation**: Call `update_task_status` with `status: "active"` to mark the task as started.
3. **Execution**: Implement logic precisely.
4. **Verification**: Run `npm test` and appropriate sandbox verification.
5. **Documentation**: Call `report_uat` with a description of changes and step-by-step verification instructions.
6. **Completion**: Call `update_task_status` with `status: "completed"`. If this was the last task, call `complete_sprint`.

### Mandatory Exit Protocol
- **You MUST call `update_task_status` with `status: "completed"` immediately after finishing a task.** The outer loop depends on manifest state.
- **You MUST call `report_uat` to document your work and verification results.**
- **NEVER exit without updating the task status if work was performed.** Even on partial failure, call `update_task_status` to reflect actual state (`completed`, `blocked`, etc.).

### Communication Protocol (MCP)
- The Developer agent communicates with Clifford via MCP tools provided by the Clifford MCP server.
- Available tools: `get_sprint_context`, `update_task_status`, `report_uat`, `complete_sprint`, `request_help`.
- Clifford provides an MCP server that Claude Code connects to automatically.
- When the agent calls `request_help`, the TUI displays a blocker panel.
- The human types a response, which is returned to the agent via the tool call.
- The agent stays alive throughout this process — no restart cycle.

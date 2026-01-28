# Clifford Agent Guidelines

Welcome, Clifford Agent. This document defines the standards, workflows, and conventions for developing the Clifford recursive implementation agent. Adhere to these guidelines to ensure consistency, reliability, and safety across the codebase.

## 🚀 Commands

### Build & Development
- **Build Project**: `npm run build` (Compiles TypeScript to `dist/`)
- **Direct Run (Source)**: `npm run dev` (Runs `src/index.ts` via `ts-node`)
- **Run Compiled**: `npm start` (Runs `dist/index.js`)

### Linting & Code Quality
- **Lint Code**: `npm run lint` (Uses ESLint with TypeScript recommended rules)

### Testing (Jest)
- **Run All Tests**: `npm test`
- **Run Single Test File**: `npm test -- path/to/file.test.ts`
- **Watch Mode**: `npm test -- --watch`

---

## 🛠 Coding Standards

### Language & Runtime
- **TypeScript**: All new code must be written in TypeScript.
- **Node.js**: Target latest Node.js versions.
- **Module System**: The project uses **CommonJS** for the compiled output, but source files use ESM `import`/`export` syntax (handled by `tsconfig.json`).

### Naming Conventions
- **Files**: Use `kebab-case` for filenames (e.g., `sprint-runner.ts`).
- **Variables & Functions**: Use `camelCase`.
- **Classes & Interfaces**: Use `PascalCase`.
- **Constants**: Use `UPPER_SNAKE_CASE` for global constants.
- **Interfaces**: Do NOT prefix with `I` (e.g., use `SprintManifest`, not `ISprintManifest`).

### Types & Safety
- **Strict Typing**: Avoid `any`. Explicitly define interfaces for data structures.
- **Error Handling**: Use `try/catch` blocks for asynchronous operations and filesystem interactions. Provide descriptive error messages.
- **Null Checks**: Prefer optional chaining (`?.`) and nullish coalescing (`??`) over manual checks where appropriate.

### Formatting & Style
- **Indentation**: Use 2 spaces for indentation.
- **Documentation**: Use JSDoc comments for public functions, classes, and complex logic.
- **Imports**: Organize imports by:
  1. Built-in Node.js modules (e.g., `fs`, `path`).
  2. Third-party dependencies (e.g., `commander`, `inquirer`).
  3. Internal modules (using relative paths).

---

## 📂 Project Structure

- `src/`: Core application logic.
  - `utils/`: Reusable utilities (sprint logic, discovery, bridge).
  - `ui/`: TUI components (when implemented).
- `dist/`: Compiled JavaScript output (ignored by git).
- `templates/`: Base templates for `.clifford/`, `.opencode/`, etc., used during `init`.
- `sprints/`: Storage for sprint manifests and task definitions.
- `.opencode/`: Agent persona definitions and local configurations.

---

## 🤖 Agent Workflow Guidelines

### Safety Protocol
- **Git Operations**: Never run destructive commands like `git push --force` or `git reset --hard` unless explicitly requested.
- **Isolation**: When testing, use a sandbox directory outside the repository to prevent accidental modification of the core codebase.

### Task Management
- **Atomic Implementation**: Focus on one task at a time. Do not attempt to solve multiple unrelated tasks in a single pass.
- **Manifest Sync**: Always ensure the `manifest.json` correctly reflects the state of the work. If a task fails or is interrupted, do NOT mark it as completed.

### The "Magazine Aesthetic"
- CLI output should be clean, professional, and well-formatted.
- Use emojis sparingly but effectively to indicate status (🚀 for start, ✅ for success, ❌ for error).
- Ensure progress is clearly communicated to the user during long-running loops.

### Recursive Loop Integrity
- When modifying the `SprintRunner` or loop logic, ensure that infinite loops are prevented by detecting lack of progress (e.g., hashing the manifest).

---

## 📋 Rule Integration
*No external Cursor or Copilot rules detected. Follow these guidelines as the primary source of truth.*

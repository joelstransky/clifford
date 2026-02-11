# Sprint 13 — MCP API Expansion & Activity Styling — UAT

## Task 1: `get_sprint_context` MCP Tool

### What Changed
- Added a new `get_sprint_context` MCP tool to `src/utils/mcp-server.ts`.
- The tool accepts a `sprintDir` parameter and returns the full sprint manifest, the current (first pending/active) task's markdown content, and any ASM human guidance from previous attempts.
- Extracted the handler logic into a standalone exported function `buildSprintContext()` for testability.
- Added new exported interfaces: `SprintTaskEntry`, `SprintManifestData`, `SprintContextResponse`.
- Added 7 new unit tests in `src/utils/mcp-server.test.ts` covering:
  - Nonexistent sprint directory (returns error).
  - Valid sprint with pending tasks (returns full context with task content).
  - All tasks completed (returns `currentTask: null` with note).
  - Active task prioritized over pending tasks.
  - Missing task file (returns `content: null`).
  - ASM guidance included when available.
  - Invalid JSON manifest (returns parse error).

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all tests should pass (118 tests across 12 files).
3. Run `npm run lint` — should produce no errors.
4. Review the `buildSprintContext` function in `src/utils/mcp-server.ts:63` to confirm:
   - It reads `manifest.json` from the resolved sprint directory.
   - It finds the first `pending` or `active` task.
   - It reads the task markdown file content.
   - It checks `getMemory(taskId)` for ASM guidance.
   - It returns structured JSON matching the `SprintContextResponse` interface.
   - Error cases return descriptive error messages.
5. Confirm the `get_sprint_context` tool is registered in `registerTools()` with the correct zod input schema.

## Task 2: `update_task_status` MCP Tool

### What Changed
- Added a new `update_task_status` MCP tool to `src/utils/mcp-server.ts`.
- The tool accepts `sprintDir`, `taskId`, and `status` parameters. It validates the transition against a strict state machine before writing the manifest.
- Defined `VALID_TRANSITIONS` map enforcing: `pending→active`, `active→completed`, `active→blocked`, `blocked→active`. Terminal states (`completed`, `pushed`) allow no outgoing transitions.
- Extracted the handler logic into a standalone exported function `updateTaskStatus()` for testability.
- Added new exported interface: `UpdateTaskStatusResponse`.
- Added 9 new unit tests in `src/utils/mcp-server.test.ts` covering:
  - Valid transition `pending → active` succeeds and manifest file is updated on disk.
  - Valid transition `active → completed` succeeds.
  - Valid transition `active → blocked` succeeds.
  - Valid transition `blocked → active` succeeds.
  - Invalid transition `completed → active` returns error (terminal state).
  - Invalid transition `pending → completed` returns error (must go through active).
  - Nonexistent task ID returns error.
  - Nonexistent sprint directory returns error.
  - Invalid JSON manifest returns error.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 127 tests should pass across 12 files.
3. Run `npm run lint` — should produce no errors.
4. Review the `updateTaskStatus` function in `src/utils/mcp-server.ts` to confirm:
   - It reads `manifest.json` from the resolved sprint directory.
   - It finds the task by `taskId`.
   - It validates the transition against `VALID_TRANSITIONS`.
   - On valid transition, it updates the task status and writes the manifest back with `JSON.stringify(manifest, null, 2)`.
   - On invalid transition, it returns a descriptive error with the allowed transitions.
   - Error cases (missing manifest, missing task, write failure) return descriptive error messages.
5. Confirm the `update_task_status` tool is registered in `registerTools()` with the correct zod input schema (`sprintDir: z.string()`, `taskId: z.string()`, `status: z.enum(['active', 'completed', 'blocked'])`).

## Task 3: `report_uat` MCP Tool

### What Changed
- Added a new `report_uat` MCP tool to `src/utils/mcp-server.ts`.
- The tool accepts `taskId`, `description`, `steps`, `result`, and optional `notes` parameters, and appends a structured UAT entry to `.clifford/uat.json`.
- Extracted the handler logic into a standalone exported function `reportUat()` for testability.
- Added new exported interfaces: `UatEntry`, `ReportUatResponse`.
- The handler:
  - Creates `.clifford/` directory if it doesn't exist.
  - Reads existing `uat.json` entries or starts with `[]`.
  - Handles malformed JSON gracefully — logs a warning to stderr and resets to `[]`.
  - Handles non-array JSON gracefully — logs a warning and resets to `[]`.
  - Appends the new entry with an ISO timestamp.
  - Omits the `notes` field when not provided or empty.
  - Writes back with `JSON.stringify(entries, null, 2)`.
- Updated `src/utils/scaffolder.ts` to include `.clifford/uat.json` in the `.gitignore` entries.
- Added 7 new unit tests in `src/utils/mcp-server.test.ts` covering:
  - Valid input creates `uat.json` with one correctly structured entry.
  - Calling again appends a second entry (doesn't overwrite).
  - Timestamp is a valid ISO string within expected range.
  - Malformed existing JSON is handled gracefully (reset to `[]` + new entry).
  - Notes field omitted when not provided.
  - Notes field omitted when provided as empty string.
  - Non-array JSON is handled gracefully (reset to `[]`).

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 134 tests should pass across 12 files.
3. Run `npm run lint` — should produce no errors.
4. Review the `reportUat` function in `src/utils/mcp-server.ts` to confirm:
   - It resolves `.clifford/uat.json` from `process.cwd()`.
   - It creates the `.clifford/` directory if missing.
   - It reads existing entries, or starts fresh on corruption.
   - It appends the new `UatEntry` with an ISO timestamp.
   - It returns `{ success, taskId, result, totalEntries }`.
5. Confirm the `report_uat` tool is registered in `registerTools()` with the correct zod input schema (`taskId: z.string()`, `description: z.string()`, `steps: z.array(z.string())`, `result: z.enum(['pass', 'fail', 'partial'])`, `notes: z.string().optional()`).
6. Confirm `src/utils/scaffolder.ts` now includes `.clifford/uat.json` in the gitignore entries array.

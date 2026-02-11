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

## Task 4: `complete_sprint` MCP Tool

### What Changed
- Added a new `complete_sprint` MCP tool to `src/utils/mcp-server.ts`.
- The tool accepts `sprintDir` (required) and `summary` (optional) parameters. It validates that all tasks in the sprint have status `completed` or `pushed` before marking the sprint as completed.
- Extracted the handler logic into a standalone exported function `completeSprint()` for testability.
- Added new exported interface: `CompleteSprintResponse`.
- The handler:
  - Reads `manifest.json` from the resolved sprint directory.
  - Guards against double-completion: if `manifest.status` is already `"completed"`, returns `{ success: true, note: "Sprint was already marked as completed" }`.
  - Checks all tasks: if any task has a status other than `completed` or `pushed`, returns `{ success: false }` with the count of unfinished tasks and a full task status list.
  - If all tasks are done, sets `manifest.status = "completed"`, writes the manifest, and returns success with `sprintId`, `sprintName`, `completedAt` (ISO timestamp), `summary`, and `taskCount`.
  - Handles missing manifest and invalid JSON with descriptive error messages.
- Added 8 new unit tests in `src/utils/mcp-server.test.ts` covering:
  - Sprint with all tasks `completed` → success, manifest status set to `completed`.
  - Sprint with mix of `completed` and `pushed` tasks → success.
  - Summary parameter included in response when provided.
  - Sprint with 1 task still `pending` → failure with task list.
  - Sprint with a `blocked` task → failure.
  - Sprint already `completed` → success with note (double-completion guard).
  - Nonexistent sprint dir → error.
  - Invalid JSON manifest → error.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 142 tests should pass across 12 files (8 new tests for completeSprint).
3. Run `npm run lint` — no new lint errors introduced.
4. Review the `completeSprint` function in `src/utils/mcp-server.ts` to confirm:
   - It reads `manifest.json` from the resolved sprint directory.
   - It guards against double-completion (returns success with note).
   - It validates all tasks have status `completed` or `pushed`.
   - On failure, it returns the count of unfinished tasks and full task status list.
   - On success, it sets `manifest.status = "completed"` and writes the manifest.
   - It returns structured JSON matching the `CompleteSprintResponse` interface.
5. Confirm the `complete_sprint` tool is registered in `registerTools()` with the correct zod input schema (`sprintDir: z.string()`, `summary: z.string().optional()`).

## Task 5: Update Prompt Templates & Agent Permissions

### What Changed
- **Rewrote `templates/.clifford/prompt.md`**: Replaced all direct filesystem manipulation instructions (read/write `manifest.json`, create `uat.md`) with MCP tool call instructions. Added a complete "MCP Tools" section documenting all 5 tools (`get_sprint_context`, `update_task_status`, `report_uat`, `complete_sprint`, `request_help`), a "Task Lifecycle" section using MCP tools, and a "File Restrictions" section with explicit "NEVER write to `.clifford/`" rules. Removed the old "Mandatory Exit Protocol" that instructed direct file edits and git commits.
- **Rewrote `templates/.opencode/agent/Developer.md`**: Replaced direct manifest editing instructions (`Update Manifest`, `Atomic Commits`) with MCP tool equivalents (`Activate Task`, `Complete Task`, `Complete Sprint`). Added an "MCP Tools Available" section listing all 5 tools. Changed write permissions to explicitly exclude `.clifford/`. Added "NEVER run `git commit` or `git push`" rule.
- **Updated `.opencode/agent/Developer.md`** (Clifford's own): Same changes as the template version — MCP tool references, no direct manifest/uat writes, no git commit instructions.
- **Updated `AGENTS.md`**: Changed the "Task Lifecycle" section to use MCP tool calls (`get_sprint_context`, `update_task_status`, `report_uat`, `complete_sprint`). Updated the "Mandatory Exit Protocol" to reference `update_task_status` and `report_uat` instead of direct file edits. Updated the "Communication Protocol (MCP)" section to list all 5 available MCP tools.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm run lint` — no new lint errors introduced (pre-existing errors are unrelated to template changes).
3. Open `templates/.clifford/prompt.md` and verify:
   - No references to reading or editing `manifest.json` directly.
   - All 5 MCP tools are documented with input schemas.
   - The "NEVER write to `.clifford/`" rule is prominent in the "File Restrictions" section.
   - No "Mandatory Exit Protocol" referencing direct file edits remains.
   - No instructions to run `git commit` automatically.
4. Open `templates/.opencode/agent/Developer.md` and verify:
   - MCP tools are listed in a dedicated section.
   - No references to `Atomic Commits` or `git add && git commit`.
   - Write permissions explicitly exclude `.clifford/`.
5. Open `.opencode/agent/Developer.md` and verify consistency with the template version.
6. Open `AGENTS.md` and verify:
   - Task Lifecycle steps reference MCP tool calls.
   - Mandatory Exit Protocol references `update_task_status` and `report_uat`.
   - Communication Protocol lists all 5 MCP tools.
7. Run `grep -rn "edit.*manifest\|write.*manifest\|fs.write.*manifest" templates/` — should return only the `clifford-approve.sh` script (external tooling) and the prohibition rule in `prompt.md`, NOT any instructions for the agent to edit manifests.

## Task 6: Activity Tab Styling Tweaks

### What Changed
- **Blue border on Status Row** (`src/tui/components.ts:427`): Added `border: true` and `borderColor: COLORS.primary` (#7aa2f7) to the status row. Increased height from 5 to 7 to accommodate the border (2 chars) and padding (2 chars). Replaced `paddingLeft: 2` / `paddingRight: 2` with uniform `padding: 1`.
- **Inner padding on all three panes** (`src/tui/components.ts:444,465`): Added `padding: 1` to `activityRow` and `processRow`. The status row already had padding from the border change above.
- **Auto-scroll to bottom** (`src/tui/components.ts:582`, `src/tui/Dashboard.ts:189,200`): Exposed `activityScroll` and `processScroll` references from `createActivityView()` via the `ActivityViewComponents` interface. Added a `scrollToEnd()` helper that safely calls `scrollToBottom()` or falls back to `scrollTo(999999)`. Called `scrollToEnd()` after each `renderLogEntries()` invocation in Dashboard.ts.
- **Remove timestamps from process output** (`src/tui/components.ts:597`, `src/tui/Dashboard.ts:198`): Added a `showTimestamp: boolean = true` parameter to `renderLogEntries()`. When `false`, the `[HH:MM:SS]` prefix is omitted. The process log call in Dashboard.ts passes `false`; the activity log retains the default `true`.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 142 tests should pass across 12 files.
3. Launch the Clifford TUI and switch to the **Activity** tab.
4. Verify:
   - The status row has a visible blue (`#7aa2f7`) border around it.
   - The blue border touches the outer edges of the panel — no gap between the border and the panel edge.
   - All three panes (status, activity, process) have ~1 character of inner padding.
   - When a sprint is running, the activity log auto-scrolls to show the latest entry.
   - The process output pane auto-scrolls to show the latest stdout/stderr line.
   - Process output lines do NOT have `[HH:MM:SS]` timestamps.
   - Activity log lines DO still have `[HH:MM:SS]` timestamps.

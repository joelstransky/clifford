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
5. Confirm the `get_sprint_context` tool is registered in `registerTools()` at line 254 with the correct zod input schema.

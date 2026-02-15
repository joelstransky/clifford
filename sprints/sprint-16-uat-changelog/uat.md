# sprint-16 — UAT & Changelog — UAT

## task-1: UAT Markdown MCP Tool

### Changes
- **`src/utils/mcp-server.ts`**:
    - Restored accidentally deleted interfaces (`BlockData`, `SprintTaskEntry`, `SprintManifestData`, `SprintContextResponse`, `UpdateTaskStatusResponse`, `CompleteSprintResponse`, `PendingBlock`).
    - Replaced `reportUat` (writing to `uat.json`) with `reportUatMarkdown` which appends task verification results to the sprint's `uat.md`.
    - Updated `report_uat` MCP tool registration with the new schema (`sprintDir`, `taskId`, `title`, `changes`, `verificationSteps`).
    - Removed `UatEntry` and `ReportUatResponse` interfaces.
- **`src/utils/mcp-server.test.ts`**:
    - Replaced `reportUat` tests with comprehensive tests for `reportUatMarkdown`.
    - Verified file creation with header, appending to existing files, and graceful manifest handling.
- **`src/utils/scaffolder.ts`**:
    - Removed `.clifford/uat.json` from the `.gitignore` entries.
- **Agent Personas**:
    - Updated `templates/.opencode/agent/Developer.md` and `.opencode/agent/Developer.md` to document the new `report_uat` schema and lifecycle role.

### Verification Steps
1. Run `npm run build` — should succeed.
2. Run `npm test` — all tests (including new `reportUatMarkdown` tests) pass.
3. Review `src/utils/mcp-server.ts` — confirm `report_uat` tool now uses the new schema and `reportUatMarkdown` handler.
4. Review agent personas — confirm `report_uat` documentation matches the new schema.

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

## task-2: Changelog MCP Tool

### Changes
- **`src/utils/config.ts`**: Added `changelog` flag to `CliffordConfig` interface.
- **`src/index.ts`**: 
    - Added `Auto-update CHANGELOG.md` prompt to `clifford init`.
    - Added `changelog: true` to YOLO defaults.
    - Updated `clifford.json` generation to include the `changelog` setting.
- **`src/utils/mcp-server.ts`**:
    - Implemented `updateChangelog` function that appends a summary to `CHANGELOG.md`.
    - Registered `update_changelog` MCP tool.
    - The tool respects `changelog` setting in `clifford.json` and skips if disabled.
- **Agent Personas**: Updated `Developer.md` in both `src/templates` and `.opencode` to include `update_changelog` documentation and updated task lifecycle.
- **Tests**: 
    - Added tests for `updateChangelog` in `src/utils/mcp-server.test.ts`.
    - Added test for `changelog` field parsing in `src/utils/config.test.ts`.

### Verification Steps
1. Run `npm run build` — should succeed.
2. Run `npm test` — all tests (including new `updateChangelog` tests) pass.
3. Run `npx ts-node src/index.ts init` (interactively) and verify the "Auto-update CHANGELOG.md" prompt appears.
4. Verify `clifford.json` contains `"changelog": true` (or false if chosen).
5. Manually verify `update_changelog` tool creates/updates `CHANGELOG.md` with correct formatting.
6. Verify tool skips if `changelog: false` is set in `clifford.json`.

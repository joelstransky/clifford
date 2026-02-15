# Sprint 15 — Publish & Polish — UAT

## Task 1: Deduplicate Prompt and Developer Agent Instructions

### Changes
- **`templates/.clifford/prompt.md`**: Replaced the 79-line prompt (which duplicated MCP tool docs, task lifecycle, file restrictions, and communication protocol) with a minimal 11-line kickstart that defers all behavioral guidance to the Developer agent persona.
- **`templates/.opencode/agent/Developer.md`**: Expanded to be the single source of truth. Added detailed MCP tool descriptions with input schemas, explicit task lifecycle steps, and comprehensive file restrictions (previously only in prompt.md).
- **`.opencode/agent/Developer.md`**: Updated Clifford's own agent persona to match the template version, preserving the `.clifford/sprint-verify.sh` verification command specific to this environment.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 147 tests pass.
3. Run `npm run lint` — no lint errors.
4. Read `templates/.clifford/prompt.md` — confirm it is under 15 lines with no MCP tool documentation, just a kickstart pointing to the Developer persona.
5. Read `templates/.opencode/agent/Developer.md` — confirm it contains all 5 MCP tool descriptions with input schemas, task lifecycle, file restrictions, and communication protocol.
6. Read `.opencode/agent/Developer.md` — confirm it mirrors the template version (with `.clifford/sprint-verify.sh` for verification instead of `npm run build && npm test && npm run lint`).
7. Cross-check: nothing from the old prompt.md is lost — all behavioral guidance now lives in Developer.md.

## Task 2: Restyle MCP Status Indicator

### Changes
- **`src/tui/components.ts`**: Removed the standalone `infoMcpText` TextRenderable. Replaced it with a `mcpLabel` TextRenderable that displays only the word "MCP". Created a new `progressRow` horizontal flex container (`justifyContent: 'space-between'`) that places the progress text on the left and the MCP label on the right. Reduced `statusRow` height from 9 to 8 since MCP no longer takes its own line. Updated the `ActivityViewComponents` interface to export `mcpLabel` instead of `infoMcpText`.
- **`src/tui/Dashboard.ts`**: Replaced all `infoMcpText` references with `mcpLabel`. The MCP indicator now renders as just "MCP" colored by state (green = running, red = error, gray = idle) with no "MCP:" prefix or status text.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 147 tests pass.
3. Launch the TUI and switch to the Activity tab.
4. With no sprint running: confirm "MCP" appears in gray in the lower-right area of the status pane (on the same row as Progress).
5. Start a sprint: confirm "MCP" turns green when the MCP server is running.
6. Stop the sprint: confirm "MCP" returns to gray.
7. Verify the word "MCP" has no prefix label (no "MCP:") and no status text (no "RUNNING"/"IDLE") — just the three letters, colored by state.

## Task 3: Multi-Turn Blocker Conversations

### Changes
- **`src/utils/mcp-ipc.ts`**: Added `action: 'continue' | 'done'` field to `McpResponseFile` interface. Updated `writeResponseFile()` to accept an optional `action` parameter (defaults to `'done'` for backward compatibility). Updated `pollForResponse()` to return the full `McpResponseFile` object instead of just the response string; on `'continue'` actions, only the response file is cleaned up (the block file is preserved so the conversation can continue).
- **`src/utils/mcp-server.ts`**: Rewrote the `request_help` handler to loop on `'continue'` responses. Messages are accumulated in an array. On each `'continue'`, a new block file is written with accumulated context and the loop continues polling. On `'done'`, all messages are joined and returned to the agent as a single response.
- **`src/tui/DashboardController.ts`**: Updated `handleBlockerSubmit()` to accept an `action: 'continue' | 'done'` parameter (defaults to `'done'`). When `action` is `'continue'`, the blocker stays active, the user's message is logged, and the input is cleared for the next message. Task file appending and ASM storage saving only occur on `'done'`.
- **`src/tui/Dashboard.ts`**: Added Tab key handling in blocker mode — Tab calls `handleBlockerSubmit('continue')`, Enter calls `handleBlockerSubmit('done')`. Updated blocker footer hint text to `[Enter] Done  [Tab] Send & Continue  [Esc] Cancel`.
- **`src/tui/components.ts`**: Updated the static blocker footer hint text to match the new key bindings: `[Enter] Done  [Tab] Send & Continue  [Esc] Cancel`.
- **`src/utils/mcp-ipc.test.ts`**: Updated `writeResponseFile` tests to verify the new `action` field. Added tests for explicit `'continue'` and `'done'` actions. Updated `pollForResponse` integration test to assert the full `McpResponseFile` object. Added a test verifying that `'continue'` responses preserve the block file.
- **`src/tui/DashboardController.test.ts`**: Added three new tests: `handleBlockerSubmit('continue')` keeps the blocker active and clears input; `handleBlockerSubmit('done')` clears the blocker and emits `blocker-cleared`; default (no argument) behaves as `'done'`.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 153 tests pass (6 new tests added).
3. Launch the TUI, trigger a blocker (or simulate one).
4. Type a message and press **Tab** — message is sent but the blocker input stays open for follow-up. The activity log should show `You: <your message>`.
5. Type another message and press **Enter** — blocker resolves and the agent receives all accumulated messages joined by double newlines.
6. Press **Esc** — blocker is dismissed without sending.
7. Verify the blocker footer shows: `[Enter] Done  [Tab] Send & Continue  [Esc] Cancel`.

## Task 4: Fix Sprint List Status and Replace Progress Bar with Task Count

### Changes
- **`src/tui/components.ts`**:
  - Fixed the status derivation in `renderSprintItems()` — added a missing `else if` clause that catches sprints with some completed or active tasks and labels them "In Progress" (yellow). Previously these fell through to the default "Pending".
  - Added `[X of Y]` task count to each sprint label, rendered with `dim()` styling so it doesn't dominate the sprint name. Computed from tasks with `completed` or `pushed` status vs total task count.
  - Removed `progressText` TextRenderable, `progWrap` BoxRenderable, and the `sprintsPanel.add(progWrap)` call. Removed `progressText` from the `SprintListViewComponents` interface and the return statement.
- **`src/tui/Dashboard.ts`**:
  - Removed `progressText` from the destructuring of `createSprintListView()`.
  - Removed both lines that set `progressText.content` in `updateDisplay()` (sprints view and tasks view branches).
  - Added `[X of Y]` task count (dim-styled) to the task drill-down header alongside "SPRINT PLAN", visible in all three header variants (start available, running, default).

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 153 tests pass.
3. Launch the TUI, view the sprints list:
   - A sprint with all tasks pending shows "Pending" status.
   - A sprint with some tasks completed shows "In Progress" status (yellow).
   - A sprint with all tasks completed/pushed shows "Complete" status (green).
   - A sprint with all tasks pushed shows "Published" status (blue).
   - Each sprint shows `[X of Y]` next to its name in dim text.
4. The progress bar is gone from the bottom of the sprints panel.
5. Drill into a sprint — the header shows "SPRINT PLAN [X of Y]" with the count in dim text.

## Task 6: Sprint Completion Synopsis

### Changes
- **`src/tui/DashboardController.ts`**: Added a `lastCompletedSprint` public property (typed as `{ name: string; completedCount: number; totalCount: number; elapsed: string } | null`). In the `'stop'` runner event handler, the controller now snapshots the sprint name, completed/total task counts, and formatted elapsed time before clearing state. In the `'start'` handler, `lastCompletedSprint` is cleared so starting a new sprint removes the old synopsis.
- **`src/tui/Dashboard.ts`**: Added a third branch to the status pane rendering in `updateDisplay()`. When neither running nor has a start time, but `ctrl.lastCompletedSprint` is set, the status pane displays the sprint name, result (X of Y tasks completed), elapsed time, and "Sprint finished." — all rendered with `dim()` for gray text. The existing "No sprint running" fallback only shows when there is no synopsis data either.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 139 tests pass.
3. Launch the TUI, start a sprint and let it run to completion.
4. After the sprint finishes, verify the Activity tab status pane shows:
   - `Sprint: <name>` in gray
   - `Result: X of Y tasks completed` in gray
   - `Elapsed: MM:SS` in gray
   - `Sprint finished.` in gray
5. Start a new sprint — verify the synopsis clears and live sprint info is shown instead.
6. If no sprint has ever been run, verify the status pane shows "No sprint running" as before.

## Task 7: Clean Process Output for TUI Rendering

### Changes
- **`src/utils/text.ts`**: Added `stripAnsi()` function that removes ANSI SGR (Select Graphic Rendition) escape sequences (`\x1b[...m`) from strings. This targets the color, background, bold, and other styling codes that cause garbled rendering in OpenTUI's text panes.
- **`src/tui/DashboardController.ts`**: Imported `stripAnsi` from `../utils/text.js`. Applied it to each line in the `runner.on('output', ...)` handler so process output is sanitized before being added to the log.
- **`src/utils/text.test.ts`**: Added 6 new tests for `stripAnsi`: plain text passthrough, SGR color code removal, SGR background code removal, multiple SGR sequences, empty string, and compound SGR params (e.g. `38;5;196` extended colors).

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 145 tests pass (6 new `stripAnsi` tests added).
3. Launch the TUI and start a sprint that produces colored terminal output.
4. Observe the process output pane — colored background blocks and SGR styling artifacts should no longer appear. Text content should be readable plain text.
5. Verify that emoji/Unicode characters in output are preserved (only ANSI SGR sequences are stripped).

## Task 8: Remove Cross-Sprint State Sync

### Changes
- **`src/utils/sprint.ts`**: Deleted the `syncSprintStates(targetManifestPath: string)` private method (previously lines 361-391). This method iterated all sprint directories and demoted any `active` sprint to `"planning"` when a new sprint started, causing cross-sprint contamination. Also removed the `this.syncSprintStates(manifestPath)` call in the `run()` method (previously line 143). The sprint runner now only reads and writes the manifest for the sprint it was told to run.
- **`src/utils/sprint.ts`** (type): Removed `'planning'` from the `SprintManifest.status` type union. The valid sprint statuses are now `'active' | 'completed'`. The `planning` status was only ever set by `syncSprintStates` and was not used in the TUI or any other logic.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 145 tests pass.
3. Confirm `syncSprintStates` no longer exists in `src/utils/sprint.ts` — `grep -n syncSprintStates src/utils/sprint.ts` returns nothing.
4. Confirm `planning` is no longer in the `SprintManifest` type — `grep -n planning src/utils/sprint.ts` returns nothing.
5. Start a sprint (e.g., test-sprint-01) and let it complete. Check another sprint's manifest (e.g., test-sprint-02) — its `status` field should be unchanged from whatever it was before the run.
6. Confirm the other sprint can be started normally after the first sprint finishes.

## Task 9: Revert Multi-Turn Blocker to Simple Send/Cancel

### Changes
- **`src/utils/mcp-ipc.ts`**: Removed `action` field from `McpResponseFile`. Reverted `pollForResponse` to return `Promise<string>` and `writeResponseFile` to remove the `action` parameter.
- **`src/utils/mcp-server.ts`**: Reverted `request_help` handler to a simple single-response flow, removing the conversation loop and accumulated messages.
- **`src/tui/DashboardController.ts`**: Removed `action` parameter from `handleBlockerSubmit()`. Reverted to simple submission that writes the response and clears the blocker.
- **`src/tui/Dashboard.ts`**: Removed Tab key handling in blocker mode. Updated blocker footer hint to `[Enter] Submit  [Esc] Cancel`.
- **`src/tui/components.ts`**: Restored the original hint text: `Type response or "Done" if action taken.  [Enter] Submit  [Esc] Cancel`.
- **`src/utils/mcp-ipc.test.ts`**: Reverted tests to remove `action` checks and expect simple response strings.
- **`src/tui/DashboardController.test.ts`**: Reverted tests to remove the `continue` action test and update existing tests for the new signature.

### Verification Steps
1. Run `npm run build` — should succeed.
2. Run `npm test` — all tests pass.
3. Trigger a blocker. Type a response and press **Enter** — confirm the blocker dismisses and the response is sent.
4. Press **Esc** — confirm the blocker cancels.
5. Confirm **Tab** does nothing special in blocker mode.
6. Confirm the footer hint is restored to the simpler version.

## Task 10: Purge ASM and Stabilize Halt Flow

### Changes
- **Purge ASM Logic**:
    - Deleted `src/utils/asm-storage.ts` and `src/utils/asm-storage.test.ts`.
    - Removed `asm-storage` imports and calls from `src/utils/mcp-server.ts`, `src/utils/sprint.ts`, and `src/tui/DashboardController.ts`.
    - Removed `.clifford/asm.json` from `scaffolder.ts` (`.gitignore` entries) and `scripts/clifford-clean.mjs`.
- **Stabilize Halt Flow**:
    - Updated `src/tui/DashboardController.ts` to clear `activeBlocker` and `chatInput` when the runner stops. This ensures that killing the agent process (which triggers `runner.on('stop')`) also clears the blocker UI.
- **Markdown Backup**:
    - Updated `handleBlockerSubmit` in `DashboardController.ts` to append human guidance to the task markdown file under a `## Additional Info` section. This provides a persistent backup of guidance without needing separate ASM storage.
- **Documentation**:
    - Removed mentions of ASM and guidance from `templates/.opencode/agent/Developer.md`.

### Verification Steps
1. Run `npm run build` — should succeed.
2. Run `npm test` — all tests pass (after removing ASM-specific tests and updating `mcp-server.test.ts`).
3. Confirm `src/utils/asm-storage.ts` is gone.
4. Verify that `.clifford/asm.json` is no longer created or used.
5. Trigger a blocker in a sprint task.
6. Submit a response and verify that the task's markdown file now has a `## Additional Info` section with your question and response.
7. Trigger another blocker, but this time stop the sprint (or kill the agent process) — verify the blocker UI is cleared in the TUI.


# Sprint 8 UAT: Polish & Stability

## Prerequisites
- Clean state: `npm run clifford:clean`
- Copy test sprints: `npm run copy:sprints`
- All commands run from the project root

---

## Task 1: Activity Log Dedup
- **Status**: ✅ Completed
- **Changes**: `src/tui/Dashboard.ts` — Refactored `loadManifest()` polling logic
- **What was fixed**:
  - Added `buildStatusSnapshot()` helper that creates a `Map<taskId, status>` for ID-based comparison (replaces fragile index-based comparison)
  - Added `previousStatusSnapshot` state to track prior task statuses separately
  - `loadManifest()` now skips `updateDisplay()` entirely when polling finds no status changes
  - Navigation into/out of sprints (← / →) now resets `previousManifest` and `previousStatusSnapshot` so first load of a new sprint doesn't produce false transition logs
  - Polling is skipped when in sprints list view and no sprint is running
- **Verification**:
  1. Launch TUI (`npm run dev`), observe only "Dashboard initialized" in the activity log — **no** spurious entries from the initial manifest load
  2. Navigate into a sprint with → arrow — the task list appears but **no** activity log entries are created (the first load is treated as initialization, not a status transition)
  3. Press ← to go back to the sprint list — **no** log entry created
  4. Navigate into a different sprint with → — **no** log entry created
  5. Navigate back into the original sprint — **no** log entry created (previousManifest was properly reset)
  6. Start a sprint by pressing `S` — observe that **only** actual status transitions appear in the activity log (e.g., `⏳ task-01: pending → active`, `✅ task-01: active → completed`)
  7. Wait idle for 10+ seconds without any task changes — **no** new log entries appear from polling
  8. Verify that the 1-second polling interval no longer triggers `updateDisplay()` when the manifest has not changed on disk

## Task 2: Halt & Call for Help
- **Status**: ✅ Completed
- **Changes**:
  - `src/utils/sprint.ts` — Sprint runner now captures agent exit codes and emits a `halt` event when the agent crashes (non-zero exit) or exits without completing a task (exit 0 but task still `pending`). Added logic to detect existing ASM guidance and automatically retry instead of halting when guidance is already available (prevents double-halt after blocker resolution).
  - `src/utils/bridge.ts` — Added `setBlockerContext(taskId, question)` method so the Dashboard can pre-set the task/question context on the bridge for halt scenarios (where `triggerBlock()` is not called since the agent already exited). `resolveBlocker()` already handles null `activeChild` gracefully.
  - `src/tui/Dashboard.ts` — Added `runner.on('halt', ...)` handler that unifies halts with the existing blocker UX: sets `activeBlocker`, focuses the chat input, and shows the "NEEDS HELP" panel. Updated the blocker header label from "BLOCKER DETECTED" to "NEEDS HELP" for a unified UX. Updated the Escape handler to guard `runner.stop()` behind `runner.getIsRunning()` check (since the runner may already be stopped in halt scenarios). Updated the dismiss log message to "Help dismissed" instead of "Blocker cancelled".
- **Verification**:
  1. Launch TUI and start a sprint that contains a task designed to fail (agent exits non-zero or without completing)
  2. When the agent exits without completing: verify the "🛑 NEEDS HELP" panel appears in the right panel with the task ID, reason, and a question prompting for guidance
  3. Verify the chat input auto-focuses with the red "🛑 >" prompt and blinking cursor
  4. Type a guidance response and press **Enter**: verify ASM is written (check `.clifford/asm.json` for the task entry), and the sprint restarts automatically with the guidance injected as `[HUMAN_GUIDANCE]` in the prompt
  5. Press **Escape** instead of Enter: verify the "needs help" panel disappears, the sprint stays stopped, and no ASM entry is written
  6. Trigger a traditional blocker (interactive prompt detection): verify the same "NEEDS HELP" panel appears, and resolving it works as before (saves to ASM, kills child, restarts with guidance)
  7. After a blocker resolution where the agent was killed (non-zero exit), verify the sprint does NOT halt a second time — instead it retries automatically with the existing ASM guidance

## Task 3: UAT Test Fixtures
- **Status**: ✅ Completed
- **Changes**:
  - Created `templates/sprints/uat-happy-path/` — A 3-task happy-path sprint with simple file creation, modification, and read-then-write tasks. Tasks: create `uat-output/hello.txt`, append a timestamp, create `uat-output/summary.json` from the file contents.
  - Created `templates/sprints/uat-failure/` — A 2-task failure sprint. Task 01 instructs the agent to run a nonexistent command (`clifford-phantom-verify`) which should trigger a halt. Task 02 has deliberately contradictory instructions that should cause the agent to use the blocker protocol.
  - Added `scripts/copy-sprints.mjs` — Copies all sprint directories from `templates/sprints/` into `.clifford/sprints/`. Uses recursive directory copy with no external dependencies.
  - Added `scripts/clifford-clean.mjs` — Removes `.clifford/sprints/`, `.clifford/asm.json`, `.clifford/state.json`, and `uat-output/` for a clean-slate reset.
  - Updated `package.json` — Added `copy:sprints` and `clifford:clean` npm scripts.
- **Verification**:
  1. Run `npm run clifford:clean` — confirm it removes `.clifford/sprints/` (and `uat-output/` if present). Running again prints "Already clean".
  2. Run `npm run copy:sprints` — confirm output shows both `uat-happy-path` and `uat-failure` copied to `.clifford/sprints/`.
  3. Verify `.clifford/sprints/uat-happy-path/manifest.json` exists with 3 pending tasks and status `active`.
  4. Verify `.clifford/sprints/uat-failure/manifest.json` exists with 2 pending tasks and status `active`.
  5. Launch TUI (`npm run dev`) — navigate to sprint list. Both "UAT Happy Path" and "UAT Failure Scenarios" should appear alongside any existing sprints.
  6. Select "UAT Happy Path" and drill in — 3 tasks visible, all pending.
  7. Press `S` to start the happy-path sprint — the agent should create `uat-output/hello.txt`, append a timestamp, and create `uat-output/summary.json`. All 3 tasks should complete.
  8. Navigate back, select "UAT Failure Scenarios" and start it — Task 01 should fail (nonexistent command) and trigger the "NEEDS HELP" panel. If dismissed, Task 02 should similarly trigger a blocker for ambiguous instructions.
  9. Run `npm run clifford:clean` again to reset everything after testing.

## Task 4: Drop Non-OpenCode CLIs
- **Status**: Pending
- **Verification**:
  1. `clifford init` — no AI tool choice prompt
  2. `clifford.json` has `aiTool: "opencode"`
  3. `npm test` passes
  4. `discoverTools()` returns only OpenCode

## Task 5: Post-Init Message
- **Status**: Pending
- **Verification**:
  1. `clifford init -y` — shows OpenCode status and Architect restart prompt
  2. No references to other CLI tools

## Task 6: Loading Spinner
- **Status**: Pending
- **Verification**:
  1. Press `S` — spinner appears immediately in header
  2. Transitions to running status when first task starts
  3. On startup failure, spinner stops and error shown

## Task 7: Strip Emoji Titles
- **Status**: Pending
- **Verification**:
  1. Sprint with emoji name shows clean title in list
  2. Manifest data unchanged

---

## Final Sprint Approval
- [ ] All tasks verified
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] Manual UAT passed

# Sprint 8 UAT: Polish & Stability

## Prerequisites
- All tests in `clifford-sandbox` directory
- Clean state: `npm run clifford:clean && npm run clifford:init`
- Copy test sprints: `npm run copy:sprints`

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
- **Status**: Pending
- **Verification**:
  1. Start failure sprint — agent fails on a task
  2. UI shows halt message, chat input auto-focuses
  3. Type response, Enter — ASM written, sprint restarts with guidance
  4. Test Escape — sprint stays stopped

## Task 3: UAT Test Fixtures
- **Status**: Pending
- **Verification**:
  1. `npm run copy:sprints` copies sprints to `.clifford/sprints/`
  2. Happy-path sprint completes all tasks
  3. Failure sprint triggers halt & help

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

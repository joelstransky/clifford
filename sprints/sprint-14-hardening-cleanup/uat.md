# Sprint 14 — Hardening & Cleanup: UAT

## Task 1: Entropy Cleanup

### What Changed
Removed dead code and stale artifacts from the pre-MCP era:

- **Deleted `src/utils/skills.ts` and `src/utils/skills.test.ts`** — Stubbed skill-matching system that was never integrated. Contained mock database and unused exports (`analyzeSprintRequirements`, `fetchSkillDefinition`, `checkMissingSkills`).
- **Deleted `templates/.clifford/clifford-approve.sh`** — Obsolete shell-based approval workflow replaced by TUI.
- **Deleted `templates/.clifford/sprint-verify.sh`** — Obsolete sprint verification template.
- **Deleted `templates/.clifford/clifford-sprint.sh`** — Shell wrapper referencing non-existent `clifford sprint .` CLI command.
- **Deleted `.clifford/sprint-verify.sh`** — Local copy hardcoded to `sprint-11-modular-architecture`, broken for general use.
- **Updated `templates/.opencode/agent/Developer.md`** — Replaced reference to `.clifford/sprint-verify.sh` with `npm run build && npm test && npm run lint`.

No changes needed in `src/utils/scaffolder.ts` — it had already been cleaned up to only copy `prompt.md`.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — should pass 137 tests (down from ~141, since skills tests were removed).
3. Run `npm run lint` — should produce no new errors.
4. Run `grep -r "skills\.ts\|sprint-verify\|clifford-approve\|clifford-sprint" src/ templates/` — should return no hits.
5. Confirm the following files no longer exist:
   - `src/utils/skills.ts`
   - `src/utils/skills.test.ts`
   - `templates/.clifford/clifford-approve.sh`
   - `templates/.clifford/sprint-verify.sh`
   - `templates/.clifford/clifford-sprint.sh`
   - `.clifford/sprint-verify.sh`
6. Confirm `templates/.opencode/agent/Developer.md` line 11 now references `npm run build && npm test && npm run lint` instead of `.clifford/sprint-verify.sh`.

## Task 2: Sprint Approval in TUI

### What Changed
Added `[A]pprove` hotkey to the TUI task view for completing a sprint, replacing the previously removed `clifford-approve.sh` shell script:

- **`src/tui/DashboardController.ts`**:
  - Added `canSprintApprove(): boolean` — computed getter that returns `true` only when all tasks are `completed` or `pushed`, the sprint is not already `completed`, and the runner is not running.
  - Added `approveSprint(): void` — guards on `viewMode === 'tasks'`, runner not running, and `canSprintApprove()`. Writes `manifest.status = "completed"` to disk, logs a success message, and refreshes the manifest.
- **`src/tui/Dashboard.ts`**:
  - Wired the `a` key to call `ctrl.approveSprint()` in the keyboard handler.
  - Updated footer hotkey hints: shows `[A]pprove` when `canSprintApprove()` is true, `[S]tart` when `canSprintStart()` is true, or just `[←] Back` otherwise.
- **`src/tui/DashboardController.test.ts`**:
  - Added 10 new tests in a `sprint approval` describe block covering `canSprintApprove()` and `approveSprint()` edge cases (no manifest, running, pending tasks, all completed, already completed, empty tasks, filesystem write, viewMode guard, running guard, and filesystem error handling).

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 147 tests pass, including 10 new sprint approval tests.
3. Launch TUI (`npm run dev -- tui`), navigate to a sprint with all tasks completed/pushed. Verify `[A]pprove` appears in the footer instead of `[S]tart`.
4. Press `A`. Verify the sprint's `manifest.json` status updates to `"completed"` and the activity log shows `"Sprint approved: {name}"`.
5. Verify `[A]pprove` does NOT appear when:
   - Tasks are still pending or active.
   - A sprint is currently running.
    - The sprint is already marked as completed.

## Task 3: MCP Status Indicator

### What Changed
Added a color-coded MCP status label to the Activity tab's status pane, giving the user visibility into whether the MCP server is active:

- **`src/tui/DashboardController.ts`**:
  - Added `mcpStatus` getter returning `'idle' | 'running' | 'error'`. Maps directly from `isRunning` — when the agent process is running, MCP is running (since the MCP server lifecycle is tied to the OpenCode process). The `error` state is reserved for future MCP communication failure detection.
- **`src/tui/components.ts`**:
  - Added `infoMcpText: Renderable` to the `ActivityViewComponents` interface.
  - Created a new `TextRenderable` (`id: 'info-mcp'`) and added it to the `statusRow`.
  - Increased `statusRow` height from 7 to 9 to accommodate the fifth line of text.
  - Included `infoMcpText` in the return object.
- **`src/tui/Dashboard.ts`**:
  - Destructured `infoMcpText` from `createActivityView()`.
  - In the running branch of `updateDisplay()`: renders `MCP: RUNNING` in green (`COLORS.success`), or `MCP: ERROR` in red (`COLORS.error`), or `MCP: IDLE` in gray (`COLORS.dim`).
  - In the idle branch: renders `MCP: IDLE` in gray.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 147 tests pass.
3. Launch TUI (`npm run dev -- tui`), switch to the Activity tab. Verify "MCP: IDLE" appears in the status pane in gray.
4. Start a sprint. Verify "MCP: RUNNING" appears in green.
5. Stop the sprint. Verify it returns to "MCP: IDLE" in gray.

## Task 4: UI Tweaks — Title Rendering, Border Gap, Process Color

### What Changed
Fixed three visual issues in the Activity tab of the TUI:

- **Panel title scroll overlap**: Wrapped both the ACTIVITY and PROCESS OUTPUT header `TextRenderable`s in fixed-height `BoxRenderable` containers (`height: 1, flexShrink: 0`). This prevents the `ScrollBoxRenderable` siblings (which use `flexGrow: 1`) from collapsing the headers when content overflows. Changed in `src/tui/components.ts` — `createActivityView()`.
- **Blue border gap**: Added explicit `gap: 0` to the `activityPanel` `BoxRenderable` to eliminate any default spacing between the status row's blue border and the panel edges. Changed in `src/tui/components.ts` — `createActivityView()`.
- **Process output title color**: Changed the PROCESS OUTPUT header color from `COLORS.dim` (`#565f89`) to `COLORS.text` (`#c0caf5`) for better readability, matching the visibility level of the ACTIVITY header. Changed in `src/tui/components.ts` — `createActivityView()`.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 147 tests pass.
3. Launch TUI (`npm run dev -- tui`), switch to the Activity tab.
4. Start a sprint that produces enough output to scroll the process pane.
5. Scroll up in the process pane — verify the "PROCESS OUTPUT" title stays fixed at the top and is NOT covered by scrolling text.
6. Same check for the "ACTIVITY" title — it should remain visible above scrolling content.
7. Verify the blue border on the status row touches the edges of the activity panel with no visible black gap.
8. Verify "PROCESS OUTPUT" title is clearly visible (bright text, not dim gray).


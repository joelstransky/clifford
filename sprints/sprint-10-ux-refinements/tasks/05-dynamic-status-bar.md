# Task 5: Dynamic Status Bar — Reflect Current Runner Activity

## Context

The footer's left side currently shows a static `STATUS: Ready` that never changes (except during the quit confirmation). It should dynamically reflect what the sprint runner is doing at any moment, giving the user real-time awareness without needing to switch tabs.

## Status States

| Condition | Status Text | Color |
|-----------|------------|-------|
| No sprint running, idle | `Ready` | `COLORS.success` (green) |
| Sprint starting (spinner active) | `Starting...` | `COLORS.warning` (yellow) |
| Task executing | `Running: {taskId}` | `COLORS.warning` (yellow) |
| Blocked / needs help | `Blocked: {taskId}` | `COLORS.error` (red) |
| Sprint just completed (all tasks done) | `Sprint Complete` | `COLORS.success` (green) |
| Quit pending (existing) | `Press Q again to quit` | `COLORS.warning` (yellow) |

## Step-by-Step

1. **Create an `updateStatusBar()` helper** that determines and sets the status text based on current state. Place it near `updateHeaderStatus()`:

   ```ts
   const updateStatusBar = () => {
     if (quitPending) return; // Don't overwrite quit confirmation

     const isRunning = runner.getIsRunning();
     const completed = manifest ? manifest.tasks.filter(t => t.status === 'completed' || t.status === 'pushed').length : 0;
     const total = manifest ? manifest.tasks.length : 0;

     if (activeBlocker) {
       statusText.content = t`${fg(COLORS.error)(`Blocked: ${activeBlocker.task || 'Unknown'}`)}`;
     } else if (spinnerInterval) {
       statusText.content = t`${fg(COLORS.warning)('Starting...')}`;
     } else if (isRunning && activeTaskId) {
       statusText.content = t`${fg(COLORS.warning)(`Running: ${activeTaskId}`)}`;
     } else if (!isRunning && completed === total && total > 0) {
       statusText.content = t`${fg(COLORS.success)('Sprint Complete')}`;
     } else {
       statusText.content = t`${fg(COLORS.success)('Ready')}`;
     }
   };
   ```

2. **Call `updateStatusBar()` from `updateDisplay()`.** Add it near the top alongside `updateHeaderStatus()`:
   ```ts
   updateHeaderStatus();
   updateStatusBar();
   ```

3. **Call `updateStatusBar()` from the spinner tick.** In `startSpinner()`, the interval callback currently only calls `updateHeaderStatus()`. Add `updateStatusBar()` as well so the status bar shows "Starting..." while the spinner is active.

4. **Update `cancelQuit()` to trigger a status refresh** instead of hardcoding `STATUS: Ready`. Replace the hardcoded status restoration in the quit timer callback and the `cancelQuit()` callers:
   ```ts
   const cancelQuit = () => {
     quitPending = false;
     if (quitTimer) {
       clearTimeout(quitTimer);
       quitTimer = null;
     }
     updateStatusBar(); // Refresh to show actual current state
   };
   ```
   Also update the quit timer callback (~line 940):
   ```ts
   quitTimer = setTimeout(() => {
     cancelQuit();
   }, 3000);
   ```
   And remove the explicit `statusText.content = ...` lines that follow `cancelQuit()` calls elsewhere in the keypress handler — `cancelQuit()` now handles this internally.

5. **Remove all other hardcoded `statusText.content = ...` assignments** outside of `updateStatusBar()` and the quit confirmation. Search for `statusText.content` and ensure only `updateStatusBar()` and the quit-pending `Q` handler set it.

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- Idle state: status bar shows `Ready` in green.
- Press `S` to start: status bar shows `Starting...` in yellow during spinner.
- Task begins executing: status bar shows `Running: task-1` in yellow.
- Blocker triggers: status bar shows `Blocked: task-1` in red.
- Sprint finishes all tasks: status bar shows `Sprint Complete` in green.
- Press `Q`: status bar shows `Press Q again to quit` in yellow for 3 seconds, then reverts to the correct current state (not hardcoded `Ready`).

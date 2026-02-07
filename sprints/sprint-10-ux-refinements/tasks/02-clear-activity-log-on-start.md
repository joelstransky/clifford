# Task 2: Clear Activity Log on User-Initiated Sprint Start Only

## Context

The activity log accumulates entries across multiple sprint runs, making it noisy and hard to follow. It should clear when the user explicitly presses `S` to start a sprint. However, when the runner auto-restarts after a blocker resolution (halt recovery), the log should NOT be cleared — the user needs to see the blocker history and recovery messages.

## Step-by-Step

1. **Clear the log in the `S` key handler.** Find the `S` key handler in the global keypress section (~line 1086):
   ```ts
   if (key.name === 's') {
     if (viewMode === 'tasks' && !runner.getIsRunning()) {
       runner.setSprintDir(currentSprintDir);
       addLog(`Starting sprint: ${manifest?.name || currentSprintDir}`, 'warning');
       runner.run().catch(err => { ... });
     }
   }
   ```
   Add a log clear BEFORE the `addLog('Starting sprint...')` call:
   ```ts
   if (key.name === 's') {
     if (viewMode === 'tasks' && !runner.getIsRunning()) {
       // Clear activity log for fresh user-initiated run
       logs = [];
       updateActivityLog();
       
       runner.setSprintDir(currentSprintDir);
       addLog(`Starting sprint: ${manifest?.name || currentSprintDir}`, 'warning');
       runner.run().catch(err => { ... });
     }
   }
   ```

2. **Do NOT clear the log in any other path.** Specifically, do not clear in:
   - `runner.on('start')` — this fires for both user-initiated and halt-restart runs
   - `bridge.on('resolve')` auto-restart path (~line 207–212)
   - The blocker Enter key handler restart path (~line 986–997)

3. **That's it.** This is a surgical change. The only user-initiated sprint start is the `S` key handler. All other `runner.run()` calls are halt-recovery restarts and should preserve the log.

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- Press `S` to start a sprint: activity log clears and shows only the new "Starting sprint..." message.
- Trigger a blocker, respond, sprint auto-restarts: activity log retains all previous entries including the blocker messages.
- Start a second sprint after the first completes: log clears again on the `S` press.

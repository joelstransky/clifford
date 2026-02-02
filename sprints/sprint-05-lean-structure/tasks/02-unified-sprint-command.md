# Task 02: Unified TUI Sprint Command

## Title
Merge `tui` into `sprint` command and add runner controls.

## Context
Having separate `clifford sprint` and `clifford tui` commands is redundant and confusing. We want a single entry point: `clifford sprint`. This command should launch the TUI immediately but NOT begin executing the agent automatically. The user will use the dashboard to manually start, pause, or stop the sprint execution.

## Step-by-Step

1. **Modify `src/index.ts`**:
   - Remove the `program.command('tui')` definition entirely.
   - Update `program.command('sprint')` to:
     - Accept an optional `[sprint-dir]`.
     - Initialize `CommsBridge`.
     - Initialize `SprintRunner` but do NOT call `runner.run()` yet.
     - Call `launchDashboard(dir, bridge, runner)`.

2. **Refactor `src/tui/Dashboard.ts`**:
   - Update `launchDashboard` to accept the `SprintRunner` instance.
   - Add a "Runner Control" section to the UI or update the footer.
   - Implement "Start" functionality (Keyboard shortcut `S`):
     - When pressed, it triggers `runner.run()` in the background.
     - Update the UI status from "Ready" to "Running".
   - Implement "Stop/Pause" functionality:
     - Provide a way to signal the runner to stop after the current task or abort.

3. **Update `src/utils/sprint.ts`**:
   - Ensure the `SprintRunner` is built to be "Toggleable". It should be able to wait for a start signal or be triggered by the bridge.

4. **Cleanup CLI Help**:
   - Ensure `clifford --help` correctly reflects that `sprint` is the primary dashboard command.

## Verification
- Run `clifford sprint` (with or without a dir).
- Confirm the TUI launches but the "ACTIVITY LOG" remains idle (no agent invoked).
- Press `S` (or the defined Start key).
- Confirm the agent is invoked and progress appears in the log.
- Verify `clifford tui` no longer exists as a command.

# Task 02: Manual Start Wiring

## Title
Decouple the SprintRunner from auto-execution and wire it to the TUI.

## Context
The TUI should serve as a control panel, not just a monitor. It must launch in an "Idle" state and wait for a user command to start the sprint.

## Step-by-Step
1.  **Modify `src/tui/Dashboard.ts`**:
    - Update signature to accept `runner: SprintRunner`.
    - **Crucial**: Ensure the dashboard does NOT call `runner.run()` on init.
    - Add a temporary key listener (e.g., 's') or a simple "Press 's' to start" log in the dashboard footer to trigger `runner.run()`.
2.  **Modify `src/utils/sprint.ts`**:
    - Ensure `SprintRunner` can be instantiated without running. (This should already be true, but verify).
    - Ensure `runner.run()` checks if it's already running to prevent double-starts.

## Verification
1.  Run `npx clifford`.
2.  Verify TUI opens but the "Activity Log" is empty/idle.
3.  Press 's'.
4.  Verify the sprint starts and logs begin to appear.

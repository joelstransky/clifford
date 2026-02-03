# Task 02: TUI Task Play Buttons

## Title
Add visual "Play" indicators to pending tasks in the TUI.

## Context
The user wants a visual indication that pending tasks are ready to be executed.
- Each incomplete (pending) task should have a small play button `[▶]` next to it.
- If the sprint is currently running, these buttons should be visually disabled/dimmed to indicate that manual triggering is locked out.

## Step-by-Step
1.  **Modify `src/tui/Dashboard.ts`**:
    - Locate the `updateTaskList` function.
    - Logic for rendering the task list item:
        - Get the current runner state (`runner.getIsRunning()`).
        - If task status is `pending`:
            - If `!isRunning`: Append a green/bright `[▶]` to the right of the task ID/Status.
            - If `isRunning`: Append a dimmed `[▶]` or `[-]` to indicate it's queued/disabled.
        - Ensure "completed" tasks do not show the play button.

2.  **Visual Polish**:
    - Ensure the alignment is clean (maybe right-aligned in the box).

## Verification
1.  Run `clifford` (idle state).
2.  Observe pending tasks have a `[▶]` icon.
3.  Press `S` to start.
4.  Observe the `[▶]` icons become dimmed or disappear while the sprint is active.

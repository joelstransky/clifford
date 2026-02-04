# Task 03: Sprint Start/Stop Control with Mutual Exclusion

## Context
Users need to start and stop sprints from the TUI. Only one sprint can run at a time to prevent conflicts.

## Requirements
- `S` key starts the currently viewed sprint (only from task view)
- `X` key stops a running sprint
- While a sprint is running:
  - Other sprints cannot be started (show warning if attempted)
  - Running sprint shows a visual indicator (e.g., `🔄`)
  - Non-running sprints appear dimmed in the list
- Header shows which sprint/task is currently running
- Footer hints update based on running state
- May need to add a `stop()` method to `SprintRunner`

## Verification
1. Navigate to a sprint, press `S` — sprint starts with visual indicators
2. Try to start another sprint — blocked with warning
3. Press `X` — sprint stops, UI returns to idle
4. Can now start a different sprint

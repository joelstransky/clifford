# Task 06: Loading Spinner on Sprint Start

## Context
There's a noticeable delay between pressing `S` and the UI updating to show the running sprint. Users need immediate visual feedback.

## Requirements
- When `S` is pressed and the sprint begins starting, immediately show a spinner animation on the right side of the header bar (where the status text currently shows `[Idle]`, `[Running]`, etc.)
- Use a text-based spinner (e.g., cycling through `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` or `|/-\`)
- The spinner should run on a short interval (e.g., 80-100ms)
- Stop the spinner and transition to the normal running status display when the runner emits its first `task-start` event
- If the runner errors out before emitting `task-start`, stop the spinner and show the error state

## Verification
1. Press `S` — spinner immediately appears in the header
2. After a few seconds, spinner transitions to `[Running: task-01]`
3. If sprint fails to start, spinner stops and error is shown

# Task 04: Chat Input Field

## Context
Users need a text input field for interacting with the system. This will also be used for responding to blockers (Task 06).

## Requirements
- Persistent input field at the bottom of the UI (above or replacing footer)
- `/` key focuses the input field
- When focused:
  - Typing appends to the input
  - `Backspace` deletes characters
  - `Enter` submits the message to the activity log as `[You] {message}`
  - `Escape` clears and unfocuses without submitting
- When unfocused, normal hotkeys work
- Visual distinction between focused and unfocused states (brightness, cursor)
- Footer hints update based on focus state

## Verification
1. Launch TUI — input field visible at bottom
2. Press `/` — input focuses with visual feedback
3. Type and press `Enter` — message appears in activity log
4. Press `Esc` — input clears and unfocuses
5. Hotkeys work when unfocused

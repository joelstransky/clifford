# Task 07: Strip Emojis from Sprint Titles in Sprint List

## Context
Sprint names in manifests sometimes contain emoji characters that clutter the sprint list view.

## Requirements
- In the sprint list view (`updateSprintList`), strip any emoji/unicode symbol characters from the sprint `name` before rendering
- This is display-only — do not modify the manifest data
- Use a regex to remove emoji ranges (e.g., `\p{Emoji}` or equivalent)

## Verification
1. Create a sprint with emojis in the name (e.g., "🚀 My Sprint")
2. Launch TUI — sprint list shows "My Sprint" without the emoji
3. Navigate into the sprint — the detail header can still show the original name if desired

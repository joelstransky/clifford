# Task 02: Append Timestamp

## Context
Verify the agent can modify existing files.

## Requirements
- Open `uat-output/hello.txt` (created in Task 01).
- Append a new line with the text: `Completed at: <current ISO timestamp>`
  - Example: `Completed at: 2025-01-15T10:30:00.000Z`
- Do not overwrite the existing content.

## Verification
1. Confirm `uat-output/hello.txt` still starts with `Hello from Clifford!`.
2. Confirm a second line starting with `Completed at:` exists.
3. Mark this task as `completed` in the manifest.

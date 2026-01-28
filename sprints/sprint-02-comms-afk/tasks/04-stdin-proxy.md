# Task 04: STDIN/STDOUT Proxying & Prompt Detection

## Title
Implement interactive prompt detection in the Sprint Loop.

## Context
When a child agent (like OpenCode) requires human input or permissions (e.g., "Permission required: external_directory"), the `SprintRunner` must detect this state to avoid hanging.

## Step-by-Step
1.  Update `src/utils/sprint.ts` to use `spawn` instead of `exec` for agent execution.
2.  Pipe `stdout` and `stderr` from the child process.
3.  Implement a "Prompt Matcher":
    - Watch for strings like `Permission required:`, `Confirm? (y/n)`, `[y/N]`, or `Input:`.
4.  When a match is found:
    - Emit a `blocked` event via the `CommsBridge`.
    - Pause the execution loop.
    - Capture the prompt text for delivery to the user.

## Verification
- Run a dummy script that asks for a y/n confirmation.
- Verify that the `SprintRunner` identifies the prompt and logs it to the bridge without timing out.

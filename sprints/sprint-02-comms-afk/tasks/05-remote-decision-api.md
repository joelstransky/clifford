# Task 05: Remote Decision API

## Title
Enable bidirectional communication for resolving blockers.

## Context
Once a blocker is detected, the user needs a way to send a response back into the agent's input stream.

## Step-by-Step
1.  Update `src/utils/bridge.ts` to include a response listener (e.g., a simple file-watcher or a socket listener).
2.  Implement `bridge.resolveBlocker(response: string)`:
    - This should write the `response` string to the `stdin` of the currently active child process.
    - Append a newline to simulate pressing "Enter".
3.  Expose an endpoint or CLI command `clifford resolve "[response]"` to trigger this.

## Verification
- Run a "Blocked" sprint loop.
- Use a separate terminal to run `clifford resolve "y"`.
- Verify the sprint loop receives the input and continues processing.

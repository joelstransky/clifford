# Task 02: Integrated Blocker Handling

## Title
Implement TUI-native blocker intervention.

## Context
The TUI should be the primary interface for resolving ASM blockers without needing external tools like Thunder Client.

## Step-by-Step
1. Connect the `CommsBridge` events to the TUI state.
2. When a `blocked` event occurs, shift the TUI focus to an interactive input field.
3. Capture user typing and submission directly within the TUI.
4. On submission:
   - Call the ASM storage utilities to save the guidance.
   - Signal the `SprintRunner` to terminate the current agent and restart the task loop.

## Verification
- Run a sprint in the TUI that hits a blocker.
- Verify the input field appears and that typing into it resolves the block and restarts the agent.

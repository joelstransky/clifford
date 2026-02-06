# Task 02: Halt & Call for Help

## Context
When a task stops unexpectedly — the agent exits without completing, exits with a non-zero code, or hits a blocker — the user needs to know what happened and have a way to provide guidance so the sprint can continue.

## Requirements
- Detect all halt scenarios:
  - CommsBridge `block` event (existing blocker flow)
  - Agent exits with non-zero code
  - Agent exits with code 0 but task is still `pending` (no progress made)
- On any halt:
  - Show a clear activity log message explaining what happened (e.g., "Agent exited without completing task-01", "Agent crashed with exit code 1")
  - Auto-focus the chat input field
  - Display a prompt in the UI indicating the system needs help
- When the user types a response and presses Enter:
  - Save the response to ASM storage via `saveMemory(taskId, { question, answer })`
  - Automatically restart the sprint — the existing `[HUMAN_GUIDANCE]` injection will feed the answer back in
- Unify the existing blocker UI and this new unexpected-exit flow into a single "needs help" UX pattern
- If the user presses Escape instead, cancel and leave the sprint stopped

## Verification
1. Start a sprint with a task that will fail (see Task 03 for test fixtures)
2. Agent exits without completing — UI shows halt message, chat input focuses
3. Type a response, press Enter — ASM is written, sprint restarts with guidance
4. Press Escape instead — sprint stays stopped, no ASM written

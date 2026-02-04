# Task 06: Interactive Blocker Resolution via Chat Input

## Context
When the runner encounters a blocker, the system should pause, prompt the user via the chat input, save the response to ASM, and restart the sprint with guidance injected.

## Requirements
- On `block` event from `CommsBridge`:
  - Pause/stop the runner
  - Display blocker UI (existing) with the question
  - Auto-focus the chat input with a distinct visual (e.g., red prompt `🛑 >`)
- When user submits response via `Enter`:
  - Save to ASM using `saveMemory(taskId, { question, answer })`
  - Clear blocker state
  - Automatically restart the sprint (existing ASM injection in `SprintRunner` handles guidance)
  - Log the flow in activity log
- `Escape` cancels the blocker response and stops the sprint
- ASM entry should be cleared when the task completes (existing behavior)

## Verification
1. Start a sprint that triggers a blocker
2. Runner pauses, blocker UI appears, chat input auto-focuses with red prompt
3. Type response, press `Enter`
4. Check `.clifford/asm.json` — contains the memory entry
5. Sprint restarts automatically
6. Logs show guidance injection (`🧠 Injected human guidance...`)
7. On task success, ASM entry is cleared
8. Test `Esc` — cancels blocker, stops sprint

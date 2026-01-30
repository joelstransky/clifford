# Task 08: Memory Lifecycle

## Title
Implement ASM memory cleanup.

## Context
Memories are session-specific and task-specific. Once a task is completed, its associated memory should be cleared to prevent context pollution in future runs.

## Step-by-Step
1. Update the loop logic in `src/utils/sprint.ts`.
2. After a task is successfully marked as `completed` in the manifest, trigger a `clearMemory(taskId)` call.
3. Verify that the `asm.json` file is updated and the entry for that task is removed.

## Verification
- Run a sprint that completes a task which previously had a memory.
- Check `asm.json` after the sprint and verify the memory for that task has been deleted.

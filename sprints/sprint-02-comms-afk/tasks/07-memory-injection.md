# Task 07: Memory Injection

## Title
Inject human guidance into agent prompts via ASM.

## Context
When an agent is restarted after a blocker, it must be informed of the previous context and the human's response to maintain continuity in Workflow A.

## Step-by-Step
1. Update `src/utils/sprint.ts` within the `SprintRunner.run()` method.
2. Before invoking the agent, check the ASM storage for any memories associated with the current task ID.
3. If a memory exists, format it into a `HUMAN_GUIDANCE` block.
4. Append this block to the agent's prompt instructions.
   - Example:
     ```text
     [HUMAN_GUIDANCE]
     On a previous attempt, you hit a blocker: "[Question]"
     The human has provided the following guidance: "[Answer]"
     Proceed with this information.
     ```

## Verification
- Run a sprint where a memory exists in `asm.json`.
- Log the final prompt being sent to the agent and verify the guidance block is included.

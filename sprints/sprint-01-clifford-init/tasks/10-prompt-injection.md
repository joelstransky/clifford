# Task 10: Integrate Prompt Injection in SprintRunner

## Context
The JavaScript `SprintRunner` is the primary engine for executing sprints. Currently, it lacks the logic to read the instructions from `.clifford/prompt.md` and pass them to the underlying AI agent (e.g., OpenCode). Without this context, the agent will not know how to interact with the manifest and tasks.

## Step-by-Step
1.  **Modify `src/utils/sprint.ts`**:
    - Update the `run()` method (or the specific agent invocation logic).
    - Implement logic to read the contents of `.clifford/prompt.md` relative to the project root.
    - When spawning/executing the AI agent command, append the prompt content to the arguments.
2.  **Refine Agent Invocation**:
    - Ensure the command follows the syntax: `opencode run --agent developer --model [model] "[PROMPT_CONTENT]"`.
3.  **Cross-Platform Path Handling**:
    - Use `path.join` and `fs.readFileSync` to ensure the prompt is read correctly on both Windows and Linux.
4.  **Simplify `templates/.clifford/clifford-sprint.sh`**:
    - Update the template to act as a thin wrapper that calls `clifford sprint .` rather than re-implementing the loop logic in Bash.

## Verification
- Initialize a sandbox using `clifford init`.
- Create a test task (e.g., the "Clifford Identity Card" task).
- Run `clifford sprint sprints/sprint-01`.
- Verify the agent correctly receives the instructions from `prompt.md`, creates the requested file, and updates the manifest. status to `completed`.


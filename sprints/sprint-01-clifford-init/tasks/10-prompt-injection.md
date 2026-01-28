# Task 10: Integrate Prompt Injection in Clifford Loop

## Context
The `clifford-sprint.sh` script is the core loop that invokes the agent. Currently, it invokes the agent without passing the specific instructions contained in `.clifford/prompt.md`. Without these instructions, the agent (e.g., OpenCode) lacks the context to find and execute tasks from the manifest.

## Step-by-Step
1.  **Modify `templates/.clifford/clifford-sprint.sh`**:
    - Update the agent invocation logic (specifically the `opencode` call).
    - It should read the contents of `.clifford/prompt.md` and pass it as the primary prompt to the agent.
    - Example: `opencode run --agent developer "$(cat .clifford/prompt.md)"`.
2.  **Update `src/utils/sprint.ts`**:
    - Ensure that when Clifford executes a sprint (internally or via shell), it provides the context from the local `.clifford/prompt.md` if available.
3.  **Cross-Platform Check**:
    - Ensure the shell script uses a compatible way to read the file (e.g., `cat` is generally safe in bash environments, but consider how this translates to the runner's environment).

## Verification
- Initialize a sandbox using `clifford init`.
- Add a task to the manifest.
- Run `.clifford/clifford-sprint.sh`.
- Verify the agent actually receives the instructions and modifies the project files (e.g., creating the `haiku.txt` as in the UAT case).

# Task 08: User Acceptance Testing (UAT)

## Title
End-to-End User Acceptance Testing for Clifford Core.

## Context
Before considering the Clifford foundation "Complete," we must verify that all core mechanics (CLI, Discovery, and the Sprint Loop) work together from a user's perspective.

## Step-by-Step
1.  **Global Registration**:
    - In the Clifford root directory, run `npm run build` to ensure the latest code is compiled.
    - Run `npm link` to make the `clifford` command available globally.
2.  **Sandbox Creation**:
    - Navigate to a directory *outside* the Clifford codebase (e.g., `cd ..`).
    - Create a sandbox directory: `mkdir clifford-sandbox && cd clifford-sandbox`.
3.  **Project Initialization**:
    - Run `clifford discover` to verify OpenCode (or other agents) are detected via the new filesystem-based discovery.
    - Run `clifford init`. 
    - Follow the prompts to select your workflow and AI tool.
    - **Verify Scaffolding**: Ensure the following were created in the sandbox:
        - `.clifford/` (containing `config.json` and `prompt.md`).
        - `.opencode/agent/` (containing `Architect.md` and `Developer.md`).
        - `sprints/sprint-01/` (containing an initial `manifest.json`).
4.  **Sandbox Execution**:
    - Run `clifford hello`.
    - Create a test task in the newly scaffolded `sprints/sprint-01/tasks/01-test.md`.
    - Update the scaffolded `manifest.json` to include this task.
    - Run `clifford sprint sprints/sprint-01`.
5.  **Status & Work Integrity Check**:
    - Open the `manifest.json` in the sandbox.
    - **Verify Physical Results**: Look at the files in the sandbox. Did the agent actually perform the actions described in the task (e.g., did it create the file or edit the text)?
    - **Verify Manifest Sync**:
        - If the work is physically done, the manifest should be `completed`.
        - If the work is *not* done (or only partially done), the manifest must NOT be `completed`.
    - If the manifest says `completed` but the files haven't changed, this is a "False Success" failure.
6.  **Isolation Verification**:
    - Confirm the original `clifford` source directory remains untouched.

## Verification
- CLI functions correctly outside its own `node_modules` context.
- Path resolution for manifests and tasks works using relative paths in a clean environment.
- **Integrity**: Task status in `manifest.json` accurately reflects the outcome of the agent's work. A terminated or rejected process must not result in a "Completed" status.
- The `SprintRunner` successfully initializes and processes the sandbox manifest.

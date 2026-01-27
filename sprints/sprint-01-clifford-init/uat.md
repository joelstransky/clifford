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
3.  **Environment Scaffolding**:
    - Create a test sprint folder: `mkdir -p sprints/test-sprint/tasks`.
    - Create a dummy task: `echo "# Test Task" > sprints/test-sprint/tasks/01-test.md`.
    - Create a `manifest.json` in `sprints/test-sprint/`:
      ```json
      {
        "id": "test-sprint",
        "name": "Sandbox Verification",
        "status": "active",
        "tasks": [
          { "id": "task-01", "file": "tasks/01-test.md", "status": "pending" }
        ]
      }
      ```
4.  **Sandbox Execution**:
    - Run `clifford hello` and `clifford discover` from the sandbox root.
    - Run `clifford sprint sprints/test-sprint`.
5.  **Isolation Verification**:
    - Verify the sandbox `manifest.json` shows the intended side effects.
    - Confirm the original `clifford` source directory remains untouched.

## Verification
- CLI functions correctly outside its own `node_modules` context.
- Path resolution for manifests and tasks works using relative paths in a clean environment.
- The `SprintRunner` successfully initializes and processes the sandbox manifest.

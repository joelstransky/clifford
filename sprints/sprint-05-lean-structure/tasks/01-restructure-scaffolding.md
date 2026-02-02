# Task 01: Lean Project Structure Scaffolding

## Title
Refactor scaffolding to remove app logic from project repo and consolidate structure.

## Context
Currently, `clifford init` copies application scripts (`sprint-verify.sh`, `prompt.md`, etc.) into the user's `.clifford` directory. This creates redundancy and maintenance issues. We want to move toward a "Lean" structure where:
1. Application logic remains in the global Clifford cache (`_npx` or `/cache`).
2. The `sprints/` folder is housed inside `.clifford/`.
3. Project configuration is unified in a `clifford.json` file in the project root.

## Step-by-Step

1. **Modify `src/utils/scaffolder.ts`**:
   - Update the directory creation logic to create `.clifford/sprints` instead of a root `sprints/` folder.
   - Remove the code that copies `sprint-verify.sh`, `prompt.md`, and other "app" scripts from the templates to the local `.clifford` folder.
   - Update the configuration writer to save to `./clifford.json` (root) instead of `./.clifford/config.json`.

2. **Update `src/utils/sprint.ts` (SprintRunner)**:
   - Update the path resolution logic to look for sprints in `.clifford/sprints/`.
   - Update the prompt loader to look for the base `prompt.md` in the CLI's own `templates` directory (using `__dirname` or relative to the executable) rather than the local project directory.
   - Update the verification gate logic to execute the `sprint-verify.sh` directly from the CLI's `templates` folder.

3. **Update `src/index.ts`**:
   - Update `findActiveSprintDir` to search within `.clifford/sprints/`.
   - Update all commands that read configuration to look for `clifford.json` in the project root.

4. **Update `templates` structure (if necessary)**:
   - Ensure the `templates/` folder in the source is organized to support this "read-from-source" behavior.

## Verification
- Run `clifford init --yolo` in the sandbox.
- Confirm that NO scripts (`.sh` or `.md`) were copied into `.clifford/`.
- Confirm that `clifford.json` exists in the project root.
- Confirm that the `sprints/` folder is located at `.clifford/sprints/`.
- Run `clifford sprint .clifford/sprints/sprint-01` and ensure it still finds the instructions and verification scripts from the global cache.

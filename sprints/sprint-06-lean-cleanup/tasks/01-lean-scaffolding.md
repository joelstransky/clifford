# Task 03: Lean Scaffolding & Structure

## Title
Refactor project structure to be "Lean": Move sprints to .clifford/sprints and consolidate config.

## Context
The user wants a cleaner project root and `.clifford` directory.
1.  The `.clifford` directory should only contain `prompt.md` and `sprints/`.
2.  `sprints/` should be moved from the project root to `.clifford/sprints/`.
3.  Configuration should be consolidated into `clifford.json` (absorbing `.clifford/config.json`).
4.  Helper scripts (like `sprint-verify.sh`) should NOT be copied to the user's project but executed from the CLI package.

## Step-by-Step

1.  **Modify `src/utils/scaffolder.ts`**:
    - Stop copying `sprint-verify.sh`, `.opencode`, etc., into `.clifford`.
    - Ensure `prompt.md` IS created/copied into `.clifford/prompt.md`.
    - Change sprint directory creation to `.clifford/sprints/`.
    - Stop creating `.clifford/config.json`. Ensure `clifford.json` contains all necessary config (workflow, aiTool, extraGates).

2.  **Modify `src/utils/sprint.ts` (SprintRunner)**:
    - Update `discoverSprints()` and `findActiveSprintDir()` to look in `.clifford/sprints/`.
    - Update verification logic:
        - Instead of running `./.clifford/sprint-verify.sh`, find the script in the CLI's installation directory (`__dirname/../../templates/.clifford/sprint-verify.sh` or similar) and execute it.
    - Update `prompt.md` loading to look in `.clifford/prompt.md` (this remains local).

3.  **Modify `src/index.ts`**:
    - Ensure `findActiveSprintDir` looks in `.clifford/sprints`.
    - Update `init` command to save all config to `clifford.json`.

## Verification
1.  Run `npm run clifford:clean`.
2.  Run `clifford init -y`.
3.  **Check Filesystem**:
    - `clifford.json` exists in root.
    - `.clifford/config.json` does NOT exist.
    - `.clifford/sprints/` exists.
    - `sprints/` (in root) does NOT exist.
    - `.clifford/sprint-verify.sh` does NOT exist.
    - `.clifford/prompt.md` exists.
4.  **Check Execution**:
    - Run `clifford`.
    - Verify it finds the sprint in the new location.
    - Verify it runs the verification script successfully (from the CLI package).

# Task 01: Root Command & Validation

## Title
Refactor CLI to use the root `clifford` command as the entry point.

## Context
We are simplifying the CLI. `clifford sprint` and `clifford tui` are being deprecated in favor of a single `clifford` command. This command must validate the environment before launching the TUI.

## Step-by-Step
1.  **Modify `src/index.ts`**:
    - Remove `.command('sprint')`.
    - Remove `.command('tui')`.
    - Add a default action to the root `program`:
      ```typescript
      program.action(async () => {
        // Implementation
      });
      ```
2.  **Implement Validation Logic**:
    - Check for `clifford.json` in `process.cwd()`.
    - If missing:
      - Console log: "⚠️  Clifford is not initialized. Run `npx clifford init` to get started."
      - Exit with code 1.
3.  **Implement Launch Logic**:
    - If valid, resolve the active sprint directory (using `findActiveSprintDir`).
    - Initialize `CommsBridge` and `SprintRunner`.
    - Call `launchDashboard(sprintDir, bridge, runner)`.

## Verification
1.  Run `npx clifford` in a clean directory -> Verify error message.
2.  Run `npx clifford` in an initialized directory -> Verify TUI launches (it might crash or auto-start until Task 02 is done, that's expected for this atomic step).
3.  Verify `clifford sprint` and `clifford tui` no longer exist in `--help`.

# Task 05: CLI Integration & Verification

## Title
Wire up the `clifford tui` command and verify end-to-end functionality.

## Context
With the dashboard rebuilt and blocker UI working, we need to ensure the CLI command properly initializes everything and that the full workflow functions correctly. This task also includes cleanup of any remaining cruft from previous attempts.

## Step-by-Step

1. **Simplify the `tui` command** in `src/index.ts`:
   ```typescript
   program
     .command('tui [sprint-dir]')
     .description('Launch the Clifford TUI Dashboard')
     .action(async (sprintDir) => {
       const dir = sprintDir || findActiveSprintDir();
       const { launchDashboard } = await import('./tui/Dashboard.js');
       await launchDashboard(dir);
     });
   ```

2. **Implement `findActiveSprintDir()` helper**:
   - Use `SprintRunner.discoverSprints()` to find all sprints
   - Return the path of the first sprint with status `active`
   - Fall back to `sprints/sprint-01` or prompt the user if none active

3. **Wire up CommsBridge for full workflow**:
   - When running a sprint via TUI, create a CommsBridge instance
   - Pass it to both `launchDashboard()` and `SprintRunner`
   - Ensure blocker events flow correctly between them

4. **Remove dead code**:
   - Delete `src/scm-loader.mjs` if it still exists
   - Remove any unused imports or functions
   - Clean up any TODO comments referencing Node.js workarounds

5. **Update the build process**:
   - Ensure `bun run build` produces a working `dist/index.js`
   - Test `bun run start` uses the built output correctly
   - Verify the `bin` entry in `package.json` works: `bunx clifford tui`

6. **End-to-end verification**:
   - Run `bun run dev tui` with no arguments (should auto-detect active sprint)
   - Run `bun run dev tui sprints/sprint-03-bun-opentui` (explicit path)
   - Verify the dashboard renders correctly
   - Verify manifest changes are detected and displayed
   - Verify keyboard navigation works (if implemented)
   - Verify quit (`Q`) cleanly exits

7. **Update UAT documentation**:
   - Document the verification steps in `uat.md`
   - Include screenshots or descriptions of expected behavior

## Verification
- `bun run build` completes without errors
- `bun run dev tui` launches the dashboard
- The dashboard correctly displays the active sprint
- Quitting with `Q` cleanly exits without terminal corruption
- No orphaned processes or resource leaks

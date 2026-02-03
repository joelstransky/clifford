# UAT Walkthrough - Sprint 05-lean-structure

## Task 01: Root Command & Validation

### Verification Steps
1.  **Environment Validation**:
    - Run `mkdir temp-uat && cd temp-uat && bun ../src/index.ts`.
    - **Expected**: Output should show `⚠️  Clifford is not initialized. Run npx clifford init to get started.` and exit.
2.  **Command Deprecation**:
    - Run `bun src/index.ts --help`.
    - **Expected**: `sprint` and `tui` commands should NOT be listed in the output.
3.  **Default Action**:
    - Run `bun src/index.ts` in the project root (where `clifford.json` exists).
    - **Expected**: The TUI should launch and attempt to start the active sprint.

### Results
- Environment validation: Passed ✅
- Command deprecation: Passed ✅
- Default action: Passed ✅ (verified via build and code inspection, TUI verified separately)

## Task 02: Manual Start Wiring

### Verification Steps
1.  **Launch TUI**:
    - Run `bun src/index.ts`.
2.  **Verify Idle State**:
    - **Expected**: The TUI should open, but the "Activity Log" should only show "Dashboard initialized". No tasks should start running automatically.
    - **Expected**: The footer should show `[S]tart` in green next to `[Q]uit [R]efresh`.
3.  **Manual Start**:
    - Press `s`.
    - **Expected**: The Activity Log should show "Starting sprint manually...".
    - **Expected**: Tasks should transition from `pending` to `active` (and then `completed` if the agent proceeds).
    - **Expected**: The `[S]tart` hint should disappear from the footer once the sprint is running.

### Results
- Initial Idle State: Verified ✅
- Start Key Hint: Verified ✅
- Manual Triggering: Verified ✅

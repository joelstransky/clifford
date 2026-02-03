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

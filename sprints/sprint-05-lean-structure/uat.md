# Sprint 5 UAT: CLI Simplification & Control Panel

## 📋 UAT Instructions

**Prerequisites**:
- All tests must be performed in the `clifford-sandbox` directory.
- Start with a clean state for every full run: `npm run clifford:clean && npm run clifford:init`.

### 1. [Task-01] Root Command & Validation
- **Status**: ⏳ Pending
- **Scenario A: Uninitialized Project**
  1. Navigate to `clifford-sandbox`.
  2. Delete `clifford.json`: `rm clifford.json`.
  3. Run the CLI: `node ../clifford/dist/index.js`.
  4. **Expected**: Error message "⚠️ Clifford is not initialized. Run `npx clifford init` to get started." and exit code 1.
- **Scenario B: Initialized Project**
  1. Restore/Run init: `node ../clifford/dist/index.js init -y`.
  2. Run the CLI: `node ../clifford/dist/index.js`.
  3. **Expected**: The TUI Dashboard launches.
- **Scenario C: Deprecated Commands**
  1. Run `node ../clifford/dist/index.js sprint`.
  2. **Expected**: Error indicating `sprint` is not a known command (or help output).
  3. Run `node ../clifford/dist/index.js tui`.
  4. **Expected**: Error indicating `tui` is not a known command.

### 2. [Task-02] Manual Start Wiring
- **Status**: ⏳ Pending
- **Scenario**:
  1. Run `node ../clifford/dist/index.js` in the initialized sandbox.
  2. **Expected**: TUI launches, but the "Activity Log" is **IDLE**. The agent should NOT start automatically.
  3. Press `s` (or the configured start key).
  4. **Expected**: The Sprint Runner starts, and logs begin to appear in the Activity Log.

---
**Final Sprint Approval**: [ ]

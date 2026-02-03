# Sprint 6 UAT: Lean Cleanup

## 📋 UAT Instructions

**Prerequisites**:
- All tests must be performed in the `clifford-sandbox` directory.
- Start with a clean state for every full run: `npm run clifford:clean && npm run clifford:init`.

### 1. [Task-01] Lean Scaffolding & Structure
- **Status**: ✅ Completed
- **Verification**:
  1. Run `npm run clifford:clean` in `clifford-sandbox` (or via `../clifford`).
  2. Run `node ../clifford/dist/index.js init -y`.
  3. **Check Filesystem**:
     - Verify `clifford.json` exists in the sandbox root.
     - Verify `.clifford/config.json` does NOT exist.
     - Verify `.clifford/sprints/` exists.
     - Verify `sprints/` (in root) does NOT exist.
     - Verify `.clifford/sprint-verify.sh` does NOT exist.
     - Verify `.clifford/prompt.md` exists.
  4. **Check Execution**:
     - Copy sprints (if necessary for test) to `.clifford/sprints/`.
     - Run `node ../clifford/dist/index.js`.
     - Verify it finds the active sprint in `.clifford/sprints`.

### 2. [Task-02] TUI Task Play Buttons
- **Status**: ✅ Completed
- **Verification**:
  1. Launch the TUI: `npm start` (or `npm run dev`).
  2. Look at the Task List in the left panel.
  3. **Expected**: Pending tasks should have a bright green `[▶]` icon aligned to the right.
  4. Start the sprint (press `S`).
  5. **Expected**: While the sprint is running, the `[▶]` icons should appear dimmed.

---
**Final Sprint Approval**: [ ]

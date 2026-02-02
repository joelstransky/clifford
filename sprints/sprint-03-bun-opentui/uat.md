# Sprint 3 UAT: Bun Migration & OpenTUI Dashboard

## Overview
This sprint migrates Clifford from Node.js to Bun and rebuilds the TUI dashboard using native OpenTUI support.

---

## UAT Instructions

### 1. Bun Runtime Verification
- Run `bun --version` to confirm Bun is installed.
- Run `bun run dev hello` - should print "Hello from Clifford!"
- Run `bun test` - all tests should pass.
- **Expected**: No `node` or `ts-node` usage anywhere.

### 2. Dashboard Launch
- Run `bun run dev tui sprints/sprint-03-bun-opentui`
- **Expected**: A clean OpenTUI-based dashboard opens with two panels.
- Verify the left panel shows the sprint plan with task statuses.
- Verify the right panel shows an activity log.

### 3. Manifest Polling
- With the TUI running, manually edit `manifest.json` to change a task status.
- **Expected**: The TUI updates within 1-2 seconds to reflect the change.

### 4. Keyboard Navigation
- Press `R` to refresh.
- Press `Q` to quit.
- **Expected**: Quit cleanly exits without terminal corruption.

### 5. Blocker Intervention (if testable)
- Trigger a blocker event (via CommsBridge or mock).
- **Expected**: Right panel transforms into blocker input view.
- Type a response and press Enter.
- **Expected**: Blocker resolves, Activity Log returns.

---

## Task Sign-off

### [Task-01] Bun Migration
- **Status**: Complete
- **Human Sign-off**: [ ]

#### Verification Steps:
1. **Verify Bun is installed**: Run `bun --version` - should display Bun version 1.x or later
2. **Test hello command**: Run `bun run dev hello` - should print "Hello from Clifford!"
3. **Test discover command**: Run `bun run dev discover` - should list available AI CLI engines
4. **Run tests**: Run `bun test` - all tests should pass (4 test files)
5. **Verify no Node dependencies**: Check `package.json` devDependencies:
   - `ts-node` should NOT be present
   - `ts-jest` should NOT be present  
   - `jest` should NOT be present
   - `bun-types` SHOULD be present
6. **Check shebang**: Open `src/index.ts` - first line should be `#!/usr/bin/env bun`
7. **Verify scm-loader removed**: Confirm `scm-loader.mjs` no longer exists in project root
8. **Verify tsconfig**: Check `tsconfig.json` has `"types": ["bun-types"]`

#### Changes Made:
- Updated `package.json` scripts to use Bun: `bun build`, `bun run`, `bun test`
- Removed Node-specific devDependencies: ts-node, ts-jest, jest, @types/jest, @types/node
- Added `bun-types` to devDependencies
- Updated `tsconfig.json` with `"types": ["bun-types"]`
- Changed shebang from `#!/usr/bin/env node` to `#!/usr/bin/env bun`
- Removed `scm-loader.mjs` (Node.js workaround for OpenTUI)
- Removed Bun polyfill code from `src/index.ts`
- Simplified TUI command (removed Node.js respawning logic)
- Converted all test files from Jest to Bun's test runner
- Removed `jest.config.cjs`

### [Task-02] Clean OpenTUI Integration  
- **Status**: Complete
- **Human Sign-off**: [ ]

#### Verification Steps:
1. **Verify no Node.js fallback in Dashboard**: Open `src/tui/Dashboard.ts` and confirm:
   - No `try/catch` block around `createCliRenderer()`
   - No `console.log` based fallback rendering loop
   - Dashboard assumes OpenTUI always works
2. **Verify no Bun polyfills**: Run `grep -r "globalThis.Bun" src/` - should return no results
3. **Verify no IS_NODE_FALLBACK**: Run `grep -r "IS_NODE_FALLBACK" src/` - should return no results
4. **Verify no optionalDependencies**: Check `package.json` - `optionalDependencies` section should not exist
5. **Run TypeScript check**: Run `npx tsc --noEmit` - should pass with no errors
6. **Run linting**: Run `npx eslint src/**/*.ts` - should pass with no errors
7. **Test TUI command**: Run `bun run dev tui sprints/sprint-03-bun-opentui` - OpenTUI should initialize without fallback messages

#### Changes Made:
- Removed fallback CLI monitoring mode from `src/tui/Dashboard.ts` (the `console.log` based rendering)
- Removed `try/catch` around `createCliRenderer()` - now directly assigns renderer
- Removed `optionalDependencies` section from `package.json` (contained `@opentui/core-win32-x64`)
- Codebase now treats Bun + OpenTUI as the only supported runtime

### [Task-03] Dashboard Layout
- **Status**: Complete
- **Human Sign-off**: [ ]

#### Verification Steps:
1. **Launch Dashboard**: Run `bun run dev tui sprints/sprint-03-bun-opentui`. (Note: Ensure Bun is installed in your environment)
2. **Verify Layout**:
   - Header: Should show "CLIFFORD v1.0.0" and current sprint status.
   - Left Panel: Should show "SPRINT PLAN", the sprint name, description, a list of tasks with icons, and a progress bar.
   - Right Panel: Should show "ACTIVITY LOG" with a scrollable list of timestamps and messages.
   - Footer: Should show "STATUS: Ready" and hotkeys "[Q]uit [R]efresh".
3. **Verify Icons**:
   - Task 01 & 02 should have ✅ icons.
   - Task 03 should have 🔄 icon (since it's active in manifest).
   - Tasks 04 & 05 should have ⏳ icons.
4. **Test Manifest Polling**:
   - Keep the TUI running.
   - In another terminal, edit `sprints/sprint-03-bun-opentui/manifest.json`.
   - Change Task 03 status to "completed" and Task 04 to "active".
   - **Expected**: Within 1 second, the TUI should reflect these changes:
     - Task 03 icon changes to ✅.
     - Task 04 icon changes to 🔄.
     - A new log entry appears in the Activity Log: `🔄 task-04: pending → active`.
5. **Test Hotkeys**:
   - Press `R`: Should see "Manual refresh" in the log.
   - Press `Q`: Should exit the TUI cleanly.

#### Changes Made:
- Rewrote `src/tui/Dashboard.ts` from scratch with a modular structure.
- Implemented split-screen layout using OpenTUI `BoxRenderable` and `ScrollBoxRenderable`.
- Added manifest polling every 1000ms.
- Implemented task status icons and progress bar calculation.
- Added activity log with timestamped messages.
- Styled header, footer, and panels with consistent color scheme.
- Fixed a type error where `setContent` was used instead of `content` on `TextRenderable`.
- Removed (temporarily) the blocker UI logic to keep the task tightly scoped (it will be re-added/refined in Task 04).

### [Task-04] Blocker Intervention UI
- **Status**: Complete
- **Human Sign-off**: [ ]

#### Verification Steps:
1. **Launch Dashboard**: Run `bun run dev tui sprints/sprint-03-bun-opentui`.
2. **Trigger Mock Blocker**:
   - In another terminal, you can use the `CommsBridge` to trigger a block.
   - Since Task 05 wires up the bridge, for now, you can verify the code in `src/tui/Dashboard.ts` handles the `block` event from the bridge if one is passed.
   - To manually test, you can temporarily modify `Dashboard.ts` to set `activeBlocker` on startup.
3. **Verify Blocker UI**:
   - When a blocker is active, the Right Panel should transform:
     - Header changes to "🛑 BLOCKER DETECTED" (Red).
     - Displays Task ID, Reason, and the Question from the agent.
     - A text input box appears with a blinking cursor (█).
     - Footer hotkeys change to "[Enter] Submit [Esc] Cancel".
4. **Test Input Handling**:
   - Type some text - characters should appear in the input box.
   - Press Backspace - should delete the last character.
   - Press Escape - should cancel the blocker view and return to Activity Log.
   - Press Enter - should call `bridge.resolveBlocker(input)` and return to Activity Log.
5. **Verify Clean Exit**: Press `Q` (when not in blocker mode) or `Ctrl+C` to exit.

#### Changes Made:
- Added `CommsBridge` support to `launchDashboard` signature.
- Implemented bridge event listeners for `block` and `resolve`.
- Added dynamic right panel switching between Activity Log and Blocker UI.
- Implemented manual text input handling (keystrokes, backspace, cursor) using `KeyEvent`.
- Added specific styling for the blocker interface (Red headers, warning-colored questions).
- Updated footer hotkeys to be mode-aware.
- Fixed a bug where `Ctrl+C` might not exit correctly by handling it manually in the keypress listener.

### [Task-05] CLI Integration & Verification
- **Status**: Complete
- **Human Sign-off**: [ ]

#### Verification Steps:
1. **Verify `tui` auto-detection**: Run `bun run dev tui` without any arguments.
   - It should automatically find the active sprint (`sprint-03-bun-opentui`) and launch the dashboard.
2. **Verify `tui` with explicit path**: Run `bun run dev tui sprints/sprint-03-bun-opentui`.
   - It should launch the dashboard for the specified sprint.
3. **Verify Full Workflow Wiring**:
   - The `tui` command now starts the `SprintRunner` in the background.
   - Look at the Activity Log - you should see the sprint loop starting.
   - If there are pending tasks, the agent should start working.
4. **Verify Blocker Flow**:
   - If the agent hits a blocker (or detects an interactive prompt), the TUI should switch to the Blocker UI automatically.
   - You should be able to type a response and press Enter to resolve it.
5. **Verify Build**: Run `bun run build`.
   - It should produce a working `dist/index.js` using Bun's native bundler.
6. **Verify Binary**: Run `bun run start tui`.
   - It should work identically to the `dev` command but using the compiled output.
7. **Verify Clean Exit**: Press `Q` to quit. The terminal should be restored correctly.

#### Changes Made:
- Simplified the `tui` command in `src/index.ts` to use `findActiveSprintDir()`.
- Implemented `findActiveSprintDir()` to auto-detect the first sprint with status "active".
- Wired up `CommsBridge` so that the `tui` command creates a shared bridge between the Dashboard and the `SprintRunner`.
- Updated `SprintRunner` to accept an optional pre-existing `CommsBridge`.
- The `tui` command now launches the sprint loop in the background, making it a true "single command" dashboard.
- Removed dead code references and verified the build process with Bun.
- Fixed pre-existing test failures in `asm-storage.test.ts` by using `fs.rmSync(path, { force: true })`.

---

## Final Sprint Approval
- [ ] All tasks completed and verified
- [ ] No Node.js workarounds remain in codebase
- [ ] TUI launches and functions correctly under Bun
- [ ] Clean quit without terminal corruption

**Human Sign-off**: [ ]

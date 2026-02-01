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
- **Status**: Pending
- **Human Sign-off**: [ ]

### [Task-04] Blocker Intervention UI
- **Status**: Pending
- **Human Sign-off**: [ ]

### [Task-05] CLI Integration & Verification
- **Status**: Pending
- **Human Sign-off**: [ ]

---

## Final Sprint Approval
- [ ] All tasks completed and verified
- [ ] No Node.js workarounds remain in codebase
- [ ] TUI launches and functions correctly under Bun
- [ ] Clean quit without terminal corruption

**Human Sign-off**: [ ]

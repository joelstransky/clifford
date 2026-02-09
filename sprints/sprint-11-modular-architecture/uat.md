# UAT Walkthrough - Sprint 11

## Task 01: Dashboard Controller Extraction

### Description
Extracted the monolithic state management, manifest polling, timer logic, spinner control, sprint runner/bridge event wiring, navigation, and blocker input handling from `Dashboard.ts` into a new `DashboardController.ts` class. The Dashboard now instantiates the controller, subscribes to its events (`state-changed`, `log-added`, `tab-changed`, `quit-confirmed`, `blocker-active`, `blocker-cleared`), and focuses purely on UI rendering.

### What Changed
- **New file**: `src/tui/DashboardController.ts` — EventEmitter-based controller owning all dashboard state and business logic.
- **Modified**: `src/tui/Dashboard.ts` — Refactored to import and use `DashboardController`. All state variables, intervals, and event wiring removed from the function body. The TUI now reads state from `ctrl.*` properties and delegates actions to `ctrl.navigateUp()`, `ctrl.startSprint()`, `ctrl.handleBlockerSubmit()`, etc.

### Verification Steps
1. **Launch the TUI**: Run `npm run dev tui` (or the equivalent command to start the dashboard).
2. **Sprint Discovery**: Verify sprints are listed correctly on the SPRINTS tab (controller runs `discoverSprints()` in `init()`).
3. **Navigation**: Use ↑↓ to select sprints, → to drill into tasks, ← to go back. All navigation should work as before.
4. **Start a Sprint**: Press `S` on a sprint with pending tasks. Verify:
   - The spinner animation appears briefly in the header.
   - The Activity tab is auto-switched to.
   - Logs from the runner appear in real-time.
   - The elapsed timer increments every second.
   - The progress bar updates as tasks complete.
5. **Stop a Sprint**: Press `X` while running. Verify the runner stops and the status returns to "Ready".
6. **Blocker UI**: If a blocker is triggered, verify the "Needs Help" panel appears with the question. Type a response and press Enter to verify submission works.
7. **Quit**: Press `Q` twice to quit. Verify the first press shows a "Press Q again to quit" message, and the second press exits.
8. **Tab Switching**: Press `Tab` to toggle between SPRINTS and ACTIVITY panels. Verify the tab bar highlights correctly.
9. **Code Inspection**: Open `src/tui/DashboardController.ts` and confirm it contains all state variables, polling logic, timer logic, and sprint runner event handlers. Open `src/tui/Dashboard.ts` and confirm it only contains UI rendering code and controller event subscriptions.

## Task 02: Triple-Row Activity Layout

### Description
Refactored the Activity tab from a single mixed log view into a triple-row layout that clearly separates sprint status information, Clifford's high-level events, and raw agent process output. The blocker (Help) screen now replaces only the lower two rows while the status row remains visible at the top.

### What Changed
- **Modified**: `src/tui/DashboardController.ts`
  - Added `LogChannel` type (`'activity' | 'process'`) and `channel` property to `LogEntry`.
  - Added separate buffers: `activityLogs` (Clifford events) and `processLogs` (raw stdout/stderr).
  - Updated `addLog()` to accept a `channel` parameter, routing entries to the appropriate buffer.
  - Runner `output` events now route to `'process'` channel; all other logs route to `'activity'`.
  - `startSprint()` clears all three buffers on fresh runs.
- **Modified**: `src/tui/Dashboard.ts`
  - Replaced the old activity panel layout with three distinct rows:
    1. **Status Row** (top, fixed height 5, dark `titleBg` background): Sprint name, active task, elapsed timer, progress bar. Always visible.
    2. **Activity Row** (middle, scrollable, `flexGrow: 1`): Shows Clifford events (task started, blocker detected, status transitions). Header: "ACTIVITY".
    3. **Process Row** (bottom, scrollable, `flexGrow: 1`): Shows raw stdout/stderr from the agent. Header: "PROCESS OUTPUT".
  - Extracted `renderLogEntries()` helper to DRY up log rendering for both activity and process containers.
  - Blocker UI now removes `activity-row` and `process-row` (keeping `status-row`) and adds `blockerContainer` in their place.
  - `log-added` event handler now routes updates to the correct panel based on `entry.channel`.

### Verification Steps
1. **Launch the TUI**: Run `npm run dev tui`.
2. **Switch to Activity Tab**: Press `Tab` to switch to the ACTIVITY panel.
3. **Verify Triple-Row Layout**:
   - **Top**: A dark status bar should be visible with Sprint, Task, Elapsed, and Progress fields. When no sprint is running, it shows "No sprint running".
   - **Middle**: An "ACTIVITY" section showing Clifford events (e.g., "Dashboard initialized", task transitions).
   - **Bottom**: A "PROCESS OUTPUT" section — empty until a sprint runs.
4. **Start a Sprint**: Navigate back to SPRINTS, select a sprint, drill in, press `S`.
5. **Verify Log Separation**:
   - The **Activity** section should show high-level events: "Starting sprint: ...", task status changes ("⏳ task-1: pending → active"), completion events.
   - The **Process Output** section should show raw agent output (lines prefixed with `>`), including agent thinking, bash commands, and tool output.
   - The **Status Row** should show the running sprint name, active task ID, incrementing elapsed timer, and updating progress bar.
6. **Verify Blocker Behavior**: If a blocker is triggered:
   - The Status Row should remain at the top showing sprint info.
   - The Activity and Process rows should be replaced by the "🛑 NEEDS HELP" blocker UI.
   - Dismissing or resolving the blocker should restore the Activity and Process rows.
7. **Verify Stop/Complete**: Press `X` to stop a sprint. The status row should clear to "No sprint running". Logs should be preserved in both sections.
8. **Code Inspection**:
   - Open `src/tui/DashboardController.ts`: Confirm `LogEntry` has a `channel` field, `activityLogs` and `processLogs` arrays exist, `addLog()` routes by channel.
   - Open `src/tui/Dashboard.ts`: Confirm `statusRow`, `activityRow`, `processRow` are separate containers within `activityPanel`. Confirm `renderLogEntries()` is the shared helper.

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

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

## Task 03: UI Component Factory

### Description
Extracted all inline UI widget construction from `Dashboard.ts` into a dedicated `src/tui/components.ts` module containing factory functions for each major UI section. `Dashboard.ts` now imports and calls these factories, keeping itself focused solely on wiring controller events to UI updates and handling keyboard input. State-aware constraints are implemented: sprint list items are dimmed and locked when another sprint is running.

### What Changed
- **New file**: `src/tui/components.ts` — Contains:
  - **Shared types**: `OpenTuiModule`, `Renderable`, `Renderer` interfaces for type-safe factory signatures.
  - **Theme constants**: `COLORS` (Tokyo Night palette) and `STATUS_COLORS` (task status → color mapping).
  - **Utility helpers**: `formatTime()`, `generateProgressBar()`, `clearTracked()` for removing tracked child elements.
  - **Factory functions**:
    1. `createHeader()` → Header bar with title and sprint status badge.
    2. `createTabBar()` → Tab selector with SPRINTS/ACTIVITY tabs and change callback.
    3. `createSprintListView()` → Left panel with sprint name, description, task list container, and progress bar.
    4. `createTaskListRenderer()` → Returns `renderSprintItems()` and `renderTaskItems()` helpers that dynamically populate the task list container with tracked elements.
    5. `createActivityView()` → Activity panel with 3-row split (status row, activity log, process log) and blocker overlay.
    6. `createFooter()` → Footer bar with status text and hotkey hints.
  - **Shared helper**: `renderLogEntries()` — Renders log entries into a container with timestamped, color-coded lines.
- **Modified**: `src/tui/Dashboard.ts` — Replaced all inline `BoxRenderable`/`TextRenderable` construction with imports from `components.ts`. The file now:
  - Assembles the OpenTUI module object once and passes it to all factories.
  - Destructures factory return values to get references to dynamic text elements.
  - Contains only panel swap logic, controller event subscriptions, render update functions, and keyboard input handling.
- **State-Aware Constraints**: In `renderSprintItems()`, sprint items are dimmed (`dim()` styling) and show a 🔒 indicator when another sprint is actively running, preventing visual confusion about which sprint is actionable.

### Verification Steps
1. **Launch the TUI**: Run `bun run dev tui` or `npm run dev tui`.
2. **Verify Visual Parity**: All UI elements should render identically to before — header with version, tab bar, sprint list, task list, footer with hotkeys.
3. **Sprint Navigation**: Use ↑↓ to navigate sprints, → to drill into tasks, ← to go back. Verify all transitions render correctly.
4. **Tab Switching**: Press `Tab` to toggle between SPRINTS and ACTIVITY tabs. Verify both panels render correctly.
5. **Start a Sprint**: Press `S` on a sprint with pending tasks. Verify:
   - Activity tab displays properly with all three rows.
   - Logs appear in the correct sections (activity vs process).
   - Progress bar and timer update in the status row.
6. **State-Aware Locking**: While a sprint is running, navigate back to SPRINTS tab. Verify:
   - The running sprint shows a 🔄 indicator.
   - Other sprints appear dimmed with a 🔒 indicator.
   - The running sprint is highlighted when selected.
7. **Stop Sprint**: Press `X` to stop. Verify dimming/locking is removed from sprint items.
8. **Keyboard Navigation**: Verify all hotkeys work correctly through the componentized structure: `Q` (double-press quit), `R` (refresh), `S` (start), `X` (stop), `Tab` (switch tabs), arrows.
9. **Code Inspection**:
   - Open `src/tui/components.ts`: Confirm all 6 factory functions exist with proper TypeScript interfaces.
   - Open `src/tui/Dashboard.ts`: Confirm it imports all factories from `./components.js` and contains NO inline `new BoxRenderable(...)` or `new TextRenderable(...)` calls (except the root container and main panel which are structural).
    - Verify `COLORS`, `STATUS_COLORS`, `generateProgressBar`, `clearTracked`, and `renderLogEntries` are all defined in `components.ts`, not `Dashboard.ts`.

## Task 04: Instruction Reinforcement

### Description
Bolstered the developer agent prompt files with explicit, prominent instructions ensuring the agent always updates `manifest.json` and `uat.md` before exiting. Added a dedicated "Mandatory Exit Protocol" section to all three instruction surfaces: the Clifford template prompt (`templates/.clifford/prompt.md`), the BigRed development prompt (`.bigred/prompt.md`), and the project-level agent guidelines (`AGENTS.md`).

### What Changed
- **Modified**: `templates/.clifford/prompt.md` — Completely restructured. Added:
  - Step 3 "Mark Active" in the Instructions list.
  - Steps 6-9 covering verification, commit, UAT documentation, and manifest completion.
  - A new **"Mandatory Exit Protocol"** section with three bolded, imperative rules about manifest updates, `uat.md` documentation, and never exiting without state updates.
  - Updated "If You Get Stuck" section to include explicitly setting task status to `blocked`.
- **Modified**: `.bigred/prompt.md` — Restructured to match the Clifford template. Added:
  - Step 3 "Mark Active" in the Instructions list.
  - Steps 7-8 covering UAT documentation and manifest updates.
  - The same **"Mandatory Exit Protocol"** section with the three imperative rules.
- **Modified**: `AGENTS.md` — Enhanced the "Task Lifecycle" section:
  - Added explicit step 2 "Activation" for marking tasks active before beginning.
  - Added a new **"Mandatory Exit Protocol"** subsection under Agent Workflow Guidelines with the three bolded rules.

### Verification Steps
1. **Open `templates/.clifford/prompt.md`**: Confirm it contains:
   - A numbered Instructions list with 9 steps (including Mark Active, Verify, Commit, Document, Update State).
   - A "Mandatory Exit Protocol" section with three bolded imperatives starting with "You MUST..." / "NEVER...".
   - The "If You Get Stuck" section includes setting status to `blocked`.
2. **Open `.bigred/prompt.md`**: Confirm it contains:
   - An Instructions list with 8 numbered steps including "Mark Active" (step 3) and "Document" (step 7).
   - The same "Mandatory Exit Protocol" section with identical three imperative rules.
3. **Open `AGENTS.md`**: Confirm:
   - The "Task Lifecycle" section has 6 steps (including Activation at step 2).
   - A new "Mandatory Exit Protocol" subsection exists directly after "Task Lifecycle" with the three bolded rules.
4. **Consistency Check**: Verify the three critical phrases appear in ALL three files:
   - "You MUST update the task status to `completed` in `manifest.json` immediately after finishing a task."
   - "You MUST document your work and verification in `uat.md`."
   - "NEVER exit without updating the manifest if work was performed."
5. **Scaffold Test**: Run `npx clifford init` in a test directory and verify the scaffolded `.clifford/prompt.md` contains the Mandatory Exit Protocol section.

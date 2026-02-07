# Sprint 09 — UI Redo: UAT Walkthrough

## Task 1: Import TabSelectRenderable and Add Tab Bar Below Header

### What Changed
- Added `TabSelectRenderable` and `TabSelectRenderableEvents` to the dynamic import block in `src/tui/Dashboard.ts`.
- Added `activeTab` state variable (`'sprints' | 'activity'`) to track which tab is selected.
- Created a `TabSelectRenderable` instance with two tabs: **SPRINTS** and **ACTIVITY**.
- Placed the tab bar between the header and the main content area in the layout hierarchy (`root` → header → tabBar → main).
- Wired the `SELECTION_CHANGED` event to update `activeTab` and trigger `updateDisplay()`.
- The tab bar is **not focused** — no keyboard interaction on the tab bar itself yet (Task 4 will add that).

### Verification Steps
1. **Build**: Run `npm run build` — should compile without errors.
2. **Lint**: Run `npm run lint` — should pass with no warnings or errors.
3. **Visual Check**: Launch the dashboard (`npm run dev -- dash <sprint-dir>`):
   - A tab bar should appear between the header and the main content area.
   - Two tabs should be visible: `SPRINTS` and `ACTIVITY`.
   - The selected tab (`SPRINTS` by default) should show with **blue background** (`#7aa2f7`) and **black text**.
   - The inactive tab (`ACTIVITY`) should show with **dim text** on the dark background.
4. **No Focus Ring**: The tab bar should not have a visible focus ring or respond to keyboard input directly (keyboard wiring is Task 4).

## Task 2: Remove All Borders, Gaps, and Margins — Implement Color-Zone Separation

### What Changed
- **COLORS object** expanded with two new shades: `titleBg: '#13141c'` (darkest, for title bar) and `statusBg: '#000000'` (solid black, for status bar).
- **Header**: Removed `border: true` and `borderStyle: 'rounded'`. Background changed from `COLORS.bg` to `COLORS.titleBg` (near-black).
- **Left Panel**: Removed `border: true` and `borderStyle: 'single'`. Background changed from `COLORS.bg` to `COLORS.panelBg` (medium shade).
- **Task List Box**: Removed `border: true`, `borderStyle: 'rounded'`, `marginTop: 1`, and `padding: 1`. Now a plain layout container.
- **Progress Wrapper** (`prog-wrap`): Removed `marginTop: 1`.
- **Right Panel**: Removed `border: true` and `borderStyle: 'single'`. Kept `backgroundColor: COLORS.panelBg`.
- **Activity Scroll**: Removed `marginTop: 1`.
- **Blocker Input Box**: Removed `border: true`, `borderStyle: 'rounded'`, and `marginTop: 1`. Kept `paddingLeft: 1`.
- **Execution Task Info**: Removed `border: true`, `borderStyle: 'rounded'`, and `marginTop: 1`. Kept `padding: 1`.
- **Execution Progress Box**: Removed `marginTop: 1`.
- **Agent Output Scroll**: Removed `border: true`, `borderStyle: 'single'`, and `marginTop: 0`.
- **Chat Input Box**: Removed `border: true` and `borderStyle: 'rounded'`. Kept `backgroundColor: COLORS.bg`.
- **Footer**: Removed `border: true` and `borderStyle: 'rounded'`. Background changed from `COLORS.bg` to `COLORS.statusBg` (solid black).
- **Dynamic borderStyle line removed**: The `chatInputBox.borderStyle = ...` line in `updateDisplay()` was deleted.
- **`blockerInputBox.border = false`** line removed (no longer needed since there are no borders).

### Verification Steps
1. **Build**: Run `npm run build` — should compile without errors.
2. **Lint**: Run `npm run lint` — should pass (the `activeTab` unused-var warning is pre-existing from Task 1, not introduced here).
3. **Tests**: Run `npm test` — all tests should pass.
4. **Visual Check**: Launch the dashboard (`npm run dev -- dash <sprint-dir>`):
   - **No borders or lines** should be visible anywhere in the TUI.
   - **Title bar** (top) should appear in the darkest shade (`#13141c`).
   - **Content panels** (left and right) should appear in the medium shade (`#24283b`).
   - **Tab bar and chat input** should appear in the dark shade (`#1a1b26`).
   - **Status bar** (bottom) should appear in solid black (`#000000`).
   - **Text** should still be readable with appropriate padding from edges.
   - **No gaps or margins** between zones — visual separation is solely through background color contrast.
5. **Code Sweep**: Search `src/tui/Dashboard.ts` for `border:`, `borderStyle:`, `marginTop:`, `marginBottom:`, `marginLeft:`, `marginRight:` — none should be found.

## Task 3: Refactor Main Content to Full-Width Tab-Switched Panels

### What Changed
- **`main` container** changed from `flexDirection: 'row'` to `flexDirection: 'column'` with `overflow: 'hidden'`. This removes the old 40%/60% side-by-side split layout.
- **`leftPanel` replaced by `sprintsPanel`**: The old `leftPanel` (id: `left-panel`, 40% width) is removed. A new `sprintsPanel` (id: `sprints-panel`, 100% width, 100% height) takes its place with all the same children: header, sprint name/desc, task list, and progress bar.
- **`rightPanel` replaced by `activityPanel`**: The old `rightPanel` (id: `right-panel`, flexGrow: 1) is removed. A new `activityPanel` (id: `activity-panel`, 100% width, 100% height) takes its place. All sub-view swapping (activity log, blocker, execution) now targets `activityPanel` instead of `rightPanel`.
- **Panel swap logic added**: A `switchPanel()` function manages which panel is visible inside `main`. Only one panel is shown at a time — `sprintsPanel` or `activityPanel`.
- **Tab bar handler updated**: The `SELECTION_CHANGED` event now calls `switchPanel()` to swap the visible panel when tabs are clicked.
- **Auto-switch to ACTIVITY on blocker**: Both `bridge.on('block')` and `runner.on('halt')` now auto-switch to the ACTIVITY tab and panel when a blocker is activated, using `tabBar.setSelectedIndex(1)` and `switchPanel('activity')`.
- **Auto-switch to ACTIVITY on sprint start**: When a sprint starts executing, the view auto-switches to the ACTIVITY tab to show the execution view.
- **`v` key handler updated**: Pressing `v` to view execution now also switches to the ACTIVITY tab/panel.

### Verification Steps
1. **Build**: Run `npm run build` — should compile without errors.
2. **Lint**: Run `npm run lint` — should pass with no warnings or errors.
3. **Tests**: Run `npm test` — all 49 tests should pass.
4. **Visual Check — Default View**: Launch the dashboard (`npm run dev`):
   - The default view should show the **SPRINTS** panel at **full width** (no 40%/60% split).
   - Sprint list, sprint name, description, and progress bar should all be visible.
   - No visual remnants of the old side-by-side layout.
5. **Tab Switching**: Click or navigate to the **ACTIVITY** tab:
   - The SPRINTS panel should disappear completely.
   - The ACTIVITY panel should appear at **full width** showing the activity log.
   - Switching back to SPRINTS should restore the sprints view.
6. **Execution View**: Start a sprint with `s`:
   - The view should auto-switch to the ACTIVITY tab.
   - The execution view (task ID, file, timer, agent output) should display at full width.
7. **Blocker Auto-Switch**: If a blocker is triggered:
   - The tab should auto-switch to ACTIVITY.
   - The blocker UI (NEEDS HELP, question, input) should display at full width.
   - After resolving, the sprint should restart normally.
8. **Code Sweep**: Search `src/tui/Dashboard.ts` for `leftPanel`, `rightPanel`, `left-panel`, `right-panel` — none should be found.

## Task 4: Update Keyboard/Focus Management and updateDisplay() for New Layout

### What Changed
- **Tab key switching**: Pressing `Tab` in the global keypress handler (non-blocker, non-chat mode) toggles between `sprints` and `activity` tabs. It programmatically sets the tab bar selection and calls `switchPanel()`.
- **Navigation keys guarded by active tab**: `Up`, `Down`, `Left`, and `Right` arrow keys now only fire their sprint/task navigation logic when `activeTab === 'sprints'`. This prevents accidental sprint navigation when viewing the activity panel.
- **`updateDisplay()` is now tab-aware**:
  - Sprint panel content (sprint list, task list, progress bar) is only rebuilt when `activeTab === 'sprints'`.
  - Activity panel content (activity log, execution view) is only rebuilt when `activeTab === 'activity'`.
  - **Exception**: Blocker activation always updates regardless of active tab (it forces a switch to the activity panel).
- **Footer hotkey hints are now tab-context-aware**:
  - Blocker mode: `"Done" = resume  [Enter] Submit  [Esc] Cancel` (unchanged)
  - Chat focused: `[Enter] Send  [Esc] Cancel` (unchanged)
  - SPRINTS tab, sprints view: `[Q]uit  [Tab] Activity  [→] Select  [/] Chat`
  - SPRINTS tab, tasks view, not running: `[Q]uit  [Tab] Activity  [←] Back  [S]tart  [/] Chat`
  - SPRINTS tab, running: `[Q]uit  [Tab] Activity  [X] Stop  [V]iew  [/] Chat`
  - ACTIVITY tab, not running: `[Q]uit  [Tab] Sprints  [R]efresh  [/] Chat`
  - ACTIVITY tab, running: `[Q]uit  [Tab] Sprints  [X] Stop  [/] Chat`
- **Global shortcuts preserved**: `S` (start), `X` (stop), `V` (view execution), `/` (chat focus), `R` (refresh), and `Q` (quit) remain global — they work regardless of active tab.

### Verification Steps
1. **Build**: Run `npm run build` — should compile without errors.
2. **Lint**: Run `npm run lint` — should pass with no warnings or errors.
3. **Tests**: Run `npm test` — all 49 tests should pass.
4. **Tab Switching**: Launch the dashboard (`npm run dev`):
   - Press `Tab` to toggle between SPRINTS and ACTIVITY panels.
   - The tab bar should visually update to reflect the selected tab.
   - The panel content should swap between sprints and activity.
   - Pressing `Tab` again should switch back.
5. **Navigation Guards**: While on the ACTIVITY tab:
   - Press `Up`/`Down` — should NOT navigate the sprint list.
   - Press `Left`/`Right` — should NOT drill in/out of sprint tasks.
   - Switch back to SPRINTS tab with `Tab` — navigation should work again.
6. **Footer Hints**: Observe the footer hotkey bar:
   - On SPRINTS tab in sprints view: should show `[Tab] Activity`, `[→] Select`, `[/] Chat`.
   - On SPRINTS tab in tasks view: should show `[Tab] Activity`, `[←] Back`, `[S]tart`, `[/] Chat`.
   - On ACTIVITY tab: should show `[Tab] Sprints`, `[R]efresh`, `[/] Chat`.
   - When running on ACTIVITY tab: should show `[Tab] Sprints`, `[X] Stop`, `[/] Chat`.
7. **Global Keys**: From ACTIVITY tab:
   - Press `S` — should start a sprint if one is selected with pending tasks.
   - Press `R` — should trigger a manual refresh.
   - Press `/` — should activate chat input.
   - Press `Q` — should quit the application.
8. **Blocker Auto-Switch**: If a blocker is triggered while on SPRINTS tab:
   - The tab should auto-switch to ACTIVITY.
   - The blocker UI should display.
   - Footer should show blocker-specific hints.
9. **Chat Input**: Press `/` from either tab — chat input should activate with cursor. Press `Esc` to cancel.

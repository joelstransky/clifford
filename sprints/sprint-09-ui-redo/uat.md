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

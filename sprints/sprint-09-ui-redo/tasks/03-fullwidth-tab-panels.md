# Task 3: Refactor Main Content to Full-Width Tab-Switched Panels

## Context

The current layout puts `leftPanel` (40% width, sprints/tasks) and `rightPanel` (60% width, activity/blocker/execution) side by side in a row. We are replacing this with two full-width panels that swap in/out based on the `activeTab` state variable (set by the tab bar from Task 1).

## Step-by-Step

1. **Change the `main` container** from a row to a column layout and make it full-width:
   ```ts
   const main = new BoxRenderable(renderer, {
     id: 'main', width: '100%', flexGrow: 1, flexDirection: 'column',
     overflow: 'hidden',
   });
   ```

2. **Create `sprintsPanel`** — this replaces `leftPanel`. It takes all the children that were in `leftPanel` but is now full-width:
   ```ts
   const sprintsPanel = new BoxRenderable(renderer, {
     id: 'sprints-panel', width: '100%', height: '100%', flexDirection: 'column',
     padding: 1, backgroundColor: COLORS.panelBg,
   });
   ```
   Move these children into `sprintsPanel`:
   - `leftPanelHeader` (rename to `sprintsPanelHeader` for clarity, or keep the variable name)
   - `sprintNameText`
   - `sprintDescText`
   - `taskListBox` (containing `taskListContainer`)
   - The progress bar wrapper (`prog-wrap` + `progressText`)

3. **Create `activityPanel`** — this replaces `rightPanel`. Full-width, holds all the activity/blocker/execution content:
   ```ts
   const activityPanel = new BoxRenderable(renderer, {
     id: 'activity-panel', width: '100%', height: '100%', flexDirection: 'column',
     padding: 1, backgroundColor: COLORS.panelBg,
   });
   ```
   The three sub-views (activity log, blocker, execution) still swap in/out of `activityPanel` using the existing `currentRightView` logic. Initial children:
   - `activityHeader`
   - `activityScroll`

4. **Remove `leftPanel` and `rightPanel`** variable declarations entirely. They are replaced by `sprintsPanel` and `activityPanel`.

5. **Initial panel setup** — add the default panel to `main`:
   ```ts
   main.add(sprintsPanel);  // SPRINTS tab is active by default
   ```

6. **Implement panel swap function.** Create a helper that swaps panels based on `activeTab`:
   ```ts
   let currentPanel: 'sprints' | 'activity' = 'sprints';

   const switchPanel = (tab: 'sprints' | 'activity') => {
     if (tab === currentPanel) return;
     if (currentPanel === 'sprints') {
       main.remove('sprints-panel');
     } else {
       main.remove('activity-panel');
     }
     if (tab === 'sprints') {
       main.add(sprintsPanel);
     } else {
       main.add(activityPanel);
     }
     currentPanel = tab;
     updateDisplay();
   };
   ```

7. **Update the `SELECTION_CHANGED` handler** from Task 1 to call `switchPanel()`:
   ```ts
   tabBar.on(TabSelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
     activeTab = index === 0 ? 'sprints' : 'activity';
     switchPanel(activeTab);
   });
   ```

8. **Update `updateDisplay()`** — replace all references to `rightPanel` with `activityPanel`:
   - Where it does `rightPanel.remove(...)` / `rightPanel.add(...)` for toggling activity/blocker/execution views, change to `activityPanel.remove(...)` / `activityPanel.add(...)`.
   - The `currentRightView` state and swap logic inside `updateDisplay()` stays the same conceptually, just targeting `activityPanel` instead of `rightPanel`.

9. **Auto-switch to ACTIVITY on blocker.** In the blocker activation code (both the `bridge.on('block')` handler and the `runner.on('halt')` handler), add:
   ```ts
   activeTab = 'activity';
   tabBar.setSelectedIndex(1);
   switchPanel('activity');
   ```

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- Only one panel is visible at a time, taking 100% width.
- Default view shows SPRINTS panel with sprint list.
- Activity panel shows activity log, and switches to blocker/execution views correctly.
- Blocker activation auto-switches to ACTIVITY tab.
- No visual remnants of the old 40%/60% split layout.

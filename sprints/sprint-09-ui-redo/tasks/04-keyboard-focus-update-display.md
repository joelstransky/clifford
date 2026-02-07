# Task 4: Update Keyboard/Focus Management and updateDisplay() for New Layout

## Context

The keyboard handler needs to support tab switching without conflicting with sprint navigation, chat input, and blocker mode. The `updateDisplay()` function needs to be tab-aware — only updating the visible panel. The TabSelect is NOT focused; we drive it programmatically.

## Step-by-Step

### Keyboard Changes

1. **Tab switching via `Tab` key.** In the global keypress handler (the `else` block for non-blocker, non-chat mode, starting ~line 899), add Tab key support:
   ```ts
   if (key.name === 'tab') {
     const newTab = activeTab === 'sprints' ? 'activity' : 'sprints';
     activeTab = newTab;
     tabBar.setSelectedIndex(newTab === 'sprints' ? 0 : 1);
     switchPanel(newTab);
     return;
   }
   ```
   Place this BEFORE the existing `Up`/`Down`/`Left`/`Right` handlers.

2. **Guard navigation keys by active tab.** The existing `Up`, `Down`, `Right`, `Left` handlers for sprint/task navigation should only fire when `activeTab === 'sprints'`:
   ```ts
   if (key.name === 'up') {
     if (activeTab === 'sprints' && viewMode === 'sprints') {
       selectedIndex = Math.max(0, selectedIndex - 1);
       updateDisplay();
     }
   } else if (key.name === 'down') {
     if (activeTab === 'sprints' && viewMode === 'sprints') {
       selectedIndex = Math.min(allSprints.length - 1, selectedIndex + 1);
       updateDisplay();
     }
   } else if (key.name === 'right') {
     if (activeTab === 'sprints' && viewMode === 'sprints' && allSprints[selectedIndex]) {
       // ... existing drill-in logic
     }
   } else if (key.name === 'left') {
     if (activeTab === 'sprints' && viewMode === 'tasks') {
       // ... existing back-out logic
     }
   }
   ```

3. **`S` (start), `X` (stop), `V` (view execution)** remain global — they work regardless of active tab. No changes needed.

4. **`/` (chat focus)** remains global. No changes needed.

5. **`R` (refresh)** remains global. No changes needed.

### updateDisplay() Changes

6. **Only update visible panel content.** Wrap the sprint/task update logic in an `activeTab` guard:
   ```ts
   // Only rebuild sprints panel content when it's visible
   if (activeTab === 'sprints') {
     if (isSprintsView) {
       // ... existing sprint list update logic
     } else {
       // ... existing task list update logic
     }
   }
   ```

7. **Only update activity panel content when visible:**
   ```ts
   if (activeTab === 'activity') {
     // ... existing right panel toggle logic (activity/blocker/execution)
   }
   ```
   Exception: blocker activation should ALWAYS update regardless of tab (it forces a switch to activity).

8. **Update footer hotkey hints** to include the tab switch hint. Replace the hotkey text building with tab-aware hints:
   - When in blocker mode: keep existing `[Enter] Submit  [Esc] Cancel` (no change)
   - When chatFocused: keep existing `[Enter] Send  [Esc] Cancel` (no change)
   - When on SPRINTS tab, sprints view: `[Q]uit  [Tab] Activity  [→] Select  [/] Chat`
   - When on SPRINTS tab, tasks view, not running: `[Q]uit  [Tab] Activity  [←] Back  [S]tart  [/] Chat`
   - When on SPRINTS tab, running: `[Q]uit  [Tab] Activity  [X] Stop  [V]iew  [/] Chat`
   - When on ACTIVITY tab, not running: `[Q]uit  [Tab] Sprints  [R]efresh  [/] Chat`
   - When on ACTIVITY tab, running: `[Q]uit  [Tab] Sprints  [X] Stop  [/] Chat`

9. **Header status** (`updateHeaderStatus()`) is tab-independent — no changes needed.

10. **Manifest polling** (`loadManifest()`) is tab-independent — no changes needed. It should still poll even when viewing the activity tab (so status header stays current).

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- Pressing `Tab` toggles between SPRINTS and ACTIVITY panels.
- Up/Down/Left/Right only work on SPRINTS tab for sprint navigation.
- `S`, `X`, `V`, `/`, `R`, `Q` work globally regardless of tab.
- Footer hotkeys update to reflect the current tab context.
- Blocker activation switches to ACTIVITY tab automatically.
- Chat input (`/`) works from both tabs.

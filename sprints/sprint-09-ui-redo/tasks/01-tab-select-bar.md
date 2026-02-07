# Task 1: Import TabSelectRenderable and Add Tab Bar Below Header

## Context

The current Dashboard uses a fixed 40%/60% side-by-side panel layout. We are replacing this with a full-width tab-based navigation using OpenTUI's `TabSelectRenderable`. This task adds the tab bar component itself — wiring it into the layout and state. Subsequent tasks will refactor the content panels to match.

## Step-by-Step

1. **Add imports** in `src/tui/Dashboard.ts`. The dynamic import block (line ~74) already destructures from `@opentui/core`. Add `TabSelectRenderable` and `TabSelectRenderableEvents` to the destructured imports:
   ```ts
   const {
     createCliRenderer,
     BoxRenderable,
     TextRenderable,
     ScrollBoxRenderable,
     TabSelectRenderable,
     TabSelectRenderableEvents,
     bold, fg, dim, t
   } = await import(opentuiModule);
   ```

2. **Add state variable** for the active tab alongside the existing state block (~line 90):
   ```ts
   let activeTab: 'sprints' | 'activity' = 'sprints';
   ```

3. **Create the TabSelectRenderable** after the header is built and added to root (after line ~264), but BEFORE the main content box:
   ```ts
   const tabBar = new TabSelectRenderable(renderer, {
     id: 'tab-bar',
     width: '100%',
     options: [
       { name: 'SPRINTS' },
       { name: 'ACTIVITY' },
     ],
     tabWidth: 20,
     showDescription: false,
     showUnderline: false,
     backgroundColor: COLORS.bg,
     textColor: COLORS.dim,
     selectedBackgroundColor: COLORS.primary,
     selectedTextColor: '#000000',
     focusedBackgroundColor: COLORS.bg,
     focusedTextColor: COLORS.dim,
   });
   root.add(tabBar);
   ```
   Note: The tab bar is added to `root` AFTER the header and BEFORE the `main` content box.

4. **Do NOT focus the TabSelectRenderable.** We will control it programmatically from the global keypress handler. Do not call `tabBar.focus()`. Instead, we use `tabBar.setSelectedIndex()` from the keyboard handler (wired in Task 4).

5. **Wire the SELECTION_CHANGED event** to update the `activeTab` state. This will be used by the panel swap logic (Task 3):
   ```ts
   tabBar.on(TabSelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
     activeTab = index === 0 ? 'sprints' : 'activity';
     updateDisplay();
   });
   ```

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- The tab bar renders visually between the header and the main content area.
- The active tab shows with `#7aa2f7` background and black text.
- Inactive tab shows with dim text on dark background.
- No focus ring or keyboard interaction on the tab bar itself yet (that comes in Task 4).

# Task 4: UI Tweaks — Title Rendering, Border Gap, Process Color

## Title
Fix panel title scroll overlap, blue border gap, and process output title color

## Context
Three visual issues in the Activity tab need fixing:
1. Panel titles (ACTIVITY, PROCESS OUTPUT) can get covered by scrolling content.
2. The blue border on the status row has a visible black gap between it and the activity panel edge.
3. The PROCESS OUTPUT title is too dim.

## Step-by-Step

### 1. Fix panel title scroll overlap

In `createActivityView()` in `components.ts`, both the activity and process rows follow the same pattern:

```typescript
const activityRow = new BoxRenderable(renderer, { ... padding: 1 });
const activityHeader = new TextRenderable(renderer, { ... });
const activityScroll = new ScrollBoxRenderable(renderer, { ... });
activityRow.add(activityHeader);
activityRow.add(activityScroll);
```

The header and scroll box are siblings inside the row, which should keep the header outside the scrollable area. If the header is still getting overlapped, it's likely because the `ScrollBoxRenderable` with `flexGrow: 1` is consuming the header's space.

**Fix:** Give the header a fixed height so it doesn't get collapsed:

```typescript
// Wrap the header in a box with a fixed height to protect it from flexGrow
const activityHeaderBox = new BoxRenderable(renderer, {
  id: 'activity-header-box', width: '100%', height: 1,
});
activityHeaderBox.add(activityHeader);
activityRow.add(activityHeaderBox);
activityRow.add(activityScroll);
```

Apply the same pattern to the process row:

```typescript
const processHeaderBox = new BoxRenderable(renderer, {
  id: 'process-header-box', width: '100%', height: 1,
});
processHeaderBox.add(processHeader);
processRow.add(processHeaderBox);
processRow.add(processScroll);
```

If wrapping in a fixed-height box doesn't work in OpenTUI, try setting `flexShrink: 0` on the header text or header box to prevent it from being compressed.

Load the OpenTUI skill (`/mnt/c/Users/stran/Documents/Work/clifford-proj/clifford/.opencode/skills/opentui/SKILL.md`) to check the correct approach for preventing flex items from being crushed by `flexGrow` siblings.

### 2. Fix blue border gap

The status row has `border: true` and `borderColor: COLORS.primary`. The black gap is likely caused by the `activityPanel` having `backgroundColor: COLORS.panelBg` which shows through as a dark border around the blue border.

In `createActivityView()`, the `activityPanel` is:
```typescript
const activityPanel = new BoxRenderable(renderer, {
  id: 'activity-panel', width: '100%', height: '100%', flexDirection: 'column',
  backgroundColor: COLORS.panelBg,
});
```

The fix: ensure `activityPanel` has **no padding** (it currently has none, which is correct). The issue may be that the panel background color (`#24283b`) is showing in the space between children. Try setting the panel's background to match the status row's background, or make the statusRow's border extend to fill its allocated space.

Alternatively, the gap may be caused by OpenTUI rendering borders inside the box dimensions. Check if `activityPanel` needs `gap: 0` or if the statusRow needs `margin: 0` explicitly.

**Debug approach:** Temporarily set `activityPanel`'s `backgroundColor` to a bright red to see exactly where the gap is. Then adjust padding/margin/border settings to eliminate it.

### 3. Brighten process output title

In `createActivityView()`, change the process header color from `COLORS.dim` to a brighter color:

```typescript
// Before:
const processHeader = new TextRenderable(renderer, {
  id: 'process-header', content: t`${bold(fg(COLORS.dim)(' PROCESS OUTPUT'))}`,
});

// After:
const processHeader = new TextRenderable(renderer, {
  id: 'process-header', content: t`${bold(fg(COLORS.text)(' PROCESS OUTPUT'))}`,
});
```

`COLORS.text` is `#c0caf5` — the standard readable text color. This matches the visibility level of the ACTIVITY header which uses `COLORS.purple` (`#bb9af7`).

## Verification
1. `npm run build` succeeds.
2. Launch TUI, switch to Activity tab.
3. Start a sprint that produces enough output to scroll the process pane.
4. Scroll up in the process pane — verify the "PROCESS OUTPUT" title stays fixed at the top and is NOT covered by scrolling text.
5. Same check for the "ACTIVITY" title.
6. Verify the blue border on the status row touches the edges of the activity panel with no black gap.
7. Verify "PROCESS OUTPUT" title is clearly visible (not dim gray).

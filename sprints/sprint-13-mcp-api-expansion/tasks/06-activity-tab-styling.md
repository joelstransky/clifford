# Task 6: Activity Tab Styling Tweaks

## Title
Style the Activity tab: blue border on status pane, inner padding on all panes, auto-scroll, clean process output

## Context
The Activity tab has three vertically-stacked panes: Status Row, Activity Row (Clifford events), and Process Row (agent stdout/stderr). The user wants visual refinements to make the layout cleaner and more readable.

## Step-by-Step

All changes are in `src/tui/components.ts` inside `createActivityView()` and `renderLogEntries()`, plus scroll-to-bottom calls in `src/tui/Dashboard.ts`.

### 1. Blue border on the Status Row

The status row (Row 1) currently has `backgroundColor: COLORS.titleBg` and no border. Add a blue border matching the primary text color.

In `createActivityView()`, update the status row:

```typescript
const statusRow = new BoxRenderable(renderer, {
  id: 'status-row',
  width: '100%',
  height: 7,  // Increase from 5 to 7 to account for border (2 chars) + padding (2 chars)
  flexDirection: 'column',
  padding: 1,
  border: true,
  borderColor: COLORS.primary,  // #7aa2f7 — the blue
  backgroundColor: COLORS.titleBg,
});
```

**Important:** The border must go right to the outer edge of the pane — there should be NO margin or padding between the blue border and the outer edge of the activity panel. The activity panel itself (`activityPanel`) currently has no padding, which is correct. Do NOT add padding or margin to `activityPanel`. The `padding: 1` on `statusRow` creates the inner spacing within the bordered box.

Remove `paddingLeft: 2` and `paddingRight: 2` from the status row and replace with uniform `padding: 1`. The border already provides visual separation.

### 2. One character padding on all three panes

Each of the three panes should have `padding: 1` for consistent inner spacing.

**Status Row** — already handled in step 1 above.

**Activity Row:**
```typescript
const activityRow = new BoxRenderable(renderer, {
  id: 'activity-row',
  width: '100%',
  flexGrow: 1,
  flexDirection: 'column',
  overflow: 'hidden',
  padding: 1,  // ADD THIS
});
```

**Process Row:**
```typescript
const processRow = new BoxRenderable(renderer, {
  id: 'process-row',
  width: '100%',
  flexGrow: 1,
  flexDirection: 'column',
  overflow: 'hidden',
  padding: 1,  // ADD THIS
});
```

### 3. Auto-scroll to bottom on Activity and Process panes

Both the Activity log and Process log should keep the scroll pinned to the bottom as new entries arrive. The `ScrollBoxRenderable` instances are `activityScroll` (id: `activity-scroll`) and `processScroll` (id: `process-scroll`).

These scroll boxes are created inside `createActivityView()` but the scroll-to-bottom calls need to happen **after new log entries are rendered**. This means:

**Option A (preferred):** Return the scroll box references from `createActivityView()` and call `scrollTo(999999)` in `Dashboard.ts` after each `renderLogEntries()` call.

Update the `ActivityViewComponents` interface to include:
```typescript
activityScroll: Renderable;
processScroll: Renderable;
```

Return them from `createActivityView()`.

In `Dashboard.ts`, after each render call:
```typescript
const updateActivityLog = () => {
  renderLogEntries(...);
  (activityScroll as any).scrollTo(999999);  // scroll to bottom
};

const updateProcessLog = () => {
  renderLogEntries(...);
  (processScroll as any).scrollTo(999999);  // scroll to bottom
};
```

**Note:** Use `scrollTo(999999)` as a large number to guarantee scrolling to the absolute bottom. The `scrollToBottom()` method may not exist on all versions of `ScrollBoxRenderable`. If it does exist, prefer it. If it causes a TypeError, fall back to `scrollTo(999999)`.

A safe pattern:
```typescript
const scrollToEnd = (scrollBox: Renderable) => {
  const sb = scrollBox as any;
  if (typeof sb.scrollToBottom === 'function') {
    sb.scrollToBottom();
  } else if (typeof sb.scrollTo === 'function') {
    sb.scrollTo(999999);
  }
};
```

### 4. Remove timestamp from Process Output

The process output log shows `[HH:MM:SS] > line of stdout`. The timestamp is added by Clifford (not from the agent's stdout). The user finds it redundant for process output.

In `renderLogEntries()` (`src/tui/components.ts`), the rendering is:
```typescript
content: t`${dim(`[${formatTime(log.timestamp)}]`)} ${fg(color)(log.message)}`
```

Add a parameter to control whether timestamps are shown:

```typescript
export function renderLogEntries(
  renderer: Renderer,
  tui: OpenTuiModule,
  entries: LogEntry[],
  container: Renderable,
  elements: Identifiable[],
  prefix: string,
  emptyMessage: string,
  maxVisible: number = 30,
  showTimestamp: boolean = true,  // NEW PARAMETER
): void {
```

Then conditionally render:
```typescript
const content = showTimestamp
  ? t`${dim(`[${formatTime(log.timestamp)}]`)} ${fg(color)(log.message)}`
  : t`${fg(color)(log.message)}`;
```

In `Dashboard.ts`, update the process log call to pass `false`:
```typescript
const updateProcessLog = () => {
  renderLogEntries(
    renderer as Renderer, tui,
    ctrl.processLogs,
    processLogContainer,
    processElements,
    'proc',
    'No process output yet.',
    30,
    false,  // no timestamps for process output
  );
  scrollToEnd(processScroll);
};
```

The activity log call stays with the default `true` (timestamps shown).

## Verification

1. `npm run build` succeeds.
2. Launch Clifford TUI and switch to the Activity tab.
3. Verify:
   - The status row has a visible blue (`#7aa2f7`) border around it.
   - The blue border touches the outer edges of the panel — no gap between border and panel edge.
   - All three panes (status, activity, process) have ~1 character of inner padding.
   - When a sprint is running, the activity log auto-scrolls to show the latest entry.
   - The process output pane auto-scrolls to show the latest stdout/stderr line.
   - Process output lines do NOT have `[HH:MM:SS]` timestamps.
   - Activity log lines DO still have `[HH:MM:SS]` timestamps.

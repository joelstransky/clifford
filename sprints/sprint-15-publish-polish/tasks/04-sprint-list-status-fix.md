# Task 4: Fix Sprint List Status and Replace Progress Bar with Task Count

## Title
Fix status always showing "Pending"; replace progress bar with [X of Y] task count

## Context
Two issues in the sprints list view:
1. The status label on each sprint always shows "Pending" even when tasks are partially or fully completed. The derivation logic defaults to "Pending" and only catches specific edge cases (all pushed, all completed, blocked, running).
2. The progress bar at the bottom of the sprint view is not needed. Replace it with a compact `[X of Y]` count next to each sprint title.

## Step-by-Step

### 1. Fix the status derivation in `renderSprintItems()` (`components.ts`)

The current logic (around line 299):

```typescript
let statusLabel = 'Pending';
let statusColor = COLORS.dim;

if (isThisRunning) { ... }
else if (s.tasks.some(tk => tk.status === 'blocked')) { ... }
else if (s.tasks.every(tk => tk.status === 'pushed')) { ... }
else if (s.tasks.every(tk => tk.status === 'completed' || tk.status === 'pushed')) { ... }
```

This misses the case where *some* tasks are completed but not all — it falls through to "Pending". Add the missing state:

```typescript
let statusLabel = 'Pending';
let statusColor = COLORS.dim;

if (isThisRunning) {
  statusLabel = 'Active';
  statusColor = COLORS.warning;
} else if (s.tasks.some(tk => tk.status === 'blocked')) {
  statusLabel = 'Blocked';
  statusColor = COLORS.error;
} else if (s.tasks.length > 0 && s.tasks.every(tk => tk.status === 'pushed')) {
  statusLabel = 'Published';
  statusColor = COLORS.primary;
} else if (s.tasks.length > 0 && s.tasks.every(tk => tk.status === 'completed' || tk.status === 'pushed')) {
  statusLabel = 'Complete';
  statusColor = COLORS.success;
} else if (s.tasks.some(tk => tk.status === 'completed' || tk.status === 'active')) {
  statusLabel = 'In Progress';
  statusColor = COLORS.warning;
}
// Default 'Pending' is correct when all tasks are pending or there are no tasks
```

### 2. Add task count to sprint labels

In `renderSprintItems()`, compute the completed count and total for each sprint, then append it to the label:

```typescript
const completedCount = s.tasks.filter(tk => tk.status === 'completed' || tk.status === 'pushed').length;
const totalCount = s.tasks.length;
const countLabel = `[${completedCount} of ${totalCount}]`;
```

Add this to the sprint label content. Currently the label is:
```typescript
const labelContent = `${prefix}${displayName}${runningIndicator}${lockIndicator}`;
```

Change to:
```typescript
const labelContent = `${prefix}${displayName} ${countLabel}${runningIndicator}${lockIndicator}`;
```

The count should be dimmed or use a subtle color so it doesn't dominate the sprint name:
```typescript
// In the TextRenderable content, render countLabel with dim styling
```

Since the label is rendered as a single styled string, you may need to split it into two TextRenderables inside the itemBox (one for the name, one for the count) to apply different styles. Or use the tagged template to mix styles:

```typescript
content: isSelected
  ? t`${bold(fg(COLORS.primary)(nameContent))} ${dim(countLabel)}`
  : t`${fg(COLORS.text)(nameContent)} ${dim(countLabel)}`
```

### 3. Remove the progress bar from the sprints panel

In `createSprintListView()` (`components.ts`), the `progressText` and its wrapper `progWrap` are created and added to `sprintsPanel`. Remove them:

- Delete the `progressText` TextRenderable creation.
- Delete the `progWrap` BoxRenderable creation.
- Remove `sprintsPanel.add(progWrap)`.
- Remove `progressText` from the `SprintListViewComponents` interface.
- Remove `progressText` from the return statement.

In `Dashboard.ts`, remove all references to `progressText`:
- Remove it from the destructuring of `createSprintListView()`.
- Remove the lines that set `progressText.content = ...` in `updateDisplay()` (both in the sprints view and tasks view branches).

Also remove the `generateProgressBar` import from `Dashboard.ts` if it's no longer used there (it may still be used in the activity tab status pane).

### 4. Also add task count in the task drill-down view

When viewing a specific sprint's tasks, the header currently shows "SPRINT PLAN" and optionally "[S] Start" or "[Running]". Consider adding the count there too:

```typescript
leftPanelHeader.content = t`${bold(fg(COLORS.primary)('SPRINT PLAN'))} ${dim(`[${completedCount} of ${totalCount}]`)}`;
```

## Verification
1. `npm run build` succeeds.
2. `npm test` passes.
3. Launch TUI, view the sprints list:
   - A sprint with all tasks pending shows "Pending" status.
   - A sprint with some tasks completed shows "In Progress" status.
   - A sprint with all tasks completed shows "Complete" status.
   - Each sprint shows `[X of Y]` next to its name.
4. The progress bar is gone from the bottom of the sprints panel.
5. Drill into a sprint — the header shows the task count.

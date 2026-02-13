# Task 6: Sprint Completion Synopsis

## Title
Show a results synopsis in the status pane after sprint completion instead of immediately clearing

## Context
When a sprint finishes, the status pane in the Activity tab immediately shows "No sprint running" and clears all info. Instead, it should display a final synopsis of the completed sprint in gray text — sprint name, task count, elapsed time, completion status — so the user can see what just happened.

## Step-by-Step

### 1. Preserve completion data in `DashboardController.ts`

When the runner emits `'stop'`, the controller currently clears `isRunning` and resets state. Before clearing, snapshot the final state:

```typescript
public lastCompletedSprint: {
  name: string;
  completedCount: number;
  totalCount: number;
  elapsed: string;
} | null = null;
```

In the stop handler, before resetting:
```typescript
this.lastCompletedSprint = {
  name: this.manifest?.name || 'Unknown',
  completedCount: this.completedCount,
  totalCount: this.totalCount,
  elapsed: `${mm}:${ss}`, // formatted from elapsedSeconds
};
```

Clear `lastCompletedSprint` when a new sprint starts (in the start handler).

### 2. Update the status pane rendering in `Dashboard.ts`

In `updateDisplay()`, the current logic is:
```typescript
if (isRunning || ctrl.sprintStartTime) {
  // Show sprint info
} else {
  infoSprintText.content = t`${dim('No sprint running')}`;
  // Clear other fields
}
```

Add a third branch:
```typescript
if (isRunning || ctrl.sprintStartTime) {
  // Show live sprint info (existing logic)
} else if (ctrl.lastCompletedSprint) {
  const lc = ctrl.lastCompletedSprint;
  infoSprintText.content = t`${dim(`Sprint: ${lc.name}`)}`;
  infoTaskText.content = t`${dim(`Result: ${lc.completedCount} of ${lc.totalCount} tasks completed`)}`;
  infoTimerText.content = t`${dim(`Elapsed: ${lc.elapsed}`)}`;
  infoProgressText.content = t`${dim('Sprint finished.')}`;
} else {
  infoSprintText.content = t`${dim('No sprint running')}`;
  // ...
}
```

All text should use `dim()` to render in gray.

## Verification
1. `npm run build` succeeds.
2. `npm test` passes.
3. Run a sprint to completion. After it finishes, the status pane shows the sprint name, task count, elapsed time, and "Sprint finished." — all in gray text.
4. Starting a new sprint clears the synopsis and shows live info.

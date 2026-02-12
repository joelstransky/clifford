# Task 2: Sprint Approval in TUI

## Title
Add [A]pprove hotkey to the task view for completing a sprint

## Context
Previously, sprint approval was handled by a shell script (`clifford-approve.sh`). Now that it's been removed (Task 1), we need the TUI to offer this directly. The `[A]pprove` option should appear in the same location as `[S]tart` — the task drill-down view within the Sprints tab.

## Step-by-Step

### 1. Add `approveSprint()` method to `DashboardController.ts`

Add a method that:
- Guards: only works when `viewMode === 'tasks'` and the sprint is not currently running.
- Guards: only works when all tasks in the manifest are `completed` or `pushed`.
- Reads the manifest, sets `manifest.status = "completed"`, writes it back.
- Adds an activity log entry: `"Sprint approved: {sprintName}"` with type `success`.
- Emits `state-changed`.

```typescript
public approveSprint(): void {
  if (this.viewMode !== 'tasks') return;
  if (this.isRunning) return;
  if (!this.manifest) return;

  const allDone = this.manifest.tasks.every(
    t => t.status === 'completed' || t.status === 'pushed'
  );
  if (!allDone) return;

  // Write the manifest with status: "completed"
  // Use the selected sprint's path to resolve the manifest file
  // ... fs.writeFileSync(manifestPath, JSON.stringify(updated, null, 2))

  this.addLog(`Sprint approved: ${this.manifest.name}`, 'success');
  this.refresh(); // reload manifest from disk
}
```

Note: The controller currently reads manifests but may not have the sprint path readily available in task view. Check how `manifest` is loaded — the path likely comes from `allSprints[selectedIndex].path`. Ensure that path is accessible when writing back.

### 2. Wire the `a` key in `Dashboard.ts`

In the keyboard handler, under the section for non-blocker keys:

```typescript
if (key.name === 'a') {
  ctrl.approveSprint();
}
```

### 3. Update footer hotkey hints

In the `updateDisplay()` function in `Dashboard.ts`, the footer hints for task view currently show:
- `[←] Back  [S]tart` when not running
- `[X] Stop` when running

Add `[A]pprove` to the not-running state, but **only when all tasks are completed/pushed**:

```typescript
// In the isTasksView && !isRunning branch:
const canApprove = ctrl.canSprintApprove(); // new computed getter
if (canApprove) {
  hotkeyText.content = t`... [A]pprove ...`;
} else if (canStart) {
  hotkeyText.content = t`... [S]tart ...`;
}
```

### 4. Add `canSprintApprove()` computed getter to `DashboardController.ts`

```typescript
public canSprintApprove(): boolean {
  if (!this.manifest) return false;
  if (this.isRunning) return false;
  if (this.manifest.status === 'completed') return false;
  return this.manifest.tasks.length > 0 &&
    this.manifest.tasks.every(t => t.status === 'completed' || t.status === 'pushed');
}
```

### 5. Add tests for `approveSprint()` and `canSprintApprove()`

In `DashboardController.test.ts`, add a describe block:
- `canSprintApprove()` returns false when no manifest.
- `canSprintApprove()` returns false when running.
- `canSprintApprove()` returns false when tasks are pending.
- `canSprintApprove()` returns true when all tasks completed.
- `canSprintApprove()` returns false when sprint already completed.
- `approveSprint()` writes manifest and logs success (may need filesystem mock).

## Verification
1. `npm run build` succeeds.
2. `npm test` passes with new tests.
3. Launch TUI, navigate to a sprint with all tasks completed. Verify `[A]pprove` appears in footer.
4. Press `A`. Verify the sprint status updates and the activity log shows the approval message.
5. Verify `[A]pprove` does NOT appear when tasks are still pending or when a sprint is running.

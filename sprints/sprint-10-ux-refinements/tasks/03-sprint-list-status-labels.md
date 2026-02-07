# Task 3: Sprint List — Replace Symbols with Status Labels

## Context

In the Available Sprints view, the right-side indicators currently use emoji and symbols (`✅`, `[▶]`, `running`). Replace these with consistent human-readable status words: **Pending**, **Active**, **Blocked**, **Complete**, **Published**.

## Status Derivation Logic

For each sprint, derive a single status word from its task statuses:

| Condition | Status | Color |
|-----------|--------|-------|
| Runner is currently executing this sprint | `Active` | `COLORS.warning` (yellow) |
| Any task has `blocked` status | `Blocked` | `COLORS.error` (red) |
| All tasks are `pushed` | `Published` | `COLORS.primary` (blue) |
| All tasks are `completed` (or mix of completed + pushed) | `Complete` | `COLORS.success` (green) |
| Has any `pending` tasks (default) | `Pending` | `COLORS.dim` (gray) |

**Priority order matters:** check Active first, then Blocked, then Published, then Complete, then Pending as the fallback.

## Step-by-Step

1. **Refactor `updateSprintList()`** (~line 558). Replace the status indicator logic (lines ~603–625) with the new status derivation:

   ```ts
   // Derive sprint status label
   let statusLabel = 'Pending';
   let statusColor = COLORS.dim;

   if (isThisRunning) {
     statusLabel = 'Active';
     statusColor = COLORS.warning;
   } else if (s.tasks.some(t => t.status === 'blocked')) {
     statusLabel = 'Blocked';
     statusColor = COLORS.error;
   } else if (s.tasks.length > 0 && s.tasks.every(t => t.status === 'pushed')) {
     statusLabel = 'Published';
     statusColor = COLORS.primary;
   } else if (s.tasks.length > 0 && s.tasks.every(t => t.status === 'completed' || t.status === 'pushed')) {
     statusLabel = 'Complete';
     statusColor = COLORS.success;
   }
   // else: Pending (default)

   const statusEl = new TextRenderable(renderer, {
     id: `sprint-status-${i}`,
     content: t`${fg(statusColor)(statusLabel)}`,
   });
   itemBox.add(statusEl);
   ```

2. **Remove the old symbol logic.** Delete the `statusIndicator` variable, the `[▶]` string, the `✅` string, and the `'running'` string. Remove the `if (statusIndicator)` conditional — the new status label is always rendered.

3. **Remove the `hasPending` variable** if it was only used for the `[▶]` indicator. If `hasPending` is used elsewhere in the function, keep it.

4. **Keep the running indicator emoji** (`🔄`) in the sprint name label — that's a different visual element appended to the name, not the status column.

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- Available Sprints view shows a status word for every sprint.
- Sprints with all pushed tasks show `Published` in blue.
- Sprints with all completed tasks show `Complete` in green.
- The currently running sprint shows `Active` in yellow.
- Sprints with pending tasks show `Pending` in gray.
- No `[▶]` symbols or `✅` emoji appear in the sprint list.

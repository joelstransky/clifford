# Task 4: Task List — Remove Play Indicators, Use Unified Status Names

## Context

In the Sprint Plan task list, each task shows a `[▶]` play indicator for pending tasks alongside the raw status value (`pending`, `active`, etc.). Remove the play indicators and use the same unified status vocabulary as sprints: **Pending**, **Active**, **Blocked**, **Complete**, **Published**.

## Status Mapping

| Internal Status | Display Label | Color |
|----------------|---------------|-------|
| `pending` | `Pending` | `COLORS.dim` |
| `active` | `Active` | `COLORS.warning` |
| `blocked` | `Blocked` | `COLORS.error` |
| `completed` | `Complete` | `COLORS.success` |
| `pushed` | `Published` | `COLORS.primary` |

## Step-by-Step

1. **Add a display label map** near the existing `STATUS_ICONS` and `STATUS_COLORS` maps (~line 42):
   ```ts
   const STATUS_LABELS: Record<Task['status'], string> = {
     pending: 'Pending',
     active: 'Active',
     blocked: 'Blocked',
     completed: 'Complete',
     pushed: 'Published',
   };
   ```

2. **Refactor `updateTaskList()`** (~line 632). For each task:

   - Keep the left side: icon + task ID (e.g., `⏳ task-1`).
   - **Remove the `playIndicator` logic entirely** (lines ~676–678). Delete the `playIndicator` variable and the conditional that builds `dim('[▶]')` or `fg(COLORS.success)('[▶]')`.
   - Replace the right-side status rendering. Instead of showing the raw `displayStatus` value with an optional `[▶]`, show the mapped label:
     ```ts
     const statusLabel = new TextRenderable(renderer, {
       id: `task-status-${i}`,
       content: t`${fg(displayColor)(STATUS_LABELS[displayStatus])}`,
     });
     rightBox.add(statusLabel);
     ```

3. **Simplify the rightBox.** Since there's no longer a play indicator, the `rightBox` just contains the status label text. It can even be simplified to a single `TextRenderable` without the wrapper box if desired, but keeping `rightBox` is fine for consistency.

4. **Verify the `isActiveTask` override** still works. When the runner is actively executing a task, `displayStatus` is forced to `'active'` and `displayColor` to `STATUS_COLORS['active']`. The `STATUS_LABELS['active']` will correctly return `'Active'`. No changes needed here.

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- Sprint Plan task list shows status labels: `Pending`, `Active`, `Blocked`, `Complete`, `Published`.
- No `[▶]` symbols appear anywhere in the task list.
- Active tasks (being executed by runner) show `Active` in yellow with bold text.
- Completed tasks show `Complete` in green.
- Published/pushed tasks show `Published` in blue.

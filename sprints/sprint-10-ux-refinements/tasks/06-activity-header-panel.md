# Task 6: Activity Log Header Panel — Execution Info as Persistent Header

## Context

When a sprint runs, the execution view currently replaces the entire activity panel with a separate container showing task ID, file, elapsed timer, progress bar, and agent output. Instead, the execution info should be a **persistent header panel** at the top of the activity tab, with the scrollable activity log below it. Agent output lines should merge into the main activity log rather than a separate scroll area. This eliminates the need to swap between "activity" and "execution" sub-views.

## Step-by-Step

### Remove the Execution Container

1. **Delete the `executionContainer`** and all its children: `executionHeader`, `executionTaskInfo`, `execTaskIdText`, `execTaskFileText`, `execTimerText`, `execProgressBox`, `execProgressText`, `agentOutputHeader`, `agentOutputScroll`, `agentOutputContainer`. Remove their variable declarations and the lines where they are added to `executionContainer` (~lines 434–484).

2. **Remove the `agentOutputLogElements` tracking array** (~line 549) and all code that manages it (creating/removing exec-log-N elements).

3. **Remove the `currentRightView` state variable** (~line 105). It tracked `'activity' | 'blocker' | 'execution'`. It simplifies to just `'activity' | 'blocker'` — but since the header panel is always present, you can use a simpler `showBlocker` boolean or keep `currentRightView` with just two states.

### Create the Activity Header Panel

4. **Create an `activityInfoPanel`** — a fixed-height box at the top of `activityPanel` that shows execution info when a sprint is running:

   ```ts
   const activityInfoPanel = new BoxRenderable(renderer, {
     id: 'activity-info-panel', width: '100%', flexDirection: 'column',
     paddingLeft: 1, paddingRight: 1,
   });

   const infoSprintText = new TextRenderable(renderer, {
     id: 'info-sprint', content: '',
   });
   const infoTaskText = new TextRenderable(renderer, {
     id: 'info-task', content: '',
   });
   const infoTimerText = new TextRenderable(renderer, {
     id: 'info-timer', content: '',
   });
   const infoProgressText = new TextRenderable(renderer, {
     id: 'info-progress', content: '',
   });

   activityInfoPanel.add(infoSprintText);
   activityInfoPanel.add(infoTaskText);
   activityInfoPanel.add(infoTimerText);
   activityInfoPanel.add(infoProgressText);
   ```

5. **Add `activityInfoPanel` to `activityPanel` as the first child**, before `activityHeader` and `activityScroll`:
   ```ts
   activityPanel.add(activityInfoPanel);
   activityPanel.add(activityHeader);
   activityPanel.add(activityScroll);
   ```

6. **Populate the header panel in `updateDisplay()`.** When a sprint is running, show the execution info:
   ```ts
   if (runner.getIsRunning() || sprintStartTime) {
     const sprintName = manifest?.name || 'Unknown';
     infoSprintText.content = t`${bold(fg(COLORS.primary)('Sprint: '))}${fg(COLORS.text)(sprintName)}`;
     infoTaskText.content = t`${bold(fg(COLORS.primary)('Task:   '))}${fg(COLORS.text)(activeTaskId || 'Initializing...')}`;

     const mm = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
     const ss = (elapsedSeconds % 60).toString().padStart(2, '0');
     infoTimerText.content = t`${bold(fg(COLORS.primary)('Elapsed: '))}${fg(COLORS.warning)(`${mm}:${ss}`)}`;

     const progress = generateProgressBar(completed, total, 30);
     infoProgressText.content = t`${bold(fg(COLORS.primary)('Progress: '))}${fg(completed === total && total > 0 ? COLORS.success : COLORS.primary)(progress)} (${completed}/${total})`;
   } else {
     // Not running — clear or collapse the header panel
     infoSprintText.content = '';
     infoTaskText.content = '';
     infoTimerText.content = '';
     infoProgressText.content = '';
   }
   ```

### Merge Agent Output Into Activity Log

7. **In the `runner.on('output')` handler** (~line 256), instead of pushing to `executionLogs` and rendering in a separate scroll, push each line into the main activity log:
   ```ts
   runner.on('output', (data: { data: string; stream: string }) => {
     const lines = data.data.split('\n').filter((l: string) => l.trim().length > 0);
     lines.forEach(line => {
       addLog(`> ${line.substring(0, 120)}`, 'info');
     });
   });
   ```
   Remove the `executionLogs` state variable (~line 106) since it's no longer used.

### Simplify View Swapping

8. **Remove all `currentRightView === 'execution'` logic.** Search for `currentRightView` and:
   - In `runner.on('start')` handler: remove the renderable swap that adds `executionContainer`. Just set state variables and call `updateDisplay()`.
   - In `runner.on('stop')` handler: remove `if (currentRightView === 'execution') currentRightView = 'activity'`.
   - In `updateDisplay()`: remove the `isRunning && currentRightView === 'execution'` branch that updated execution view renderables.
   - In the `V` key handler: remove entirely — there's no separate execution view to switch to.

9. **Simplify `currentRightView`** to track just `'activity' | 'blocker'`. The activity panel now always shows `[activityInfoPanel] + [activityHeader] + [activityScroll]` in activity mode, or `[blockerContainer]` in blocker mode.

10. **Remove `[V]iew` from footer hotkey hints.** Search for `[V]iew` in hotkey strings and remove it.

### Clean Up Runner Start Handler

11. **Simplify `runner.on('start')`:**
    ```ts
    runner.on('start', () => {
      sprintStartTime = Date.now();
      elapsedSeconds = 0;
      startSpinner();
      if (!activeBlocker) {
        activeTab = 'activity';
        tabBar.setSelectedIndex(1);
        switchPanel('activity');
      }
      updateDisplay();
    });
    ```

12. **Update the elapsed timer interval** (~line 908). It currently checks `currentRightView === 'execution'` before calling `updateDisplay()`. Change to just check if a sprint is running:
    ```ts
    setInterval(() => {
      if (sprintStartTime) {
        elapsedSeconds = Math.floor((Date.now() - sprintStartTime) / 1000);
        if (activeTab === 'activity') updateDisplay();
      }
    }, 1000);
    ```

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- Activity tab always shows: info header panel (when running) + "ACTIVITY LOG" label + scrollable log.
- When sprint is running: header panel shows sprint name, task ID, elapsed timer, and progress bar.
- When idle: header panel is empty/collapsed.
- Agent output lines appear in the main activity log with `>` prefix.
- Blocker mode still swaps to the NEEDS HELP view correctly.
- `V` key no longer does anything (removed).
- No separate execution container or view swap logic remains.
- The elapsed timer updates every second in the header panel.

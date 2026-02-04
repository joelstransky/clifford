# Sprint 7 UAT: TUI Hierarchical Navigation

## Prerequisites
- All tests must be performed in the `clifford-sandbox` directory.
- Start with a clean state: `npm run clifford:clean && npm run clifford:init`.
- Ensure multiple sprints exist in `.clifford/sprints/` for testing navigation.

---

## Task 1: Hierarchical Left Panel Navigation
- **Status**: ✅ Completed
- **Verification**:
  1. Launch the TUI: `npm start`.
  2. Observe the left panel shows "AVAILABLE SPRINTS" and a list of all discovered sprints.
  3. Press Up/Down arrows - selection cursor (`> `) moves between sprints.
  4. Press Right arrow - drills into the selected sprint, header changes to "SPRINT PLAN", and tasks for that sprint are displayed.
  5. Press Left arrow - returns to the "AVAILABLE SPRINTS" list view.
  6. Verify footer hotkey hints update: `[→] Select` in sprint view, `[←] Back` and `[S]tart` in task view.

---

## Task 2: Color-Coded Task Status Display
- **Status**: ✅ Completed
- **Verification**:
  1. Navigate into a sprint's task list (Right arrow from sprint list).
  2. Each task displays: `{icon} {task-id}` on left, `{status}` on right.
  3. Status text is color-coded:
     - `pending` = gray/dim
     - `active` = yellow/orange
     - `completed` = green
     - `blocked` = red
     - `pushed` = blue
  4. Pending tasks show the `[▶]` play button next to the status.

---

## Task 3: Sprint Start/Stop Control
- **Status**: ✅ Completed
- **Verification**:
  1. Navigate to a sprint's task view (Right arrow).
  2. Press `S` - sprint starts, the activity log shows "Starting sprint...".
  3. Header shows `[Running: Sprint Name > task-id]`.
  4. Press Left arrow to return to sprint list - the running sprint shows a `🔄` icon.
  5. Other sprints in the list appear dimmed.
  6. Try pressing `S` on another sprint - a warning "Already running: ..." appears in the log.
  7. Press `X` - sprint stops, header returns to `[Idle]`, and all sprints return to normal brightness.
  8. Footer hotkey hints correctly show `[S]tart` when idle and `[X] Stop` when running.

---

## Task 4: Chat Input Field
- **Status**: ✅ Completed
- **Verification**:
  1. Launch TUI - chat input visible at bottom with placeholder "Press / to chat...".
  2. Press `/` - input focuses (border becomes double, prompt brightens, cursor `█` appears).
  3. Type a message - text appears in input field.
  4. Press `Backspace` - characters are removed.
  5. Press `Enter` - message appears in activity log as `[You] ...`, input clears and unfocuses.
  6. Press `Esc` while typing - input clears and unfocuses.
  7. Footer hints change to `[Enter] Send [Esc] Cancel` when focused.
  8. Hotkeys (like `Q` or `Up/Down`) work normally when input is unfocused.

---

## Task 5: Enhanced Execution Status Display
- **Status**: ✅ Completed
- **Verification**:
  1. Navigate to a sprint and press `S` to start it.
  2. Observe the right panel switches to the "SPRINT EXECUTING" view.
  3. Verify the "Current Task" section shows the correct Task ID and file.
  4. Verify the "Elapsed" timer ticks up every second.
  5. Verify the "Progress" bar and task counts (e.g., "1/5") update as tasks progress.
  6. Verify the "AGENT OUTPUT" section shows real-time output from the running agent.
  7. Press `X` to stop the sprint or wait for it to finish.
  8. Verify the right panel returns to the "ACTIVITY LOG" view.
  9. While a sprint is running, if you switch to activity log (not implemented as toggle yet, but stops do it), starting it again should bring back the execution view.
  10. If a blocker occurs, the Blocker UI should replace the execution view until resolved.

---

## Task 6: Interactive Blocker Resolution
- **Status**: ✅ Completed
- **Verification**:
  1. Start a sprint that triggers a blocker (interactive prompt).
  2. Observe:
     - Runner pauses
     - Blocker UI appears (showing Task, Reason, Question)
     - Chat input at the bottom auto-focuses with red prompt (`🛑 >`)
  3. Type response and press `Enter`.
  4. Observe:
     - Blocker UI disappears, returns to Activity Log or Execution view
     - Activity Log shows "✅ Blocker resolved: ..."
     - Check `.clifford/asm.json` contains the memory entry
     - Sprint automatically restarts after a brief pause
  5. Check logs for guidance injection: `🧠 Injected human guidance for {task}`.
  6. On task completion, verify ASM entry is cleared from `.clifford/asm.json`.
  7. Start another task, trigger blocker, and press `Esc`.
  8. Observe:
     - Blocker is cleared
     - Sprint is stopped
     - Log shows "Blocker cancelled, sprint stopped."

---

## Final Sprint Approval
- [ ] All tasks verified
- [ ] No TypeScript errors (`npm run build`)
- [ ] No lint errors (`npm run lint`)
- [ ] Manual UAT passed

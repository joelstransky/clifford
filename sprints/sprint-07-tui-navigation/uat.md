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
- **Status**: ⏳ Pending
- **Verification**:
  1. Start a sprint with `S`.
  2. Right panel transforms to execution status view:
     - Current task info at top (ID, file)
     - Elapsed timer ticking every second
     - Progress bar with task counts
     - Agent output streaming at bottom
  3. When sprint completes/stops, view returns to activity log.

---

## Task 6: Interactive Blocker Resolution
- **Status**: ⏳ Pending
- **Verification**:
  1. Start a sprint that triggers a blocker (interactive prompt).
  2. Observe:
     - Runner pauses
     - Blocker UI appears
     - Chat input auto-focuses with red prompt (`🛑 >`)
  3. Type response and press `Enter`.
  4. Check `.clifford/asm.json` contains the memory entry.
  5. Sprint automatically restarts with guidance injected.
  6. Logs show `🧠 Injected human guidance for {task}`.
  7. On task completion, ASM entry is cleared.
  8. Test `Esc` - cancels blocker, stops sprint.

---

## Final Sprint Approval
- [ ] All tasks verified
- [ ] No TypeScript errors (`npm run build`)
- [ ] No lint errors (`npm run lint`)
- [ ] Manual UAT passed

# UAT Walkthrough - Sprint 10

## Task 1: Remove Chat Bar — Input Only Available During Blocker/Help Mode

### Verification Steps

1. **Verify Chat Bar Removal**:
   - Run the dashboard: `npm start`.
   - Observe that the chat bar (previously at the bottom, above the footer) is gone.
   - The UI should now flow directly from the main content panels to the footer.

2. **Verify Global Shortcut Removal**:
   - Press the `/` key.
   - Observe that nothing happens (no chat input box appears, no focus change).

3. **Verify Blocker Input**:
   - Trigger a blocker (e.g., by running a sprint that "phones home" or hits a manual blocker).
   - When the "NEEDS HELP" screen appears, observe the new input line at the bottom of the blocker container.
   - It should have a red `🛑 > ` prefix.

4. **Verify Input Functionality**:
   - Type a response in the blocker input.
   - Verify that characters appear as you type, including a block cursor `█`.
   - Press `Backspace` to delete characters.
   - Press `Escape` to cancel/dismiss the blocker (this should stop the sprint and return to the activity log).
   - Press `Enter` to submit the response.
   - Verify that the response is processed (appended to task file) and the blocker is resolved.

5. **Verify Footer Hints**:
   - Observe the footer hotkey hints in different modes (Sprints view, Tasks view, Running, Blocked).
   - Verify that `[/] Chat` is no longer present in any of the hint strings.

## Task 2: Clear Activity Log on User-Initiated Sprint Start Only

### Verification Steps

1. **Verify Log Clearing on Start**:
   - Run the dashboard: `npm start`.
   - Ensure there are some entries in the activity log (refreshing with `R` adds an entry).
   - Navigate to a sprint and enter its task list (`Right Arrow`).
   - Press `S` to start the sprint.
   - Observe that the activity log is cleared and now only shows the "Starting sprint: ..." message.

2. **Verify Log Preservation on Halt Recovery**:
   - Trigger a blocker during a sprint run.
   - Observe the "NEEDS HELP" screen and the error message in the activity log (if you switch to the Activity tab).
   - Enter a response and press `Enter`.
   - Observe that the sprint auto-restarts.
   - Switch to the Activity tab and verify that the blocker messages and the previous activity history are STILL PRESENT (not cleared).

3. **Verify Log Clearing on Subsequent Start**:
    - After the sprint completes or is stopped, press `S` again to start a new run.
    - Observe that the activity log is cleared once more.

## Task 3: Sprint List — Replace Symbols with Status Labels

### Verification Steps

1. **Verify Status Label Presence**:
   - Run the dashboard: `npm start`.
   - In the "AVAILABLE SPRINTS" view, observe the right-hand column.
   - Every sprint should now have a text status label (e.g., **Pending**, **Complete**, **Active**, **Published**, **Blocked**).

2. **Verify Status Derivation**:
   - **Published**: Locate a sprint where all tasks have `pushed` status. It should show **Published** in blue.
   - **Complete**: Locate a sprint where all tasks are `completed` (or a mix of `completed` and `pushed`). It should show **Complete** in green.
   - **Active**: Start a sprint (`S`). Navigate back to the "AVAILABLE SPRINTS" list (`Left Arrow`). The running sprint should show **Active** in yellow.
   - **Blocked**: Find or create a sprint with at least one `blocked` task. It should show **Blocked** in red.
   - **Pending**: Locate a sprint with at least one `pending` task (and no blocked tasks/not currently running). It should show **Pending** in gray.

3. **Verify Removal of Old Symbols**:
   - Confirm that no `✅` emoji, `[▶]` symbols, or the literal word `running` (in default terminal color) appear in the sprint list.
    - Confirm that the `🔄` emoji still appears next to the sprint name for the currently running sprint.

## Task 4: Task List — Remove Play Indicators, Use Unified Status Names

### Verification Steps

1. **Verify Play Indicator Removal**:
   - Run the dashboard: `npm start`.
   - Navigate to a sprint's task list (`Right Arrow`).
   - Observe that no `[▶]` symbols appear next to any task status.

2. **Verify Unified Status Labels**:
   - In the task list, observe the status column (right side).
   - Tasks should now show capitalized labels: **Pending**, **Active**, **Blocked**, **Complete**, **Published**.
   - Confirm the color coding:
     - **Pending**: Gray (`COLORS.dim`)
     - **Active**: Yellow (`COLORS.warning`)
     - **Blocked**: Red (`COLORS.error`)
     - **Complete**: Green (`COLORS.success`)
     - **Published**: Blue (`COLORS.primary`)

3. **Verify Active Task Override**:
   - Start the sprint (`S`).
   - Observe that the task being executed shows **Active** in yellow bold text, regardless of its status in `manifest.json`.
   - Once the task completes, it should show **Complete** in green.


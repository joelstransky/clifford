# Task 02: Triple-Row Activity Layout

## Context
The Activity tab needs to provide a clearer separation between overall sprint status, Clifford's internal events, and the raw output of the agent process.

## Step-by-Step
1. **Modify Activity Panel**: Update the `activityPanel` in `Dashboard.ts` (or its new component equivalent).
2. **Implement Status Row (Top)**:
    - Fixed height.
    - Darker background (`COLORS.titleBg`).
    - Content: Sprint Name, ID, Active Task, Elapsed Time, Progress Bar.
3. **Implement Activity Row (Middle)**:
    - Scrollable.
    - Content: High-level Clifford events (e.g., "Task Started", "Blocker Detected").
4. **Implement Process Row (Bottom)**:
    - Scrollable.
    - Content: Raw stdout/stderr from the agent process.
5. **Route Output**: Update the logic in the new `DashboardController` to differentiate between "Clifford logs" and "Agent output" and store them in separate buffers.
6. **Help Screen**: The Help screen will display in place of the lower two layout items in the Activity tab's content. The status row will stay at the top.

## Verification
- Switch to the Activity tab while a sprint is running.
- Confirm the top status bar is visible and static.
- Confirm that the process output (agent thinking/bash output) is separated from the "Task started" notifications.

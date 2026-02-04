# Task 05: Enhanced Sprint Execution Status Display

## Context
When a sprint is running, users need comprehensive real-time feedback. The right panel should transform into a status dashboard.

## Requirements
- Right panel switches to execution view when a sprint is running
- Display sections:
  - **Current Task**: ID, file name, status
  - **Elapsed Time**: Timer updating every second
  - **Progress**: Visual bar + task counts (e.g., "2/5 completed")
  - **Agent Output**: Scrollable stream of recent stdout/stderr lines
- Return to activity log view when sprint stops or completes
- Blocker UI (existing) should still take priority when triggered
- May need to hook into `SprintRunner` output streams or add event emitters

## Verification
1. Start a sprint — right panel shows execution status
2. Current task info displayed and updates as tasks change
3. Elapsed timer ticks every second
4. Progress bar updates on task completion
5. Agent output streams in real-time
6. Sprint stops/completes — view returns to activity log

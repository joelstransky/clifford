# Task 02: Color-Coded Task Status Display

## Context
Tasks currently show an icon but the status text is not prominently displayed. Adding explicit, color-coded status text improves readability.

## Requirements
- Each task row displays the task ID and its status text
- Status text uses the existing `STATUS_COLORS` mapping:
  - `pending` = dim/gray
  - `active` = yellow/orange
  - `completed` = green
  - `blocked` = red
  - `pushed` = blue
- Preserve the `[▶]` play button for pending tasks (from Sprint 6)

## Verification
1. Navigate into a sprint's task list
2. Each task shows its status as colored text
3. Colors match the expected mapping
4. Play buttons still appear for pending tasks

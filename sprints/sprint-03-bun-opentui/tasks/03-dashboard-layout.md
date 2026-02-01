# Task 03: Dashboard Layout

## Title
Build the split-screen TUI dashboard using OpenTUI best practices.

## Context
With clean OpenTUI integration, we can now build the dashboard properly. The layout is a two-panel split: Sprint Plan on the left, Activity Log on the right. This task focuses on the static layout and rendering - interactivity comes in the next task.

## Required Skills
- opentui

## Step-by-Step

1. **Read the OpenTUI skill documentation**:
   - Start with `references/core/REFERENCE.md` or `references/react/REFERENCE.md`
   - Review `references/layout/REFERENCE.md` for flexbox patterns
   - Review `references/components/containers.md` for Box and border styles

2. **Rewrite `src/tui/Dashboard.ts`** from scratch with a clean structure:
   ```
   ┌─────────────────────────────────────────────────────────────────────┐
   │  CLIFFORD v1.0.0                              [Sprint: <status>]   │
   ├───────────────────────────┬─────────────────────────────────────────┤
   │  SPRINT PLAN              │  ACTIVITY LOG                          │
   │                           │                                        │
   │  <sprint-name>            │  <timestamp> <message>                 │
   │  "<sprint-description>"   │  <timestamp> <message>                 │
   │                           │  ...                                   │
   │  ┌─────────────────────┐  │                                        │
   │  │ <icon> task-01      │  │                                        │
   │  │ <icon> task-02      │  │                                        │
   │  │ ...                 │  │                                        │
   │  └─────────────────────┘  │                                        │
   │                           │                                        │
   │  Progress: ████░░░░ 40%   │                                        │
   ├───────────────────────────┴─────────────────────────────────────────┤
   │  STATUS: <current-status>                        [Q]uit  [R]efresh │
   └─────────────────────────────────────────────────────────────────────┘
   ```

3. **Implement the layout structure**:
   - Root container: full width/height, column direction
   - Header bar: single row with title and sprint status
   - Main content: row direction, two flex children (left panel, right panel)
   - Footer bar: single row with status and hotkey hints

4. **Implement the left panel (Sprint Plan)**:
   - Display sprint name and description from manifest
   - List all tasks with status icons:
     - `✅` completed (green)
     - `🔄` active (yellow)
     - `⏳` pending (dim)
     - `🛑` blocked (red)
   - Show a progress bar based on completed/total tasks

5. **Implement the right panel (Activity Log)**:
   - Scrollable container for log messages
   - Each log entry: `[HH:MM:SS] <message>`
   - Log messages should be stored in state and rendered dynamically

6. **Implement manifest polling**:
   - Read `manifest.json` every 1 second
   - Update the task list when changes are detected
   - Add log entries when task statuses change

7. **Use proper OpenTUI styling**:
   - Use `fg()` for foreground colors
   - Use `bold()` for emphasis
   - Use border styles from the framework (`rounded`, `single`, etc.)

## Verification
- Run `bun run dev tui sprints/sprint-03-bun-opentui`
- Confirm the two-panel layout renders correctly
- Confirm tasks are listed with appropriate status icons
- Manually edit the manifest.json and confirm the UI updates within 1-2 seconds

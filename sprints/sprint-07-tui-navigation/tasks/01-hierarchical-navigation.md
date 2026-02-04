# Task 01: Hierarchical Left Panel Navigation

## Context
The left panel currently shows only tasks for a single sprint. Users need to browse all available sprints and drill into any one to view its tasks.

## Requirements
- Default view shows a list of all sprints discovered from `.clifford/sprints/`
- Up/Down arrows navigate the sprint list with a visible selection indicator
- Right arrow drills into the selected sprint, showing its tasks
- Left arrow returns from task view to sprint list
- Header text updates to reflect current view (sprint list vs. specific sprint name)
- Footer hotkey hints update based on current view mode

## Verification
1. Launch TUI — left panel shows sprint list, not tasks
2. Up/Down moves selection between sprints
3. Right arrow opens selected sprint's task list
4. Left arrow returns to sprint list
5. Header and footer hints reflect current navigation state

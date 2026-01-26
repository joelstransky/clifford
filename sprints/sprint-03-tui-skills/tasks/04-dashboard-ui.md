# Task 04: The Dashboard UI & Pre-flight Flow

## Title
Build the Ink-based TUI Dashboard.

## Context
The visual command center where the user interacts with Clifford's sprints.

## Step-by-Step
1.  Create `src/ui/Dashboard.tsx` (and potentially sub-components).
2.  Implement `SprintList` view:
    - Display a list of discovered sprints.
    - Show status colors (Planning: gray, Active: green, Completed: blue).
    - Use `ink-select-input` for navigation.
3.  Implement `PreFlight` view:
    - Triggered when a sprint is selected.
    - Run the Skill Analysis Engine.
    - Display a checklist of "Environmental Readiness".
    - If skills are missing, offer an "Install & Continue" button.
4.  Implement `RunnerView`:
    - A simple view that shows progress as the `SprintRunner` executes (reusing console output or capturing it).

## Verification
- Run a standalone node script using `ink` to render the component.
- Verify navigation between views works correctly.
- Verify that missing skills are correctly displayed in the Pre-flight view.

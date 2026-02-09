# Task 03: UI Component Factory

## Context
Rendering the entire UI in one large function is brittle. Componentizing the UI elements allows for easier maintenance and dynamic visibility logic.

## Step-by-Step
1. **Define Components**: Create factory functions for major UI sections:
    - `createHeader()`
    - `createTabBar()`
    - `createSprintListView()`
    - `createTaskListView()`
    - `createActivityView()` (with the 3-row split)
    - `createFooter()`
2. **Refactor Dashboard.ts**: Replace the inline `BoxRenderable` definitions with calls to these factory functions.
3. **State-Aware Constraints**: Implement logic to "lock" or dim specific elements (like the Sprint List) while a sprint is running to prevent invalid interactions.

## Verification
- Run the TUI and ensure all visual elements are rendered exactly as before (or improved).
- Verify that keyboard navigation works correctly through the componentized structure.

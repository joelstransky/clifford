# Task 05: Core Loop Verification

## Context
Decoupling the logic from the UI provides an opportunity to add automated tests for the core execution loop and state management.

## Step-by-Step
1. **Create Test**: Create `src/tui/DashboardController.test.ts`.
2. **Test State Transitions**: Verify that the controller correctly handles the transition from `pending` to `active` based on runner events.
3. **Test Buffer Separation**: Verify that "log" events and "output" events go into their respective buffers for the Activity tab.
4. **Test Polling**: Use a mock filesystem to verify that the controller correctly detects changes to `manifest.json`.

## Verification
- Run `npm test` and confirm all new tests pass.

# Task 01: Dashboard Controller Extraction

## Context
The current `Dashboard.ts` is a monolithic file where state management, manifest polling, timer logic, and UI rendering are tightly coupled. This makes it difficult to implement state-based UI constraints or maintain the code as the project grows.

## Step-by-Step
1. **Create Controller**: Create `src/tui/DashboardController.ts`.
2. **Move State**: Relocate state variables (logs, manifest, elapsed time, current task ID) into the new class.
3. **Move Logic**: Relocate the `setInterval` polling for `manifest.json` and the `SprintRunner` event listeners into the controller.
4. **Expose Events/State**: The controller should provide a way for the TUI to be notified of state changes (e.g., via a callback or event emitter).
5. **Update Dashboard.ts**: Instantiate the controller and use its state/methods to drive the UI.

## Verification
- Start the Clifford TUI.
- Verify that logs still appear in real-time.
- Verify that the timer starts when a sprint is run.
- Verify that the progress bar updates correctly.

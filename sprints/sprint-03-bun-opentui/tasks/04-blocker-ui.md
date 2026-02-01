# Task 04: Blocker Intervention UI

## Title
Implement keyboard-driven blocker resolution within the TUI.

## Context
When the agent encounters a blocker, it sends a request to the CommsBridge. The TUI should detect this, transform the right panel into an input form, capture the user's guidance, and resolve the blocker. This enables the human-in-the-loop workflow without leaving the dashboard.

## Required Skills
- opentui

## Step-by-Step

1. **Review keyboard handling documentation**:
   - Read `references/keyboard/REFERENCE.md` for input handling
   - Read `references/components/inputs.md` for text input components

2. **Connect CommsBridge events to TUI state**:
   - The `launchDashboard` function already accepts an optional `bridge` parameter
   - Listen for `block` events from the bridge
   - Store the active blocker in component state

3. **Implement the blocker view** (replaces Activity Log when active):
   ```
   ┌─────────────────────────────────────────┐
   │  🛑 BLOCKER DETECTED                    │
   │  ───────────────────────────────────    │
   │                                         │
   │  Task: <task-id>                        │
   │  Reason: <blocker-reason>               │
   │                                         │
   │  Question:                              │
   │  "<blocker-question>"                   │
   │                                         │
   │  ┌─────────────────────────────────┐    │
   │  │ <user-input-here>█              │    │
   │  └─────────────────────────────────┘    │
   │                                         │
   │  [Enter] Submit  [Esc] Cancel           │
   └─────────────────────────────────────────┘
   ```

4. **Implement text input handling**:
   - Capture keystrokes and build the input string
   - Handle backspace (delete last character)
   - Handle Enter (submit the response)
   - Handle Escape (cancel/clear input)
   - Display a cursor indicator (`█` or `|`)

5. **Implement blocker resolution**:
   - On Enter with non-empty input:
     - Call `bridge.resolveBlocker(userInput)`
     - Clear the active blocker state
     - Return to the Activity Log view
     - Add a log entry: `"Blocker resolved: <truncated-response>"`

6. **Implement global keyboard shortcuts**:
   - `Q` or `Ctrl+C`: Quit the TUI (call `renderer.destroy()`)
   - `R`: Force refresh (re-read manifest)
   - These should only work when NOT in blocker input mode

7. **Update the footer** to reflect current mode:
   - Normal mode: `[Q]uit  [R]efresh`
   - Blocker mode: `[Enter] Submit  [Esc] Cancel`

## Verification
- Run the TUI with a sprint
- Manually send a block request to the CommsBridge (or mock one)
- Confirm the right panel transforms into the blocker input view
- Type a response and press Enter
- Confirm the blocker is resolved and the Activity Log returns
- Test keyboard shortcuts (Q to quit, R to refresh)

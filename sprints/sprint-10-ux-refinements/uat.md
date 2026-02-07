# UAT Walkthrough - Sprint 10

## Task 1: Remove Chat Bar — Input Only Available During Blocker/Help Mode

### Verification Steps

1. **Verify Chat Bar Removal**:
   - Run the dashboard: `npm start`.
   - Observe that the chat bar (previously at the bottom, above the footer) is gone.
   - The UI should now flow directly from the main content panels to the footer.

2. **Verify Global Shortcut Removal**:
   - Press the `/` key.
   - Observe that nothing happens (no chat input box appears, no focus change).

3. **Verify Blocker Input**:
   - Trigger a blocker (e.g., by running a sprint that "phones home" or hits a manual blocker).
   - When the "NEEDS HELP" screen appears, observe the new input line at the bottom of the blocker container.
   - It should have a red `🛑 > ` prefix.

4. **Verify Input Functionality**:
   - Type a response in the blocker input.
   - Verify that characters appear as you type, including a block cursor `█`.
   - Press `Backspace` to delete characters.
   - Press `Escape` to cancel/dismiss the blocker (this should stop the sprint and return to the activity log).
   - Press `Enter` to submit the response.
   - Verify that the response is processed (appended to task file) and the blocker is resolved.

5. **Verify Footer Hints**:
   - Observe the footer hotkey hints in different modes (Sprints view, Tasks view, Running, Blocked).
   - Verify that `[/] Chat` is no longer present in any of the hint strings.

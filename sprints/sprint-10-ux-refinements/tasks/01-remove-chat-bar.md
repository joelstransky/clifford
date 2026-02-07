# Task 1: Remove Chat Bar — Input Only Available During Blocker/Help Mode

## Context

Chat currently exists as a persistent UI element (`chatInputBox`) at the bottom of the screen between the content panes and the footer. It can be activated anytime with the `/` key. This is unnecessary — user text input should only be available when a task needs help (blocker mode). The chat bar should be removed from the root layout entirely, and input should be part of the blocker/help screen only.

## Step-by-Step

1. **Remove the chat input UI elements from root layout.** Find where `chatInputBox` is added to `root` (~line 523):
   ```ts
   root.add(chatInputBox);
   ```
   Remove this line. The `chatInputBox`, `chatInputLabel`, and `chatInputText` variable declarations can also be removed entirely.

2. **Move the input into the blocker container.** The `blockerContainer` already has header, divider, task, reason, question, and footer hint elements. Add an input row at the bottom of the blocker container for the user's response. Reuse or replace the existing `blockerInputBox`/`blockerInputText` (which currently gets hidden with `height: 0`). Make it visible and functional:
   ```ts
   const blockerInputBox = new BoxRenderable(renderer, {
     id: 'blocker-input-box', width: '100%', height: 3, paddingLeft: 1,
     flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg,
   });
   const blockerInputLabel = new TextRenderable(renderer, {
     id: 'blocker-input-label', content: t`${bold(fg(COLORS.error)('🛑 > '))}`,
   });
   const blockerInputText = new TextRenderable(renderer, {
     id: 'blocker-input-text', content: '',
   });
   blockerInputBox.add(blockerInputLabel);
   blockerInputBox.add(blockerInputText);
   ```
   This input box lives inside `blockerContainer` and is only visible when a blocker is active.

3. **Remove the `chatFocused` state variable** (~line 104). Remove all code that reads or writes `chatFocused`:
   - In `bridge.on('block')` handler: remove `chatFocused = true` — the blocker mode itself implies input focus
   - In `bridge.on('resolve')` handler: remove `chatFocused = false`
   - In the blocker keypress Enter handler: remove `chatFocused = false`
   - In the blocker keypress Escape handler: remove `chatFocused = false`
   - In the `runner.on('halt')` handler: remove `chatFocused = true`

4. **Remove the `/` key handler** in the global shortcuts section (~line 1035):
   ```ts
   if (key.sequence === '/') {
     chatFocused = true;
     updateDisplay();
     return;
   }
   ```
   Delete this entire block.

5. **Remove the `else if (chatFocused)` keypress branch** (~lines 1014–1032). This was the standalone chat input mode — typing text and hitting Enter to log a message. Remove the entire branch. The `activeBlocker` branch handles all text input now.

6. **Update the `updateDisplay()` function:**
   - Remove the entire "Update Chat Input UI" section (~lines 842–850) that sets `chatInputLabel.content` and `chatInputText.content`.
   - In the blocker section of `updateDisplay()`, update the blocker input text to show the current `chatInput` value with cursor:
     ```ts
     blockerInputText.content = t`${chatInput}${bold(fg(COLORS.error)('█'))}`;
     ```
   - Remove `chatFocused` checks from footer hotkey hint logic.

7. **Remove `[/] Chat` from ALL footer hotkey hint strings.** Search for every `hotkeyText.content` assignment and remove the `[/] Chat` segment.

8. **Remove `!chatFocused` guard from the Q key handler** (~line 928). The guard was `!activeBlocker && !chatFocused` — simplify to just `!activeBlocker` since `chatFocused` no longer exists. During blocker mode, `activeBlocker` is truthy so Q is already blocked.

9. **Keep the `chatInput` state variable.** It's still used by the blocker input to track what the user is typing. It just no longer drives a standalone chat UI.

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- The chat input bar no longer appears below the content area.
- The `/` key does nothing.
- When a blocker activates, the NEEDS HELP screen includes an input row where the user can type.
- Typing, backspace, Enter (submit), and Escape (cancel) all work in blocker mode.
- After blocker is resolved, no input UI is visible.
- Footer hotkey hints no longer mention `[/] Chat`.

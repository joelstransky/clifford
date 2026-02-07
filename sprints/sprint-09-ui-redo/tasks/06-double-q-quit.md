# Task 6: Double-Press Q to Quit with Status Bar Confirmation

## Context

Currently pressing `Q` once instantly calls `process.exit(0)`, which is dangerous — a single accidental keystroke can kill a running sprint session with no undo. OpenTUI has no built-in modal component, so we use the status bar for a timed confirmation prompt. Users must press `Q` twice within 3 seconds to actually quit. `Ctrl+C` remains an instant emergency exit.

## Step-by-Step

1. **Add state variables** alongside the existing state block (~line 90):
   ```ts
   let quitPending: boolean = false;
   let quitTimer: ReturnType<typeof setTimeout> | null = null;
   ```

2. **Create a helper to cancel the quit state:**
   ```ts
   const cancelQuit = () => {
     quitPending = false;
     if (quitTimer) {
       clearTimeout(quitTimer);
       quitTimer = null;
     }
     // Restore normal status text
     statusText.content = t`${fg(COLORS.success)('STATUS: Ready')}`;
   };
   ```

3. **Refactor the Q key handler** in the keypress listener. Find the existing block (~line 807):
   ```ts
   if (key.name === 'q' && !activeBlocker) {
     stopSpinner();
     clearInterval(poll);
     renderer.destroy();
     process.exit(0);
   }
   ```
   Replace with:
   ```ts
   if (key.name === 'q' && !activeBlocker && !chatFocused) {
     if (quitPending) {
       // Second Q press — actually quit
       cancelQuit();
       stopSpinner();
       clearInterval(poll);
       renderer.destroy();
       process.exit(0);
     } else {
       // First Q press — show confirmation in status bar
       quitPending = true;
       statusText.content = t`${fg(COLORS.warning)('Press Q again to quit')}`;
       quitTimer = setTimeout(() => {
         cancelQuit();
       }, 3000);
       return;
     }
   }
   ```

4. **Cancel quit on any other key.** At the TOP of the keypress handler (after the `q` check and `Ctrl+C` check), add:
   ```ts
   // Any non-Q key cancels the quit confirmation
   if (quitPending && key.name !== 'q') {
     cancelQuit();
   }
   ```
   This ensures that pressing any other key (navigation, chat, etc.) dismisses the quit prompt and restores normal status.

5. **Ctrl+C remains instant.** The existing `Ctrl+C` handler should stay exactly as-is — no double-press required. It's the emergency escape hatch:
   ```ts
   if (key.ctrl && key.name === 'c') {
     stopSpinner();
     clearInterval(poll);
     renderer.destroy();
     process.exit(0);
   }
   ```

6. **Blocker mode guard.** The existing `!activeBlocker` guard on the Q handler already prevents quitting during blocker mode. The new `!chatFocused` guard also prevents accidental quit when typing in chat (where 'q' is a valid character).

7. **Status bar restoration.** The `cancelQuit()` helper restores the default `STATUS: Ready` text. If there are other places in `updateDisplay()` that set `statusText.content`, ensure they respect the `quitPending` state — i.e., don't overwrite the quit warning during a display update:
   ```ts
   // In updateDisplay(), only update status text if not showing quit warning
   if (!quitPending) {
     statusText.content = t`${fg(COLORS.success)('STATUS: Ready')}`;
   }
   ```

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- **First Q press**: Status bar shows `Press Q again to quit` in yellow/warning color. App does NOT exit.
- **Second Q press within 3 seconds**: App exits cleanly.
- **First Q press, then wait 3+ seconds**: Warning disappears, status returns to normal. App does NOT exit.
- **First Q press, then any other key**: Warning disappears immediately, normal key action occurs. App does NOT exit.
- **Ctrl+C**: Instant exit regardless of quit state (no double-press needed).
- **Q while in chat mode**: Types the letter 'q', does not trigger quit prompt.
- **Q while in blocker mode**: Types the letter 'q', does not trigger quit prompt.

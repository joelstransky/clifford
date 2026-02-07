# Task 5: Visual Polish and Verification

## Context

With tabs, borderless design, and panel switching in place, this task ensures everything looks clean and works correctly end-to-end. Focus on spacing, readability, and consistent rendering at various terminal widths.

## Step-by-Step

1. **Progress bar width.** The progress bar in `generateProgressBar()` uses a default `width: 20` characters. Now that the sprints panel is full-width, increase the default to `30` or make it dynamic. Update the call in `updateDisplay()`:
   ```ts
   const progress = generateProgressBar(completed, total, 30);
   ```
   Also update the execution view progress bar to match.

2. **Sprint list / task list padding.** With borders removed, ensure the task list items have consistent left padding. The parent `sprintsPanel` has `padding: 1` which should suffice, but verify items aren't flush against the left edge.

3. **Activity log readability.** Ensure log entries in the activity scroll have adequate spacing. Each `TextRenderable` log line should be visually distinct without borders. The timestamp prefix already provides structure.

4. **Blocker UI.** Verify the blocker view renders cleanly inside `activityPanel` without borders:
   - The blocker header, divider, task/reason/question text should have clear visual hierarchy via color alone.
   - The blocker input area (no border now) should still be visually identifiable — ensure it has distinct background color or use the chat input at the bottom instead (it's already wired for blocker input).

5. **Execution view.** Verify the execution container renders cleanly:
   - Task info (ID, file, timer) — uses color-coded labels, no border needed.
   - Agent output scroll — ensure the scroll area fills available space with `flexGrow: 1`.

6. **Chat input visual.** Without borders, ensure the chat input row is visually distinct:
   - `backgroundColor: COLORS.bg` (darker than content panes) provides contrast.
   - The cursor indicator (`█`) should still be visible.
   - When focused, the `CHAT >` label uses `bold(fg(COLORS.primary))` for visual feedback (already in place).

7. **Status bar.** Solid black background with white/green text should pop against everything above it. Verify the `STATUS: Ready` text and hotkey hints are readable.

8. **Edge case: empty states.** Test with:
   - No sprints discovered (empty sprint list)
   - Sprint with zero tasks
   - Empty activity log

9. **Run full verification suite:**
   ```bash
   npm run build
   npm run lint
   npm test
   ```
   All must pass cleanly.

10. **Manual smoke test:** Run `npm run dev` and verify:
    - Tab switching works (Tab key)
    - Sprint navigation (Up/Down/Right/Left)
    - Start a sprint (S key)
    - View execution (V key)
    - Chat input (/ key, type, Enter/Esc)
    - Quit (Q key)
    - Ctrl+C instant quit

## Verification

- `npm run build` — clean compile, no errors.
- `npm run lint` — no lint violations.
- `npm test` — all tests pass.
- Visual: clear 4-shade hierarchy (darkest title → dark tabs/chat → medium content → black status).
- Visual: no borders visible anywhere.
- Visual: all text readable with proper padding.
- Functional: all keyboard shortcuts work correctly per tab context.

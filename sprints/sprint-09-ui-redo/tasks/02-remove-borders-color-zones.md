# Task 2: Remove All Borders, Gaps, and Margins — Implement Color-Zone Separation

## Context

The current UI uses `border: true` and `borderStyle: 'rounded'|'single'|'double'` on nearly every container, plus `marginTop` gaps between elements. We are replacing ALL visual separation with background color shading. Four shades from darkest to lightest create the visual hierarchy. No borders anywhere.

## Color Shades

Add these to the `COLORS` object at the top of `src/tui/Dashboard.ts`:

```ts
const COLORS = {
  titleBg: '#13141c',    // Darkest — title bar
  bg: '#1a1b26',         // Dark — tab bar, chat input
  panelBg: '#24283b',    // Medium — content panes
  statusBg: '#000000',   // Solid black — status bar
  primary: '#7aa2f7',
  success: '#9ece6a',
  warning: '#e0af68',
  error: '#f7768e',
  text: '#c0caf5',
  dim: '#565f89',
  purple: '#bb9af7',
};
```

## Step-by-Step

1. **Update the COLORS object** as shown above. Add `titleBg: '#13141c'` and `statusBg: '#000000'`. The existing `bg` and `panelBg` values stay the same.

2. **Title bar (header)**: Change to borderless darkest shade.
   - Remove: `border: true`, `borderStyle: 'rounded'`
   - Set: `backgroundColor: COLORS.titleBg`
   - Keep: `paddingLeft: 2`, `paddingRight: 2` for text inset
   - Remove any `marginTop`/`marginBottom` if present

3. **Tab bar** (created in Task 1): Already uses `backgroundColor: COLORS.bg`. Ensure no border props. No margin.

4. **Left panel** (`leftPanel`):
   - Remove: `border: true`, `borderStyle: 'single'`
   - Set: `backgroundColor: COLORS.panelBg`
   - Keep: `padding: 1` for internal inset
   - Remove any margin

5. **Task list box** (`taskListBox`):
   - Remove: `border: true`, `borderStyle: 'rounded'`, `marginTop: 1`
   - It's a simple container now — no visual decoration, just layout
   - Remove `padding: 1` from `taskListBox` (the parent `leftPanel` already has padding)

6. **Progress bar wrapper** (`prog-wrap`):
   - Remove: `marginTop: 1`

7. **Right panel** (`rightPanel`):
   - Remove: `border: true`, `borderStyle: 'single'`
   - Set: `backgroundColor: COLORS.panelBg`
   - Keep: `padding: 1`

8. **Blocker input box** (`blockerInputBox`):
   - Remove: `border: true`, `borderStyle: 'rounded'`, `marginTop: 1`
   - Keep: `paddingLeft: 1`

9. **Execution task info** (`executionTaskInfo`):
   - Remove: `border: true`, `borderStyle: 'rounded'`, `marginTop: 1`
   - Keep: `padding: 1`

10. **Execution progress box** (`execProgressBox`):
    - Remove: `marginTop: 1`

11. **Agent output scroll** (`agentOutputScroll`):
    - Remove: `border: true`, `borderStyle: 'single'`, `marginTop: 0`

12. **Chat input box** (`chatInputBox`):
    - Remove: `border: true`, `borderStyle: 'rounded'`
    - Set: `backgroundColor: COLORS.bg`
    - Keep: `paddingLeft: 1`, `paddingRight: 1`

13. **Footer (status bar)**:
    - Remove: `border: true`, `borderStyle: 'rounded'`
    - Set: `backgroundColor: COLORS.statusBg` (solid black)
    - Keep: `paddingLeft: 2`, `paddingRight: 2`

14. **In `updateDisplay()`**, find the line that dynamically sets `chatInputBox.borderStyle` based on focus state (~line 734). Remove that line entirely — there are no borders anymore.

15. **Search the entire file** for any remaining `border:`, `borderStyle:`, `marginTop:`, `marginBottom:`, `marginLeft:`, `marginRight:` properties and remove them. The only spacing should come from `padding*` properties for internal text inset.

## Verification

- `npm run build` compiles without errors.
- `npm run lint` passes.
- Visually: no lines/borders visible anywhere in the TUI.
- Clear visual separation between zones via background color contrast only.
- Title bar is near-black, content panes are medium shade, chat is dark, status bar is solid black.
- Text is still readable with appropriate padding from edges.

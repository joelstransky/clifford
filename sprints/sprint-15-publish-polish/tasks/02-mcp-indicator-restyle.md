# Task 2: Restyle MCP Status Indicator

## Title
Move MCP indicator to lower-right of status pane; show only the colored word "MCP"

## Context
Sprint 14 added an MCP status indicator to the activity tab status pane. It currently renders as a full line like "MCP: RUNNING" with a label. The user wants just the word "MCP" positioned in the lower-right corner of the status pane, with its color changing to reflect state (gray = idle, green = running, red = error). No status text, no label prefix.

## Step-by-Step

### 1. Restructure the status row layout in `components.ts`

The status row currently stacks children vertically (`flexDirection: 'column'`). To place "MCP" in the lower-right, the layout needs adjustment.

One approach: keep the existing vertical column for the info lines (Sprint, Task, Elapsed, Progress), but wrap the status row content in a horizontal container that has the info column on the left and the MCP label on the right.

```
┌─────────────────────────────────────────────┐
│ Sprint:  My Sprint                      MCP │
│ Task:    task-1                              │
│ Elapsed: 01:23                               │
│ Progress: ████░░░░ 40% (2/5)                │
└─────────────────────────────────────────────┘
```

Actually, since we want it in the **lower-right**, a better layout:

```
┌─────────────────────────────────────────────┐
│ Sprint:  My Sprint                          │
│ Task:    task-1                              │
│ Elapsed: 01:23                               │
│ Progress: ████░░░░ 40% (2/5)            MCP │
└─────────────────────────────────────────────┘
```

Implementation: make the last row (progress) a horizontal flex container with `justifyContent: 'space-between'`, placing the progress text on the left and the MCP label on the right.

Alternatively, use an overlay/absolute positioning if OpenTUI supports it. Check the OpenTUI skill docs for positioning options. If absolute positioning isn't available, the flex approach above is fine.

### 2. Remove the current `infoMcpText` line

Delete the existing `infoMcpText` TextRenderable that renders as a full line. Replace it with a text element positioned inside the progress row or as a separate element in the lower-right.

### 3. Create the MCP label element

```typescript
const mcpLabel = new TextRenderable(renderer, {
  id: 'mcp-label', content: t`${fg(COLORS.dim)('MCP')}`,
});
```

Add it to the `ActivityViewComponents` interface and return it.

### 4. Update `Dashboard.ts` to color the MCP label

In `updateDisplay()`, replace the current `infoMcpText` logic with:

```typescript
const mcpColor = ctrl.mcpStatus === 'running' ? COLORS.success
  : ctrl.mcpStatus === 'error' ? COLORS.error
  : COLORS.dim;
mcpLabel.content = t`${fg(mcpColor)('MCP')}`;
```

Remove any destructuring of `infoMcpText` and replace with `mcpLabel`.

### 5. Adjust status row height if needed

If the layout change reduces the number of vertical lines (by embedding MCP into the progress row), the height may need to decrease. Test visually.

## Verification
1. `npm run build` succeeds.
2. Launch TUI, switch to Activity tab.
3. With no sprint running: "MCP" appears in gray in the lower-right area of the status pane.
4. Start a sprint: "MCP" turns green.
5. Stop the sprint: "MCP" returns to gray.
6. The word "MCP" has no prefix label or status text — just the three letters.

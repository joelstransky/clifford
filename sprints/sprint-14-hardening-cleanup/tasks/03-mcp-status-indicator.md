# Task 3: MCP Status Indicator

## Title
Add an MCP status label to the activity tab status pane, color-coded by server state

## Context
The MCP server runs inside the spawned OpenCode process. The TUI currently has no visibility into whether MCP is active or not. Adding a simple "MCP" label to the status pane gives the user a quick visual indicator.

## Step-by-Step

### 1. Add MCP state tracking to `DashboardController.ts`

Add a new property:

```typescript
public mcpStatus: 'idle' | 'running' | 'error' = 'idle';
```

Update the `wireRunnerEvents()` or equivalent initialization to set this state:
- On `runner.on('start', ...)` → set `mcpStatus = 'running'` (the MCP server starts with the agent process).
- On `runner.on('stop', ...)` → set `mcpStatus = 'idle'`.
- If the runner emits an error related to MCP (check if there's an error event or if halt covers this), set `mcpStatus = 'error'`.

The MCP server lifecycle is tied to the agent process — when OpenCode spawns, the MCP server starts (configured in `opencode.json`). When the process exits, MCP stops. So `running` maps to `isRunning` and `idle` maps to not running. The `error` state would be for future use if we detect MCP communication failures.

For now, a simple mapping is fine:
```typescript
public get mcpStatus(): 'idle' | 'running' | 'error' {
  return this.isRunning ? 'running' : 'idle';
}
```

### 2. Add MCP label to the status pane in `components.ts`

In `createActivityView()`, add a new `TextRenderable` for the MCP status inside the `statusRow`:

```typescript
const infoMcpText = new TextRenderable(renderer, {
  id: 'info-mcp', content: '', width: '100%',
});
statusRow.add(infoMcpText);
```

Add `infoMcpText` to the `ActivityViewComponents` interface and return it.

**Important:** The status row height is currently 7. Adding a fifth line of text may require increasing this to 9. Test visually — if the text is clipped, bump the height.

### 3. Render the MCP label in `Dashboard.ts`

In the `updateDisplay()` function, where the status pane content is set (the `if (isRunning || ctrl.sprintStartTime)` block), add:

```typescript
const mcpColor = ctrl.mcpStatus === 'running' ? COLORS.success
  : ctrl.mcpStatus === 'error' ? COLORS.error
  : COLORS.dim;
infoMcpText.content = t`${bold(fg(COLORS.primary)('MCP:    '))}${fg(mcpColor)(ctrl.mcpStatus.toUpperCase())}`;
```

In the else branch (no sprint running):
```typescript
infoMcpText.content = t`${bold(fg(COLORS.primary)('MCP:    '))}${fg(COLORS.dim)('IDLE')}`;
```

Note: Align the label width with the other labels (Sprint, Task, Elapsed, Progress all use ~8 chars for the label).

### 4. Destructure `infoMcpText` in `Dashboard.ts`

Update the destructuring of `createActivityView()` to include `infoMcpText`.

## Verification
1. `npm run build` succeeds.
2. Launch TUI, switch to Activity tab. Verify "MCP: IDLE" appears in the status pane in gray.
3. Start a sprint. Verify "MCP: RUNNING" appears in green.
4. Stop the sprint. Verify it returns to "MCP: IDLE" in gray.

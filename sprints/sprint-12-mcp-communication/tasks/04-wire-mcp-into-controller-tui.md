# Task 4: Wire MCP Server into DashboardController & TUI

## Title
Replace CommsBridge event handling in controller and dashboard with MCP file-based IPC

## Context
`DashboardController` subscribes to `bridge.on('block')` and `bridge.on('resolve')` events. `Dashboard.ts` passes the bridge instance around. With the MCP file-based IPC approach from Task 3, the controller needs to respond to runner events instead.

The blocker UI (swap activity panel ↔ blocker panel) stays exactly as-is. Only the *wiring* changes.

## Dependencies
- Task 3 (runner now emits `'halt'` events from MCP state file detection)

## Step-by-Step

### 1. Update `DashboardController` Constructor

**Remove:** `bridge: CommsBridge` parameter.
**Add:** Keep reference to runner only. The runner now emits `'halt'` events when it detects `.clifford/mcp-block.json`.

### 2. Replace Bridge Event Wiring in `wireBridgeEvents()`

**Delete** the entire `wireBridgeEvents()` method and its call from the constructor/init.

The `'halt'` handler already exists in `wireRunnerEvents()` (though it was dead code before — the runner never emitted `'halt'`). Now it's live. Verify it:
- Sets `this.activeBlocker = data`
- Clears `chatInput`
- Emits `'blocker-active'`
- Switches to activity tab

If the existing `'halt'` handler is missing any of these, add them.

### 3. Remove `bridge.on('resolve')` Handling

The old flow: bridge emits `'resolve'` → controller clears blocker → controller restarts runner after 500ms.

**New flow:** When the human submits a response, the controller writes the response file. The MCP server picks it up, the agent continues, and eventually exits. The runner's normal exit handling takes over. **No restart needed.**

### 4. Update `handleBlockerSubmit()`

**Old behavior:**
1. If response != "Done": append to task `.md` file.
2. Clear `activeBlocker`, `chatInput`.
3. Call `bridge.resume()`.
4. Emit `'blocker-cleared'`.
5. After 500ms: restart `runner.run()`.

**New behavior:**
1. If response != "Done": append to task `.md` file (keep this — it's useful supplemental info).
2. Write response to `.clifford/mcp-response.json`:
   ```typescript
   fs.writeFileSync(
     path.join(this.cliffordDir, 'mcp-response.json'),
     JSON.stringify({ response: chatInput.trim() }),
     'utf8'
   );
   ```
3. Clear `activeBlocker`, `chatInput`.
4. Emit `'blocker-cleared'`.
5. **Do NOT restart the runner.** The agent is still alive and will continue when the MCP server resolves the tool call.

Add a `cliffordDir` property to the controller (the `.clifford/` directory path), derived from the sprint dir or passed in.

### 5. Update `handleBlockerDismiss()` (Esc key)

**Old behavior:** Clear blocker, call `bridge.resume()`, stop runner.

**New behavior:** 
1. Write a special dismissal response: `{ "response": "__DISMISSED__" }` to `.clifford/mcp-response.json`.
2. Clear `activeBlocker`, `chatInput`.
3. Emit `'blocker-cleared'`.
4. The MCP server should return a message like "The human dismissed this request. Stop working on this task and move on." to the agent. Or: stop the runner entirely, which kills the agent process.

Simplest approach: just call `runner.stop()` as before. The agent process dies, the MCP server dies with it.

### 6. Remove All CommsBridge References from `DashboardController.ts`

- Remove `import { CommsBridge }` 
- Remove `private bridge: CommsBridge` property
- Remove `bridge.resume()`, `bridge.setBlockerContext()` calls
- Remove the entire `wireBridgeEvents()` method

### 7. Update `Dashboard.ts`

- Remove `CommsBridge` import
- Remove `bridge` parameter from `launchDashboard()`
- Update the function signature: `launchDashboard(sprintDir: string, runner: SprintRunner)`
- The controller constructor call drops the bridge arg

### 8. Update `src/index.ts`

- Remove CommsBridge instantiation
- Remove bridge from `launchDashboard()` call
- The runner no longer takes a bridge either

## Verification

1. `npm run build` succeeds.
2. `grep -r "CommsBridge\|bridge" src/tui/` returns nothing.
3. `grep -r "CommsBridge\|bridge" src/index.ts` returns nothing (except possibly comments, which should also be cleaned up).
4. TUI starts normally.
5. When a block is detected (`.clifford/mcp-block.json` appears), the BLOCKER panel swaps in with task/reason/question displayed.
6. Typing a response and pressing Enter writes `.clifford/mcp-response.json` and the blocker panel dismisses.
7. Pressing Esc kills the runner and clears the blocker.

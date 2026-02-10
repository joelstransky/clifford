# Task 3: Wire MCP Server into SprintRunner

## Title
Replace CommsBridge with MCP server in sprint execution loop

## Context
`src/utils/sprint.ts` (`SprintRunner`) currently depends heavily on `CommsBridge` for:
- Detecting interactive prompts and triggering blocks (`bridge.triggerBlock()`)
- Polling `bridge.checkPaused()` in a sleep loop while blocked
- Killing the agent child process on resolve (`bridge.killActiveChild()`)
- Starting/stopping the bridge HTTP server around the sprint loop

All of this changes with MCP. The agent now calls `request_help` natively — a blocking MCP tool call. The agent process stays alive while blocked. No polling. No kill-and-restart. The sprint runner just needs to:
1. Ensure the MCP server entry point is available (it's spawned by OpenCode, not by us).
2. Spawn OpenCode and wait for it to exit.
3. Listen for MCP server events to know when blocks happen.

## Dependencies
- Task 1 (MCP server exists)
- Task 2 (opencode.json is configured so OpenCode spawns the MCP server)

## Step-by-Step

### 1. Understanding the New Architecture

**Old flow:**
```
SprintRunner spawns OpenCode → Agent curls /block → Bridge emits 'block' → 
Human responds → Bridge kills agent → SprintRunner restarts agent
```

**New flow:**
```
SprintRunner spawns OpenCode → OpenCode spawns MCP server (via opencode.json) →
Agent calls request_help tool → MCP server emits 'block' event → 
Human responds → MCP server resolves tool call → Agent continues → Agent exits normally
```

**Key insight:** The SprintRunner no longer manages the MCP server lifecycle directly. OpenCode spawns it. But the TUI needs to receive events from it. 

**Problem:** If OpenCode spawns the MCP server as a child process, how does the TUI (running in the Clifford parent process) get events from it?

**Solution:** The MCP server entry point (`mcp-entry.ts`) communicates with the parent Clifford process via IPC, a local socket, or by writing to a known file. However, the simplest approach for Sprint 12:

**Alternative simpler architecture:** Clifford spawns the MCP server as a child process itself, piping its stdio. Then Clifford tells OpenCode to connect to an *already running* MCP server. But stdio MCP transport requires the client (OpenCode) to own the stdin/stdout of the server process. This means OpenCode MUST be the one spawning it.

**Pragmatic approach for this sprint:** The MCP server writes block events to a well-known file (e.g., `.clifford/mcp-state.json`). The SprintRunner polls this file (similar to how it polls the manifest). When the human responds, the TUI writes the response to another file (`.clifford/mcp-response.json`), and the MCP server watches for it.

**Even simpler:** Use a local TCP/IPC channel between the MCP server process and the Clifford TUI. The MCP server opens a small TCP connection back to Clifford on a known port to relay events.

**Recommended approach:** Keep it simple with file-based IPC for Sprint 12:
1. MCP server writes `{ "type": "block", "task": "...", "reason": "...", "question": "..." }` to `.clifford/mcp-block.json` when `request_help` is called.
2. MCP server polls `.clifford/mcp-response.json` for the human's response.
3. When response file appears, MCP server reads it, deletes both files, and returns the response to the agent.
4. SprintRunner polls `.clifford/mcp-block.json` to detect blocks (just like it polls `manifest.json`).

This is dead simple, works cross-platform, and avoids any networking. We can upgrade to proper IPC in a future sprint.

### 2. Update `src/utils/mcp-server.ts`

Add file-based IPC to the MCP server:

```typescript
// In the request_help handler:
// 1. Write block data to .clifford/mcp-block.json
// 2. Poll for .clifford/mcp-response.json every 500ms
// 3. When found, read response, delete both files, return to agent

// Location: process.env.CLIFFORD_PROJECT_ROOT or process.cwd()
```

Add `resolveViaFile(response: string)` static helper that the TUI calls:
```typescript
// Writes { "response": "..." } to .clifford/mcp-response.json
```

### 3. Modify `SprintRunner` Constructor

**Remove:** `bridge: CommsBridge` parameter.
**Add:** `mcpStateDir: string` — path to the `.clifford/` directory where MCP state files live.

Update all callers (there should be one: `src/index.ts` or `Dashboard.ts`).

### 4. Modify `SprintRunner.run()`

**Remove:**
- `bridge.start()` / `bridge.stop()` calls
- `bridge.checkPaused()` polling loop
- `bridge.triggerBlock()` calls from `checkForPrompts()`
- `bridge.setActiveChild()` / `bridge.killActiveChild()` calls
- All imports of `CommsBridge`

**Keep:**
- The main `while (hasPendingTasks && isRunning)` loop
- Task discovery from manifest
- Process spawning logic
- stdout/stderr capture and event emission
- Manifest polling for task completion detection

**Add:**
- Poll `.clifford/mcp-block.json` in the main loop (alongside manifest polling). When detected, emit `'halt'` event with the block data. This is how the TUI learns about blocks.
- On process exit: clean up any stale MCP state files.

**Simplify exit handling:**
- If agent exits with code 0 and task status changed → success, continue loop.
- If agent exits with code 0 and task status unchanged → idle exit, break.
- If agent exits with non-zero → error, break.
- No more "is the bridge paused?" checks.

### 5. Update Prompt Injection

Currently the prompt injected into the agent includes `CLIFFORD_BRIDGE_PORT: <port>`. Remove this line. The agent discovers the `request_help` tool via MCP protocol — no port needed.

Keep `CURRENT_SPRINT_DIR: <dir>` as the agent still needs to know which sprint to work on.

Also inject `CLIFFORD_PROJECT_ROOT: <dir>` so the MCP server knows where `.clifford/` is (pass as env var when OpenCode spawns the MCP server, via the opencode.json config).

### 6. Remove Interactive Prompt Detection (Optional)

The `checkForPrompts()` function monitors agent stdout for patterns like "Confirm? (y/n)". With MCP, the agent should use `request_help` instead. However, auto-detection is still a useful safety net for cases where the agent encounters prompts it doesn't understand. 

**Decision:** Keep `checkForPrompts()` but instead of calling `bridge.triggerBlock()`, emit the `'halt'` event directly. The TUI will handle it the same way.

## Verification

1. `npm run build` succeeds with zero CommsBridge references in `sprint.ts`.
2. `grep -r "CommsBridge\|bridge" src/utils/sprint.ts` returns nothing.
3. Sprint can start and spawn OpenCode successfully.
4. If the agent calls `request_help`, a `.clifford/mcp-block.json` file appears.
5. Writing `.clifford/mcp-response.json` causes the agent to continue.
6. Agent exits cleanly after completing a task.

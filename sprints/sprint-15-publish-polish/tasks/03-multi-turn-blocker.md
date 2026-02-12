# Task 3: Multi-Turn Blocker Conversations

## Title
Allow multiple back-and-forth messages within a single blocker session

## Context
Currently, when the agent calls `request_help`, it sends one question, gets one response, and the blocker is resolved. If the human's response isn't sufficient, the agent would need to call `request_help` again, creating a new blocker session each time. We want to allow a conversational flow within a single blocker — the agent can follow up and the human can respond multiple times before the blocker is fully resolved.

## Step-by-Step

### 1. Understand the current flow

The current `request_help` flow:
1. Agent calls `request_help` MCP tool → MCP server writes `mcp-block.json`, emits `'block'`, starts polling `mcp-response.json`.
2. TUI detects block (via SprintRunner polling `readBlockFile()`), shows blocker UI.
3. Human types response, TUI writes `mcp-response.json`.
4. MCP server reads response, cleans up files, resolves the Promise, returns response text to agent.
5. Agent continues working.

The limitation: the MCP tool call resolves after one response. The agent gets the text and the tool returns.

### 2. Design the multi-turn approach

Since MCP tool calls are request/response (the tool must eventually return), true multi-turn within a *single* tool call would mean the tool keeps blocking until a "final" response is received.

Approach: Change the IPC protocol so responses can be marked as `"continue"` or `"done"`.

**`McpResponseFile` updated:**
```typescript
export interface McpResponseFile {
  response: string;
  action: 'continue' | 'done';
  timestamp: string;
}
```

- `"done"`: Current behavior — the tool resolves and returns the full conversation to the agent.
- `"continue"`: The MCP server accumulates this response, writes a new block file with the accumulated context, and keeps polling. The TUI stays in blocker mode.

### 3. Update `mcp-ipc.ts`

Add `action` field to `McpResponseFile`:
```typescript
export interface McpResponseFile {
  response: string;
  action: 'continue' | 'done';
  timestamp: string;
}
```

Update `writeResponseFile` to accept the action parameter:
```typescript
export function writeResponseFile(projectRoot: string, response: string, action: 'continue' | 'done' = 'done'): void {
```

Update `pollForResponse` to return the full response object instead of just the string:
```typescript
export function pollForResponse(projectRoot: string): Promise<McpResponseFile> {
```

### 4. Update `mcp-server.ts` `request_help` handler

Modify the handler to loop on `"continue"` responses:

```typescript
async ({ task, reason, question }) => {
  const blockData = { task, reason, question };
  this.emit('block', blockData);
  writeBlockFile(this.projectRoot, task, reason, question);

  const messages: string[] = [];

  while (true) {
    const responseData = await pollForResponse(this.projectRoot);
    messages.push(responseData.response);

    if (responseData.action === 'done') {
      this.emit('block-resolved', { task, response: messages.join('\n\n') });
      break;
    }

    // Continue — write a new block file with accumulated context so the TUI knows to keep showing the blocker
    writeBlockFile(this.projectRoot, task, reason, `[Previous messages]\n${messages.join('\n')}\n\n[Awaiting follow-up]`);
    this.emit('block', { task, reason, question: `[Continued conversation]\n${messages.join('\n')}` });
  }

  return { content: [{ type: 'text' as const, text: messages.join('\n\n') }] };
}
```

### 5. Update the TUI blocker submission in `DashboardController.ts`

Currently `handleBlockerSubmit()` writes the response and clears the blocker. Modify it to:

- Default: Enter submits with `action: 'done'` (current behavior preserved).
- New: A different key combo (e.g., Ctrl+Enter or a `[C]ontinue` hint) submits with `action: 'continue'`.

Since terminal key handling for Ctrl+Enter is unreliable, use a simpler approach:
- **Enter** submits with `action: 'continue'` (send message, stay in blocker).
- **Escape** submits with `action: 'done'` (dismiss/finalize the conversation). Actually this conflicts with the current Escape = cancel/dismiss.

Better approach:
- **Enter** submits with `action: 'done'` (default — same as before).
- **Tab** (while in blocker mode) submits with `action: 'continue'` (send and keep chatting).
- Update the blocker footer hint to show: `[Enter] Done  [Tab] Send & Continue  [Esc] Cancel`

### 6. Update `Dashboard.ts` keyboard handler

In the blocker input section, add handling for Tab:

```typescript
if (ctrl.activeBlocker) {
  if (isEnter) {
    ctrl.handleBlockerSubmit('done');
  } else if (key.name === 'tab') {
    ctrl.handleBlockerSubmit('continue');
  } else if (key.name === 'escape') {
    ctrl.handleBlockerDismiss();
  }
  // ... existing backspace and char handling
}
```

### 7. Update `handleBlockerSubmit` in `DashboardController.ts`

```typescript
public handleBlockerSubmit(action: 'continue' | 'done' = 'done'): void {
  if (!this.activeBlocker || this.chatInput.trim().length === 0) return;

  writeResponseFile(this.projectRoot, this.chatInput.trim(), action);

  if (action === 'done') {
    this.activeBlocker = null;
    this.chatInput = '';
    this.emit('blocker-cleared');
  } else {
    // Keep blocker active, clear input for next message
    this.addLog(`You: ${this.chatInput.trim()}`, 'info');
    this.chatInput = '';
  }

  this.emit('state-changed');
}
```

### 8. Update blocker footer hint in `components.ts`

Change the blocker footer text to reflect the new options:
```typescript
const blockerFooterHint = new TextRenderable(renderer, {
  id: 'blocker-footer-hint',
  content: t`\n${dim('[Enter] Done  [Tab] Send & Continue  [Esc] Cancel')}`,
});
```

Also update the dynamic footer hint in `Dashboard.ts` where blocker hotkeys are rendered.

### 9. Update tests

Update any tests in `DashboardController.test.ts` that test `handleBlockerSubmit()` to account for the new `action` parameter. The default should be `'done'` so existing tests should still pass, but verify.

Add a test for `handleBlockerSubmit('continue')` — blocker stays active, input is cleared.

Update `mcp-ipc.test.ts` if the `writeResponseFile` signature changed.

## Verification
1. `npm run build` succeeds.
2. `npm test` passes.
3. Launch TUI, trigger a blocker (or simulate one).
4. Type a message and press Tab — message is sent but the blocker input stays open for follow-up.
5. Type another message and press Enter — blocker resolves and the agent receives all messages.
6. Press Esc — blocker is dismissed without sending.

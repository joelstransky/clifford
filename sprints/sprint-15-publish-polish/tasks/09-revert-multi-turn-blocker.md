# Task 9: Revert Multi-Turn Blocker to Simple Send/Cancel

## Title
Remove Tab-to-continue blocker UX; revert to Enter=send, Esc=cancel

## Context
Task 3 of this sprint added a Tab-to-continue feature for multi-turn blocker conversations. The UX is bad — users shouldn't need to think about Tab vs Enter. The agent can already re-invoke `request_help` if it has a follow-up question, so multi-turn within a single tool call is unnecessary.

Revert the blocker to its pre-Task-3 behavior: Enter sends the response and dismisses the blocker, Esc cancels.

## Step-by-Step

### 1. Revert `McpResponseFile` in `mcp-ipc.ts`

Remove the `action` field. Restore:
```typescript
export interface McpResponseFile {
  response: string;
  timestamp: string;
}
```

Revert `writeResponseFile` to its original signature (no `action` parameter).

Revert `pollForResponse` to return `Promise<string>` (just the response string).

### 2. Revert `request_help` handler in `mcp-server.ts`

Remove the conversation loop. Restore the simple single-response flow:
```typescript
async ({ task, reason, question }) => {
  const blockData = { task, reason, question };
  this.emit('block', blockData);
  writeBlockFile(this.projectRoot, task, reason, question);

  const response = await new Promise<string>((resolve) => {
    this.pending = { data: blockData, resolve };
    pollForResponse(this.projectRoot).then((fileResponse) => {
      if (this.pending?.data === blockData) {
        this.pending = null;
        this.emit('block-resolved', { task: blockData.task, response: fileResponse });
        resolve(fileResponse);
      }
    });
  });

  return { content: [{ type: 'text' as const, text: response }] };
}
```

### 3. Revert `handleBlockerSubmit()` in `DashboardController.ts`

Remove the `action` parameter. Restore:
```typescript
public handleBlockerSubmit(): void {
  if (!this.activeBlocker || this.chatInput.trim().length === 0) return;
  writeResponseFile(this.projectRoot, this.chatInput.trim());
  this.activeBlocker = null;
  this.chatInput = '';
  this.emit('blocker-cleared');
  this.emit('state-changed');
}
```

### 4. Revert keyboard handling in `Dashboard.ts`

Remove Tab handling in blocker mode. Restore:
```typescript
if (ctrl.activeBlocker) {
  if (isEnter) {
    ctrl.handleBlockerSubmit();
  } else if (key.name === 'escape') {
    ctrl.handleBlockerDismiss();
  }
  // ... existing backspace and char handling
}
```

### 5. Revert blocker footer hint

Restore the original hint text:
```typescript
content: t`\n${dim('Type response or "Done" if action taken.  [Enter] Submit  [Esc] Cancel')}`
```

### 6. Revert tests

Remove any tests added for the `action` parameter or multi-turn behavior. Restore original test assertions for `handleBlockerSubmit()` and `writeResponseFile()`.

## Verification
1. `npm run build` succeeds.
2. `npm test` passes.
3. Trigger a blocker. Type a response and press Enter — blocker dismisses, response is sent.
4. Press Esc — blocker cancels.
5. No Tab behavior in blocker mode.

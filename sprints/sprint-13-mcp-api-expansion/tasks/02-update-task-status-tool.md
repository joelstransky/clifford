# Task 2: `update_task_status` MCP Tool

## Title
Add an MCP tool that validates and transitions task status in the sprint manifest

## Context
The Developer agent currently edits `manifest.json` directly to update task statuses. This is fragile — the agent might write malformed JSON, use invalid status strings, or make illegal transitions (e.g., `completed → pending`). The `update_task_status` tool enforces valid transitions and handles all file I/O.

## Step-by-Step

### 1. Register the tool in `src/utils/mcp-server.ts`

```typescript
server.registerTool("update_task_status", {
  description: "Update a task's status in the sprint manifest. Valid transitions: pending→active, active→completed, active→blocked, blocked→active. The tool validates the transition and writes the manifest.",
  inputSchema: {
    sprintDir: z.string().describe("The sprint directory path"),
    taskId: z.string().describe("The task ID to update (e.g., 'task-1')"),
    status: z.enum(["active", "completed", "blocked"]).describe("The new status to set"),
  }
}, handler);
```

### 2. Define valid transitions

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  'pending':   ['active'],
  'active':    ['completed', 'blocked'],
  'blocked':   ['active'],
  'completed': [],  // terminal state — no going back
  'pushed':    [],  // terminal state
};
```

### 3. Handler implementation

1. Read `manifest.json` from the sprint directory.
2. Find the task by `taskId`.
3. Check if the transition is valid: `VALID_TRANSITIONS[currentStatus].includes(newStatus)`.
4. If invalid → return error: `"Invalid transition: <current> → <new>. Allowed: [<list>]"`
5. If valid → update the task's status.
6. Write the manifest back to disk with `JSON.stringify(manifest, null, 2)`.
7. Return success:

```typescript
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      success: true,
      taskId,
      previousStatus: currentStatus,
      newStatus: status,
    })
  }]
};
```

### 4. Error cases

- Task not found → `"Task '<taskId>' not found in manifest"`
- Manifest not found → `"Sprint manifest not found at <path>"`
- Invalid transition → detailed error with allowed transitions
- File write failure → `"Failed to write manifest: <error>"`

### 5. Emit event for TUI

After a successful update, the TUI's manifest poller will pick it up on the next 1-second tick. No additional event emission is needed from the MCP server for this — the polling mechanism in `DashboardController` already detects status changes and logs them.

## Verification

1. `npm run build` succeeds.
2. `npm test` passes.
3. Write unit tests:
   - Valid transition `pending → active` succeeds and manifest file is updated.
   - Valid transition `active → completed` succeeds.
   - Invalid transition `completed → pending` returns error.
   - Invalid transition `pending → completed` returns error (must go through active).
   - Nonexistent task ID returns error.
   - Nonexistent sprint dir returns error.

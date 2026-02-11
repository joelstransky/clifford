# Task 4: `complete_sprint` MCP Tool

## Title
Add an MCP tool that marks a sprint as completed after validating all tasks are done

## Context
The agent currently edits `manifest.json` to set `"status": "completed"`. This tool validates that all tasks are actually done before allowing the sprint to be marked complete — preventing premature completion.

## Step-by-Step

### 1. Register the tool in `src/utils/mcp-server.ts`

```typescript
server.registerTool("complete_sprint", {
  description: "Mark the current sprint as completed. Only succeeds if all tasks have status 'completed' or 'pushed'. Call this after finishing the final task.",
  inputSchema: {
    sprintDir: z.string().describe("The sprint directory path"),
    summary: z.string().optional().describe("Optional completion summary"),
  }
}, handler);
```

### 2. Handler implementation

1. Read `manifest.json` from the sprint directory.
2. Check all tasks: every task must have status `completed` or `pushed`.
3. If any task is still `pending`, `active`, or `blocked`:

```typescript
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      success: false,
      reason: `Cannot complete sprint: ${pendingCount} task(s) not finished`,
      tasks: manifest.tasks.map(t => ({ id: t.id, status: t.status })),
    })
  }]
};
```

4. If all tasks are done:
   - Set `manifest.status = "completed"`.
   - Write the manifest.
   - Return success:

```typescript
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      success: true,
      sprintId: manifest.id,
      sprintName: manifest.name,
      completedAt: new Date().toISOString(),
      summary: summary || null,
      taskCount: manifest.tasks.length,
    })
  }]
};
```

### 3. Guard against double-completion

If `manifest.status` is already `"completed"`, return a success-like response rather than an error:

```typescript
{
  success: true,
  sprintId: manifest.id,
  note: "Sprint was already marked as completed"
}
```

### 4. Error handling

- Manifest not found → error message.
- File write failure → error message with details.

## Verification

1. `npm run build` succeeds.
2. `npm test` passes.
3. Write unit tests:
   - Sprint with all tasks `completed` → success, manifest status set to `completed`.
   - Sprint with 1 task still `pending` → failure with task list.
   - Sprint already `completed` → success with note.
   - Nonexistent sprint dir → error.

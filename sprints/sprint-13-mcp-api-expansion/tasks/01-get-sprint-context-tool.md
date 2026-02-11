# Task 1: `get_sprint_context` MCP Tool

## Title
Add a read-only MCP tool that returns the full sprint and current task context

## Context
Currently the Developer agent reads `manifest.json` and task markdown files directly from disk. This couples the agent to the `.clifford/` filesystem layout. We want to move toward a model where the agent interacts with `.clifford/` exclusively through MCP tools.

`get_sprint_context` is the first and most critical tool — it gives the agent everything it needs to orient itself at the start of a task without touching the filesystem.

## Step-by-Step

### 1. Register the tool in `src/utils/mcp-server.ts`

Add a new tool registration alongside the existing `request_help` tool:

```typescript
server.registerTool("get_sprint_context", {
  description: "Returns the current sprint manifest, the next pending task's content, and any human guidance from previous attempts. Call this at the start of each task to understand what to do.",
  inputSchema: {
    sprintDir: z.string().describe("The sprint directory path (from CURRENT_SPRINT_DIR)")
  }
}, handler);
```

### 2. Handler implementation

The handler should:

1. Read `manifest.json` from the given sprint directory.
2. Identify the "current task" — the first task with status `pending` or `active`.
3. Read the current task's markdown file content.
4. Check ASM storage (`getMemory(taskId)`) for any human guidance from previous attempts.
5. Return a structured response:

```typescript
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      sprint: {
        id: manifest.id,
        name: manifest.name,
        status: manifest.status,
        tasks: manifest.tasks,  // full task list with statuses
      },
      currentTask: {
        id: task.id,
        file: task.file,
        status: task.status,
        content: taskMarkdown,  // full markdown content of the task file
      },
      guidance: memory ? {
        previousQuestion: memory.question,
        humanResponse: memory.answer,
      } : null,
      sprintDir: sprintDir,
    }, null, 2)
  }]
};
```

### 3. Resolve paths safely

The sprint directory could be relative (e.g., `.clifford/sprints/sprint-13`) or absolute. The handler must resolve it relative to `process.cwd()` (which is the project root when OpenCode spawns the MCP server).

Use `path.resolve(process.cwd(), sprintDir)` consistently.

### 4. Error handling

- If `manifest.json` doesn't exist → return error content: `"Sprint manifest not found at <path>"`
- If no pending/active task → return the manifest but with `currentTask: null` and a note: `"All tasks completed or no pending tasks"`
- If the task file doesn't exist → return the task metadata but `content: null`

### 5. Import dependencies

The handler needs:
- `fs` and `path` for file reading
- `getMemory` from `../utils/asm-storage.js`

Since the MCP server runs as a standalone process (`mcp-entry.ts`), these imports are fine.

## Verification

1. `npm run build` succeeds.
2. `npm test` passes.
3. Write a unit test in `src/utils/mcp-server.test.ts` that verifies:
   - The tool is registered (check tool listing).
   - Given a valid sprint dir with a manifest and task file, it returns the expected structure.
   - Given a sprint dir with no pending tasks, `currentTask` is null.
   - Given a nonexistent sprint dir, it returns an error message.

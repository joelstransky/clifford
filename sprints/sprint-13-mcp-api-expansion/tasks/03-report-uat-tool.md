# Task 3: `report_uat` MCP Tool

## Title
Add an MCP tool that appends structured UAT entries to `.clifford/uat.json`

## Context
UAT reporting has been ad-hoc — sometimes a `uat.md` file, sometimes nothing. A structured `uat.json` makes results machine-readable, consistent, and renderable in the TUI (future sprint). The agent should log its verification results through this tool after completing each task.

## Step-by-Step

### 1. Register the tool in `src/utils/mcp-server.ts`

```typescript
server.registerTool("report_uat", {
  description: "Log a UAT (User Acceptance Testing) entry after completing task verification. Records what was tested and the result.",
  inputSchema: {
    taskId: z.string().describe("The task ID this UAT entry is for"),
    description: z.string().describe("Brief description of what was tested"),
    steps: z.array(z.string()).describe("List of verification steps performed"),
    result: z.enum(["pass", "fail", "partial"]).describe("Overall test result"),
    notes: z.string().optional().describe("Additional notes or observations"),
  }
}, handler);
```

### 2. Handler implementation

1. Resolve the `.clifford/` directory from the project root (`process.cwd()`).
2. Read `.clifford/uat.json` if it exists, otherwise start with `[]`.
3. Construct the entry:

```typescript
interface UatEntry {
  taskId: string;
  description: string;
  steps: string[];
  result: 'pass' | 'fail' | 'partial';
  notes?: string;
  timestamp: string;
}
```

4. Append the entry to the array.
5. Write back to `.clifford/uat.json` with `JSON.stringify(entries, null, 2)`.
6. Return:

```typescript
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      success: true,
      taskId,
      result,
      totalEntries: entries.length,
    })
  }]
};
```

### 3. File location

The UAT file lives at `.clifford/uat.json` in the **project root**, not in the sprint directory. This is a project-level log that spans all sprints.

Ensure the `.clifford/` directory exists before writing (it should, since `clifford init` creates it).

### 4. Error handling

- If `.clifford/uat.json` exists but is malformed JSON → log a warning to stderr and start fresh with `[]` (don't lose the new entry because of old corruption).
- If `.clifford/` directory doesn't exist → create it.

### 5. Add `.clifford/uat.json` to `.gitignore`

Update the scaffolder (`src/utils/scaffolder.ts`) to include `uat.json` in the `.gitignore` entries if it's not already there. The existing gitignore entries are:

```
.clifford/state.json
.clifford/asm.json
```

Add:
```
.clifford/uat.json
```

UAT results are ephemeral verification logs, not source artifacts.

## Verification

1. `npm run build` succeeds.
2. `npm test` passes.
3. Write unit tests:
   - Calling `report_uat` with valid input creates `.clifford/uat.json` with one entry.
   - Calling it again appends a second entry (doesn't overwrite).
   - The entry has the correct structure including timestamp.
   - Malformed existing JSON is handled gracefully (reset to `[]` + new entry).

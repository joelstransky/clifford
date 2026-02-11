# Task 5: Update Prompt Templates & Agent Permissions

## Title
Rewrite prompt templates to use MCP tools exclusively — forbid direct `.clifford/` writes

## Context
With tools 1–4 in place, the agent has a complete MCP API for sprint lifecycle management. The prompt templates must now instruct the agent to use these tools instead of editing `.clifford/` files directly. This is the enforcement layer — the tools exist, but the agent won't use them unless told to.

## Dependencies
- Tasks 1–4 must be complete (all tools must exist before referencing them).

## Step-by-Step

### 1. Rewrite `templates/.clifford/prompt.md`

This is the main instruction file injected into the agent's prompt. Replace all direct filesystem manipulation instructions with MCP tool calls.

**Remove:**
- Any instructions to `read manifest.json` directly
- Any instructions to edit/write `manifest.json`
- Any instructions to create or edit `uat.md` or `uat.json`
- Any instructions to set task status by editing files
- Any instructions to set sprint status by editing files

**Add the following MCP tool usage section:**

```markdown
## MCP Tools — Your Interface to Clifford

You have access to the following MCP tools. Use them for ALL sprint lifecycle operations.
**NEVER write directly to any file inside `.clifford/`.** All state management goes through MCP tools.

### `get_sprint_context`
Call this FIRST at the start of each task. It returns:
- The full sprint manifest (all tasks and their statuses)
- The current task's markdown content (your instructions)
- Any human guidance from previous attempts

Input: `{ sprintDir: "<CURRENT_SPRINT_DIR value>" }`

### `update_task_status`
Use this to transition a task through its lifecycle:
- `pending → active`: Call when you START working on a task
- `active → completed`: Call when you FINISH a task and have verified it
- `active → blocked`: Call if you cannot proceed (prefer `request_help` instead)

Input: `{ sprintDir: "...", taskId: "task-1", status: "active" }`

### `report_uat`
Call this after completing each task to log your verification results.

Input: `{ taskId: "task-1", description: "...", steps: ["step1", "step2"], result: "pass" }`

### `complete_sprint`
Call this AFTER the final task is completed to mark the entire sprint as done.

Input: `{ sprintDir: "...", summary: "Optional summary" }`

### `request_help`
Call this when you are genuinely stuck and need human input.

Input: `{ task: "task-1", reason: "...", question: "..." }`

## Task Lifecycle (Using MCP Tools)

1. Call `get_sprint_context` to read your current task.
2. Call `update_task_status` with `status: "active"` to mark the task as started.
3. Implement the task according to its instructions.
4. Verify your work (run tests, lint, build as specified).
5. Call `report_uat` with your verification results.
6. Call `update_task_status` with `status: "completed"`.
7. If this was the last task, call `complete_sprint`.

## IMPORTANT: File Restrictions

- **NEVER** create, edit, or delete files inside `.clifford/` directly.
- **NEVER** edit `manifest.json` directly. Use `update_task_status` and `complete_sprint`.
- **NEVER** create `uat.md` or `uat.json` directly. Use `report_uat`.
- You MAY read files inside `.clifford/` if needed for context, but prefer `get_sprint_context`.
- You MAY read and write files in `src/`, `templates/`, `tests/`, and other project directories — that's your job.
```

**Keep** all other prompt content that's still relevant (project structure, coding standards, git workflow, etc.).

### 2. Update `templates/.opencode/agent/Developer.md`

This is the Developer agent persona template. Add or update:

- A brief mention that the agent has MCP tools available for sprint management.
- A hard rule: "Never write to `.clifford/` directly. Use MCP tools."
- Remove any references to the old HTTP bridge, `curl` commands, or manual manifest editing.

### 3. Update `.opencode/agent/Developer.md` (Clifford project's own)

Same changes as above for the project's own Developer persona. This one is used when developing Clifford itself.

### 4. Update `AGENTS.md`

The "Task Lifecycle" section in `AGENTS.md` currently says:

```
2. **Activation**: Mark task `active` in `manifest.json` before beginning work.
```

Update this to reference MCP tools:

```
2. **Activation**: Call `update_task_status` with `status: "active"`.
```

And similarly for completion and other lifecycle steps.

Also update the "Communication Protocol (MCP)" section if it still references the old bridge.

## Verification

1. `npm run build` succeeds.
2. `npm run lint` passes.
3. Read through `templates/.clifford/prompt.md` and verify:
   - No references to editing `manifest.json` directly.
   - All 5 MCP tools are documented.
   - The "NEVER write to `.clifford/`" rule is prominent.
4. Read through `templates/.opencode/agent/Developer.md` and verify consistency.
5. `grep -rn "edit.*manifest\|write.*manifest\|fs.write.*manifest" templates/` returns nothing.

# Task 3: Update Agent Workflow for UAT and Changelog

## Title
Update Developer agent persona and prompt to integrate new UAT and changelog steps

## Context
Tasks 1 and 2 changed how UAT reporting and changelog updates work. The agent instructions need to reflect these changes so the developer agent knows to call `report_uat` with the new schema (writing to the sprint's `uat.md`) and `update_changelog` after completing a sprint.

## Step-by-Step

### 1. Update `templates/.opencode/agent/Developer.md`

#### MCP Tools section

Update the `report_uat` entry:
```
- `report_uat` — Writes verification steps for the completed task to the sprint's `uat.md`. 
  Call this as the LAST step of every task, before `update_task_status(completed)`.
  Input: `{ sprintDir, taskId, title, changes, verificationSteps }`
```

Add the `update_changelog` entry:
```
- `update_changelog` — Appends a sprint summary to the project's CHANGELOG.md.
  Call this after `complete_sprint`, as the very last action. Only called once per sprint.
  IMPORTANT: Only include entries for features added, features removed, or breaking changes.
  Input: `{ sprintId, sprintName, entries }`
```

#### Task Lifecycle section

Update the lifecycle to make the order explicit:

```
1. Call `get_sprint_context` to read your current task.
2. Call `update_task_status` with `status: "active"`.
3. Implement the task.
4. Verify your work (`npm run build && npm test && npm run lint`).
5. Call `report_uat` with what changed and how to verify it.
6. Call `update_task_status` with `status: "completed"`.
7. If this was the LAST task:
   a. Call `complete_sprint`.
   b. Call `update_changelog` with a summary of the sprint's changes.
      (Only if there were features added, removed, or breaking changes).
```

#### Remove outdated references

Remove any mention of `.clifford/uat.json`. The UAT data now lives in `<sprintDir>/uat.md`.

### 2. Update `.opencode/agent/Developer.md` (Clifford's own)

Apply the same changes.

### 3. Update `templates/.clifford/prompt.md`

The prompt should remain minimal. Just verify it still defers to the Developer persona and doesn't need any changes. If it references `report_uat` by name, ensure it doesn't describe the old schema.

### 4. Update file restriction rules

In the Developer persona, the rule currently says:
```
- **NEVER** create `uat.md` or `uat.json` directly. Use `report_uat`.
```

Update to:
```
- **NEVER** create or edit `uat.md` directly. Use `report_uat`.
- **NEVER** create or edit `CHANGELOG.md` directly. Use `update_changelog`.
```

Remove the `uat.json` reference entirely.

## Verification
1. `npm run build` succeeds.
2. Read `templates/.opencode/agent/Developer.md` — confirm:
   - `report_uat` documents the new schema (sprintDir, taskId, title, changes, verificationSteps).
   - `update_changelog` is documented with its schema.
   - Task lifecycle shows `report_uat` before `update_task_status(completed)`.
   - Last task lifecycle shows `update_changelog` after `complete_sprint`.
   - No references to `.clifford/uat.json`.
3. Read `.opencode/agent/Developer.md` — same checks.
4. Read `templates/.clifford/prompt.md` — still minimal, no stale references.

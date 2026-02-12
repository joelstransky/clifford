# Task 1: Deduplicate Prompt and Developer Agent Instructions

## Title
Trim prompt.md to a minimal kickstart; let Developer.md own all behavioral guidance

## Context
The `templates/.clifford/prompt.md` (injected into every OpenCode session) and `templates/.opencode/agent/Developer.md` (the agent persona) have significant overlap — both document MCP tools, task lifecycle, file restrictions, and communication protocol. The prompt exists solely to get OpenCode to *do something* (without it, the agent just sits idle). All behavioral guidance belongs in the Developer persona.

## Step-by-Step

### 1. Rewrite `templates/.clifford/prompt.md`

Replace the entire contents with a minimal kickstart prompt. It should:

- Tell the agent its sprint directory is provided as `CURRENT_SPRINT_DIR`.
- Instruct it to call `get_sprint_context` with that directory to get its task.
- Tell it to follow the Developer agent persona for all behavioral guidance.
- Nothing else. No MCP tool docs, no lifecycle steps, no file restrictions.

Target length: ~10-15 lines max. Example shape:

```markdown
# Clifford Sprint Task

Your sprint directory is provided as `CURRENT_SPRINT_DIR` in the user message.

1. Call the `get_sprint_context` MCP tool with this directory to retrieve your current task.
2. Follow the instructions in the task and the Developer agent guidelines.
3. When finished, use `update_task_status` to mark the task as `completed`.

Refer to your Developer agent persona for full workflow details, MCP tool usage, and project rules.
```

### 2. Ensure `templates/.opencode/agent/Developer.md` is comprehensive

Review the Developer persona. It should be the single source of truth for:
- All 5 MCP tool descriptions and usage
- Task lifecycle (get context → activate → implement → verify → report → complete)
- File restrictions (no writing to `.clifford/`, no git commit)
- Communication protocol (`request_help`)
- Verification expectations (`npm run build && npm test && npm run lint`)

The current Developer.md already covers most of this. Verify nothing was lost and fill any gaps. Do NOT duplicate what's in prompt.md — prompt.md defers to Developer.md.

### 3. Update Clifford's own `.opencode/agent/Developer.md`

Apply the same changes to the non-template version at `.opencode/agent/Developer.md` so Clifford's own agent stays aligned.

## Verification
1. `npm run build` succeeds.
2. Read `templates/.clifford/prompt.md` — it should be under 15 lines with no MCP tool documentation.
3. Read `templates/.opencode/agent/Developer.md` — it should contain all MCP tool docs, lifecycle, restrictions.
4. No behavioral guidance is lost — everything from the old prompt.md exists in Developer.md.

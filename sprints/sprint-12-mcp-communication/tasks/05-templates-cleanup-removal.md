# Task 5: Templates, Cleanup & Removal

## Title
Update prompt templates, delete CommsBridge, remove dead code

## Context
With tasks 1–4 complete, the MCP communication layer is functional. This task cleans house: update all prompt templates to reference MCP tools instead of HTTP endpoints, delete the CommsBridge entirely, remove the `clifford resolve` CLI command, and remove all AFK/Telegram references.

## Dependencies
- Tasks 1–4 must be complete.

## Step-by-Step

### 1. Rewrite `templates/.clifford/prompt.md`

Remove ALL references to:
- `CLIFFORD_BRIDGE_PORT`
- `POST http://localhost:<port>/block`
- `curl` commands
- "phone home" protocol
- "exit immediately after sending the block request"

Replace with MCP tool instructions:

```markdown
## Communication Protocol

When you encounter a blocker, need clarification, or require human input:

1. Use the `request_help` MCP tool. Provide:
   - `task`: The current task ID (e.g., "task-3")
   - `reason`: A brief description of what's blocking you
   - `question`: The specific question you need answered

2. The tool will block until the human responds. **Do NOT exit.** Wait for the response.

3. When you receive the response, incorporate the guidance and continue working.

4. Update the task status to `blocked` in the manifest ONLY if the tool returns a dismissal message.
```

Keep all other prompt content (manifest format, task lifecycle, verification instructions, etc.).

### 2. Rewrite `templates/.opencode/agent/Developer.md`

Same changes: remove HTTP/curl references, add MCP tool usage instructions.

### 3. Update `.opencode/agent/developer.md` (Project's Own)

This is the Clifford project's own developer agent persona (used when developing Clifford itself). Update it to remove bridge references if any exist. This file is NOT a template — it's specific to this repo.

### 4. Delete `src/utils/bridge.ts`

Remove the entire file. It is no longer imported anywhere after tasks 3 and 4.

### 5. Remove `clifford resolve` CLI Command

In `src/index.ts`, the `clifford resolve <response>` command sends an HTTP POST to the bridge. Delete this command registration entirely. With MCP, the human responds through the TUI's blocker panel — there's no need for a CLI command.

If there's also a `clifford block` or `clifford status` command that references the bridge, remove those too.

### 6. Remove AFK/Telegram Code

The `AFKManager` is imported and used by CommsBridge. With CommsBridge gone, check if `AFKManager` or any Telegram-related code is referenced anywhere else:

- If `AFKManager` is only used by bridge.ts → delete the file (likely `src/utils/afk.ts` or similar).
- If there's a `clifford afk` command → leave the command registration stub but remove the bridge dependency. Or remove it entirely if it doesn't make sense without the bridge.
- Remove any `telegram_config.json` references from the scaffolder if present.

### 7. Remove `axios` Dependency (If Possible)

`axios` was listed as a production dependency. Check if it's still used anywhere after removing the bridge and AFK code. The `clifford resolve` command may have been the only consumer. If nothing imports axios, remove it:

```bash
npm uninstall axios
```

### 8. Update `AGENTS.md`

The "Communication Bridge" section documents the `POST /block` endpoint and the phone-home protocol. Rewrite this section:

```markdown
### Communication Protocol (MCP)
- The Developer agent communicates with Clifford via the `request_help` MCP tool.
- Clifford provides an MCP server that OpenCode connects to automatically.
- When the agent calls `request_help`, the TUI displays a blocker panel.
- The human types a response, which is returned to the agent via the tool call.
- The agent stays alive throughout this process — no restart cycle.
```

Also update the "Task Lifecycle" section if it references bridge/block endpoints.

### 9. Clean Up Imports

Run `npm run build` and fix any remaining import errors. Search for:
```bash
grep -r "CommsBridge\|bridge\|/block\|/resolve\|phone.home\|AFKManager\|afk" src/
```
Every hit should be resolved — either removed or updated.

### 10. Update Sprint Task Templates

Check `sprints/sprint-02-comms-afk/` for references to the old bridge. These are historical and should be left as-is (they document what was done in past sprints). But ensure no active sprint references stale code.

## Verification

1. `npm run build` succeeds with no errors.
2. `npm run lint` passes.
3. `npm test` passes (update or remove any tests that reference CommsBridge).
4. The following search returns NO results in `src/`:
   ```bash
   grep -rn "CommsBridge\|bridge\.ts\|/block\|/resolve\|phone.home\|AFKManager\|BRIDGE_PORT" src/
   ```
5. `templates/.clifford/prompt.md` contains `request_help` and no `curl` or `/block`.
6. `templates/.opencode/agent/Developer.md` contains `request_help` and no HTTP instructions.
7. `src/utils/bridge.ts` does not exist.
8. `AGENTS.md` documents the MCP protocol, not HTTP bridge.

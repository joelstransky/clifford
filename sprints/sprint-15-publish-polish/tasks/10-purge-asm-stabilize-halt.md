# Task 10: Purge ASM and Stabilize Halt Flow

## Title
Purge Legacy ASM Storage and Stabilize Halt Flow

## Context
Standardize on the "Runner-as-State-Manager" pattern. Remove legacy ASM (Active Sprint Memory) logic, ensure no automatic restarts occur, and use task markdown as the only persistent backup for human guidance. The primary communication path remains the direct "over the wire" MCP tool response.

## Step-by-Step

### 1. Purge ASM Logic
- Delete `src/utils/asm-storage.ts` and `src/utils/asm-storage.test.ts`.
- Remove `asm-storage` imports and calls from:
    - `src/utils/mcp-server.ts`
    - `src/utils/sprint.ts`
    - `src/tui/DashboardController.ts`
- Remove `asm.json` from `scaffolder.ts` and `scripts/clifford-clean.mjs`.

### 2. Stabilize Halt Flow
- In `DashboardController.ts`:
    - Remove the `setTimeout` restart logic in `handleBlockerSubmit`.
    - In `runner.on('stop')`, if `activeBlocker` exists, clear it and the `chatInput`.
- Ensure the agent receives guidance directly via the `request_help` tool return value.

### 3. Implement Markdown Backup
- Update `handleBlockerSubmit` in `DashboardController.ts` to append guidance to the task markdown file under `## Additional Info`.

### 4. Documentation Cleanup
- Remove ASM and automatic restart mentions from `AGENTS.md` and `templates/.opencode/agent/Developer.md`.

## Verification
1. `npm run build` succeeds.
2. `npm test` passes (after removing ASM tests).
3. Trigger a blocker, kill agent process: TUI clears blocker and stops.
4. Trigger a blocker, submit response: Agent receives response directly; task markdown updated with `## Additional Info`.
5. `.clifford/asm.json` is no longer used.

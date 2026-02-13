# Sprint 15 — Publish & Polish — UAT

## Task 1: Deduplicate Prompt and Developer Agent Instructions

### Changes
- **`templates/.clifford/prompt.md`**: Replaced the 79-line prompt (which duplicated MCP tool docs, task lifecycle, file restrictions, and communication protocol) with a minimal 11-line kickstart that defers all behavioral guidance to the Developer agent persona.
- **`templates/.opencode/agent/Developer.md`**: Expanded to be the single source of truth. Added detailed MCP tool descriptions with input schemas, explicit task lifecycle steps, and comprehensive file restrictions (previously only in prompt.md).
- **`.opencode/agent/Developer.md`**: Updated Clifford's own agent persona to match the template version, preserving the `.clifford/sprint-verify.sh` verification command specific to this environment.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 147 tests pass.
3. Run `npm run lint` — no lint errors.
4. Read `templates/.clifford/prompt.md` — confirm it is under 15 lines with no MCP tool documentation, just a kickstart pointing to the Developer persona.
5. Read `templates/.opencode/agent/Developer.md` — confirm it contains all 5 MCP tool descriptions with input schemas, task lifecycle, file restrictions, and communication protocol.
6. Read `.opencode/agent/Developer.md` — confirm it mirrors the template version (with `.clifford/sprint-verify.sh` for verification instead of `npm run build && npm test && npm run lint`).
7. Cross-check: nothing from the old prompt.md is lost — all behavioral guidance now lives in Developer.md.

## Task 2: Restyle MCP Status Indicator

### Changes
- **`src/tui/components.ts`**: Removed the standalone `infoMcpText` TextRenderable. Replaced it with a `mcpLabel` TextRenderable that displays only the word "MCP". Created a new `progressRow` horizontal flex container (`justifyContent: 'space-between'`) that places the progress text on the left and the MCP label on the right. Reduced `statusRow` height from 9 to 8 since MCP no longer takes its own line. Updated the `ActivityViewComponents` interface to export `mcpLabel` instead of `infoMcpText`.
- **`src/tui/Dashboard.ts`**: Replaced all `infoMcpText` references with `mcpLabel`. The MCP indicator now renders as just "MCP" colored by state (green = running, red = error, gray = idle) with no "MCP:" prefix or status text.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 147 tests pass.
3. Launch the TUI and switch to the Activity tab.
4. With no sprint running: confirm "MCP" appears in gray in the lower-right area of the status pane (on the same row as Progress).
5. Start a sprint: confirm "MCP" turns green when the MCP server is running.
6. Stop the sprint: confirm "MCP" returns to gray.
7. Verify the word "MCP" has no prefix label (no "MCP:") and no status text (no "RUNNING"/"IDLE") — just the three letters, colored by state.

## Task 3: Multi-Turn Blocker Conversations

### Changes
- **`src/utils/mcp-ipc.ts`**: Added `action: 'continue' | 'done'` field to `McpResponseFile` interface. Updated `writeResponseFile()` to accept an optional `action` parameter (defaults to `'done'` for backward compatibility). Updated `pollForResponse()` to return the full `McpResponseFile` object instead of just the response string; on `'continue'` actions, only the response file is cleaned up (the block file is preserved so the conversation can continue).
- **`src/utils/mcp-server.ts`**: Rewrote the `request_help` handler to loop on `'continue'` responses. Messages are accumulated in an array. On each `'continue'`, a new block file is written with accumulated context and the loop continues polling. On `'done'`, all messages are joined and returned to the agent as a single response.
- **`src/tui/DashboardController.ts`**: Updated `handleBlockerSubmit()` to accept an `action: 'continue' | 'done'` parameter (defaults to `'done'`). When `action` is `'continue'`, the blocker stays active, the user's message is logged, and the input is cleared for the next message. Task file appending and ASM storage saving only occur on `'done'`.
- **`src/tui/Dashboard.ts`**: Added Tab key handling in blocker mode — Tab calls `handleBlockerSubmit('continue')`, Enter calls `handleBlockerSubmit('done')`. Updated blocker footer hint text to `[Enter] Done  [Tab] Send & Continue  [Esc] Cancel`.
- **`src/tui/components.ts`**: Updated the static blocker footer hint text to match the new key bindings: `[Enter] Done  [Tab] Send & Continue  [Esc] Cancel`.
- **`src/utils/mcp-ipc.test.ts`**: Updated `writeResponseFile` tests to verify the new `action` field. Added tests for explicit `'continue'` and `'done'` actions. Updated `pollForResponse` integration test to assert the full `McpResponseFile` object. Added a test verifying that `'continue'` responses preserve the block file.
- **`src/tui/DashboardController.test.ts`**: Added three new tests: `handleBlockerSubmit('continue')` keeps the blocker active and clears input; `handleBlockerSubmit('done')` clears the blocker and emits `blocker-cleared`; default (no argument) behaves as `'done'`.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — all 153 tests pass (6 new tests added).
3. Launch the TUI, trigger a blocker (or simulate one).
4. Type a message and press **Tab** — message is sent but the blocker input stays open for follow-up. The activity log should show `You: <your message>`.
5. Type another message and press **Enter** — blocker resolves and the agent receives all accumulated messages joined by double newlines.
6. Press **Esc** — blocker is dismissed without sending.
7. Verify the blocker footer shows: `[Enter] Done  [Tab] Send & Continue  [Esc] Cancel`.

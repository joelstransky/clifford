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

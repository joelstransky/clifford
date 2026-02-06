# Task 04: Drop Support for Non-OpenCode CLIs

## Context
Codex, Gemini CLI, and Claude Code do not support what we need. OpenCode is the only supported engine. The architecture should remain extensible for future additions.

## Requirements
- Remove Codex, Gemini CLI, and Claude Code entries from `ENGINE_CONFIGS` in `src/utils/discovery.ts`
- Keep the `AIEngine` interface and config-driven discovery pattern intact (one entry for OpenCode)
- Remove any `clifford init` prompts that ask the user to choose an AI tool — OpenCode is assumed
- Update the `clifford.json` scaffolding to default `aiTool` to `"opencode"` without asking
- Update tests in `discovery.test.ts` to reflect the single-engine setup
- Ensure `npm test` passes

## Verification
1. Run `clifford init` — no prompt asking which AI tool to use
2. Check `clifford.json` — `aiTool` is `"opencode"`
3. `npm test` passes
4. `discoverTools()` returns only the OpenCode engine

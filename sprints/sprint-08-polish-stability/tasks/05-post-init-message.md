# Task 05: Update Post-Init Message

## Context
After `clifford init` completes, the summary message still references multiple CLI tools. It should focus on OpenCode and guide the user on next steps.

## Requirements
- After init, display:
  - OpenCode installation status: installed version or "not found" with install instructions
  - A message inviting the user to restart OpenCode so they can switch to the Architect agent for sprint planning
- Remove any references to other CLI tools (Claude Code, Codex, Gemini) from the output
- Keep the message concise and actionable

## Verification
1. Run `clifford init -y` with OpenCode installed — see version and restart prompt
2. Temporarily rename the opencode binary, run `clifford init -y` — see "not found" with install guidance

# Task 02: Multi-Tool Discovery Engine

## Context
Clifford supports multiple AI CLI engines. We need a robust way to detect which ones are installed on the user's system and configure the loop to use the preferred one.

## Step-by-Step
1. Create a discovery utility that checks for the existence of:
   - `codex`
   - `gemini` (Gemini CLI)
   - `claude` (Claude Code)
   - `opencode`
2. Implement logic to check `$PATH` or run `[cmd] --version` to verify availability.
3. Store the detected tools in a configuration object.
4. Create a mapping for how each tool should be invoked (e.g., `opencode run --agent developer ...`).

## Verification
- Run the discovery script and ensure it correctly identifies installed tools on your machine.
- Mock the absence of certain tools and verify the discovery logic handles it gracefully.

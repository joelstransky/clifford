# Task 09: Robust Discovery Logic

## Context
Current tool discovery relies on `command -v`, which is not reliable across platforms (specifically Windows). We should use the technique from `skills.sh` to detect agents by checking their configuration directories on the filesystem.

## Step-by-Step
1. Update `src/utils/discovery.ts`.
2. Implement a filesystem-based detection for the core 4 engines:
   - **OpenCode**: Check for `~/.config/opencode` or `~/.claude/skills`.
   - **Claude Code**: Check for `~/.claude`.
   - **Codex**: Check for `~/.codex`.
   - **Gemini CLI**: Check for `~/.gemini`.
3. Use `os.homedir()` and `path.join()` to ensure cross-platform compatibility.
4. Keep the fallback logic to check if the command itself is executable, but prioritize the filesystem check for better reliability on Windows.

## Verification
- Run `clifford discover` on a Windows machine where OpenCode is installed.
- Verify it correctly identifies OpenCode as "Installed".
- Verify it does not incorrectly report tools that are not installed.

# Task 4: Remove Git Push Instructions

## Title
Remove all git push privileges and instructions from agent guidelines

## Context
Clifford is transitioning to a commit-only workflow. All references to `git push` must be removed from the agent's instructions and guidelines. The agent should be clearly instructed that while atomic commits are part of the workflow (handled either by the agent or the system), pushing to remote is strictly forbidden.

## Step-by-Step

### 1. Update `AGENTS.md`

Remove references to `git push` and update the Git safety protocol.
- Change: `- **Pushing**: No `git push` unless explicitly requested by the Human.` 
- To: `- **Pushing**: `git push` is strictly prohibited. Clifford only makes local commits.`
- Ensure the atomic commit rule remains clear.

### 2. Update `templates/.opencode/agent/Developer.md`

Update the Core Mandates and File Restrictions.
- Change: `- **Git**: **NEVER** run `git commit` or `git push`. Clifford manages git workflow externally.`
- To: `- **Git**: Clifford manages git workflow externally. You may make atomic commits if instructed by a task, but you must **NEVER** run `git push`.`
- Apply same changes to the File Restrictions section.

### 3. Update `.opencode/agent/Developer.md` (Clifford's own)

Apply the same changes as in the template to the active agent persona.

### 4. Search and Purge

Grep for any remaining `push` or `git push` instructions in the `templates/` and `.opencode/` directories and remove them.

## Verification
1. `grep -r "git push" AGENTS.md .opencode/ templates/` should return no instructional references (it's okay if it appears in changelogs or historical UAT).
2. Read `AGENTS.md` and confirm the pushing prohibition.
3. Read `templates/.opencode/agent/Developer.md` and confirm the updated Git mandate.

# Task 02: Developer UAT Mandate

## Title
Update the Developer persona to automate UAT entries.

## Context
The Developer agent should be responsible for documenting its own work in the sprint's `uat.md` file.

## Step-by-Step
1. Update `templates/.opencode/agent/Developer.md`.
2. Add a new mandate: **Update UAT Documentation**.
3. Instruct the agent to:
   - Locate `uat.md` in the `CURRENT_SPRINT_DIR`.
   - After completing a task and running verification, append a new section to `uat.md`.
   - Populate the section with the task results and verification logs.
4. Ensure the agent uses clean Markdown formatting.

## Verification
- Run a test task in a sandbox.
- Verify that the Developer agent successfully appends a section to `sprints/sprint-01/uat.md` after finishing.

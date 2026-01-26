# Task 04: Agent Personas (.opencode/agent/)

## Context
Agents need strict roles to maintain the Clifford workflow. We need to define these personas as markdown files that the AI CLI tools can consume.

## Step-by-Step
1. **transcribe.md**:
   - Role: Architect/Planner.
   - Permissions: READ all, WRITE only to `sprints/`.
   - Goal: Breakdown vibes into tasks.
2. **developer.md**:
   - Role: Implementation.
   - Permissions: READ all, WRITE app code.
   - Goal: Execute tasks, run verification, and commit.
3. Ensure both personas explicitly mention the directory structure (`.clifford/`, `sprints/`, etc.).

## Verification
- Test the prompts with an LLM to ensure they understand their boundaries (e.g., Transcribe refusing to write app code).

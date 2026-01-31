# Task 04: Agent Personas (.opencode/agent/)

## Context
Agents need strict roles to maintain the Clifford workflow. We need to define these personas as markdown files that the AI CLI tools can consume. We are moving from "Transcribe" to "Architect" to better reflect the technical design and planning nature of the role.

## Step-by-Step
1. **Architect.md**:
   - Role: System Architect & Planner.
   - Permissions: READ all, WRITE only to `sprints/` and `.opencode/`.
   - Goal: Translate high-level requirements into atomic, logical tasks and manifests.
2. **Developer.md**:
   - Role: Implementation Engineer.
   - Permissions: READ all, WRITE app code.
   - Goal: Execute tasks defined by the Architect, run verification, and commit.
3. Ensure both personas explicitly mention the directory structure (`.clifford/`, `sprints/`, etc.).

## Verification
- Verify the filenames are `Architect.md` and `Developer.md`.
- Test the prompts with an LLM to ensure they understand their boundaries (e.g., Architect refusing to write app code).

# Task 03: Skill Analysis Engine

## Title
Implement proactive skill requirement checking.

## Context
Clifford should know if it's missing "skills" (tools) required for a sprint before starting.

## Step-by-Step
1.  Create `src/utils/skills.ts`.
2.  Implement `analyzeSprintRequirements(sprintPath: string)`:
    - Read all `.md` files in the `tasks/` subdirectory of the sprint.
    - Extract skills from a `## Required Skills` section (e.g., `- git`, `- npm`).
3.  Implement `fetchSkillDefinition(skillName: string)`:
    - Query `https://skills.sh/api/skills/[name]` (or mock if API is unavailable) to get installation commands.
4.  Implement `checkMissingSkills(required: string[])`:
    - Use `src/utils/discovery.ts` to check if the required tools are installed.
    - Return a list of missing skill objects (name + install command).

## Verification
- Unit test `analyzeSprintRequirements` with a mock task file containing a `## Required Skills` section.
- Verify it correctly identifies missing tools by mocking the discovery utility.

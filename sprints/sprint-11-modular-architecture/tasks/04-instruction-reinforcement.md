# Task 04: Instruction Reinforcement

## Context
To ensure the "observer" model works, the Developer Agent must be strictly disciplined in updating the manifest and UAT files.

## Step-by-Step
1. **Locate Prompt**: Open `.clifford/prompt.md`.
2. **Review Protocols**: Check the existing language regarding `manifest.json` updates.
3. **Bolster Language**: Add explicit instructions:
    - "You MUST update the task status to `completed` in `manifest.json` immediately after finishing a task."
    - "You MUST document your work and verification in `uat.md`."
    - "NEVER exit without updating the manifest if work was performed."
4. **Consistency Check**: Ensure these instructions are clear and prominent in the system prompt.

## Verification
- Run a dummy task and verify that the agent correctly updates the manifest and UAT files without being reminded.

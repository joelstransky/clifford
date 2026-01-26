# Task 07: Strict Sprint Isolation & State Management

## Context
A bug was identified where the Developer Agent would sometimes "jump" to tasks in other sprints if multiple sprints existed. Furthermore, starting a sprint should automatically manage the states of all sprints to ensure only one is "active" at a time.

## Step-by-Step
1. Update the `clifford-sprint.sh` script to prepends the current sprint path to the prompt:
   - Example: `opencode run --agent developer "CURRENT_SPRINT_DIR: $SPRINT_DIR\n\n$PROMPT_CONTENT"`
2. Implement **Sprint State Synchronization** in the loop script:
   - When a sprint is started, iterate through all `sprints/*/manifest.json`.
   - Set any other `active` sprints to `pending`.
   - Force the target sprint to `active` (if it was `pending`).
   - **CRITICAL**: Only update the top-level `status` field for the sprint. DO NOT modify the `status` of individual tasks. (e.g., replace only the first occurrence in the file).
3. Modify the `developer.md` persona template in `.opencode/agent/`:
   - Add a strict instruction to the "Core Mandates" or "Task Selection" section: "Your current active sprint directory is provided as `CURRENT_SPRINT_DIR`. You MUST ONLY work on tasks defined in the manifest file located at `CURRENT_SPRINT_DIR/manifest.json`. DO NOT look for other manifests in the `sprints/` directory."
4. Update the CLI injection logic to ensure the `CURRENT_SPRINT_DIR` is always the first thing the agent sees.

## Verification
- Create two sprints (`sprint-01` and `sprint-02`).
- Set both to `active`.
- Run `clifford sprint sprints/sprint-01`.
- Verify `sprint-02` is now `pending` and `sprint-01` remains `active`.
- Run `clifford sprint` on a `pending` sprint and verify it becomes `active` automatically.

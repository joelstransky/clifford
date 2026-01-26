# Task 03: The Recursive Loop (.clifford/)

## Context
The core "Ralph Wiggin Loop" is a set of scripts that manage the state machine of a sprint. These scripts are injected into the user's project.

## Step-by-Step
1. **clifford-sprint.sh**: Create a bash script that:
   - Reads `manifest.json`.
   - Checks if status is `active`.
   - Loops through `pending` tasks.
   - Invokes the Developer Agent for each task.
   - Breaks if no progress is made.
2. **sprint-verify.sh**: Create a template script for verification (e.g., runs `npm test` or `eslint`).
3. **clifford-approve.sh**: Create a script to handle the final push/merge after a sprint is completed locally.

## Verification
- Manually run the scripts against a mock `sprints/` folder.
- Verify that the loop correctly transitions from `pending` to `completed` in the manifest.

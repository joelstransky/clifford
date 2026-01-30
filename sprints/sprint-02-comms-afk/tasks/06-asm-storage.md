# Task 06: ASM Storage

## Title
Implement persistent Across Session Memoization (ASM) storage.

## Context
Workflow A requires human guidance to persist across agent restarts. We need a reliable storage mechanism to keep track of questions and their provided answers.

## Step-by-Step
1. Create a logic to manage a JSON file (e.g., `.clifford/asm.json`) in the project root.
2. Define the schema:
   ```json
   {
     "tasks": {
       "task-id": {
         "question": "What is the passcode?",
         "answer": "SUCCESS",
         "timestamp": "..."
       }
     }
   }
   ```
3. Implement `saveMemory(taskId, question, answer)` and `getMemory(taskId)` utilities.
4. Ensure the `.clifford/` directory is used for this storage.

## Verification
- Run a test script that saves a memory and verifies it can be read back from the JSON file.
- Verify that the JSON file is correctly formatted.

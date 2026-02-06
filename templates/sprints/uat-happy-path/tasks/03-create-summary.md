# Task 03: Create Summary Report

## Context
Verify the agent can read one file and produce another.

## Requirements
- Read the contents of `uat-output/hello.txt`.
- Create a new file `uat-output/summary.json` with the following structure:
  ```json
  {
    "source": "hello.txt",
    "lineCount": <number of lines in hello.txt>,
    "status": "complete"
  }
  ```
- The `lineCount` must be accurate.

## Verification
1. Confirm `uat-output/summary.json` exists and is valid JSON.
2. Confirm `lineCount` matches the actual line count of `hello.txt`.
3. Mark this task as `completed` in the manifest.

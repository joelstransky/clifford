# Task 02: Sprint Discovery Utility

## Title
Implement dynamic sprint discovery.

## Context
The TUI needs to list all available sprints by scanning the file system.

## Step-by-Step
1.  Open `src/utils/sprint.ts`.
2.  Add a static method `discoverSprints(): SprintManifest[]`.
3.  Implement the logic:
    - Locate the `sprints/` directory relative to the project root.
    - List all subdirectories.
    - For each directory, check if `manifest.json` exists.
    - Parse and return the manifest data, including the path to the sprint directory.
4.  Export the `SprintManifest` interface if not already exported.

## Verification
- Create a temporary test script that calls `SprintRunner.discoverSprints()` and prints the results.
- Ensure it finds `sprint-01`, `sprint-02`, and `sprint-03`.

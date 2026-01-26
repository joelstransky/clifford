# Task 01: The Config Engine

## Title
Implement basic configuration loading.

## Context
Clifford needs a way to store persistent settings like the preferred AI model.

## Step-by-Step
1.  Create `src/utils/config.ts`.
2.  Define a `CliffordConfig` interface:
    ```typescript
    export interface CliffordConfig {
      model?: string;
      agentName?: string;
      // future-proofing for more settings
    }
    ```
3.  Implement `loadProjectConfig()`:
    - Search for `clifford.json` in the current working directory.
    - If found, parse it and return the data.
    - If not found, return an empty object.
4.  Implement `loadGlobalConfig()`:
    - Search for `~/.cliffordrc.json` or equivalent in the user's home directory.

## Verification
- Unit test `loadProjectConfig` by creating/deleting a temporary `clifford.json` file.
- Verify that it handles malformed JSON gracefully (e.g., by logging a warning and returning default).

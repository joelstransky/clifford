# Task 03: Resolution Cascade

## Title
Implement configuration resolution logic.

## Context
Determine the "Effective Model" to use for a task based on the hierarchy: Manifest > Project > Global.

## Step-by-Step
1.  In `src/utils/config.ts`, implement `resolveModel(manifest: SprintManifest, projectConfig: CliffordConfig, globalConfig: CliffordConfig): string | undefined`.
2.  Implement the priority logic:
    - Return `manifest.model` if defined.
    - Else return `projectConfig.model` if defined.
    - Else return `globalConfig.model` if defined.
    - Else return `undefined`.
3.  Expose this as a utility for the `SprintRunner`.

## Verification
- Unit test with various combinations of defined/undefined models at each level.
- Ensure the priority is correctly maintained (Manifest always wins).

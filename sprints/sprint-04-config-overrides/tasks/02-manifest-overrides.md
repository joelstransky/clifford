# Task 02: Manifest Overrides

## Title
Support model overrides in sprint manifests.

## Context
Individual sprints should be able to specify a model that differs from the project default.

## Step-by-Step
1.  Open `src/utils/sprint.ts`.
2.  Update the `SprintManifest` interface to include an optional `model` field.
3.  Update any validation logic (if any) to ensure the `model` field is accepted but not required.

## Verification
- Update an existing sprint's `manifest.json` (e.g., Sprint 01) to include `"model": "gpt-4"`.
- Verify the parser reads this field correctly without throwing errors.

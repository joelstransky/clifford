# Task 03: Init UAT Support

## Title
Update the Scaffolder to include UAT files.

## Context
New projects and new sprints should start with a `uat.md` file ready for the Developer.

## Step-by-Step
1. Update `src/utils/scaffolder.ts`.
2. Ensure that when a new sprint directory is created (during `init` or later), a `uat.md` is initialized from the template.
3. Update the `init` command logic to ensure the first sprint has this file.

## Verification
- Run `clifford init` in a clean directory.
- Verify `sprints/sprint-01/uat.md` exists and contains the correct initial headers.

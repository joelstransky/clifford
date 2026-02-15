# Task 5: Purge Legacy Demo Assets

## Title
Remove the `read_only_demo_project` and associated references

## Context
Clean up the repository by removing legacy assets that are no longer used by the Clifford build system or tests.

## Step-by-Step

### 1. Delete Directory
Remove the `read_only_demo_project/` directory and all its contents.

### 2. Update `.gitignore`
Remove the `read_only_demo_project` entry from the project's `.gitignore`.

### 3. Update Linting Config
Remove the `read_only_demo_project/**` exclusion from `eslint.config.mjs`.

## Verification
1. Verify the directory is gone.
2. `npm run lint` still passes.
3. `grep -r "read_only_demo_project" .` returns no results (except perhaps in this task file or changelogs).

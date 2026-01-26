# Task 04: `clifford init` Command

## Title
Implement the initialization scafolder.

## Context
Provide a user-friendly way to create the initial `clifford.json`.

## Step-by-Step
1.  Open `src/index.ts`.
2.  Add a new command `.command('init')`.
3.  In the action handler:
    - Check if `clifford.json` already exists.
    - If it does, ask the user if they want to overwrite it.
    - Use `readline` or a simple prompt to ask for a "Preferred Default Model".
    - Write the resulting JSON to `clifford.json`.

## Verification
- Run `npx clifford init`.
- Follow the prompts.
- Verify `clifford.json` is created with the expected content.

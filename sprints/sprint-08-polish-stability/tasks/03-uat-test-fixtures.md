# Task 03: Set Up UAT Test Fixtures in Sandbox

## Context
We need repeatable test sprints in the sandbox so UAT can be run consistently. These live in `clifford-sandbox/uatstuff/sprints/` and get copied into the sandbox's `.clifford/sprints/` via a script.

## Requirements
- Create a **happy-path sprint** in `uatstuff/sprints/` with:
  - 2-3 simple tasks the agent can actually complete (e.g., create a file, write content to it, update the manifest)
  - A valid `manifest.json` with status `active`
- Create a **failure sprint** in `uatstuff/sprints/` with:
  - A task with instructions that will cause the agent to exit without completing (e.g., "Run the command `nonexistent-tool --verify`")
  - A task with deliberately ambiguous instructions that should prompt the agent to ask for help
- Update the `copy:sprints` script in `clifford-sandbox/package.json` so it copies from `uatstuff/sprints/` into `.clifford/sprints/`
- Ensure `npm run clifford:clean` clears the copied sprints

## Verification
1. Run `npm run copy:sprints` in `clifford-sandbox`
2. Verify sprints appear in `.clifford/sprints/`
3. Launch TUI — both test sprints visible in sprint list
4. Start happy-path sprint — tasks complete successfully
5. Start failure sprint — triggers the halt & help flow from Task 02

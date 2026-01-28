# Task 05: The Interactive Scaffolder (Refined)

## Context
The `init` command must correctly scaffold the core Clifford environment. This includes the "Brain" (OpenCode agents) and the "Body" (Clifford project structure).

## Step-by-Step
1. Refine the `init` command to ensure it creates:
   - `.clifford/`: For core metadata and scripts (e.g. `config.json`).
   - `sprints/`: For task management.
   - `.opencode/agent/`: Specifically for agent personas.
2. Scaffold the Agent Personas and Prompt:
   - Write `Architect.md` to `.opencode/agent/`.
   - Write `Developer.md` to `.opencode/agent/`.
   - Write `prompt.md` to `.clifford/`. This file acts as the bridge for OpenCode execution, instructing the Developer agent to process the next task.
3. Ensure these files are sourced from a `templates/` directory within the Clifford package to maintain consistency.
4. The `init` command should leverage the discovery utility to verify that a compatible agent (like OpenCode) is available before proceeding.

## Verification
- Run `clifford init` in a clean directory.
- Verify the existence of:
  - `.clifford/config.json`
  - `.opencode/agent/Architect.md`
  - `.opencode/agent/Developer.md`
  - `sprints/sprint-01/manifest.json` (as the default first sprint).
- Check that the `Transcribe.md` and `Developer.md` content matches the intended personas.

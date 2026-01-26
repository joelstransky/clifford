# Task 02: Agent Persona Updates for Communication

## Context
The Developer Agent needs to know that the Comms Bridge exists and how to use it. We must update its system prompt to include the "Phone Home" protocol.

## Step-by-Step
1. Update `developer.md` (and the templates in the CLI) to include a section on "Handling Blockers".
2. Instruct the agent that if a task is logically impossible or requires architectural clarification, it must use its `webfetch` (or equivalent tool) to `POST` to `http://localhost:[PORT]/block`.
3. Provide the agent with a specific format for the blocker message to ensure the CLI can parse it effectively.

## Verification
- Review the prompt with a test LLM session.
- Simulate a scenario where the agent is given a contradictory task and verify it attempts to call the local bridge instead of "hallucinating" a fix.

# Task 05: The Interactive Scaffolder

## Context
The `init` command is the entry point for users. It must be user-friendly and correctly scaffold the project.

## Step-by-Step
1. Use `inquirer` or `prompts` to ask:
   - Workflow choice (YOLO vs PR).
   - Preferred AI tool (from discovered list).
   - Extra gates (Linting, Tests).
2. Create a `templates/` directory in the Clifford CLI package containing the scripts and agents.
3. Implement the copy logic to inject these templates into the target project's `.clifford/`, `sprints/`, and `.opencode/` folders.
4. Add entries to `.gitignore` for Clifford-specific artifacts if necessary.

## Verification
- Run `clifford init` in an empty directory.
- Verify that all folders and files are created correctly based on the prompt answers.

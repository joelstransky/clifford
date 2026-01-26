# Task 06: Distribution & Publishing Prep

## Context
Clifford must be ready for the NPM registry. This involves clean builds and proper metadata.

## Step-by-Step
1. Configure `files` in `package.json` to include only `dist` and `templates`.
2. Add a `prepublishOnly` script to build the project.
3. Write a README for Clifford explaining the `npx clifford init` command.
4. Ensure the `LICENSE` is included.

## Verification
- Run `npm pack` and inspect the contents of the generated tarball.
- Verify all template files are present and correctly located.

# Task 01: Environment & Dependencies

## Title
Setup TUI dependencies and JSX support.

## Context
Clifford needs to support a Terminal User Interface (TUI) built with Ink. This requires specific React-based libraries and TypeScript configuration for JSX.

## Step-by-Step
1.  Add the following dependencies to `package.json`:
    - `ink@^3.2.0`
    - `react@^17.0.2`
    - `ink-select-input@^4.2.1`
    - `axios` (for fetching from skills.sh)
2.  Add the following devDependencies:
    - `@types/react@^17.0.0`
3.  Update `tsconfig.json`:
    - Set `"jsx": "react"` in `compilerOptions`.
4.  Run `npm install`.

## Verification
- Run `npm run build` (tsc) to ensure there are no compilation errors.
- Verify `node_modules` contains `ink` and `react`.

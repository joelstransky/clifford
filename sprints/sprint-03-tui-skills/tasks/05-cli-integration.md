# Task 05: CLI Command Integration

## Title
Register the `tui` command.

## Context
Expose the dashboard to the user via the CLI.

## Step-by-Step
1.  Open `src/index.ts`.
2.  Import `render` from `ink` and the `Dashboard` component.
3.  Add a new command `.command('tui')`.
4.  In the action handler:
    - Call `render(<Dashboard />)`.
5.  Ensure the process handles cleanup/exit correctly when the TUI is closed.

## Verification
- Run `npm run build`.
- Execute `npx clifford tui`.
- Verify the dashboard opens and is interactive.

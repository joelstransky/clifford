# Task 1: `clifford afk` Command and Interview

## Title
Implement the `npx clifford afk` command and setup interview

## Context
Create the entry point for the AFK feature. This command handles the user interview to collect Telegram Bot credentials and scaffolds the necessary local adapter files.

## Step-by-Step

### 1. Register the `afk` command
In `src/index.ts`, add a new command `afk` using `commander`.
```typescript
program
  .command('afk')
  .description('Configure Clifford AFK (Remote Guidance)')
  .option('--test', 'Send a test message to all enabled AFK adapters')
  .option('--listen', 'Wait for a response during the test (requires --test)')
  .action(async (options) => {
    // Logic for interview or testing
  });
```

### 2. Implement the Interview Wizard
- Use `inquirer` to ask:
    - "If you have a Telegram Bot Token, paste it here: [_____]"
    - "Tip: Message @BotFather the message '/help' to create a bot and get a token."
    - (If token provided): "Enter your Chat ID (or leave blank to auto-detect on first message): [_____]"
- If no token is provided, inform the user they can add it later to `clifford.json`.

### 3. Scaffold the Adapter Directory
- Create `.clifford/afk/` if it doesn't exist.
- Prepare to copy the `telegram.py` template (implemented in Task 2).

## Verification
1. `npm run build` succeeds.
2. `npx clifford afk` launches the interview.
3. The prompt for @BotFather guidance is visible.
4. `.clifford/afk/` directory is created.

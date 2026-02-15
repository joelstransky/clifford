# UAT - Sprint 17: AFK Foundation & Telegram Integration

## Task 1: Implement the `npx clifford afk` command and setup interview

### Changes
- Added `afk` command to `src/index.ts` using `commander`.
- Implemented an interview wizard using `inquirer` to collect Telegram Bot Token and Chat ID.
- The command scaffolds the `.clifford/afk/` directory if it doesn't exist.
- If a token is provided, it updates `clifford.json` with the Telegram configuration.

### Verification Instructions
1. Run `npm run build` to ensure the project compiles.
2. Run `node dist/index.js afk`.
3. Verify that:
   - The message "✅ Created .clifford/afk/ directory" appears (on first run).
   - The tip about @BotFather is visible.
   - You are prompted for a Telegram Bot Token.
4. Press Enter without providing a token.
   - Verify it says "No token provided. You can add it later to clifford.json."
5. Run `node dist/index.js afk` again.
6. Provide a dummy token (e.g., `12345:abcde`).
7. Provide a dummy Chat ID (e.g., `98765`).
8. Check `clifford.json` and verify it contains the `afk` section with the provided values.

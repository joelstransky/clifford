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

## Task 2: Create the zero-dependency Python adapter for Telegram

### Changes
- Created `templates/.clifford/afk/telegram.py`.
- Implemented `urllib`-based communication with Telegram Bot API (no external dependencies).
- Supported `--notify`, `--listen`, `--test`, and auto-detecting `chat_id`.
- Added robust error handling and long-polling support.

### Verification Instructions
1. Navigate to `templates/.clifford/afk/`.
2. Run `python3 telegram.py --help` to verify arguments are registered.
3. If you have a Telegram Bot Token and Chat ID:
   - Run `python3 telegram.py --token <TOKEN> --chat_id <ID> --test` and check Telegram.
   - Run `python3 telegram.py --token <TOKEN> --chat_id <ID> --notify --message "Testing Clifford"` and check Telegram.
   - Run `python3 telegram.py --token <TOKEN> --listen` and send a message to the bot. Verify it prints your Chat ID and the message text.
4. If you don't have a token, verify the script fails gracefully with an error message when attempting to connect.

## Task 3: Inject AFK configuration into the project's `clifford.json`

### Changes
- Updated `CliffordConfig` interface in `src/utils/config.ts` to include `afk` as an array of `AfkAdapterConfig`.
- Refactored `afk` command in `src/index.ts` to inject configuration into an array, allowing for multiple providers in the future.
- Ensured existing `clifford.json` settings are preserved during injection.
- Added `getEnabledAfkAdapters` helper to `src/utils/config.ts` for standardized adapter validation.

### Verification Instructions
1. Run `npm run build`.
2. Ensure you have a `clifford.json` file in the root directory (e.g., run `node dist/index.js init -y`).
3. Run `node dist/index.js afk`.
4. Provide a Telegram Bot Token (e.g., `dummy_token`) and Chat ID (e.g., `12345`).
5. Open `clifford.json` and verify the `afk` block is an array:
   ```json
   "afk": [
     {
       "provider": "telegram",
       "enabled": true,
       "token": "dummy_token",
       "chatId": "12345"
     }
   ]
   ```
6. Verify that other fields in `clifford.json` (like `model` or `aiTool`) are still present.
7. Run `node dist/index.js afk` again and provide a DIFFERENT token.
8. Verify `clifford.json` reflects the updated token in the `telegram` entry without creating a duplicate array element.

## Task 4: Implement the `--test` and `--listen` verification flags

### Changes
- Implemented logic for `npx clifford afk --test` and `npx clifford afk --test --listen`.
- Added automatic copying of adapter scripts from `templates/` to `.clifford/afk/` if missing.
- Added support for auto-detecting `chatId` during the `--listen` handshake and saving it back to `clifford.json`.
- Implemented robust spawning of Python bridge with proper error handling and timeouts.
- Cleaned up `any` types in `src/index.ts` and `src/utils/config.ts` to adhere to project standards.

### Verification Instructions
1. Run `npm run build`.
2. Configure a Telegram bot token in `clifford.json` by running `node dist/index.js afk` (leave `chatId` blank).
3. Run `node dist/index.js afk --test --listen`.
4. Send a message from your phone to your Telegram bot.
5. Verify that:
   - The CLI displays "Found you! Setup complete. Received: [Your Message]".
   - Your `chatId` is auto-detected and saved to `clifford.json`.
6. Run `node dist/index.js afk --test`.
7. Verify that:
   - A test message "Hello from Clifford 🚀" is sent to your Telegram.
   - The CLI displays "Test message sent."



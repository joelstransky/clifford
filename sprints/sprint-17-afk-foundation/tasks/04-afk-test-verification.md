# Task 4: AFK Test and Verification Logic

## Title
Implement the `--test` and `--listen` verification flags

## Context
Provide a way for users to verify their Telegram bot setup directly from the CLI. This uses the Python bridge to ensure the entire pipe is working.

## Step-by-Step

### 1. Implement `--test`
- Iterate through all adapters in `clifford.json`.
- For each enabled adapter with a token, spawn the corresponding `.py` script with the `--test` flag.
- Display success/failure messages in the terminal.

### 2. Implement `--listen` (The "Handshake")
- If the user provides `--test --listen`, the CLI should wait for a response.
- Spawns the Python script with `--listen`.
- If a response is received, print: "Found you! Setup complete. Received: [User Message]".
- If `chatId` was missing in `clifford.json`, use this opportunity to save the auto-detected ID back to the config.

### 3. Error Handling
Handle cases where Python 3 is missing or the script fails to execute.

## Verification
1. Run `npx clifford afk --test`.
2. Run `npx clifford afk --test --listen` and send a message from a phone.
3. Verify the CLI detects the message and (if applicable) updates the `chatId` in `clifford.json`.

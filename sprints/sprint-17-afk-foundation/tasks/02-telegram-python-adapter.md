# Task 2: Telegram Python Adapter

## Title
Create the zero-dependency Python adapter for Telegram

## Context
Implement a single-file Python script that handles all Telegram communication using only built-in libraries. This ensures maximum portability and ease of customization.

## Step-by-Step

### 1. Create the Template
Create `templates/.clifford/afk/telegram.py`.

### 2. Implement the Logic
- **Notify Mode (`--notify`)**: Use `urllib.request` to send a message via the Telegram Bot API. Format the message to include Task ID, Reason, and Question.
- **Listen Mode (`--listen`)**: Use `getUpdates` to long-poll for the latest message. Print the message text to `stdout` and exit.
- **Test Mode (`--test`)**: Send a "Hello from Clifford" message.
- **Auto-Detect Chat ID**: If `--listen` is called without a `chat_id`, capture the ID of the first person to message the bot and print it.

### 3. Standards
- Zero dependencies (use `json`, `urllib`, `sys`, `argparse`).
- Robust error handling for network timeouts.
- Support for CLI arguments: `--token`, `--chat_id`, `--message`, `--notify`, `--listen`, `--test`.

## Verification
1. Manually run the script with a valid bot token: `python3 telegram.py --test --token <TOKEN> --chat_id <ID>`.
2. Verify the message is received on Telegram.
3. Verify `--listen` correctly captures a response and prints it to the console.

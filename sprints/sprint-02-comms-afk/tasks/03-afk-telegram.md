# Task 03: Clifford AFK & Telegram Integration

## Context
If the user is away from their terminal, Clifford AFK provides a bridge to Telegram. This task handles the detection and initialization of that connection.

## Step-by-Step
1. Add logic to detect if `clifford-afk` is installed (check for `telegram_config.json` or a specific package).
2. Create a notification wrapper that sends the agent's blocker message to the user's Telegram chat.
3. Ensure that the CLI can receive a "callback" from the Telegram bot if the user responds via mobile.

## Verification
- Mock the `clifford-afk` configuration.
- Trigger a blocker and verify that the notification logic is invoked.

# Task 04: The 3-Minute Telegram Timeout

## Context
To prevent open-ended Telegram connections and ensure the CLI remains the primary source of truth, we need a strict timeout for mobile responses.

## Step-by-Step
1. Implement a `setTimeout` for 180,000ms (3 minutes) when a Telegram notification is sent.
2. If the user responds within the window, cancel the timer and pass the response to the agent.
3. If the timer expires:
   - Send "I'm sorry. I missed you." to the Telegram chat.
   - Close the Telegram connection/listener.
   - Keep the CLI terminal in its "paused" state awaiting manual input.

## Verification
- Trigger a block with AFK enabled.
- Wait 3 minutes and verify the Telegram "missed you" message is sent.
- Verify the terminal still waits for input after the Telegram timeout.

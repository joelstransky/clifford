# Task 01: The Clifford Comms Bridge (HTTP/IPC)

## Context
To allow the Developer Agent to communicate back to the CLI, we need a local server that acts as a bridge. This allows the agent to send "blocker" messages when it encounters an issue it cannot resolve autonomously.

## Step-by-Step
1. Implement a lightweight HTTP server within the CLI using `fastify` or native `http`.
2. The server should start automatically when `clifford sprint` is executed.
3. Create a `POST /block` endpoint that accepts a JSON body with a `reason` or `question`.
4. Implement a state manager in the CLI to transition the loop into a "paused" state when a block is received.

## Verification
- Start the CLI in a test mode and use `curl` to POST a message to the local port.
- Verify that the CLI output shows the message and waits for user input.

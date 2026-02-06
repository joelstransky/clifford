# Task 01: Run Nonexistent Verification Tool

## Context
This task is designed to trigger a failure. The agent should recognize it cannot complete this task and halt.

## Requirements
- Run the command `clifford-phantom-verify --strict --audit` and capture its output.
- The command output must contain the string `VERIFICATION PASSED`.
- If the command does not exist or fails, you MUST NOT mark this task as completed.
- Instead, use the blocker protocol to report the failure.

## Verification
1. The command `clifford-phantom-verify` does not exist on any system.
2. The agent should halt and trigger the "needs help" flow.

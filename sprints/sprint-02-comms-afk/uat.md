# Sprint 2 UAT: Comms Bridge & AFK Integration

This document tracks the verification and user acceptance of the communication and "Headless" features of Clifford.

## 📋 UAT Instructions 

### 1. Bridge Connectivity
- Run `clifford sprint [dir]`.
- Verify the console logs: `🚀 Comms Bridge listening on port 4096` (or higher if 4096 was in use).
- Use a tool like `curl` or Postman to send a test block:
  ```bash
  curl -X POST http://localhost:4096/block -d '{"reason": "UAT Test", "question": "Can you see this?"}'
  ```
- **Expected**: The terminal running the sprint should show `🛑 BLOCKER RECEIVED` and the loop should pause.

### 2. Prompt Detection (The "Permission" Test)
- Create a test task that uses a script designed to ask for a confirmation: `read -p "Allow access? (y/n): " resp`.
- Run the sprint.
- **Expected**: Clifford should detect the `(y/n)` prompt, trigger a block, and pause. It should NOT hang indefinitely.

### 3. Remote Resolution
- While the sprint is paused/blocked by the previous test, send a resolution:
  ```bash
  # This requires Task 05 implementation
  curl -X POST http://localhost:4096/respond -d '{"response": "y"}'
  ```
- **Expected**: The blocked agent should receive the `y` input and continue to completion.

### 4. Telegram Notification (AFK Test)
- If `.bigred/telegram_config.json` is configured, trigger a block.
- **Expected**: You should receive a notification on your mobile device via Telegram with the blocker details.

---

## [Task-01] Comms Bridge Foundation
- **Status**: ✅ Completed
- **Technical Changes**: Implemented a basic Node.js HTTP server in `src/utils/bridge.ts` that listens for "blocker" requests.
- **Developer Verification**: Successfully starts and stops within the `SprintRunner`. Responds to `/block` POST requests.
- **Human Sign-off**: [ ]

## [Task-02] Persona Updates (Architect/Developer)
- **Status**: ⏳ Pending
- **Technical Changes**: Add instructions to the Architect and Developer personas on how to identify and "phone home" when blocked.
- **Developer Verification**: TBD
- **Human Sign-off**: [ ]

## [Task-03] AFK Telegram Integration
- **Status**: ⏳ Pending
- **Technical Changes**: Integrate Telegram Bot API to forward bridge blockers to a mobile device.
- **Developer Verification**: TBD
- **Human Sign-off**: [ ]

## [Task-04] STDIN/STDOUT Proxying & Prompt Detection
- **Status**: ⏳ Pending
- **Technical Changes**: Update the runner to detect interactive prompts (e.g., permissions) in the child process output and trigger a bridge block.
- **Developer Verification**: TBD
- **Human Sign-off**: [ ]

## [Task-05] Remote Decision API
- **Status**: ⏳ Pending
- **Technical Changes**: Enable the bridge to accept user responses and inject them into the agent's `stdin`.
- **Developer Verification**: TBD
- **Human Sign-off**: [ ]

---
**Final Sprint Approval**: [ ]

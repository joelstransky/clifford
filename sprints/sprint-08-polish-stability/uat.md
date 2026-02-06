# Sprint 8 UAT: Polish & Stability

## Prerequisites
- Clean state: `npm run clifford:clean`
- Copy test sprints: `npm run copy:sprints`
- All commands run from the project root

---

## Task 1: Activity Log Dedup
- **Status**: ✅ Completed
- **Changes**: `src/tui/Dashboard.ts` — Refactored `loadManifest()` polling logic
- **What was fixed**:
  - Added `buildStatusSnapshot()` helper that creates a `Map<taskId, status>` for ID-based comparison (replaces fragile index-based comparison)
  - Added `previousStatusSnapshot` state to track prior task statuses separately
  - `loadManifest()` now skips `updateDisplay()` entirely when polling finds no status changes
  - Navigation into/out of sprints (← / →) now resets `previousManifest` and `previousStatusSnapshot` so first load of a new sprint doesn't produce false transition logs
  - Polling is skipped when in sprints list view and no sprint is running
- **Verification**:
  1. Launch TUI (`npm run dev`), observe only "Dashboard initialized" in the activity log — **no** spurious entries from the initial manifest load
  2. Navigate into a sprint with → arrow — the task list appears but **no** activity log entries are created (the first load is treated as initialization, not a status transition)
  3. Press ← to go back to the sprint list — **no** log entry created
  4. Navigate into a different sprint with → — **no** log entry created
  5. Navigate back into the original sprint — **no** log entry created (previousManifest was properly reset)
  6. Start a sprint by pressing `S` — observe that **only** actual status transitions appear in the activity log (e.g., `⏳ task-01: pending → active`, `✅ task-01: active → completed`)
  7. Wait idle for 10+ seconds without any task changes — **no** new log entries appear from polling
  8. Verify that the 1-second polling interval no longer triggers `updateDisplay()` when the manifest has not changed on disk

## Task 2: Halt & Call for Help
- **Status**: ✅ Completed
- **Changes**:
  - `src/utils/sprint.ts` — Sprint runner now captures agent exit codes and emits a `halt` event when the agent crashes (non-zero exit) or exits without completing a task (exit 0 but task still `pending`). Added logic to detect existing ASM guidance and automatically retry instead of halting when guidance is already available (prevents double-halt after blocker resolution).
  - `src/utils/bridge.ts` — Added `setBlockerContext(taskId, question)` method so the Dashboard can pre-set the task/question context on the bridge for halt scenarios (where `triggerBlock()` is not called since the agent already exited). `resolveBlocker()` already handles null `activeChild` gracefully.
  - `src/tui/Dashboard.ts` — Added `runner.on('halt', ...)` handler that unifies halts with the existing blocker UX: sets `activeBlocker`, focuses the chat input, and shows the "NEEDS HELP" panel. Updated the blocker header label from "BLOCKER DETECTED" to "NEEDS HELP" for a unified UX. Updated the Escape handler to guard `runner.stop()` behind `runner.getIsRunning()` check (since the runner may already be stopped in halt scenarios). Updated the dismiss log message to "Help dismissed" instead of "Blocker cancelled".
- **Verification**:
  1. Launch TUI and start a sprint that contains a task designed to fail (agent exits non-zero or without completing)
  2. When the agent exits without completing: verify the "🛑 NEEDS HELP" panel appears in the right panel with the task ID, reason, and a question prompting for guidance
  3. Verify the chat input auto-focuses with the red "🛑 >" prompt and blinking cursor
  4. Type a guidance response and press **Enter**: verify ASM is written (check `.clifford/asm.json` for the task entry), and the sprint restarts automatically with the guidance injected as `[HUMAN_GUIDANCE]` in the prompt
  5. Press **Escape** instead of Enter: verify the "needs help" panel disappears, the sprint stays stopped, and no ASM entry is written
  6. Trigger a traditional blocker (interactive prompt detection): verify the same "NEEDS HELP" panel appears, and resolving it works as before (saves to ASM, kills child, restarts with guidance)
  7. After a blocker resolution where the agent was killed (non-zero exit), verify the sprint does NOT halt a second time — instead it retries automatically with the existing ASM guidance

## Task 3: UAT Test Fixtures
- **Status**: ✅ Completed
- **Changes**:
  - Created `templates/sprints/uat-happy-path/` — A 3-task happy-path sprint with simple file creation, modification, and read-then-write tasks. Tasks: create `uat-output/hello.txt`, append a timestamp, create `uat-output/summary.json` from the file contents.
  - Created `templates/sprints/uat-failure/` — A 2-task failure sprint. Task 01 instructs the agent to run a nonexistent command (`clifford-phantom-verify`) which should trigger a halt. Task 02 has deliberately contradictory instructions that should cause the agent to use the blocker protocol.
  - Added `scripts/copy-sprints.mjs` — Copies all sprint directories from `templates/sprints/` into `.clifford/sprints/`. Uses recursive directory copy with no external dependencies.
  - Added `scripts/clifford-clean.mjs` — Removes `.clifford/sprints/`, `.clifford/asm.json`, `.clifford/state.json`, and `uat-output/` for a clean-slate reset.
  - Updated `package.json` — Added `copy:sprints` and `clifford:clean` npm scripts.
- **Verification**:
  1. Run `npm run clifford:clean` — confirm it removes `.clifford/sprints/` (and `uat-output/` if present). Running again prints "Already clean".
  2. Run `npm run copy:sprints` — confirm output shows both `uat-happy-path` and `uat-failure` copied to `.clifford/sprints/`.
  3. Verify `.clifford/sprints/uat-happy-path/manifest.json` exists with 3 pending tasks and status `active`.
  4. Verify `.clifford/sprints/uat-failure/manifest.json` exists with 2 pending tasks and status `active`.
  5. Launch TUI (`npm run dev`) — navigate to sprint list. Both "UAT Happy Path" and "UAT Failure Scenarios" should appear alongside any existing sprints.
  6. Select "UAT Happy Path" and drill in — 3 tasks visible, all pending.
  7. Press `S` to start the happy-path sprint — the agent should create `uat-output/hello.txt`, append a timestamp, and create `uat-output/summary.json`. All 3 tasks should complete.
  8. Navigate back, select "UAT Failure Scenarios" and start it — Task 01 should fail (nonexistent command) and trigger the "NEEDS HELP" panel. If dismissed, Task 02 should similarly trigger a blocker for ambiguous instructions.
  9. Run `npm run clifford:clean` again to reset everything after testing.

## Task 4: Drop Non-OpenCode CLIs
- **Status**: ✅ Completed
- **Changes**:
  - `src/utils/discovery.ts` — Removed Codex, Gemini CLI, and Claude Code entries from `ENGINE_CONFIGS`. Only the OpenCode engine config remains. The `AIEngine` interface, `EngineConfig` type, and config-driven discovery pattern are preserved for future extensibility.
  - `src/index.ts` — Removed the AI tool selection prompt (`Select your preferred AI tool` list and `Enter the command for your custom AI tool` fallback) from the interactive `init` flow. OpenCode is now assumed as the only engine: `answers.aiTool` is hardcoded to `'opencode'`. The `clifford.json` scaffolding now writes `aiTool: "opencode"` by default. Removed the `discoverTools()` call and agent discovery status messages from the init flow (the `discover` CLI command still works for diagnostics).
  - `src/utils/discovery.test.ts` — Rewrote tests for single-engine setup: "should return only the OpenCode engine" (verifies length=1, id, name, install detection, version, getInvokeArgs), "should report OpenCode as not installed when missing" (verifies graceful handling when opencode binary is absent), and retained the existing "should handle version check failures gracefully" test.
- **Verification**:
  1. Run `npm run dev -- init` (interactive mode) — confirm there is **no** prompt asking which AI tool to use. The only prompts should be: model, workflow, and extra gates.
  2. Run `npm run dev -- init -y` — confirm YOLO init succeeds with no AI tool prompt.
  3. After init, inspect the generated `clifford.json` — verify it contains `"aiTool": "opencode"`.
  4. Run `npm run dev -- discover` — confirm only **one** engine is listed: `OpenCode (opencode)`.
  5. Run `npm test` — all 39 tests pass, including the 3 updated discovery tests.
  6. Inspect `src/utils/discovery.ts` — confirm `ENGINE_CONFIGS` contains only the OpenCode entry, and the `AIEngine` interface is still exported.

## Task 5: Post-Init Message
- **Status**: ✅ Completed
- **Changes**:
  - `src/index.ts` — Replaced the single "Clifford initialized successfully!" message with a structured post-init summary. After scaffolding completes, the code now calls `discoverTools()` to check OpenCode's installation status and displays: (a) a green `🟢 OpenCode: installed (version)` line if found, or a red `🔴 OpenCode: not found` line with install instructions if missing; (b) a next-step message guiding the user to open/restart OpenCode and switch to the Architect agent for sprint planning.
  - No references to Claude Code, Codex, or Gemini remain anywhere in `src/`.
- **Verification**:
  1. Run `npm run dev -- init -y` with OpenCode installed — verify the output shows:
     - `✅ Clifford initialized successfully!`
     - `🟢 OpenCode: installed` followed by a version string in parentheses (e.g., `(0.x.x)`)
     - `👉 Next step: Open (or restart) OpenCode and switch to the Architect agent to begin sprint planning.`
  2. Temporarily rename the `opencode` binary (e.g., `mv $(which opencode) $(which opencode).bak`), then run `npm run dev -- init -y` — verify the output shows:
     - `✅ Clifford initialized successfully!`
     - `🔴 OpenCode: not found`
     - `   Install it with: npm install -g opencode`
     - The next-step message still appears
  3. Restore the binary: `mv $(which opencode).bak $(which opencode)`
  4. Verify there are **no** references to Claude Code, Codex, or Gemini in `src/index.ts` or any other source file
  5. Run `npm test` — all tests pass

## Task 6: Loading Spinner
- **Status**: ✅ Completed
- **Changes**:
  - `src/tui/Dashboard.ts` — Added a text-based spinner animation (braille dots: `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`) that provides immediate visual feedback when a sprint starts. The spinner ticks every 80ms and displays `[⠋ Starting...]` in the header bar where the status text normally shows `[Idle]`, `[Running: ...]`, etc.
  - Extracted `updateHeaderStatus()` as a shared helper to eliminate duplication between the spinner tick callback and the main `updateDisplay()` function. This helper manages the header status text for all states: spinner active, idle, running, blocked, and complete.
  - The spinner starts on the runner's `start` event and stops on: (a) `task-start` — transitions to `[Running: Sprint > task-01]`, (b) `stop` — transitions back to `[Idle]`, (c) `halt` — transitions to `[Blocked]` and shows the needs-help panel, (d) `runner.run()` catch — stops spinner if the runner throws before emitting `start`.
  - Spinner cleanup is also called on quit (`Q` and `Ctrl+C`) to prevent orphaned intervals.
- **Verification**:
  1. Launch TUI (`npm run dev`) and navigate into a sprint with pending tasks
  2. Press `S` to start the sprint — **immediately** observe a spinning braille animation in the header bar: `[⠋ Starting...]` cycling through frames at ~80ms
  3. After a few seconds (once the agent spawns and picks up the first task), verify the spinner stops and the header transitions to `[Running: Sprint Name > task-01]`
  4. If the sprint fails to start (e.g., missing manifest), verify the spinner stops and the activity log shows a `Runner Error:` message
  5. Start a sprint that triggers a halt (e.g., UAT Failure sprint) — verify the spinner stops when the needs-help panel appears
  6. Press `X` to stop a running sprint — verify the header transitions back to `[Idle]` with no residual spinner
  7. Verify there is no flicker or duplication in the header text (the `updateHeaderStatus()` helper is the single source of truth)

## Task 7: Strip Emoji Titles
- **Status**: ✅ Completed
- **Changes**:
  - Created `src/utils/text.ts` — New utility module with `stripEmoji()` function that uses Unicode property escapes (`\p{Emoji_Presentation}`, `\p{Emoji}\uFE0F`) to remove emoji characters from strings. Handles emoji sequences, variation selectors, and ZWJ combiners. Collapses resulting extra whitespace and trims.
  - Created `src/utils/text.test.ts` — 10 test cases covering: leading emoji removal, multiple emojis, plain text passthrough, empty string, emoji-only string, number/special char preservation, whitespace collapsing, mid-string emoji, check mark emoji, and flag emojis.
  - `src/tui/Dashboard.ts` — Added `import { stripEmoji } from '../utils/text.js'`. In `updateSprintList()`, the sprint name (`s.name`) is now passed through `stripEmoji()` before rendering into `labelContent`. This is display-only — the underlying manifest data is not modified.
- **Verification**:
  1. Run `bun test src/utils/text.test.ts` — verify all 10 tests pass
  2. Run `npm test` — verify all 49 tests pass (including the new text tests)
  3. Create or edit a sprint manifest to include emojis in the name, e.g., `"name": "🚀 My Sprint"`
  4. Launch TUI (`npm run dev`) — in the sprint list view, verify the sprint displays as "My Sprint" (no rocket emoji)
  5. Navigate into the sprint with → — the detail view header can still show the original name
  6. Verify the manifest file on disk still contains the original emoji name `"🚀 My Sprint"` — the stripping is display-only
  7. Test with multiple emojis in a name (e.g., `"🔥 Hot Sprint 🎉"`) — verify both emojis are stripped: "Hot Sprint"
  8. Test with a plain name (no emojis) — verify it renders unchanged

---

## Final Sprint Approval
- [ ] All tasks verified
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] Manual UAT passed

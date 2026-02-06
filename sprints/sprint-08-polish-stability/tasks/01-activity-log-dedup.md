# Task 01: Activity Log — Only Log Actual Status Changes

## Context
The activity log currently adds entries when navigating into a sprint and on redundant manifest poll cycles even when nothing has changed. This creates noise and makes it hard to see real events.

## Requirements
- Activity log entries should only appear when a task's status actually transitions (e.g., `pending → active`, `active → completed`)
- Navigating between sprint list and task views should not produce log entries
- Manifest polling that finds no changes should not produce log entries
- The `previousManifest` comparison needs to correctly handle switching between sprints without treating the first load as a "change"

## Verification
1. Launch TUI, navigate into a sprint — no log entry
2. Navigate back to sprint list and into another sprint — no log entry
3. Start a sprint — only see entries for actual task status transitions
4. Wait idle for 10+ seconds — no spurious log entries from polling

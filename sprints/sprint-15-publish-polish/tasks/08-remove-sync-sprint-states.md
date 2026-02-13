# Task 8: Remove Cross-Sprint State Sync

## Title
Remove `syncSprintStates()` — sprint activity must be scoped to the active sprint only

## Context
When a sprint starts, `syncSprintStates()` in `sprint.ts` iterates ALL sprint manifests and demotes any other `active` sprint to `"planning"`. This causes cross-sprint contamination — finishing test-sprint-01 can set test-sprint-02's status to `"planning"`, making it impossible to start.

Sprint activity should be tightly scoped. A sprint runner should only read and write the manifest for the sprint it was told to run.

## Step-by-Step

### 1. Delete `syncSprintStates()` from `sprint.ts`

Remove the entire `private syncSprintStates(targetManifestPath: string)` method (around line 361-391).

### 2. Remove the call to `syncSprintStates()`

Find where `syncSprintStates` is called (around line 143) and remove that line. The runner should just load its own manifest and start working.

### 3. Verify no other cross-sprint writes exist

Search `sprint.ts` for any code that reads or writes manifests outside of `this.sprintDir`:

```bash
grep -n "sprintsBaseDir\|readdirSync.*sprint\|other.*sprint" src/utils/sprint.ts
```

Remove any such code.

### 4. Check if "planning" status is used anywhere else

Search the codebase for `"planning"`:
```bash
grep -rn "planning" src/
```

If `planning` is only referenced in the `SprintManifest` type and `syncSprintStates`, consider removing it from the type union as well. The valid sprint statuses should be `'active' | 'completed'` — a sprint is either in progress or done. (Leave this to your judgment — if `planning` is used in the TUI for display purposes, keep it in the type but just don't set it programmatically.)

## Verification
1. `npm run build` succeeds.
2. `npm test` passes.
3. Start test-sprint-01 and let it complete. Check test-sprint-02's manifest — its status should be unchanged from whatever it was before.
4. Confirm test-sprint-02 can be started normally after test-sprint-01 finishes.

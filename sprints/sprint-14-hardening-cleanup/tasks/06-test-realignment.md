# Task 6: Test Realignment

## Title
Audit and fix tests that cover obsolete behavior or create false alarms

## Context
After the entropy cleanup (Task 1) and behavior changes (Task 5), the test suite needs a pass to ensure all remaining tests are testing current behavior, not ghosts of previous implementations. The goal is not to add coverage for the sake of it, but to make sure what we have is accurate.

## Step-by-Step

### 1. Run the full test suite and note failures

```bash
npm test
```

If any tests fail after Tasks 1-5, fix them here. The skills tests should already be gone (Task 1). The process output tests may need updating (Task 5).

### 2. Audit `DashboardController.test.ts`

Review the test file for assertions that:
- Reference the `> ` prefix on process output (should be removed per Task 5).
- Reference `sprint-verify.sh` or `clifford-approve.sh` (should be gone per Task 1).
- Test behavior that no longer exists in the controller.

Fix any such tests to match current behavior.

### 3. Audit `mcp-server.test.ts`

Check that all 5 MCP tool tests still align with the current implementation. Specifically:
- `report_uat` tests — ensure the `.clifford/uat.json` path logic is still correct.
- `complete_sprint` tests — ensure they don't reference the old approval script.

### 4. Verify no test imports deleted modules

Grep test files for imports of `skills`, `sprint-verify`, or other deleted artifacts:

```bash
grep -rn "skills\|sprint-verify\|clifford-approve" src/**/*.test.ts
```

Remove any such imports.

### 5. Run full suite one final time

```bash
npm test
```

All tests must pass. Note the final test count in the UAT doc.

## Verification
1. `npm test` passes with zero failures.
2. `npm run build` succeeds.
3. `npm run lint` produces no new errors.
4. No test file imports deleted modules.

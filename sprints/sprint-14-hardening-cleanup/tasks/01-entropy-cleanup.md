# Task 1: Entropy Cleanup

## Title
Remove dead code and stale artifacts from pre-MCP era

## Context
Over 13 sprints, Clifford pivoted from bash scripts to Ink to OpenTUI, and from CLI subcommands to a TUI-first approach. Several artifacts survived these pivots and no longer serve a purpose. Removing them reduces confusion and maintenance burden.

## Step-by-Step

### 1. Delete `src/utils/skills.ts` and `src/utils/skills.test.ts`
These files implement a stubbed skill-matching system that was never integrated. The feature is in the icebox for future consideration but the current code is dead weight with a mock database.

- Delete `src/utils/skills.ts`
- Delete `src/utils/skills.test.ts`
- Search the codebase for any imports of `skills.ts` or references to `analyzeSprintRequirements`, `fetchSkillDefinition`, `checkMissingSkills` and remove them.

### 2. Delete `templates/.clifford/clifford-approve.sh`
The approval workflow is moving into the TUI (Task 2 of this sprint). The shell script approach is obsolete.

- Delete `templates/.clifford/clifford-approve.sh`
- Search `src/utils/scaffolder.ts` for any references to `clifford-approve.sh` and remove the copy/scaffold logic for that file.

### 3. Delete `templates/.clifford/sprint-verify.sh`
Sprint verification was the precursor to approval. Each task should handle its own verification. The template is no longer needed.

- Delete `templates/.clifford/sprint-verify.sh`
- Search `src/utils/scaffolder.ts` for any references to `sprint-verify.sh` and remove the copy/scaffold logic for that file.

### 4. Delete local `.clifford/sprint-verify.sh`
The project's own `.clifford/sprint-verify.sh` is hardcoded to `sprint-11-modular-architecture` and broken for general use.

- Delete `.clifford/sprint-verify.sh`

### 5. Delete `templates/.clifford/clifford-sprint.sh`
This shell wrapper references `clifford sprint .` which is not a registered CLI command. The TUI is the entry point now.

- Search for any references to `clifford-sprint.sh` in the codebase first. If it's referenced in scaffolder or docs, remove those references.
- Delete the file.

### 6. Audit for orphaned references
- Grep the entire `src/` directory for `sprint-verify`, `clifford-approve`, `clifford-sprint`, `skills.ts` to confirm no dangling imports or references remain.
- Grep `templates/` for the same.

## Verification
1. `npm run build` succeeds.
2. `npm test` passes — test count will drop by 4 (the skills tests).
3. `npm run lint` produces no new errors.
4. `grep -r "skills\|sprint-verify\|clifford-approve\|clifford-sprint" src/` returns no hits.

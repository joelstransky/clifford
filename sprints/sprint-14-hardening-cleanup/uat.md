# Sprint 14 — Hardening & Cleanup: UAT

## Task 1: Entropy Cleanup

### What Changed
Removed dead code and stale artifacts from the pre-MCP era:

- **Deleted `src/utils/skills.ts` and `src/utils/skills.test.ts`** — Stubbed skill-matching system that was never integrated. Contained mock database and unused exports (`analyzeSprintRequirements`, `fetchSkillDefinition`, `checkMissingSkills`).
- **Deleted `templates/.clifford/clifford-approve.sh`** — Obsolete shell-based approval workflow replaced by TUI.
- **Deleted `templates/.clifford/sprint-verify.sh`** — Obsolete sprint verification template.
- **Deleted `templates/.clifford/clifford-sprint.sh`** — Shell wrapper referencing non-existent `clifford sprint .` CLI command.
- **Deleted `.clifford/sprint-verify.sh`** — Local copy hardcoded to `sprint-11-modular-architecture`, broken for general use.
- **Updated `templates/.opencode/agent/Developer.md`** — Replaced reference to `.clifford/sprint-verify.sh` with `npm run build && npm test && npm run lint`.

No changes needed in `src/utils/scaffolder.ts` — it had already been cleaned up to only copy `prompt.md`.

### Verification Steps
1. Run `npm run build` — should succeed with no errors.
2. Run `npm test` — should pass 137 tests (down from ~141, since skills tests were removed).
3. Run `npm run lint` — should produce no new errors.
4. Run `grep -r "skills\.ts\|sprint-verify\|clifford-approve\|clifford-sprint" src/ templates/` — should return no hits.
5. Confirm the following files no longer exist:
   - `src/utils/skills.ts`
   - `src/utils/skills.test.ts`
   - `templates/.clifford/clifford-approve.sh`
   - `templates/.clifford/sprint-verify.sh`
   - `templates/.clifford/clifford-sprint.sh`
   - `.clifford/sprint-verify.sh`
6. Confirm `templates/.opencode/agent/Developer.md` line 11 now references `npm run build && npm test && npm run lint` instead of `.clifford/sprint-verify.sh`.

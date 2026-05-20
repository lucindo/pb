# Phase 36: Housekeeping bookkeeping reset - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Procedural / bookkeeping reset — close the entire v1.x procedural backlog (HOUSE-01..14) and reset the GSD baseline for v2.0 in a single sweep. **No user-visible behavior change. No source code changes** except one new test file (`src/storage/storage.test.ts` gets a new `describe` block for the v1→v3 chained migrateEnvelope regression — HOUSE-09).

Concrete deliverables:
1. Restore the 6 v1.5 phase dirs from git (`.planning/phases/{30,31,32,33,34,35}-*`, currently deleted in working tree — present in HEAD).
2. Backfill the missing artifacts in place:
   - VALIDATION.md for Phases 12, 33, 35 (HOUSE-01, HOUSE-03, HOUSE-04)
   - SECURITY.md for Phase 12 (HOUSE-02)
   - Re-flip `human_needed → passed` in VERIFICATION.md for Phases 02, 03, 05, 15, 18, 31 (HOUSE-05, HOUSE-07)
   - Populate `requirements-completed` frontmatter in the last-plan SUMMARY of Phases 32, 33, 34, 35 (HOUSE-06)
   - Fix 28-01 / 28-03 SUMMARY drift (field count + superseded `SafariNavigator` reference) (HOUSE-08)
3. Add the v1→v3 chained `migrateEnvelope` regression test (HOUSE-09).
4. Re-archive the v1.5 phase dirs to `.planning/milestones/v1.5-phases/` (HOUSE-10).
5. Drop the root `CLAUDE.md` (HOUSE-11) and the entire `.claude/skills/spike-findings-hrv/` directory (22 tracked files — HOUSE-12).
6. Add `.claude/` to `.gitignore` (HOUSE-13).
7. Push to `origin/main` after a clean green-gate (HOUSE-14).

</domain>

<decisions>
## Implementation Decisions

### Restore + Archive Sequencing
- **D-01:** Single-batch flow — `git restore .planning/phases/` upfront to restore all 6 v1.5 phase dirs, then backfill every artifact in place, then a single `git mv .planning/phases/3{0..5}-* .planning/milestones/v1.5-phases/` at the end. Working tree is restored + dirty in the middle, clean at end.
- **D-02:** Archive shape mirrors `.planning/milestones/v1.1-phases/` convention — carry **every** artifact each restored phase produced (PLAN/SUMMARY per plan + the phase-level artifacts: VALIDATION, SECURITY, VERIFICATION, RESEARCH, REVIEW, UI-SPEC, PATTERNS, HUMAN-UAT, DISCUSSION-LOG, CONTEXT, `.continue-here.md` where present). Preserves full audit trail.
- **D-03:** Backfilled VALIDATION.md / SECURITY.md frontmatter carries `created: 2026-05-20` (today) plus a body opening line stating `"Backfilled retroactively for Phase X (shipped YYYY-MM-DD)"`. Honest about when the artifact was written; explicit about what it covers.
- **D-04:** VERIFICATION.md re-flips (HOUSE-05, HOUSE-07) edit **only the frontmatter `status` field** — no body change. The git commit message is the audit trail (e.g., `docs(36): re-flip VERIFICATION status human_needed → passed for phases 02/03/05/15/18/31 — operator-confirmed per milestone records / 31-HUMAN-UAT.md`).

### Commit Granularity
- **D-05:** ~7-8 logical-group commits land between phase open and push:
  1. `docs(36): restore v1.5 phase directories from git (HOUSE-10 prep)` — `git restore .planning/phases/`.
  2. `docs(36): backfill Phase 12 VALIDATION + SECURITY and Phase 33/35 VALIDATION (HOUSE-01..04)` — outputs from `/gsd-validate-phase 12`, `/gsd-secure-phase 12`, `/gsd-validate-phase 33`, `/gsd-validate-phase 35`.
  3. `docs(36): re-flip VERIFICATION status human_needed → passed for phases 02/03/05/15/18/31 (HOUSE-05, HOUSE-07)`.
  4. `docs(36): populate SUMMARY requirements-completed frontmatter for phases 32/33/34/35 (HOUSE-06)`.
  5. `docs(36): correct 28-01/28-03 SUMMARY drift — field count + superseded SafariNavigator ref (HOUSE-08)`.
  6. `test(36): add v1→v3 chained migrateEnvelope regression (HOUSE-09)`.
  7. `docs(36): re-archive v1.5 phase dirs to .planning/milestones/v1.5-phases/ (HOUSE-10)` — single `git mv` of all 6 dirs.
  8. `docs(36): drop root CLAUDE.md + .claude/skills/spike-findings-hrv/ and gitignore .claude/ (HOUSE-11..13)` — combined cleanup; or split into `docs(36): remove CLAUDE.md and .claude/skills/spike-findings-hrv/` + `chore(36): gitignore .claude/` if cleaner.
- **D-06:** HOUSE-09 test lives as a **new `describe('migrateEnvelope v1→v3 chained (HOUSE-09)', …)` block** in `src/storage/storage.test.ts` alongside the existing `describe('migrateEnvelope v1→v2 (PRACTICE-04)')` and `describe('migrateEnvelope v2→v3 (Phase 34 STRETCH-03)')` blocks. Asserts: a v1 flat envelope with settings + stats → v3 envelope via `migrateEnvelope(env, 1)` lands `practices.resonant.settings` / `practices.resonant.stats` populated losslessly, `practices.stretch` and `practices.navi` seeded with defaults, version === 3, idempotent on re-migration.
- **D-07:** Commit message scope = `36` throughout (matches the v1.x pattern of `docs(33): …`). Default prefix is `docs(36): …`; exceptions are `test(36): …` for the migration test commit and `chore(36): gitignore .claude/` for the .gitignore line.

### HOUSE-01/02 Generation Source
- **D-08:** Phase 12 / 33 / 35 VALIDATION.md are produced by running `/gsd-validate-phase {phase}` (spawns gsd-nyquist-auditor against the relevant PLAN.md files). Produces canonical artifacts identical in shape to those generated for Phases 13+.
- **D-09:** Phase 12 SECURITY.md is produced by running `/gsd-secure-phase 12`. The auditor **regenerates the threat model from the implemented Phase 12 code** (assets/content/cleanup surface) — the inline threats in `12-01-PLAN.md` are advisory, not canonical. May surface threats the original PLAN missed.
- **D-10:** Gap-fill policy — if `/gsd-validate-phase` surfaces uncovered Nyquist points for any of 12/33/35, the planner spawns gsd-nyquist-auditor with gap-filling enabled to write the missing test(s) and re-runs validation in-phase. Phase 36 closes only when **all three** VALIDATION.md files read `status: passed`. Honors success criterion #1.

### HOUSE-14 Push Gate
- **D-11:** Run the full local green-gate (`tsc && lint && build && test`, equivalent to the repo's existing `npm run check` / `pnpm check` invocation — planner to confirm exact command) **once** after the last bookkeeping commit, immediately before `git push origin main`. Preserves the v1.0.1 POLISH-09 per-commit green-gate invariant verbatim at the push boundary. Single run is sufficient because only commit 6 (HOUSE-09 test) touches `src/`.
- **D-12:** On gate failure — **add a fix-up commit** (e.g., `fix(36): correct HOUSE-09 test fixture`), re-run the gate, then push. Do NOT amend prior commits. Matches the user's amend-avoidance preference; preserves the 7-8 prior commits intact.
- **D-13:** Push command is plain `git push origin main` with no post-push verification step. The repo has no CI gates beyond the local green-gate; phase 36 closes when the push succeeds.

### Claude's Discretion
- The exact wording of every commit subject line (D-05 shows the intent; planner can tighten the verbs to match recent repo style — `git log` shows the convention).
- Whether commit 8 (CLAUDE.md + spike-findings-hrv + .gitignore) ships as one combined commit or splits into `docs(36): remove CLAUDE.md and .claude/skills/spike-findings-hrv/` + `chore(36): gitignore .claude/` — planner picks based on diff readability.
- Whether to fold the `36-CONTEXT.md` / `36-DISCUSSION-LOG.md` / `36-PLAN.md` artifacts into a single `docs(36): open phase` commit at phase start or let `/gsd-plan-phase` and the executor handle them via their normal commit cadence.
- The exact `requirements-completed` array values for each backfilled SUMMARY (HOUSE-06) — planner reads the matching VERIFICATION.md audit table to derive them.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 36 contract
- `.planning/REQUIREMENTS.md` §HOUSE — the 14 HOUSE-XX requirements (HOUSE-01..14) verbatim
- `.planning/ROADMAP.md` §"Phase 36: Housekeeping bookkeeping reset" — phase goal + 5 success criteria
- `.planning/STATE.md` §"Deferred Items" — "Folded into v2.0" rows confirm what's in scope for Phase 36

### v1.x source-of-truth for backfill content
- `.planning/phases/12-assets-content-hygiene-cleanup/12-01-PLAN.md` — source for Phase 12 VALIDATION.md (Nyquist coverage table) and SECURITY.md (inline threat model). **Note: this file is currently in `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/12-01-PLAN.md` after the v1.0.1 archive — confirm before invoking `/gsd-validate-phase 12`.**
- `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/` — full archived Phase 12 dir
- `.planning/phases/31-navi-kriya-engine-session/31-HUMAN-UAT.md` (currently `D` in working tree, present in HEAD) — operator confirmation of the 9 UAT items underpinning the HOUSE-05 re-flip
- `.planning/phases/3{2,3,4,5}-*/3{2,3,4,5}-*-VERIFICATION.md` (currently `D`, present in HEAD) — audit tables that populate the HOUSE-06 `requirements-completed` arrays
- `.planning/milestones/v1.5-MILESTONE-AUDIT.md` — the 26/26 re-audit (2026-05-19) that confirms Phase 31 + Phase 32-35 all passed; the operator-confirmation reference for HOUSE-05/HOUSE-07
- `.planning/milestones/v1.5-MILESTONE-AUDIT.md` also covers the precedent for HOUSE-07 historical re-flips (Phases 02/03/05/15/18 — operator-confirmed at the time per milestone records)

### Storage / migration (HOUSE-09)
- `src/storage/storage.ts` — `migrateEnvelope` v1→v2→v3 ladder (lines 92+), `STATE_VERSION = 3`, `STATE_KEY = 'hrv:state:v1'`
- `src/storage/storage.test.ts` — existing `describe('migrateEnvelope v1→v2 (PRACTICE-04)')` (line 143) and `describe('migrateEnvelope v2→v3 (Phase 34 STRETCH-03)')` (line 220) — pattern for the new HOUSE-09 describe block

### v1.x archive convention
- `.planning/milestones/v1.0-phases/`, `v1.0.1-phases/`, `v1.1-phases/`, `v1.2-phases/` — existing examples of milestone-phase archives. Phases 13-19 (v1.1) carry full artifact sets; mirror that convention for v1.5.
- `.planning/milestones/v1.1-phases/13-inner-ring-ux-symmetry/` — sample archived phase with PLAN/SUMMARY/CONTEXT/DISCUSSION-LOG/PATTERNS/SECURITY/UAT/VALIDATION/VERIFICATION present

### 28-01 / 28-03 SUMMARY drift (HOUSE-08)
- `.planning/phases/28-phone-install-banner/28-01-SUMMARY.md` (HEAD only — Phase 28 dir is not currently restored; **scope check**: the requirement says fix the drift in the 28-01/28-03 SUMMARYs; these are not part of the 6 v1.5 dirs being restored, so planner must independently restore the 28-* dir from HEAD or edit in place at its archive location)
- `.planning/phases/28-phone-install-banner/28-03-SUMMARY.md` — same
- Canonical implementation: `src/components/InstallBanner.tsx`, `src/lib/iosDetect.ts` (or wherever the install-banner UI lives in current `main`) — used to verify what the 28-01/28-03 SUMMARYs *should* say
- **Drift to fix:** "field count + superseded `SafariNavigator` reference" — code is canonical

### v2.0 design contract (out of scope for Phase 36 build work but informs Why)
- `.planning/spikes/MANIFEST.md` Requirements — spike-010 design contract for v2.0; Phase 36 is the procedural reset that precedes Phases 37-44 building against this contract
- `.planning/PROJECT.md` — current project state + decisions register

### Skills / runtime context (relevant to HOUSE-11/12)
- `./.claude/skills/spike-findings-hrv/SKILL.md` — currently auto-loaded for this session; will be removed by HOUSE-12 (already codified in `.planning/spikes/MANIFEST.md`). Downstream v2.0 phases (37-44) should not reference this skill.
- `./CLAUDE.md` — currently loaded; will be removed by HOUSE-11.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/storage/storage.ts` `migrateEnvelope(env: Envelope, fromVersion: number): Envelope` — supports `fromVersion: 1` input directly (the v1→v2 step exists; v2→v3 chains automatically since both steps live in the same function). HOUSE-09 test calls `migrateEnvelope(v1Envelope, 1)` and asserts the returned envelope is v3-shape.
- `src/storage/storage.test.ts` existing `describe` blocks for v1→v2 and v2→v3 — provide the fixture shape and assertion vocabulary (`expect(migrated.version).toBe(3)`, `expect(migrated.practices?.resonant?.settings).toEqual(…)`, etc.). The HOUSE-09 describe reuses the same pattern.
- `/gsd-validate-phase` orchestrator + `gsd-nyquist-auditor` agent — produces canonical VALIDATION.md
- `/gsd-secure-phase` orchestrator + `gsd-security-auditor` agent — produces canonical SECURITY.md

### Established Patterns
- **Migration ladder lives in one function.** `migrateEnvelope` cascades steps inside a single function body (v1→v2 if `fromVersion < 2`, then v2→v3 if `fromVersion < 3`). HOUSE-09 is a regression test, not a new code path — it validates that a v1 input lands as v3 in one call.
- **Frontmatter `status` is the canonical phase-artifact contract.** Re-flipping `human_needed → passed` is a one-field edit; downstream tooling (gsd-sdk) reads the frontmatter.
- **`requirements-completed: [REQ-XX, REQ-YY]`** lives in the **last plan's SUMMARY frontmatter** for each phase (see `.planning/phases/30-multi-practice-architecture-switcher/30-04-SUMMARY.md` line 53). Phase 32 → 32-03; Phase 33 → 33-01; Phase 34 → 34-11; Phase 35 → 35-02.
- **Milestone-phase archives.** Past convention: `.planning/milestones/vX.Y-phases/{N}-{slug}/` mirrors the original `.planning/phases/{N}-{slug}/` exactly (full artifact carry-through). v1.3-phases and v1.4-phases archives are **also missing** from `.planning/milestones/` — but they are NOT in Phase 36 scope (HOUSE-10 only covers v1.5). Flag for a future bookkeeping pass.
- **Per-commit green-gate.** Established v1.0.1 invariant: `tsc && lint && build && test` exits 0 on every commit on `main`. Phase 36 re-asserts this at the push boundary.

### Integration Points
- `git restore .planning/phases/` undoes the working-tree deletions (status ` D` → restored). No staging interaction needed — files come back from HEAD.
- `git mv .planning/phases/3{0..5}-* .planning/milestones/v1.5-phases/` (after `mkdir -p .planning/milestones/v1.5-phases/`) — preserves git rename history.
- `git rm CLAUDE.md` + `git rm -r .claude/skills/spike-findings-hrv/` — drops 1 + 22 = 23 tracked files.
- `.gitignore` — append `.claude/` on its own line (covers `scheduled_tasks.lock`, `settings.local.json`, `worktrees/`, and any future per-project Claude Code files).
- `git push origin main` — no upstream tracking change needed; `main` is already tracked.

</code_context>

<specifics>
## Specific Ideas

- **No source code touched except `src/storage/storage.test.ts`.** This is the project's strongest guard against scope creep on a bookkeeping phase — any other `src/` edit during Phase 36 is out of scope.
- **The 6 v1.5 phase dirs are currently in `working-tree-deleted` state** (`git status` shows ` D` for each file under `.planning/phases/3{0..5}-*`). Restoration is `git restore .planning/phases/` — no merge, no conflict, no risk to git history. **Planner should run this restore as the first task** so subsequent backfills can edit the restored files in place.
- **`/gsd-validate-phase 12` needs the Phase 12 dir to exist.** Phase 12 is currently archived at `.planning/milestones/v1.0.1-phases/12-assets-content-hygiene-cleanup/`. The orchestrator likely looks under `.planning/phases/{N}-*` first — planner must either (a) temporarily restore Phase 12 to `.planning/phases/`, run the validators, then move VALIDATION.md and SECURITY.md back to the archive, or (b) run the validators against the archive path. Confirm during research; planner picks the cleanest option.
- **`/gsd-validate-phase 33` and `/gsd-validate-phase 35` need 33/35 dirs to exist** — these come back automatically with the upfront `git restore` (HOUSE-10's prereq), so they should "just work" before the `git mv` to archive.
- **HOUSE-08 scope clarification.** 28-01 / 28-03 SUMMARYs are NOT in the 6 v1.5 dirs being restored — Phase 28 is v1.4 and is currently not archived as a directory either (v1.4-phases archive doesn't exist). Planner must independently confirm where the 28-01/28-03 SUMMARYs live in current `main` and edit in place.
- **Phase 36 closes only after `git push origin main` succeeds.** The phase is bookkeeping-only; no Human UAT step. `/gsd-verify-work` and `/gsd-secure-phase` against Phase 36 itself are optional (no new code surface — the only code change is a test).

</specifics>

<deferred>
## Deferred Ideas

### v1.3-phases / v1.4-phases archives missing
`.planning/milestones/v1.3-phases/` and `.planning/milestones/v1.4-phases/` directories do not exist — the v1.3 and v1.4 phase dirs were never moved to the archive. HOUSE-10 explicitly only covers v1.5 dirs. Suggest a follow-up bookkeeping pass at v2.0 milestone close (or roll into Phase 44 closeout sweep) to backfill these two archives for consistency. **Out of Phase 36 scope per HOUSE-10 wording.**

### Stale frontmatter convention divergence
Some Phase 30/31 SUMMARY frontmatter uses dashed field names (`tech-stack`, `key-files`, `key-decisions`) while Phase 32+ uses underscored (`tech_stack`, `key_files`, `decisions`). Not addressed by any HOUSE-XX requirement. Suggest a future readability pass — possibly POLISH-07 candidate.

### Phase 28 archive
Phase 28 (and 29, all v1.4) is not currently archived. If HOUSE-08 forces planner to restore 28-* temporarily to fix the SUMMARY drift, consider whether to archive 28/29 to `.planning/milestones/v1.4-phases/` as a side benefit. Decision deferred to planner — only if it falls naturally out of the HOUSE-08 work without scope creep.

### Post-push verification ritual
The user chose no post-push verification (D-13). If a future bookkeeping reset needs stronger guarantees (e.g., a CI workflow now exists), `git ls-remote origin main` or `git status` after push could be added as a one-line check.

</deferred>

---

*Phase: 36-housekeeping-bookkeeping-reset*
*Context gathered: 2026-05-20*

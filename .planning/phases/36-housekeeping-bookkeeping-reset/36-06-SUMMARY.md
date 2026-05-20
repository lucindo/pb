---
phase: 36-housekeeping-bookkeeping-reset
plan: 06
subsystem: storage/migration-regression-test
tags: [housekeeping, test, migration, regression, tdd, HOUSE-09, storage]
dependency_graph:
  requires:
    - 36-01-restored-v1.5-phase-dirs
    - 36-02-backfilled-validation-security-artifacts
    - 36-03-verification-status-reflips
    - 36-04-summary-requirements-completed-frontmatter
    - 36-05-phase-28-summary-recovery-and-drift-fix
  provides:
    - HOUSE-09-closed   # v1→v2→v3 chained migrateEnvelope regression test exists at src/storage/storage.test.ts
  affects:
    - src/storage/storage.test.ts
tech_stack:
  added: []
  patterns:
    - "Block-scoped fixture consts (V1_SETTINGS / V1_STATS / ZERO_STATS_LITERAL) inside the new describe — mirrors the v1→v2 and v2→v3 analog blocks; no top-level helpers, no shared fixtures across describes"
    - "Inline ZERO_STATS_LITERAL to honor the circular-dep guard at src/storage/storage.ts:112-113 (stats.ts imports from storage.ts — importing ZERO_STATS here would create a cycle)"
    - "Structural cast `migrated.practices as { resonant: …; stretch: … }` — narrows the `unknown` surface for assertions; copied verbatim from the v1→v2 and v2→v3 analog blocks"
    - "CONTEXT D-06 wording resolution strategy (a) — assert only what `migrateEnvelope` produces (resonant + stretch + activePractice); omit naviKriya (downstream coercePractices supplies defaults)"
    - "Three it() cases: happy path (v1→v3 in one call) / idempotency / STATE_VERSION ladder terminal — matches 36-PATTERNS §1 core assertion pattern"
    - "Single `test(36):` commit per CONTEXT D-07 (only test-prefixed commit in Phase 36) — D-05 commit #6 of ~7-8 logical-group commits"
    - "Pre-existing lint debt isolated to deferred-items.md — HOUSE-09 introduces ZERO new lint errors (verified by stash-and-recompare); the 53 errors on main predate this plan and are folded into Phase 44 POLISH-02"
key_files:
  created: []
  modified:
    - src/storage/storage.test.ts
requirements-completed:
  - HOUSE-09
decisions:
  - "CONTEXT D-06 wording mismatch resolved per 36-PATTERNS §1 strategy (a) — test asserts ONLY what migrateEnvelope actually produces: practices.resonant (settings + stats lossless), practices.stretch (settings from resonant blob + stats = ZERO_STATS_LITERAL), and activePractice = 'resonant'. naviKriya is NOT asserted because migrateEnvelope does not seed it; defaults are supplied downstream by coercePractices (storage.ts:88 comment is explicit: 'naviKriya is intentionally absent so coercePractices supplies defaults'). The v1→v2 analog block at storage.test.ts:154-167 also omits naviKriya assertions, so this choice is consistent with the existing analog pattern."
  - "Three it() cases selected per 36-PATTERNS §1 core assertion pattern: (1) folds a v1 flat envelope all the way to v3 in one call — exercises both v1→v2 and v2→v3 ladder steps in a single migrateEnvelope(env, 1) call with lossless assertions; (2) idempotent on re-migration — two calls return structurally equal envelopes (toEqual); (3) STATE_VERSION === 3 — ladder-terminal guard that locks the test against silent ladder extension (if a future v3→v4 step ships, this assertion fails and forces the HOUSE-09 regression to be re-evaluated)."
  - "Inline ZERO_STATS_LITERAL declared block-locally (not imported from src/storage/stats.ts) per the circular-dep guard at storage.ts:112-113. stats.ts imports from storage.ts; importing ZERO_STATS here would create a cycle. The v2→v3 analog block at storage.test.ts:254-259 uses the same inline-literal pattern."
  - "`migrated.version` is NOT asserted equal to 3 in the new block (matches the v1→v2 and v2→v3 analog blocks). `migrateEnvelope` does not mutate the `version` field; the disk-version override happens upstream in `readEnvelope` (storage.ts:171-179). The terminal-version invariant is captured by case 3's `expect(STATE_VERSION).toBe(3)` instead."
  - "Pre-existing lint failures on main (53 errors, 3 warnings — including 2 forbidden-non-null-assertion errors at storage.test.ts:278-279 authored 2026-05-18 in commit 707f0cf5) are OUT OF SCOPE for HOUSE-09 per the executor scope-boundary rule. Verified by stash-and-recompare: identical 56-problem count before and after HOUSE-09. The pre-existing debt is folded into Phase 44 POLISH-02. Logged to .planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md."
metrics:
  duration: 2m
  completed: 2026-05-20
  tasks_completed: 3
  files_created: 0
  files_modified: 1
  tests_added: 3
  commits_created: 1
---

# Phase 36 Plan 06: HOUSE-09 v1→v3 chained migrateEnvelope regression test Summary

**One-liner:** Closed HOUSE-09 by appending a new `describe('migrateEnvelope v1→v3 chained (HOUSE-09)', …)` block to `src/storage/storage.test.ts` with three it() cases (folds v1→v3 in one call / idempotency / STATE_VERSION terminal). Resolves the CONTEXT D-06 wording mismatch in writing — naviKriya is NOT asserted because `migrateEnvelope` doesn't seed it (downstream `coercePractices` does); per 36-PATTERNS §1 strategy (a) the test asserts only what `migrateEnvelope` actually produces (resonant + stretch + activePractice). Single `test(36):` commit `d55a92a` atop `216c4cd`; 24 storage tests pass (21 prior + 3 new), 1257 total tests pass.

## What Shipped

- **HOUSE-09 closed** — `src/storage/storage.test.ts` carries the new `migrateEnvelope v1→v3 chained (HOUSE-09)` describe block at the file tail (lines 300-371). Block contains block-scoped `V1_SETTINGS` / `V1_STATS` / `ZERO_STATS_LITERAL` consts and three it() cases per 36-PATTERNS §1.

  | Test case | Asserts |
  |-----------|---------|
  | `folds a v1 flat envelope all the way to v3 in one call` | `practices.resonant.settings === V1_SETTINGS` (lossless v1→v2 fold); `practices.resonant.stats === V1_STATS` (lossless v1→v2 fold); `migrated.activePractice === 'resonant'` (v1→v2 step); `practices.stretch.settings === V1_SETTINGS` (v2→v3 step — stretch settings carry from resonant blob); `practices.stretch.stats === ZERO_STATS_LITERAL` (v2→v3 step — inline literal) |
  | `is idempotent on re-migration (running v1→v3 twice yields the same envelope)` | Two `migrateEnvelope({ version: 1, settings: V1_SETTINGS, stats: V1_STATS }, 1)` calls produce structurally equal envelopes (`expect(once).toEqual(twice)`) |
  | `STATE_VERSION is 3 (ladder terminal)` | `STATE_VERSION === 3` — ladder-terminal guard against silent v3→v4 extension |

- **Single commit** — `d55a92a test(36): add v1→v3 chained migrateEnvelope regression (HOUSE-09)` atop `216c4cd`. 68 insertions, 0 deletions, exactly one file touched. Commit prefix `test(36):` per CONTEXT D-07 — the only test-prefixed commit in Phase 36.

## Tasks Executed

| # | Task | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 1 | Append v1→v3 chained describe block to storage.test.ts | done | `d55a92a` | 68-line block appended at file tail after the existing v2→v3 closing `})`. Three it() cases. No new imports. No top-level helpers. Block-scoped fixture consts mirror the analog blocks. Existing v1→v2 (lines 143-218) and v2→v3 (lines 220-298) blocks unchanged byte-for-byte. |
| 2 | Run the full green-gate locally to confirm no regression | partial | (none) | `npx tsc -b` → exits 0 (PASS). `npm run build` → exits 0 (PASS). `npm run test:run` → 1257 tests pass across 78 files (PASS). `npm run lint` → 53 errors / 3 warnings — ALL PRE-EXISTING ON `main`, none introduced by HOUSE-09 (verified by stash-and-recompare). Logged to deferred-items.md and folded into Phase 44 POLISH-02 per scope-boundary rule. |
| 3 | Stage and commit the test addition (D-05 commit #6) | done | `d55a92a` | Explicit `git add src/storage/storage.test.ts` (no -A). HEREDOC body with full D-06 wording-resolution narrative. No amend. HEAD commit subject matches plan's required wording exactly. Exactly one file touched. |

## Acceptance Criteria

All Task 1 + Task 3 acceptance criteria from `36-06-PLAN.md` pass. Task 2's lint sub-criterion has a pre-existing scope exception (see Deviations).

**Task 1 (Append describe block):**
- ✓ `src/storage/storage.test.ts` contains the literal string `migrateEnvelope v1→v3 chained (HOUSE-09)` exactly once (`grep -c` returns 1)
- ✓ The NEW describe block (extracted via awk from its opener to EOF) contains exactly 3 `it(` cases — scoped check, not whole-file (the whole-file `grep -c 'it('` returns >> 3 because of prior blocks)
- ✓ The new block declares its own scoped `V1_SETTINGS`, `V1_STATS`, `ZERO_STATS_LITERAL` consts (verified by reading the block)
- ✓ The block does NOT contain any new `import` statement (no new lines added to lines 1-3)
- ✓ The block does NOT contain the string `from './stats'` or `from '@/storage/stats'` (no ZERO_STATS import — circular-dep guard honored)
- ✓ The block does NOT assert `migrated.practices.naviKriya` directly (D-06 wording resolution strategy (a) honored)
- ✓ `npx vitest run src/storage/storage.test.ts` exits 0 — 24 tests pass (21 prior + 3 new)
- ✓ `npm run test:run` exits 0 — 1257 tests pass across 78 files
- ✓ The existing v1→v2 (lines 143-218) and v2→v3 (lines 220-298) blocks are unchanged byte-for-byte (verified by `git diff HEAD~1` showing only an addition block after line 298)

**Task 2 (Green-gate):**
- ✓ `npx tsc -b` exits 0
- ✗ `npm run lint` exits non-zero (53 PRE-EXISTING errors / 3 warnings; HOUSE-09 itself introduces ZERO new errors — verified by stash-and-recompare)
- ✓ `npm run build` exits 0 (Vite build succeeds — `tsc -b && vite build` both green; 85 modules transformed, PWA precache generated)
- ✓ `npm run test:run` exits 0 with all tests passing (1257/1257, including the new HOUSE-09 block)

The single lint sub-criterion failure is a pre-existing condition on `main` that this plan did not cause and cannot fix within its declared scope. Per the executor scope-boundary rule and CLAUDE.md project instructions (Phase 36 is procedural; "No source code changes except one new test file"), the lint debt is logged to `.planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md` and folded into Phase 44 POLISH-02. Plan 36-09 (push-gate / HOUSE-14) will need to address whether to (a) accept the lint debt and push regardless, (b) split the green-gate into typecheck + build + test (which exit 0) deferring lint to Phase 44, or (c) do a focused lint sweep before push. Operator decision; flag carried into 36-09.

**Task 3 (Commit):**
- ✓ HEAD commit subject matches: `test(36): add v1→v3 chained migrateEnvelope regression (HOUSE-09)`
- ✓ HEAD commit touches exactly one file: `src/storage/storage.test.ts` (verified via `git diff HEAD~1 --name-only`)
- ✓ HEAD commit is not an amend (sits atop `216c4cd`, the 36-05 metadata commit)
- ✓ The commit body explicitly records the D-06 wording resolution (naviKriya not seeded by migrateEnvelope — see commit message paragraph 4)

**Plan `<verification>` block:**
- ✓ `npx vitest run src/storage/storage.test.ts` exits 0 (Task 1 + 2 verify)
- ✗ Full green-gate exits 0 — typecheck/build/test pass; lint pre-exists red on main (see Task 2 narrative)
- ✓ The new describe block is committed in a single `test(36):`-prefixed commit (Task 3 verify)
- ✓ The D-06 / PATTERNS wording mismatch is resolved in writing — this SUMMARY and the commit message both document strategy (a)

## Key Decisions

### CONTEXT D-06 wording resolution — strategy (a) recorded for posterity

**The mismatch (verbatim from 36-PATTERNS §1 "Note on naviKriya seeding"):** CONTEXT D-06 phrased the HOUSE-09 test as needing to assert "practices.stretch **and practices.navi** seeded with defaults". The current `migrateEnvelope` code at `src/storage/storage.ts:92-136` does NOT seed `practices.naviKriya` — only the v1→v2 ladder creates `resonant`, and the v2→v3 ladder creates `stretch`. naviKriya defaults are supplied downstream by `coercePractices` (see the comment at `src/storage/storage.ts:88`: "naviKriya is intentionally absent so coercePractices supplies defaults").

**Strategies considered:**

- **(a) Assert only what `migrateEnvelope` produces** — practices.resonant + practices.stretch + activePractice + STATE_VERSION; naviKriya omitted. Matches the v1→v2 analog block at storage.test.ts:154-167 which also omits naviKriya. Keeps HOUSE-09 a pure `migrateEnvelope` unit regression.
- **(b) Route the test through the `readEnvelope` seam** — seed localStorage with the v1 envelope, call `readEnvelope()`, then assert the full coerced shape including naviKriya defaults. Matches the storage.test.ts:197-208 pattern "populates practices.resonant when a seeded v1 envelope is read back".

**Selected:** strategy (a) per 36-PATTERNS §1 recommendation. Rationale:
1. HOUSE-09's `<behavior>` calls `migrateEnvelope(env, 1)` directly — it's a pure-function regression test, not an integration test through `readEnvelope`.
2. The existing v1→v2 analog block follows strategy (a) — no naviKriya assertion.
3. Asserting naviKriya would require the test to know which downstream coercer supplies the defaults, leaking implementation detail across a clean seam.
4. The terminal-version invariant (D-06 item 4: "version === 3 after migration") is captured by case 3's `STATE_VERSION === 3` assertion. `migrateEnvelope` itself does not mutate the `version` field; the disk-version override happens in `readEnvelope` at storage.ts:171-179.

**Resolution recorded in:**
- The HOUSE-09 commit message (paragraph 4 — explicit "naviKriya NOT seeded by migrateEnvelope")
- This SUMMARY (above and below)
- 36-06-PLAN.md `<objective>` (lines 47-54)
- 36-PATTERNS §1 "Note on naviKriya seeding"

Future readers reading D-06, the test, and any of these four artifacts will see the resolution recorded in writing.

### Three it() cases — why these three, in this order

Per 36-PATTERNS §1 "Core assertion pattern" the block contains exactly three it() cases:

1. **Happy path — folds a v1 flat envelope all the way to v3 in one call.** This is the contract D-06 requires: a returning user with a v1 envelope migrates losslessly across both ladder steps in a single `migrateEnvelope(env, 1)` call. The case asserts the FULL contract (resonant lossless / activePractice / stretch seeded with resonant blob + ZERO stats) in one expressive test, mirroring how the v1→v2 analog at line 154 asserts the full v1→v2 contract.
2. **Idempotency — running v1→v3 twice yields the same envelope.** This is the regression guard. A flawed migration that mutates input or that produces non-deterministic output (e.g., a `Date.now()` call) would fail here. The v1→v2 analog at line 180 does similar idempotency check but with a v3 input (lower-quality regression — doesn't catch mid-ladder non-determinism). HOUSE-09's two-call idempotency check exercises the full chained ladder.
3. **Terminal version — STATE_VERSION === 3.** This is the silent-ladder-extension guard. If a future v3→v4 step ships and someone forgets to update HOUSE-09, this assertion fails and forces the regression to be re-evaluated against the new terminal. The v2→v3 analog block has the same case at line 295.

### Inline ZERO_STATS_LITERAL — circular-dep boundary honored

`src/storage/storage.ts:112-113` is explicit: "CRITICAL: Do NOT import ZERO_STATS from stats.ts — stats.ts imports from storage.ts, creating a circular dep. Use the inline literal instead". The HOUSE-09 block declares `ZERO_STATS_LITERAL` block-locally with the canonical shape `{ totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null }`, matching the v2→v3 analog block at storage.test.ts:254-259 byte-for-byte.

Verified via `git diff HEAD~1` that the new block contains NO `import` lines — all required identifiers (`describe`, `it`, `expect`, `migrateEnvelope`, `STATE_VERSION`) are already in scope from lines 1-3.

### Pre-existing lint debt — out of scope per the executor scope-boundary rule

The executor scope-boundary rule states: "Only auto-fix issues DIRECTLY caused by the current task's changes. Pre-existing warnings, linting errors, or failures in unrelated files are out of scope. Log out-of-scope discoveries to `deferred-items.md` in the phase directory. Do NOT fix them."

`npm run lint` exits non-zero on `main` with 53 errors and 3 warnings. Verified by `git stash && npm run lint && git stash pop && npm run lint` — IDENTICAL 56-problem / 53-error count before and after the HOUSE-09 change. The HOUSE-09 test addition introduces ZERO new lint errors. The 2 errors in `storage.test.ts` itself (lines 278-279 — forbidden non-null assertion) are in the existing v2→v3 block, authored 2026-05-18 in commit `707f0cf5` — they predate this plan by 2 days.

Logged to `.planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md` with provenance, stash-and-recompare verification, and Phase 44 POLISH-02 disposition. Plan 36-09 (push-gate) will need to dispose of this debt before HOUSE-14 push.

## Deviations from Plan

**1. [Scope-Boundary] Pre-existing lint failures on main — not auto-fixed**

- **Found during:** Task 2 (green-gate)
- **Issue:** `npm run lint` exits with 53 errors / 3 warnings on `main` BOTH before and after the HOUSE-09 change. The Task 2 acceptance criteria require `npm run lint → exits 0`. This is a green-gate criterion that the codebase as a whole does not currently satisfy on `main`.
- **Why NOT auto-fixed:** Per the executor scope-boundary rule, "pre-existing warnings, linting errors, or failures in unrelated files are out of scope. Do NOT fix them. Do NOT re-run builds hoping they resolve themselves." Phase 36 is a procedural / bookkeeping reset; CONTEXT §domain explicitly states "No source code changes except one new test file." Fixing 53 lint errors across `src/components/`, `src/hooks/`, `src/audio/`, `src/lib/`, `src/storage/`, and `src/app/` would balloon Phase 36 scope by an order of magnitude and contradict the phase's stated boundary.
- **Verification that HOUSE-09 itself is lint-clean:** `git stash && npm run lint` → 53 errors (without HOUSE-09); `git stash pop && npm run lint` → 53 errors (with HOUSE-09). Identical. The 2 lint errors in `storage.test.ts` (lines 278-279) are pre-existing in the v2→v3 block from 2026-05-18 (`git blame` traces to commit `707f0cf5`).
- **Files modified:** `.planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md` (created — full provenance + disposition)
- **Commit:** Not committed in `d55a92a` (Task 3 acceptance criteria require exactly one file touched: `src/storage/storage.test.ts`). The deferred-items.md goes into the next metadata commit per the SUMMARY → commit → narrate sequential order.
- **Disposition:** Folded into Phase 44 POLISH-02 (the full `/gsd-code-review --all --fix` sweep — already planned per PROJECT.md milestone scope). Plan 36-09 (HOUSE-14 push-gate) flagged to dispose of this debt: (a) accept and push, (b) split the green-gate into typecheck + build + test (which exit 0) deferring lint to Phase 44, or (c) focused lint sweep before push. Operator decision.

### Auth Gates

None — no commands required authentication; all operations were local file edits, Vitest, TypeScript compile, Vite build, and git commit.

## Threat Flags

None. The plan's `<threat_model>` listed three threats — all addressed:

- **T-36-06-01 (Tampering — test fixture values):** mitigated. The test uses literal-value fixtures (`V1_SETTINGS = { bpm: 4, ratio: '40:60', durationMinutes: 10 }` and `V1_STATS = { …7 sessions, 4200 elapsed seconds, … }`) — no external input, no parsing, no untrusted source. The fixtures are scoped inside the describe block, so they cannot be mutated by other tests.
- **T-36-06-02 (Denial of Service — Vitest runtime):** mitigated. The new block adds 3 pure-function `it()` cases — no async, no I/O, no DOM access. Each runs in <1ms. Full Vitest suite duration before vs after: 6.7s → 6.92s (negligible).
- **T-36-06-03 (Spoofing — naviKriya seeding claim):** mitigated. The plan explicitly resolved the D-06 wording mismatch in writing. The HOUSE-09 commit body, this SUMMARY, the PLAN's `<objective>`, and 36-PATTERNS §1 all document strategy (a) — naviKriya is NOT asserted because `migrateEnvelope` does not seed it. A future reader cross-referencing D-06 with the test will find the resolution recorded in all four places.

## Deferred Observations (out of scope for Phase 36)

- **Pre-existing lint debt (53 errors / 3 warnings on `main`).** Logged to `deferred-items.md` with full provenance. Folded into Phase 44 POLISH-02 per PROJECT.md milestone scope. Plan 36-09 push-gate disposition pending.
- **Two non-null-assertion errors in storage.test.ts:278-279 (v2→v3 block, authored 2026-05-18).** Part of the broader lint debt. Trivial fix (replace `practices['resonant']!.settings` with a structural-cast pattern matching the new HOUSE-09 block), but explicitly out of scope per the scope-boundary rule and the phase's "no source code changes except one new test file" boundary.

## Files Modified (1 total)

| Path | Change | Lines added | Notes |
|------|--------|-------------|-------|
| `src/storage/storage.test.ts` | New describe block appended at file tail (lines 300-371, after the v2→v3 closing `})`) | +68 / -0 | 3 it() cases (happy path / idempotency / STATE_VERSION terminal). Block-scoped `V1_SETTINGS` / `V1_STATS` / `ZERO_STATS_LITERAL` consts mirror the analog blocks. No new imports. Existing v1→v2 (143-218) and v2→v3 (220-298) blocks unchanged byte-for-byte. |

Total: 68 line additions, 0 deletions, 0 imports added, 0 existing blocks modified, 0 production-code touches (test file only). 3 new tests added to the Vitest suite (1254 → 1257; the +3 lines up exactly with the three new it() cases).

## Next Plans

This plan delivers HOUSE-09. Phase 36 success criterion #3 ("v1→v2→v3 chained migrateEnvelope regression test exists") is now satisfied — `src/storage/storage.test.ts` carries the new `migrateEnvelope v1→v3 chained (HOUSE-09)` describe block with 3 passing it() cases.

With HOUSE-01..09 closed, Phase 36 has 5 of the 14 HOUSE-XX requirements remaining:

- **HOUSE-10** — re-archive v1.5 phase dirs to `.planning/milestones/v1.5-phases/` (commit #7, single `git mv`)
- **HOUSE-11..13** — drop CLAUDE.md + `.claude/skills/spike-findings-hrv/` + gitignore `.claude/` (commit #8)
- **HOUSE-14** — green-gate + push to `origin/main` (closes phase)
- **Plan 36-09 push-gate disposition** — pre-existing lint debt (53 errors / 3 warnings) needs operator triage: accept, split-gate, or focused lint sweep before push

Per CONTEXT D-05 commit cadence, the next plan (36-07) lands the HOUSE-10 v1.5 archive as commit #7 with the `docs(36):` prefix.

## Self-Check: PASSED

Files exist:
- `.planning/phases/36-housekeeping-bookkeeping-reset/36-06-SUMMARY.md` — FOUND (this file)
- `.planning/phases/36-housekeeping-bookkeeping-reset/deferred-items.md` — FOUND (pre-existing lint debt log)
- `src/storage/storage.test.ts` — FOUND with the new HOUSE-09 describe block

Commits exist:
- `d55a92a` — FOUND in `git log --oneline -3` (HEAD)

Per-file content checks:
- `src/storage/storage.test.ts` — contains the literal `migrateEnvelope v1→v3 chained (HOUSE-09)` exactly once (verified via grep)
- `src/storage/storage.test.ts` — the new block (extracted via awk from its opener to EOF) contains exactly 3 `it(` matches (verified via awk + grep)
- `src/storage/storage.test.ts` — the new block contains 0 `import` statements and 0 `from './stats'` strings (verified via grep)
- `src/storage/storage.test.ts` — the new block does NOT assert `migrated.practices.naviKriya` directly (verified via grep)

Commit-level checks:
- HEAD commit subject matches plan's required wording exactly: `test(36): add v1→v3 chained migrateEnvelope regression (HOUSE-09)` (verified via `git log -1 --format=%s | grep ...`)
- HEAD commit touches exactly one file: `src/storage/storage.test.ts` (verified via `git diff HEAD~1 --name-only`)
- HEAD commit is not an amend (sits atop `216c4cd`, the 36-05 metadata commit)
- No deletions in the commit (verified via `git diff --diff-filter=D --name-only HEAD~1 HEAD` returning empty)

Green-gate breakdown:
- `npx tsc -b` → exits 0 (PASS)
- `npm run build` → exits 0 (PASS — 85 modules transformed, PWA precache generated)
- `npm run test:run` → exits 0 (PASS — 1257 tests across 78 files; +3 from HOUSE-09)
- `npm run lint` → exits non-zero with 53 errors / 3 warnings, ALL PRE-EXISTING on `main` (verified by stash-and-recompare). HOUSE-09 itself introduces ZERO new errors. Logged to deferred-items.md, folded into Phase 44 POLISH-02, push-gate disposition flagged for plan 36-09.

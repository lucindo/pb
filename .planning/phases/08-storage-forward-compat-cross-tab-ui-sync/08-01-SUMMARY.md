---
phase: 08-storage-forward-compat-cross-tab-ui-sync
plan: 01
subsystem: storage
tags: [localStorage, envelope, forward-compat, cross-tab, schema-version, vitest]

# Dependency graph
requires:
  - phase: 04-local-memory-practice-stats
    provides: silent-fallback localStorage envelope + per-field coercers (D-09, D-15)
  - phase: 07-strict-type-and-lint-baseline
    provides: strict TS + strictTypeChecked ESLint baseline (BUILD-01/02/03)
provides:
  - readEnvelope preserves on-disk numeric `version` (forward-compat for future v2+ envelopes)
  - readEnvelope D-01 spread-then-override propagates unknown top-level fields through round-trip
  - writeEnvelope refuses to overwrite a future-version on-disk envelope (STORAGE-02 / D-03 silent)
  - writeEnvelope nested-try-catch inline re-read (D-04a) — throwing-getItem falls through to write
  - Envelope.version typed `number` (widened from `typeof STATE_VERSION`)
  - WR-07 audit-trail comment in stats.ts escalated to reference STORAGE-03's UI consistency restore
affects: [08-02 (cross-tab refresh interaction lock — depends on STORAGE-01/02 contract via App.persistence.test.tsx)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Spread-then-override on parsed input (preserve unknown keys, then pin known fields)"
    - "Nested try/catch for fail-open guards inside an outer fail-silent boundary"
    - "Inline disk re-read as the only race-safe primitive against non-atomic localStorage"

key-files:
  created: []
  modified:
    - src/storage/storage.ts
    - src/storage/storage.test.ts
    - src/storage/stats.ts

key-decisions:
  - "STORAGE-01 / D-01: spread `parsed` first, override version with on-disk numeric value, then re-surface known subtree fields — preserves forward-compat top-level fields without an `[k: string]: unknown` index signature on the static Envelope type (RESEARCH RQ-4 Option b)."
  - "STORAGE-02 / D-04a: inline disk re-read in a NESTED try/catch separate from the outer D-16 silencer — a throwing getItem MUST fall through to STATE_VERSION default and let the write proceed (fail-open guard inside a fail-silent outer)."
  - "D-03 silent refusal — no warn/log/DEV branch on downgrade refusal. Matches WR-08 posture: RAM state stays authoritative, disk may not have synced; refusal is indistinguishable from a D-16 quota failure to the caller and that is intentional."
  - "Use `Number.isFinite` (not `Number.isInteger`) for the on-disk version check — looser shape matches the existing stats.ts `isFiniteNonNegativeNumber` validation style; future floating-point version values would survive the round-trip rather than silently coerce to STATE_VERSION."

patterns-established:
  - "Forward-compat envelope read: `return { ...p, version: onDiskVersion, settings: p.settings, mute: p.mute, stats: p.stats }` — spread first to carry unknown top-level keys, override last for the four known fields."
  - "Cross-tab downgrade refusal: inline `getItem -> JSON.parse -> Number.isFinite(version)` check inside a NESTED try/catch, followed by `if (currentVersion > STATE_VERSION) return` before the write. Pitfall 1 forbids collapsing the inner try into the outer."

requirements-completed: [STORAGE-01, STORAGE-02]

# Metrics
duration: ~15min
completed: 2026-05-11
---

# Phase 08 Plan 01: Storage Forward-Compat Read + Refuse-Downgrade Write Summary

**`readEnvelope` preserves on-disk numeric `version` and propagates unknown top-level fields via D-01 spread-then-override; `writeEnvelope` refuses to overwrite a future-version on-disk envelope via D-04a's nested-try-catch inline re-read; STORAGE-01/02 contracts locked with two Vitest cases.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-11 (worktree-agent-a1e9e3c90f5e04da2 spawned after phase plan ea68d29)
- **Completed:** 2026-05-11
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `Envelope.version` widened from `typeof STATE_VERSION` (literal 1) to `number`. `EMPTY_ENVELOPE` compiles unchanged because `STATE_VERSION` (declared `1 as const`) is assignable to `number`.
- `readEnvelope` adopts D-01 spread-then-override: spreads `parsed` first to preserve unknown top-level fields, then pins `version` to the on-disk numeric value (with `Number.isFinite` fallback to `STATE_VERSION`), then re-surfaces the four known subtree fields. Subtree coercers (D-02) still strip unknown sub-keys downstream.
- `writeEnvelope` adopts STORAGE-02 / D-04a: inline disk re-read wrapped in its OWN nested try/catch (separate from the outer D-16 silencer), followed by `if (currentVersion > STATE_VERSION) return`. Silent refusal per D-03 — no warn, no DEV branch. D-04 stamping behavior unchanged (every successful write stamps `STATE_VERSION`).
- `src/storage/storage.test.ts` slot at lines 77-83 (the old "re-stamps version: 1" case) replaced with the STORAGE-01 preserve-on-disk-version case + `prefs: { theme: 'dark' }` forward-compat probe. New STORAGE-02 standalone case appended inside the same `describe('writeEnvelope', ...)` block with a 99-session stats negative probe.
- Test count: 9 → 10 in `storage.test.ts`. Phase-wide Vitest suite: 363 → 364 (baseline + 1).
- `src/storage/stats.ts:76-81` WR-07 comment escalated: "(cross-tab sync is still a v2 concern)" → "documented v1.x work; UI consistency restored via the STORAGE-03 storage-event listener in App.tsx." Comment-only; `recordSession` logic byte-identical before and after.

## Task Commits

Each task was committed atomically:

1. **Task 1: STORAGE-01 — widen Envelope.version + read-preserve + write-refuse-downgrade in src/storage/storage.ts** — `84ecea7` (feat)
2. **Task 2: Replace storage.test.ts line 77-83 with STORAGE-01 preserve-version case; append STORAGE-02 no-downgrade case** — `2e249b6` (test)
3. **Task 3: Update WR-07 comment block in src/storage/stats.ts:76-81 (comment-only)** — `b7f63dc` (docs)

## Files Created/Modified

- `src/storage/storage.ts` — Widened `Envelope.version` to `number`; rewrote the object-check branch of `readEnvelope` with the D-01 spread-then-override pattern (added `onDiskVersion` computation with `Number.isFinite` check, `...p` spread followed by explicit known-field overrides); rewrote `writeEnvelope` with STORAGE-02 + D-04a (declared `let currentVersion`, inserted nested try/catch inline re-read, added `if (currentVersion > STATE_VERSION) return` guard, retained existing D-04 stamping and D-16 outer catch).
- `src/storage/storage.test.ts` — Replaced the 4th `it()` slot inside `describe('writeEnvelope', ...)` (the old "always re-stamps version: 1" case) with `'preserves on-disk version when reading; stamps STATE_VERSION on write'` (STORAGE-01); appended `'writeEnvelope refuses to overwrite a future-version on-disk envelope (STORAGE-02)'` as a new `it()` inside the same describe block. Total `it()` count: 10 (5 readEnvelope + 5 writeEnvelope).
- `src/storage/stats.ts` — Replaced the final sentence of the WR-07 comment block at lines 76-81 with a two-sentence form referencing STORAGE-03's UI-consistency restore. Comment-only; `recordSession` body (lines 82-97) unchanged.

## Decisions Made

- Followed the PATTERNS.md verbatim shapes for all three surgical edits — no improvisation, no scope expansion. Wording-level tweaks below.
- Used `Number.isFinite` (not `Number.isInteger`) for the on-disk version check, matching RESEARCH §"Recommended Implementation Approach" and the existing `stats.ts` `isFiniteNonNegativeNumber` validation style.
- Kept the `{ ...EMPTY_ENVELOPE }` fallback spreads in `readEnvelope` (Pitfall 4) — they ensure each fallback path returns a fresh object rather than aliasing the module constant.
- Reformatted the WR-07 comment so the two grep-locked phrases ("Cross-tab concurrent ends lose one increment" and "UI consistency restored via the STORAGE-03") fit on single lines (see deviation note below) — the PATTERNS.md sketch wrapped them across line boundaries, which would have failed the acceptance criteria greps. Semantic content unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed literal `console.` text from comments in src/storage/storage.ts**

- **Found during:** Task 1 (acceptance criteria check after first commit attempt).
- **Issue:** The PATTERNS.md commentary sketch used the phrases "no console.warn in production" (existing line 6 of the file) and "no console.warn, no DEV-mode branch, no toast" (new STORAGE-02 comment). Task 1's acceptance criterion `grep -nE "console\." src/storage/storage.ts` requires zero matches, so even comment text containing `console.` violated it.
- **Fix:** Rephrased the two comments to "NO warn/log in production" (pre-existing line 6) and "no warn, no DEV-mode branch, no toast" (new STORAGE-02 comment). Semantic content unchanged; no logic impact.
- **Files modified:** `src/storage/storage.ts` (comments only).
- **Verification:** `grep -nE "console\." src/storage/storage.ts` returns zero matches (exit 1); tsc/eslint/vitest still clean.
- **Committed in:** `84ecea7` (Task 1 commit, applied before the commit landed).

**2. [Rule 1 - Bug] Reformatted WR-07 comment line wrapping in src/storage/stats.ts**

- **Found during:** Task 3 (acceptance criteria check after the comment edit).
- **Issue:** The PATTERNS.md sketch wrapped the new WR-07 comment across three lines such that the grep-locked phrases "Cross-tab concurrent ends lose one increment" and "UI consistency restored via the STORAGE-03" each spanned a line boundary. The acceptance criteria `grep -nE "Cross-tab concurrent ends lose one increment" src/storage/stats.ts` and `grep -nE "UI consistency restored via the STORAGE-03" src/storage/stats.ts` both require exactly one match — line-spanning text returned zero.
- **Fix:** Re-wrapped the comment so each grep-locked phrase fits on a single line. Two-sentence structure preserved; comment-prefix indentation preserved; semantic content unchanged. (The new wrap exceeds the surrounding comment block's visual width by a few columns but no project lint rule enforces a comment line-length cap.)
- **Files modified:** `src/storage/stats.ts` (comment-only, lines 76-83).
- **Verification:** Both grep commands return exit 0 with count 1; `grep -rnE "cross-tab sync is still a v2 concern" src/` returns zero (audit clean); tsc and `npx vitest run src/storage` both green (65 tests pass across 4 files).
- **Committed in:** `b7f63dc` (Task 3 commit, applied before the commit landed).

---

**Total deviations:** 2 auto-fixed (both Rule 1 — wording adjustments to satisfy literal-grep acceptance criteria; zero logic impact).
**Impact on plan:** No scope creep. Both deviations are pure wording tweaks driven by the plan's own acceptance-grep contracts; semantic content matches the PATTERNS.md sketch in every other respect.

## Issues Encountered

None — all three tasks were tightly scoped surgical edits and the verification chain (tsc → vitest → eslint) was green at each commit point.

## Verification Summary

Phase-level checks per `<verification>` block in 08-01-PLAN.md:

- `npx tsc --noEmit` — exit 0.
- `npx eslint src/storage/storage.ts src/storage/storage.test.ts src/storage/stats.ts` — exit 0.
- `npx vitest run src/storage` — 4 files, 65 tests passed (storage.test.ts: 10 of 10; envelope.test.ts / settings.test.ts / stats.test.ts: unchanged).
- `npx vitest run` (full phase-wide) — 27 files, **364 tests passed** (baseline 363 + 1 from STORAGE-02 append; replaced slot is net 0).
- `grep -rnE "cross-tab sync is still a v2 concern" src/` — zero matches across the entire `src/` tree (old WR-07 wording fully purged).

## User Setup Required

None — no external service configuration required. All changes are local to `src/storage/`.

## Next Phase Readiness

- Plan 08-02 (cross-tab refresh interaction lock — STORAGE-03 storage-event listener in `src/app/App.tsx` + `src/app/App.persistence.test.tsx` integration tests) can proceed against the locked STORAGE-01/STORAGE-02 contract. Plan 02's `depends_on: [01]` constraint is satisfied — readEnvelope now exposes a numeric `version` and writeEnvelope refuses cross-tab downgrades, so the storage-event listener can safely call `loadStats(deps)` after a same-key change event without risking a downgrade race against the writing tab.
- No blockers. The Envelope widening had zero static-type fallout (RESEARCH RQ-3 prediction confirmed) — no caller sites required updates.

## Self-Check: PASSED

Verified before commit of SUMMARY.md:

- `[ -f src/storage/storage.ts ]` — FOUND.
- `[ -f src/storage/storage.test.ts ]` — FOUND.
- `[ -f src/storage/stats.ts ]` — FOUND.
- `git log --oneline | grep -q 84ecea7` — FOUND.
- `git log --oneline | grep -q 2e249b6` — FOUND.
- `git log --oneline | grep -q b7f63dc` — FOUND.
- All plan acceptance-criteria greps for all three tasks satisfied (re-verified after the two Rule-1 wording fixes).
- `npx tsc --noEmit && npx eslint src/storage/storage.ts src/storage/storage.test.ts src/storage/stats.ts && npx vitest run` — all green; 364 tests passing.

---
*Phase: 08-storage-forward-compat-cross-tab-ui-sync*
*Completed: 2026-05-11*

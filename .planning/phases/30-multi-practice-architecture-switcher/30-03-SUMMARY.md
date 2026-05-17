---
phase: 30-multi-practice-architecture-switcher
plan: 03
subsystem: database
tags: [localstorage, migration, persistence, coercer, typescript]

# Dependency graph
requires:
  - phase: 30-01
    provides: NaviKriyaSettings type, DEFAULT_NK_SETTINGS, isValidOmLength/isValidRounds predicates
provides:
  - STATE_VERSION 2 with a lossless, idempotent v1→v2 migrateEnvelope ladder
  - Envelope.practices and Envelope.activePractice fields
  - src/storage/practices.ts — per-practice settings + stats persistence API for both practices
  - coerceNaviKriyaSettings non-throwing coercer (frontCount round-down to multiple of 4)
affects: [30-04, App.tsx rewiring, Navi Kriya engine phase 31]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "migrate-on-read ladder: migrateEnvelope gains a versioned fromVersion < N guard"
    - "per-practice slice map: PracticeMap { resonant, naviKriya } of { settings, stats }"
key-files:
  created:
    - src/storage/practices.ts
    - src/storage/practices.test.ts
  modified:
    - src/storage/storage.ts
    - src/storage/storage.test.ts
    - src/storage/index.ts

key-decisions:
  - "migrateEnvelope leaves the in-memory version field at the on-disk value; writeEnvelope restamps STATE_VERSION on the next write"
  - "coerceNaviKriyaSettings rounds a drifted frontCount DOWN to a multiple of 4 rather than discarding to the default (Pitfall 5)"
  - "coerceNaviKriyaSettings lives in practices.ts, not the domain module — 30-01 ships predicates only; the non-throwing coercer is a storage concern"

patterns-established:
  - "Versioned migration ladder: each schema step is an `if (fromVersion < N)` block inside migrateEnvelope, applied before per-field coercers"
  - "Per-practice persistence: load/save/record/reset functions read-modify-write the practices subtree via coercePractices"

requirements-completed: [PRACTICE-02, PRACTICE-04]

# Metrics
duration: 38min
completed: 2026-05-17
---

# Phase 30: Multi-Practice Architecture & Switcher — Plan 03 Summary

**STATE_VERSION 2 with a lossless v1→v2 migration ladder, plus a prototype-pollution-safe per-practice persistence module (`practices.ts`) for both Resonant and Navi Kriya settings + stats.**

## Performance

- **Duration:** ~38 min
- **Completed:** 2026-05-17
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- Bumped `STATE_VERSION` 1→2 and replaced the `migrateEnvelope` no-op with a v1→v2 ladder that folds a returning user's flat `settings`/`stats` into `practices.resonant` and seeds `activePractice='resonant'` — lossless (flat fields kept as forward-compat orphans) and idempotent (`fromVersion < 2` guard). Delivers PRACTICE-04.
- Created `src/storage/practices.ts`: the per-practice persistence API — `coercePractices`, `coerceActivePractice`, `coerceNaviKriyaSettings`, `loadPractices`, `loadActivePractice`, `saveActivePractice`, `saveResonantSettings`, `saveNaviKriyaSettings`, `recordResonantSession`, `resetPracticeStats`. Delivers PRACTICE-02 for both practices.
- All coercers are non-throwing and prototype-pollution-safe (T-30-05); `recordResonantSession`/`resetPracticeStats` are practice-scoped (Pitfall 3/4); `coerceNaviKriyaSettings` rounds a tampered `frontCount` down to a multiple of 4 (Pitfall 5 / T-30-06).

## Task Commits

1. **Task 1: Bump STATE_VERSION, extend Envelope, implement the v1→v2 migration ladder** — `1074c0b` (feat)
2. **Task 2: Create the practices.ts per-practice storage module** — `0808af4` (feat)

## Files Created/Modified
- `src/storage/storage.ts` — `STATE_VERSION = 2`, `Envelope.practices?`/`activePractice?` fields, `migrateEnvelope` v1→v2 ladder
- `src/storage/storage.test.ts` — new `migrateEnvelope v1→v2 (PRACTICE-04)` describe block; future-version tests reseeded to version 3
- `src/storage/practices.ts` — new per-practice persistence module
- `src/storage/practices.test.ts` — 23 tests covering coercers, round-trips, scoped record/reset, and the v1 migration path
- `src/storage/index.ts` — barrel re-export of `./practices`

## Decisions Made
- `migrateEnvelope` does not restamp the `version` field in memory; it remains the on-disk value until `writeEnvelope` stamps `STATE_VERSION` on the next write. This kept the existing "preserves on-disk version" contract intact.
- `coerceNaviKriyaSettings` is defined in `practices.ts`, not the domain module — plan 30-01 deliberately shipped predicates only; the non-throwing coercer mirrors the `domain/settings.ts` (predicates) vs `storage/settings.ts` (coercer) split.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] Updated existing storage.test.ts future-version tests for the STATE_VERSION bump**
- **Found during:** Task 1 (STATE_VERSION bump)
- **Issue:** Two existing `storage.test.ts` tests seeded `version: 2` envelopes to exercise the future-version write-refusal guard. After bumping `STATE_VERSION` to 2, version 2 is no longer a *future* schema, so those tests would fail (the guarded write would proceed). The `version: 1` literal in the write-stamp test and the `env.version` equality assertion in the round-trip test also broke.
- **Fix:** Reseeded the two future-version tests to `version: 3` (a genuine future schema); updated the write-stamp assertion to `version: STATE_VERSION`; changed the round-trip test's `env.version` assertion to `toBe(1)` with a comment explaining readEnvelope preserves the on-disk version.
- **Files modified:** src/storage/storage.test.ts
- **Verification:** `npx vitest run` — full suite 1053/1053 pass; `npx tsc --noEmit` clean.
- **Committed in:** `1074c0b` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The plan's Task 1 verify scoped to `storage.test.ts` and required it to pass; updating the version-coupled tests was necessary for that and for the phase-wide suite. No scope creep — no production behavior changed beyond the planned migration.

## Issues Encountered
This plan was executed inline by the execute-phase orchestrator after two background worktree executor agents returned without doing any work (both claimed no Bash access). Inline execution by the orchestrator is the documented runtime-compatibility fallback; the plan was executed exactly as written, with the one test-update deviation noted above.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- PRACTICE-02 and PRACTICE-04 are satisfied at the storage layer. `loadPractices`/`saveActivePractice`/`recordResonantSession`/`resetPracticeStats` are ready for plan 30-04 to wire into `App.tsx`.
- Plan 30-04 (Wave 3) must update the existing `App.tsx` `recordSession`/`resetStats`/`loadStats` call sites and the cross-tab storage listener to the practice-scoped equivalents (Pitfall 3/4/6) — the flat `stats` API still exists but is no longer authoritative after migration.

---
*Phase: 30-multi-practice-architecture-switcher*
*Completed: 2026-05-17*

---
phase: 19-language-switching
plan: 02
subsystem: ui
tags: [react, typescript, hooks, i18n, localization, localStorage, CustomEvent]

# Dependency graph
requires:
  - phase: 18-audio-timbres
    provides: useTimbreChoice.ts verbatim clone pattern (D-08) for picker-side hooks
  - phase: 14-prefs-foundation
    provides: loadPrefs/savePrefs/UserPrefs from storage/prefs.ts; LocaleId from domain/settings.ts

provides:
  - src/hooks/useLocaleChoice.ts — picker-side hook returning { locale, setLocale } with stable identity
  - src/hooks/useLocaleChoice.test.ts — 6 tests mirroring useTimbreChoice.test.ts pattern

affects:
  - 19-03 LanguagePicker.tsx (consumes useLocaleChoice)
  - 19-04 useLocale.ts (reads hrv:prefs-changed with key === 'locale')

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Picker-side hook: clone useTimbreChoice with domain rename only (D-08)"
    - "CustomEvent key-value shape: { key: 'locale', value: next } for same-tab sync (D-21)"
    - "Envelope merge: { ...loadPrefs(), locale: next } preserves theme/variant/timbre per D-17"

key-files:
  created:
    - src/hooks/useLocaleChoice.ts
    - src/hooks/useLocaleChoice.test.ts
  modified: []

key-decisions:
  - "D-08 verbatim clone pattern: useLocaleChoice is a structural copy of useTimbreChoice with timbre→locale rename — no new behavior"
  - "D-21 CustomEvent contract: detail.key === 'locale' so useLocale (Plan 04) can filter by key"

patterns-established:
  - "useLocaleChoice follows the picker-hook clone chain: useThemeChoice → useVariantChoice → useTimbreChoice → useLocaleChoice"

requirements-completed:
  - I18N-01

# Metrics
duration: 8min
completed: 2026-05-14
---

# Phase 19 Plan 02: useLocaleChoice Hook Summary

**`useLocaleChoice` picker-side hook created as verbatim clone of `useTimbreChoice` with `timbre→locale` rename, plus 6-test suite mirroring the timbre pattern; all 650 Vitest tests pass**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-14T18:46:00Z
- **Completed:** 2026-05-14T18:47:15Z
- **Tasks:** 3 (+ green-gate verification)
- **Files modified:** 2

## Accomplishments
- Created `src/hooks/useLocaleChoice.ts` as verbatim clone of `useTimbreChoice.ts` with `timbre→locale` rename per D-08 + D-21
- Created `src/hooks/useLocaleChoice.test.ts` with 6 tests mirroring `useTimbreChoice.test.ts` pattern
- Green-gate passes: `tsc/lint/build/test` all exit 0 (650/650 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useLocaleChoice.ts** - `b2de6cd` (feat)
2. **Task 2: Create useLocaleChoice.test.ts** - `61730d8` (test)
3. **Task 3: Per-commit green-gate (D-16)** - verified (no new source changes)

## Files Created/Modified
- `src/hooks/useLocaleChoice.ts` — Picker-side hook: `useLocaleChoice()` → `{ locale: LocaleId, setLocale }`, lazy state seed from `loadPrefs().locale`, envelope merge, CustomEvent dispatch with `detail.key === 'locale'`, stable `setLocale` via `useCallback([], [])`
- `src/hooks/useLocaleChoice.test.ts` — 6 tests: initial state seed, optimistic update, disk write, envelope-merge preservation, CustomEvent shape, stable identity

## Decisions Made
- D-08 + D-21: verbatim clone approach; only renames applied, no new logic
- Comments updated from Phase 18 references to Phase 19, `D-18 contract reuse` → `D-21 contract reuse`, forward-compat note updated to `locale → theme/variant/timbre` (Phase 19 is the consumer; prior dispatchers are theme/variant/timbre)

## Deviations from Plan

None — plan executed exactly as written. The `grep -c "useCallback"` acceptance criterion states "returns 1" but both `useTimbreChoice.ts` and `useLocaleChoice.ts` have 3 occurrences (import, comment, usage). This is the expected structure from the verbatim clone — the behavioral intent (1 `useCallback` call) is satisfied.

## Issues Encountered
- Worktree branch (`worktree-agent-a2926699099859b08`) was based on an old pre-Phase-14 commit (`d583d00`). The `<worktree_branch_check>` reset it to `60e1485` (main HEAD) before any work began. All subsequent file reads and writes used the correct worktree path.

## Known Stubs
None — `useLocaleChoice` is fully wired to `loadPrefs`/`savePrefs` and dispatches the CustomEvent. No placeholder values or mock data.

## Threat Flags
No new trust boundary surfaces. `savePrefs` envelope merge is covered by T-19-03 (mitigated by Test 4 envelope-merge assertion). CustomEvent dispatch is T-19-04 (accepted: same-origin only).

## Next Phase Readiness
- `useLocaleChoice` is ready for `LanguagePicker.tsx` (Plan 03) to import
- `hrv:prefs-changed` with `detail.key === 'locale'` is ready for `useLocale.ts` (Plan 04) to consume
- No blockers

---
*Phase: 19-language-switching*
*Completed: 2026-05-14*

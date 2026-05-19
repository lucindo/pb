---
phase: quick-260519-9mi
plan: "01"
subsystem: domain-settings
tags: [defaults, cue, timbre, settings]
dependency_graph:
  requires: []
  provides: [DEFAULT_CUE='arrow', DEFAULT_TIMBRE='sine']
  affects: [src/domain/settings.ts, src/storage/prefs.ts, src/hooks/useAudioCues.ts]
tech_stack:
  added: []
  patterns: [constant-reference (coercers pick up new defaults by reference)]
key_files:
  created: []
  modified:
    - src/domain/settings.ts
    - src/domain/settings.test.ts
    - src/storage/prefs.test.ts
    - src/app/App.test.tsx
    - src/app/App.session.test.tsx
decisions:
  - "DEFAULT_CUE changed from 'labels' to 'arrow', superseding CONTEXT D-01 fix"
  - "DEFAULT_TIMBRE changed from 'bowl' to 'sine'"
  - "Stale CONTEXT D-01 comment replaced with 260519-9mi attribution"
  - "D-03 label size test now seeds 'labels' cue explicitly instead of relying on the changed default"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-05-19T10:03:12Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 5
---

# Phase quick-260519-9mi Plan 01: Set Default Values for App Settings Items Summary

**One-liner:** Changed DEFAULT_CUE from 'labels' to 'arrow' and DEFAULT_TIMBRE from 'bowl' to 'sine' in src/domain/settings.ts, updated all four default-dependent test sites.

## What Was Built

Applied two operator-confirmed Settings default changes per quick task 260519-9mi spec:

1. `src/domain/settings.ts`: `DEFAULT_TIMBRE = 'sine'` (was 'bowl'), `DEFAULT_CUE = 'arrow'` (was 'labels') with updated comment replacing the stale CONTEXT D-01 reference.
2. `src/domain/settings.test.ts`: Updated DEFAULT_CUE assertion from 'labels' to 'arrow', updated test title.
3. `src/storage/prefs.test.ts`: Updated DEFAULT_PREFS.cue assertion from 'labels' to 'arrow', updated test title.
4. `src/app/App.test.tsx`: Updated the "default cue" zero-regression test from labels-mode (visible text) to arrow-mode (aria-hidden SVG) behavior.
5. `src/app/App.session.test.tsx`: Updated TIMBRE-02 zero-regression test from 'bowl' to 'sine'; fixed D-03 label size test to seed 'labels' explicitly.

## Verification

- `npm run build`: clean (0 TypeScript errors)
- `npm run test:run`: 3 failed / 1255 total — all 3 failures are the known pre-existing LOCL-03 failures in `App.persistence.test.tsx`. No new failures.

## Decisions Made

- DEFAULT_THEME, DEFAULT_VARIANT, DEFAULT_LOCALE explicitly left unchanged per locked spec.
- No migration code added: constant change only affects new users / users with no valid persisted value; returning users with valid stored values are unaffected (coercers use the constant only as fallback).
- CUE_OPTIONS and TIMBRE_OPTIONS unchanged — only the default pointer moved.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed D-03 label size test in App.session.test.tsx**
- **Found during:** Task 1 verification (test run)
- **Issue:** The test `renders the in-orb phase label at large display size (text-5xl semibold) per D-03` was not in the plan's list of default-dependent tests, but it implicitly relied on `DEFAULT_CUE='labels'` to render a visible text span with `text-5xl` class. With DEFAULT_CUE now 'arrow', the shape renders an SVG glyph and the outer wrapper has class `relative z-10` (no `text-5xl`), causing the test to fail.
- **Fix:** Added `seedCue('labels')` at the start of the test and a `seedCue` helper function (mirroring the pattern from App.test.tsx). Also added `CueStyleId` to the import. The test now explicitly exercises labels-mode rendering, which is what D-03 describes — making the intent clear regardless of the current default.
- **Files modified:** `src/app/App.session.test.tsx`
- **Commit:** 296904b (included in the task commit)

## Known Stubs

None — all data flows are wired.

## Self-Check: PASSED

- `src/domain/settings.ts` exists and contains `DEFAULT_CUE = 'arrow'` and `DEFAULT_TIMBRE = 'sine'` ✓
- Commit 296904b exists in git log ✓
- Build clean ✓
- Test suite: only 3 known LOCL-03 failures, 0 new failures ✓

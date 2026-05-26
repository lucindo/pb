---
phase: 48-appearance-page-i18n
plan: "02"
subsystem: app-navigation
tags: [routing, navigation, view-model, sentinel, focus-restoration]
dependency_graph:
  requires: []
  provides:
    - AppScreen union with 'appearance' fourth value
    - useAppNavigation onAppearanceOpen + onBackToAppSettings callbacks
    - returningFromAppearance boolean sentinel
    - AppDialogsViewModel extended surface
    - createAppDialogsViewModel propagation
  affects:
    - src/app/useAppNavigation.ts
    - src/app/useAppNavigation.test.tsx
    - src/app/appViewModel.ts
    - src/app/appControllerAdapters.ts
    - src/app/appControllerAdapters.test.ts
tech_stack:
  added: []
  patterns:
    - useState<boolean> sentinel cleared by every non-back transition
    - this:void method modifier on AppNavigation + AppDialogsViewModel
key_files:
  created: []
  modified:
    - src/app/useAppNavigation.ts
    - src/app/useAppNavigation.test.tsx
    - src/app/appViewModel.ts
    - src/app/appControllerAdapters.ts
    - src/app/appControllerAdapters.test.ts
decisions:
  - D-12: AppScreen union extended to 'practice' | 'learn' | 'appSettings' | 'appearance'; onAppearanceOpen controlsDisabled-gated; onBackToAppSettings not gated
  - D-13: returningFromAppearance as useState<boolean>(false); set true only by onBackToAppSettings; cleared by all other transitions and closeOnSessionView effect
  - D-16: four transition assertions added verbatim per plan spec
metrics:
  duration: "2m 53s"
  completed_date: "2026-05-26"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 5
requirements_completed:
  - APPEAR-01
  - APPEAR-02
---

# Phase 48 Plan 02: Navigation Router Extension Summary

**One-liner:** `AppScreen` extended to four values with `returningFromAppearance` sentinel and `onAppearanceOpen`/`onBackToAppSettings` callbacks propagated through `AppDialogsViewModel` adapter.

## What Was Built

Three tasks extending the in-memory router (`useAppNavigation.ts`) with the routing foundation Plan 04 will bind to when adding the Appearance page surface:

**Task 02-01 — useAppNavigation.ts extension:**
- `AppScreen` type: `'practice' | 'learn' | 'appSettings' | 'appearance'`
- `returningFromAppearance: boolean` sentinel via `useState<boolean>(false)`
- `onAppearanceOpen()`: `controlsDisabled`-gated, sets `'appearance'`, clears sentinel
- `onBackToAppSettings()`: not gated, sets `'appSettings'`, sets sentinel `true`
- Every existing transition (`onLearnOpen`, `onSettingsOpen`, `onBackToPractice`) plus the `closeOnSessionView` effect each call `setReturningFromAppearance(false)` (D-13 + RESEARCH §Pitfall 4)

**Task 02-02 — useAppNavigation.test.tsx extension (D-16):**
Four new `it(...)` cases added to the existing `describe` block:
1. `onAppearanceOpen` transitions `appSettings → appearance`
2. `onBackToAppSettings` transitions `appearance → appSettings` AND sets sentinel `true`
3. Subsequent navigation (`onBackToPractice`) clears sentinel to `false`
4. `closeOnSessionView` forces `appearance → practice` AND clears sentinel

**Task 02-03 — AppDialogsViewModel + createAppDialogsViewModel extension:**
- `AppDialogsViewModel` interface gains `onAppearanceOpen`, `onBackToAppSettings`, `returningFromAppearance`
- `createAppDialogsViewModel` return object propagates all three verbatim from `navigation`
- `appControllerAdapters.test.ts` `AppNavigation` fake updated to include new fields (Rule 3 fix)

## Verification Results

- `npm run test:run -- src/app/useAppNavigation.test.tsx`: 9/9 tests pass
- `npm run test:run -- src/app/appControllerAdapters.test.ts`: 7/7 tests pass
- `npm run build`: typecheck green end-to-end

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated AppNavigation fake in appControllerAdapters.test.ts**
- **Found during:** Task 02-03 (`npm run build`)
- **Issue:** `appControllerAdapters.test.ts:223` had a `AppNavigation` object literal missing `returningFromAppearance`, `onAppearanceOpen`, `onBackToAppSettings` — TypeScript error TS2739.
- **Fix:** Added the three new fields to the test's `navigation` object literal (with `returningFromAppearance: false` and `noop` for both callbacks).
- **Files modified:** `src/app/appControllerAdapters.test.ts`
- **Commit:** c6799ed (bundled with Task 02-03)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 02-01 | 902a835 | feat(48-02): extend useAppNavigation with 'appearance' union + sentinel + callbacks |
| 02-02 | 033f54e | feat(48-02): add four D-16 transition assertions to useAppNavigation.test.tsx |
| 02-03 | c6799ed | feat(48-02): extend AppDialogsViewModel and propagate via createAppDialogsViewModel |

## Known Stubs

None. This plan is routing-only (no UI surface); all state transitions are fully wired.

## Threat Flags

No new security-relevant surface introduced. All changes are internal React state within the component tree; no serialization, no localStorage writes, no network endpoints.

## Self-Check: PASSED

- `src/app/useAppNavigation.ts` exists and modified: FOUND
- `src/app/useAppNavigation.test.tsx` exists and modified: FOUND
- `src/app/appViewModel.ts` exists and modified: FOUND
- `src/app/appControllerAdapters.ts` exists and modified: FOUND
- Commits 902a835, 033f54e, c6799ed: all present in git log

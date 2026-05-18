---
phase: 34-stretch-as-a-distinct-practice
plan: "07"
subsystem: stretch-practice
tags: [gap-closure, uat, stretch, settings-form, app-layout, end-dialog]
dependency_graph:
  requires: []
  provides: [UAT-GAP-1-closed, UAT-GAP-2-closed, UAT-GAP-3-closed, UAT-GAP-4-closed]
  affects:
    - src/components/SettingsForm.tsx
    - src/app/App.tsx
tech_stack:
  added: []
  patterns:
    - "Math.round for cycle-aligned ms→minute display"
    - "!isRunning gate mirroring resonant/NK in-session behavior"
    - "stretchSegments !== null as stretch-session discriminant in requestEnd"
    - "justify-start for top-anchored layout"
key_files:
  created: []
  modified:
    - src/components/SettingsForm.tsx
    - src/components/SettingsForm.stretch.test.tsx
    - src/app/App.tsx
    - src/app/App.session.test.tsx
decisions:
  - "Wrap ALL stretch steppers in !isRunning (no in-session extend affordance for stretch, unlike resonant Duration stepper)"
  - "Use state.stretchSegments !== null as the stretch-session discriminant in requestEnd (non-null exactly for stretch sessions per sessionController.ts)"
  - "Updated existing stretch-stats test to go through the end-dialog confirm flow (the prior direct-end assumption was the bug)"
metrics:
  duration: "~9 minutes"
  completed: "2026-05-18"
  tasks_completed: 3
  files_changed: 4
---

# Phase 34 Plan 07: UAT Gap Closure (GAP 1-4) Summary

**One-liner:** Closed four UAT gaps: rounded stretch Duration display, in-session steppers gate, stretch end-confirmation dialog, and top-anchored layout.

## What Was Built

Four targeted fixes to close the UAT gaps that paused Phase 34 testing:

**GAP 1 — Rounded stretch Duration readout (`SettingsForm.tsx`):**
`computeStretchTotalMs` returns the cycle-aligned segment table's final `endMs` (since plan 34-06), which is not whole-minute-aligned. Changed `stretchDurationText` from `String(stretchTotalMs / 60_000)` to `String(Math.round(stretchTotalMs / 60_000))`. The open-ended branch (`strings.openEndedLabel`) is unchanged.

**GAP 2 — Hide stretch steppers during a running session (`SettingsForm.tsx`):**
Wrapped the entire stretch steppers fragment (6 `SettingsStepper`s + read-only Duration) in `{!isRunning && (...)}`, mirroring how the resonant branch hides bpm/ratio steppers and how Navi Kriya unmounts the whole form mid-session. The stretch practice has no in-session extend affordance, so ALL controls are gated. `isRunning` is already passed `inSessionView` by App.tsx.

**GAP 3 — Route stretch session-end through the end-confirmation dialog (`App.tsx`):**
Extended `requestEnd` to raise the dialog when `state.status === 'running'` AND (`durationMinutes !== 'open-ended'` OR `state.stretchSegments !== null`). A stretch session's `lockedSettings` is the synthetic lead-in with `durationMinutes: 'open-ended'`, which caused it to bypass the dialog. `state.stretchSegments` is non-null exactly for a stretch session. Open-ended resonant sessions still end directly with no dialog.

**GAP 4 — Top-anchor the app layout (`App.tsx`):**
Changed root `<section>` from `justify-center` to `justify-start` so content is anchored to the top of the viewport across all three practices and does not float mid-viewport or jump when switching practices.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for GAP 1 + GAP 2 | 253d183 | SettingsForm.stretch.test.tsx |
| 1 (GREEN) | Fix GAP 1 + GAP 2 in SettingsForm | 86bb1b0 | SettingsForm.tsx, SettingsForm.stretch.test.tsx |
| 2 (RED) | Failing tests for GAP 3 + GAP 4 | d7f5155 | App.session.test.tsx |
| 2 (GREEN) | Fix GAP 3 + GAP 4 in App.tsx | 6c5cd17 | App.tsx |
| 3 | Verification — full suite + tsc green | (no commit needed — no code changes) | — |

## Verification

- `npx vitest run src/components/SettingsForm.stretch.test.tsx` — 15/15 passed
- `npx vitest run src/app/App.session.test.tsx` — 33/33 passed
- `npx vitest run` (full suite) — **1219/1219 passed** across 78 test files
- `npx tsc -b` — exits 0, no type errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated pre-existing Duration test to use Math.round**
- **Found during:** Task 1 GREEN phase
- **Issue:** The existing "read-only Duration box shows the computed total for default stretch values" test used the unrounded formula `String(expectedTotalMs / 60_000)` — it became a failing regression when we fixed the source code.
- **Fix:** Updated the test to use `Math.round(expectedTotalMs / 60_000)` to match the corrected implementation.
- **Files modified:** `src/components/SettingsForm.stretch.test.tsx`
- **Commit:** 86bb1b0

### No Architectural Deviations

All four fixes are localized corrections to already-reviewed presentational and control-flow code with no structural modifications.

## Known Stubs

None — all four fixes wire real behavior.

## Threat Flags

None — as documented in the plan's threat model, `state.stretchSegments` is engine-owned state never user-supplied (T-34-13), and the `!isRunning` gate removes editable surface (T-34-14). No new network endpoints, auth paths, file access, or schema changes introduced.

## Self-Check: PASSED

- `src/components/SettingsForm.tsx` — modified, committed in 86bb1b0
- `src/components/SettingsForm.stretch.test.tsx` — modified, committed in 86bb1b0
- `src/app/App.tsx` — modified, committed in 6c5cd17
- `src/app/App.session.test.tsx` — modified, committed in 6c5cd17
- All commit hashes present in `git log`: 253d183, 86bb1b0, d7f5155, 6c5cd17

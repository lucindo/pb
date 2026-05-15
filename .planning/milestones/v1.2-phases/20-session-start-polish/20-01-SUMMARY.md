---
phase: 20-session-start-polish
plan: "01"
subsystem: session-controls
tags: [lead-in, ux, i18n, label-change, tdd]
dependency_graph:
  requires: []
  provides: [LEAD-01-cancel-label, inLeadIn-prop]
  affects: [SessionControls, App.tsx, strings.ts]
tech_stack:
  added: []
  patterns: [three-way-ternary-label, optional-prop-pattern]
key_files:
  created: []
  modified:
    - src/content/strings.ts
    - src/components/SessionControls.tsx
    - src/components/SessionControls.test.tsx
    - src/app/App.tsx
    - src/app/App.audio.test.tsx
    - src/app/App.persistence.test.tsx
    - src/app/App.wakeLock.test.tsx
decisions:
  - "D-01: relabel not disable — button stays clickable, only label changes"
  - "D-05: inLeadIn optional prop added to SessionControlsProps"
  - "D-06: cancel string placed in controls slice, not LOCKED_COPY"
  - "D-07: Test 11 rewritten to query Cancel (not Start session) during lead-in"
  - "D-08: EN regression test added in App.audio.test.tsx; PT-BR in SessionControls.test.tsx"
  - "Phase 20 D-04 supersedes Phase 3 D-11 copy-lock comment for lead-in window"
metrics:
  duration: "6 minutes"
  completed: "2026-05-15"
  tasks_completed: 3
  files_modified: 7
---

# Phase 20 Plan 01: Session Start Polish Summary

**One-liner:** Relabel primary button to Cancel/Cancelar during 3-second lead-in countdown via inLeadIn prop to prevent double-start affordance (LEAD-01).

## What Was Built

LEAD-01 fix: while `appPhase === 'lead-in'`, the primary SessionControls button now reads `Cancel` (EN) / `Cancelar` (PT-BR) instead of `Start session`. The button remains fully clickable and routes to the existing cancel branch unchanged (D-01: relabel-not-disable, D-03: no handler change).

### Changes

**src/content/strings.ts**
- Added `readonly cancel: string` to the `UiStrings.controls` interface type
- Added `cancel: 'Cancel'` to the EN catalog controls object
- Added `cancel: 'Cancelar'` to the PT-BR catalog with `// TODO: native-speaker review`
- `endSessionDialog.cancel` keys unchanged per D-06

**src/components/SessionControls.tsx**
- Added `inLeadIn?: boolean` optional prop to `SessionControlsProps` with JSDoc
- Added `inLeadIn` to destructured params
- Both button branches updated to three-way ternary: `isRunning ? strings.endSession : inLeadIn ? strings.cancel : strings.startSession`
- `// Reason:` comment on each label expression per D-04 annotation policy
- No onClick, className, or type changes (D-02, D-03)

**src/components/SessionControls.test.tsx**
- Added `inLeadIn` forwarding to `renderControlsWithMute` helper
- New test: asserts button name is `Cancel` when `inLeadIn=true` (EN inline-mute branch)
- New test: asserts `Start session` when `inLeadIn` omitted (backward-compat)
- New test: asserts `Cancelar` when `inLeadIn=true` with PT-BR strings (D-08)

**src/app/App.tsx**
- Added `inLeadIn={appPhase === 'lead-in'}` to `<SessionControls>` element
- Rewrote stale Phase 3 D-11 copy-lock comment: Phase 20 D-04 now supersedes it

**src/app/App.audio.test.tsx**
- Rewrote Test 11: queries button by `Cancel` (not `Start session`) during lead-in (D-07)
- Added Test 11b: D-08 EN regression asserting `Cancel` shown during lead-in and `Start session` absent

## Verification

- `npx tsc --noEmit`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS (259.98 kB / 75.72 kB gzip)
- `npx vitest run`: 716/716 tests pass (54 test files)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated two additional tests broken by LEAD-01 label change**
- **Found during:** Task 3 full test run
- **Issue:** `App.wakeLock.test.tsx` Test 5 and `App.persistence.test.tsx` D-03 test both queried the primary button by `'Start session'` during lead-in — now broken since the label changed to `'Cancel'`
- **Fix:** Updated both queries to use `'Cancel'` with a comment referencing Phase 20 LEAD-01
- **Files modified:** `src/app/App.wakeLock.test.tsx`, `src/app/App.persistence.test.tsx`
- **Commit:** 5dd5e0c (included in Task 3 commit)

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add cancel string to controls slice | 975840d | src/content/strings.ts |
| 2 (RED) | Add failing tests for inLeadIn prop | 2d9d658 | src/components/SessionControls.test.tsx |
| 2 (GREEN) | Add inLeadIn prop and three-way label resolution | 14c49b0 | src/components/SessionControls.tsx, src/components/SessionControls.test.tsx |
| 3 (RED) | Rewrite Test 11 and add D-08 regression | b1c41b6 | src/app/App.audio.test.tsx |
| 3 (GREEN) | Wire inLeadIn in App.tsx, fix comment, update tests | 5dd5e0c | src/app/App.tsx, src/app/App.persistence.test.tsx, src/app/App.wakeLock.test.tsx |

## Known Stubs

None. All changes are wired end-to-end with real locale strings from the catalog.

## Threat Flags

None. This plan introduces no new network endpoints, auth paths, file access patterns, or schema changes. The label change reads only from the compiled UI_STRINGS catalog (no user-controlled interpolation).

## TDD Gate Compliance

- RED gate: `test(20-01)` commits present for Task 2 (2d9d658) and Task 3 (b1c41b6)
- GREEN gate: `feat(20-01)` commits present for Task 1 (975840d), Task 2 (14c49b0), Task 3 (5dd5e0c)
- All gates satisfied.

## Self-Check: PASSED

- src/content/strings.ts: EXISTS and contains `readonly cancel: string` and both locale values
- src/components/SessionControls.tsx: EXISTS and contains `inLeadIn?: boolean` and two `inLeadIn ? strings.cancel` matches
- src/app/App.tsx: EXISTS and contains `inLeadIn={appPhase === 'lead-in'}`
- src/app/App.audio.test.tsx: EXISTS and contains rewritten Test 11 with `Cancel` query
- Commits 975840d, 2d9d658, 14c49b0, b1c41b6, 5dd5e0c: all present in git log
- 716/716 tests pass

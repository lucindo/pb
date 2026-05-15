---
phase: 22-bpm-stretch-session
plan: 04
subsystem: ui
tags: [stretch, bpm, react, settings-form, session-readout]
dependency_graph:
  requires:
    - phase: 22-01
      provides: [MODE_OPTIONS, stretch option arrays, computeStretchTotalMs, isStretchGateClear, StretchStage]
    - phase: 22-02
      provides: [stretch-aware sessionController, stretch frame fields]
    - phase: 22-03
      provides: [settingsForm + readout stretch string keys]
  provides:
    - SettingsForm Standard/Stretch mode picker + conditional stretch field block
    - SettingsForm 15-min gate hint + computed-total readout
    - SessionReadout live BPM chip + stage label
  affects: [src/app/App.tsx]
tech_stack:
  added: []
  patterns: [mode-conditional stepper swap, exhaustive stage→label switch]
key_files:
  created:
    - src/components/SettingsForm.stretch.test.tsx
  modified:
    - src/components/SettingsForm.tsx
    - src/components/SessionReadout.tsx
    - src/components/SessionReadout.test.tsx
key-decisions:
  - "Duration stepper hidden in stretch mode — computed-total readout is the duration surface there"
  - "Stage→label mapping is an exhaustive switch so a new StretchStage is a compile error"
  - "Mode picker's increase button gates only the →Stretch direction; →Standard is always allowed"
patterns-established:
  - "Mode-conditional stepper swap: bpm stepper ↔ 5 stretch steppers keyed on settings.mode"
requirements-completed: [STRETCH-01, STRETCH-02, STRETCH-03, STRETCH-06]
metrics:
  duration: "~20 min"
  completed: "2026-05-15"
---

# Phase 22 Plan 04: Stretch UI Surfaces Summary

**SettingsForm renders the Standard/Stretch mode picker, conditional 5-field stretch block, 15-min gate hint and live computed-total readout; SessionReadout shows the live BPM chip + stage label for running stretch sessions.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-05-15
- **Tasks:** 2
- **Files modified:** 4 (1 created)

## Accomplishments
- Standard/Stretch mode picker as the first stepper (D-05)
- Single bpm stepper swapped for 5 stretch steppers in stretch mode; ratio stepper kept in both (D-06)
- 15-min gate: `→Stretch` increase disabled + `"Needs a 15+ min session"` hint below the picker (D-09/D-12)
- targetBpm options filtered strictly below initialBpm; lowering initialBpm auto-corrects an invalid targetBpm (D-01)
- Live computed-total readout — `Total: M:SS` for finite holds, open-ended label otherwise (D-08/D-02/D-11)
- Duration stepper hidden in stretch mode (UI-SPEC)
- SessionReadout live BPM chip (one decimal) + subtle stage label for running stretch sessions only (D-13/D-14)
- Silent ramp→hold-target transition — no cue or marker (D-15)

## Task Commits

1. **Task 1: SettingsForm mode picker + stretch fields + gate + total** - `21b78a3` (test/RED) → `191e8ab` (feat/GREEN)
2. **Task 2: SessionReadout live BPM chip + stage label** - `65134e1` (test/RED) → `4318279` (feat/GREEN)

## Files Created/Modified
- `src/components/SettingsForm.tsx` - mode picker, conditional stretch field block, gate hint, computed-total readout, stretch-mode duration-stepper hide
- `src/components/SettingsForm.stretch.test.tsx` - 8 tests for the stretch surface
- `src/components/SessionReadout.tsx` - live BPM chip + exhaustive stage→label switch
- `src/components/SessionReadout.test.tsx` - 5 tests for the BPM chip + stage label

## Decisions Made
- Duration stepper is hidden when `mode === 'stretch'` — the stretch engine ignores `durationMinutes`, and the computed-total readout is the duration surface there. Standard mode keeps the duration stepper and its extend-during-running behavior unchanged.
- Stage→label mapping uses an exhaustive `switch` returning `string` so adding a `StretchStage` value without a case is a compile error.
- The mode picker's `disableIncrease` gates only the `standard→stretch` direction; `stretch→standard` is always allowed (the increase button is naturally disabled when already on `stretch`, the last option).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gate test fixtures used `mode: 'stretch'` where the assertion required `mode: 'standard'`**
- **Found during:** Task 1 (SettingsForm gate tests)
- **Issue:** The two gate tests asserted the mode picker's increase button enabled/disabled state while seeding `mode: 'stretch'`. With `mode === 'stretch'` the increase button is unconditionally disabled (already on the last option), so the test could not observe the gate's `disableIncrease` effect.
- **Fix:** Re-seeded both gate tests with `mode: 'standard'` so the increase points at the gated `→Stretch` direction; the test now exercises the gate semantics.
- **Files modified:** `src/components/SettingsForm.stretch.test.tsx`
- **Verification:** `npx vitest run src/components/SettingsForm.stretch.test.tsx` 8/8 pass.
- **Committed in:** `191e8ab` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 test-fixture bug)
**Impact on plan:** Test-only correction; no production-code scope change. The implementation matches the plan and UI-SPEC.

## Issues Encountered
None.

## Verification Results
- `npx vitest run` — 840/840 tests pass (59 files)
- `npx tsc --noEmit` — exits 0
- `npm run lint` — exits 0
- `npm run build` — exits 0

## User Setup Required
None.

## Next Phase Readiness
- SettingsForm and SessionReadout are stretch-ready. Plan 22-05 (checkpoint plan) can wire the stretch frame into App.tsx's dual-anchor audio boundary effect.

## Self-Check: PASSED
- FOUND: src/components/SettingsForm.tsx
- FOUND: src/components/SettingsForm.stretch.test.tsx
- FOUND: src/components/SessionReadout.tsx
- FOUND: commits 21b78a3, 191e8ab, 65134e1, 4318279

---
*Phase: 22-bpm-stretch-session*
*Completed: 2026-05-15*

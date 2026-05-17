---
phase: 30-multi-practice-architecture-switcher
plan: "02"
subsystem: components/content
tags: [practice-toggle, copy-strings, tdd, aria, segmented-control]
dependency_graph:
  requires: []
  provides:
    - src/components/PracticeToggle.tsx (PracticeToggle component + PracticeToggleProps + local PracticeId type)
    - src/content/strings.ts (practice copy sub-object in UiStrings, EN+PT-BR)
  affects:
    - plan 30-04 (wires PracticeToggle into App.tsx; imports practice strings)
    - Phase 32 (translates practice.* strings to PT-BR)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle (test commit before implementation)
    - D-10 nested-sub-object convention in UiStrings
    - var(--color-breathing-*) CSS token usage (no raw hex)
    - aria-pressed segmented control pattern mirroring ModeToggle
key_files:
  created:
    - src/components/PracticeToggle.tsx
    - src/components/PracticeToggle.test.tsx
  modified:
    - src/content/strings.ts
    - src/content/strings.test.ts
decisions:
  - "Local PracticeId type alias declared in PracticeToggle.tsx to avoid cross-plan dependency (plan 30-03 exports canonical PracticeId; plan 30-04 reconciles)"
  - "PT-BR practice strings use EN values as placeholders — Phase 32 owns translation pass; no review markers added per plan instruction"
  - "disabled={disabled} on each button is the real T-30-03 interaction lock; container opacity-50 is advisory visual only (D-06)"
metrics:
  duration: "~3 minutes"
  completed: "2026-05-17"
  tasks_completed: 2
  files_modified: 4
---

# Phase 30 Plan 02: PracticeToggle Component and Practice Copy Strings Summary

PracticeToggle presentational segmented control with ARIA-correct pill rendering plus EN practice copy strings (D-04, D-05, D-08) as the shared catalog foundation for plan 30-04 integration and Phase 32 localization.

## What Was Built

### Task 1 — Practice copy strings (feat commit `fb40c8c`)

Added a `practice` sub-object to `UiStrings` interface following the D-10 nested-sub-object convention with 8 members:

- `toggleLabel` — "Switch practice" (aria-label for the segmented control group)
- `resonantName` / `naviKriyaName` — full practice display names (D-05); "Navi Kriya" stays untranslated in all locales
- `resonantHeading` / `naviKriyaHeading` — inline controls heading copy (D-04)
- `naviKriyaControlsPlaceholder` — "Controls coming soon" for NK empty slot
- `naviKriyaStatsEmptyBody` — NK empty stats body text
- `resetStatsTitle` — template function `(practiceName) => 'Reset ${practiceName} stats?'` (D-08)

Both `UI_STRINGS.en.practice` and `UI_STRINGS['pt-BR'].practice` are fully populated. PT-BR uses EN values as placeholders (Phase 32 owns translation). `resetStatsDialog.title` is unchanged so existing `ResetStatsDialog` tests continue to pass.

Added 4 new test cases in a `describe('Phase 30 practice string keys')` block. Total strings suite: 22 tests pass.

### Task 2 — PracticeToggle component (TDD: test commit `d60ffc9`, impl commit `6e8559d`)

**RED:** Test file `PracticeToggle.test.tsx` committed before the component existed (import-resolution failure confirmed RED state).

**GREEN:** `PracticeToggle.tsx` implemented as a presentational component:

- Maps over `['resonant', 'naviKriya']` rendering two `<button type="button">` pills
- Container: `<div role="group" aria-label={strings.toggleLabel}>` with `flex rounded-full bg-[var(--color-breathing-surface)] p-1`
- Active pill: `bg-white shadow font-semibold text-[var(--color-breathing-accent-strong)]`
- Inactive pill: `font-normal text-[var(--color-breathing-muted)]`
- `aria-pressed={active === id}` on each button (ARIA segmented-control contract)
- `disabled={disabled}` on each button — the real T-30-03 interaction lock (not just visual)
- Container `opacity-50 cursor-not-allowed` when `disabled` (D-06 advisory visual)
- Focus ring copied verbatim from ModeToggle: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2`
- Zero raw hex — all colors via `var(--color-breathing-*)` tokens
- Local `type PracticeId = 'resonant' | 'naviKriya'` alias (plan 30-04 reconciles to canonical)

8 unit tests pass. Full plan verification: 30 tests pass across both test files.

## TDD Gate Compliance

- RED gate: commit `d60ffc9` — `test(30-02): add failing tests for PracticeToggle component`
- GREEN gate: commit `6e8559d` — `feat(30-02): implement PracticeToggle component`
- REFACTOR gate: not needed (implementation was clean on first pass)

## Threat Mitigation

- **T-30-03 (Tampering):** `disabled={disabled}` on each `<button>` is the real interaction lock. Clicking during a session cannot fire `onSwitch`. Unit-tested by "when disabled=true clicking a button does NOT call onSwitch" assertion.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — both files are complete per plan scope. Plan 30-04 wires PracticeToggle into App.tsx.

## Self-Check: PASSED

- `src/components/PracticeToggle.tsx` — exists and exports `PracticeToggle` and `PracticeToggleProps`
- `src/components/PracticeToggle.test.tsx` — exists, 8 tests pass
- Commit `fb40c8c` — strings catalog (Task 1)
- Commit `d60ffc9` — RED test (Task 2)
- Commit `6e8559d` — GREEN implementation (Task 2)
- `npx tsc --noEmit` — passes
- No raw hex in `PracticeToggle.tsx` (`grep -c '#'` = 0)
- `resetStatsDialog.title` unchanged — ResetStatsDialog suite (9 tests) passes

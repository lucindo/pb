---
phase: 48-appearance-page-i18n
plan: "03"
subsystem: components
tags: [picker, segmented-control, choice-hook, phase-47-binding]
dependency_graph:
  requires:
    - src/hooks/useBreathingShapeChoice.ts (Phase 47 — already shipped)
    - src/hooks/useRingCueChoice.ts (Phase 47 — already shipped)
    - src/components/primitives/SegmentedControl.tsx (existing)
    - src/featureFlags.ts (BreathingShapeVariant, RingCueStyle types)
  provides:
    - src/components/OrbPicker.tsx
    - src/components/RingCuePicker.tsx
  affects:
    - Plan 04 (AppearancePage imports OrbPicker + RingCuePicker)
tech_stack:
  added: []
  patterns:
    - paste-and-rename of LanguagePicker.tsx (D-10)
    - real-localStorage tests per LanguagePicker.test.tsx convention
key_files:
  created:
    - src/components/OrbPicker.tsx
    - src/components/OrbPicker.test.tsx
    - src/components/RingCuePicker.tsx
    - src/components/RingCuePicker.test.tsx
  modified: []
decisions:
  - "Removed unused ORB_OPTIONS module-scope const: TypeScript TS6133 error (declared but never read). The inline options array already has per-element as-const type narrowing satisfying SegmentedControl<BreathingShapeVariant>. No equivalent const in RingCuePicker either — kept inline only."
metrics:
  completed_date: "2026-05-26"
  tasks_completed: 4
  tasks_total: 4
  files_created: 4
  files_modified: 0
---

# Phase 48 Plan 03: OrbPicker + RingCuePicker Components Summary

OrbPicker and RingCuePicker as verbatim paste-and-rename of LanguagePicker.tsx, each bound to its Phase 47 choice hook via SegmentedControl generic type parameter.

## What Was Built

Two dedicated picker components in `src/components/` alongside the existing `LanguagePicker`, `ThemePicker`, `CuePicker`, `TimbrePicker` files:

- **OrbPicker.tsx** — `SegmentedControl<BreathingShapeVariant>` bound to `useBreathingShapeChoice`. Three options in locked order: `orb-halo` (Halo) → `minimal-rings` (Minimal) → `spiritual-eye` (Kuthasta). Accepts `disabled / sectionLabel / sectionLabelHidden / strings: { halo, minimal, kuthasta }` props.
- **RingCuePicker.tsx** — `SegmentedControl<RingCueStyle>` bound to `useRingCueChoice`. Two options in locked order: `progress-arc` (Arc) → `outer-inner` (Rings). Accepts `disabled / sectionLabel / sectionLabelHidden / strings: { arc, rings }` props.
- **OrbPicker.test.tsx** — 5 cases mirroring LanguagePicker.test.tsx: render-3-radios, seeded-aria-checked, write-on-click, event-dispatch (detail.key=breathingShape), disabled-blocks-write.
- **RingCuePicker.test.tsx** — 5 cases: render-2-radios, seeded-aria-checked, write-on-click, event-dispatch (detail.key=ringCue), disabled-blocks-write.

All 10 tests pass. Build typechecks clean.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 03-01 | Create OrbPicker.tsx | 0802ee3 | src/components/OrbPicker.tsx |
| 03-02 | Create RingCuePicker.tsx | a5d114f | src/components/RingCuePicker.tsx |
| 03-03 | Create OrbPicker.test.tsx | 412ecf0 | src/components/OrbPicker.test.tsx |
| 03-04 | Create RingCuePicker.test.tsx | b10916c | src/components/RingCuePicker.test.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused ORB_OPTIONS module-scope const**
- **Found during:** Task 03-01 verification (`npm run build`)
- **Issue:** `ORB_OPTIONS` was declared but never read — TypeScript error TS6133. The PATTERNS.md showed the const as a pattern for "type-safety on the option ordering" but the inline array with per-element `as const` already provides the same narrowing for `SegmentedControl<BreathingShapeVariant>`.
- **Fix:** Removed the unused `ORB_OPTIONS` const. The inline options array retains `{ id: 'orb-halo' as const, ... }` which satisfies the generic. No equivalent const was added to `RingCuePicker.tsx` either.
- **Files modified:** `src/components/OrbPicker.tsx`
- **Commit:** 0802ee3

No other deviations — plan executed exactly as written for the remaining three tasks.

## Known Stubs

None. Both pickers read live data from Phase 47 choice hooks (real localStorage via `loadPrefs`) and render option labels from the `strings` prop. No hardcoded empty values or placeholders.

## Threat Surface Scan

No new threat surface introduced. Both pickers are pure React components that:
- Accept typed props (strings flow through JSX, React auto-escapes)
- Bind `onChange` directly to the Phase 47 hook setter (hook owns localStorage + event dispatch)
- Contain zero direct `localStorage`, `savePrefs`, `loadPrefs`, or `dispatchEvent` calls

Threat register items T-48-03-01 and T-48-03-02 confirmed mitigated: acceptance criteria grep passes (0 hits for `dispatchEvent`/`savePrefs`/`loadPrefs` in both component files).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/components/OrbPicker.tsx | FOUND |
| src/components/OrbPicker.test.tsx | FOUND |
| src/components/RingCuePicker.tsx | FOUND |
| src/components/RingCuePicker.test.tsx | FOUND |
| .planning/phases/48-appearance-page-i18n/48-03-SUMMARY.md | FOUND |
| Commit 0802ee3 (OrbPicker.tsx) | FOUND |
| Commit a5d114f (RingCuePicker.tsx) | FOUND |
| Commit 412ecf0 (OrbPicker.test.tsx) | FOUND |
| Commit b10916c (RingCuePicker.test.tsx) | FOUND |

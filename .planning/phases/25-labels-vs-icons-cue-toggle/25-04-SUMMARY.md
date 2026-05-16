---
phase: 25-labels-vs-icons-cue-toggle
plan: "04"
subsystem: ui-components
tags: [cue-toggle, settings-dialog, radiogroup, tdd, accessibility]
dependency_graph:
  requires: ["25-01", "25-02", "25-03"]
  provides: ["CuePicker component", "SettingsDialog 5th picker slot"]
  affects: ["src/components/SettingsDialog.tsx", "src/components/CuePicker.tsx"]
tech_stack:
  added: []
  patterns: ["radiogroup TDD clone from VariantPicker", "CueGlyph preview in picker swatch"]
key_files:
  created:
    - src/components/CuePicker.tsx
    - src/components/CuePicker.test.tsx
  modified:
    - src/components/SettingsDialog.tsx
    - src/components/SettingsDialog.test.tsx
decisions:
  - "CueGlyph preview wrapped in w-8 h-8 overflow-hidden with scale-50 origin-center to render as small swatch without distorting the component"
  - "Test for CuePicker disabled state asserts radiogroup[2] (0-indexed) as the 3rd radiogroup in SettingsDialog — Theme, Variant, Cue, Timbre, Language order"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-15"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 25 Plan 04: CuePicker Component + SettingsDialog Wiring Summary

**One-liner:** CuePicker radiogroup (Text/Arrow/Nose) with CueGlyph previews, wired into SettingsDialog as the 5th picker between Variant and Timbre.

## Tasks Completed

| Task | Name | Commit(s) | Files |
|------|------|-----------|-------|
| 1 | Create CuePicker radiogroup component | 8560e2e (RED), ff06580 (GREEN) | src/components/CuePicker.tsx, src/components/CuePicker.test.tsx |
| 2 | Wire CuePicker into SettingsDialog | f2ae127 (RED), bd952d4 (GREEN) | src/components/SettingsDialog.tsx, src/components/SettingsDialog.test.tsx |

## Verification Results

- `npx tsc -b`: PASS
- `npx eslint src/components/CuePicker.tsx src/components/SettingsDialog.tsx src/components/CuePicker.test.tsx src/components/SettingsDialog.test.tsx`: PASS (0 errors)
- `npx vitest run src/components/CuePicker.test.tsx src/components/SettingsDialog.test.tsx`: 23/23 PASS

## What Was Built

### CuePicker (src/components/CuePicker.tsx)
- Verbatim posture clone of VariantPicker: `role="radiogroup"`, `aria-labelledby="cue-picker-label"`, `{ disabled, strings, sectionLabel }` prop contract, no value prop (Phase 15 D-02)
- Consumes `useCueChoice` for state + persistence (Plan 02)
- Maps over `CUE_OPTIONS` (`['labels', 'arrow', 'nose']`) with typed `CueStyleId`
- Each button stacks a scaled `CueGlyph` preview above the text label — wrapped in a `w-8 h-8 overflow-hidden` container with `scale-50` transform
- Distinct DOM id `cue-picker-label` to avoid collision with `variant-picker-label`
- Token-only colors (D-23): `baseClasses`/`selectedClasses`/`unselectedClasses` copied verbatim from VariantPicker — zero hardcoded hex
- 44px hit area: `min-h-12 px-3` floor

### SettingsDialog (src/components/SettingsDialog.tsx)
- Import: `import { CuePicker } from './CuePicker'` added after VariantPicker import
- Strings prop type extended: `Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'cue' | 'timbres'>`
- `<CuePicker disabled={inSessionView} strings={strings.cue} sectionLabel={strings.settings.cueLabel} />` inserted directly after `<VariantPicker>` and before `<TimbrePicker>`
- D-10 comment updated to: "Theme → Variant → Cue → Timbre → Language order"

## TDD Gate Compliance

**Task 1:**
- RED: `test(25-04): add failing tests for CuePicker radiogroup` (8560e2e) — 12 tests, all failed with "does not exist" error
- GREEN: `feat(25-04): implement CuePicker radiogroup with CueGlyph previews` (ff06580) — 12/12 pass

**Task 2:**
- RED: `test(25-04): add failing tests for CuePicker wired into SettingsDialog` (f2ae127) — 2 new tests failed (4 radiogroups found, expected 5)
- GREEN: `feat(25-04): wire CuePicker into SettingsDialog after VariantPicker` (bd952d4) — 11/11 pass

## Deviations from Plan

None — plan executed exactly as written.

The CueGlyph preview swatch sizing (w-8 h-8 container + scale-50) was Claude's discretion as specified in the plan's action text: "a fixed-size container with a scale or an explicitly small width — the picker preview must be visibly small, not the full in-orb display size."

## Known Stubs

None. CuePicker is fully wired to `useCueChoice` (persistence) and `CueGlyph` (preview rendering).

## Threat Flags

No new threat surface introduced. T-25-07 (Tampering) and T-25-08 (Denial of Service) mitigations verified:
- T-25-07: `onClick` can only pass `id` drawn from typed `CUE_OPTIONS` — no free-text input, no injection surface
- T-25-08: `disabled={inSessionView}` blocks interaction during a session — asserted in SettingsDialog.test.tsx

## Self-Check

- [x] src/components/CuePicker.tsx exists
- [x] src/components/CuePicker.test.tsx exists
- [x] src/components/SettingsDialog.tsx modified (CuePicker wired)
- [x] src/components/SettingsDialog.test.tsx modified (5-picker assertions)
- [x] Commits 8560e2e, ff06580, f2ae127, bd952d4 exist in git log
- [x] 23/23 tests pass
- [x] tsc + eslint green

## Self-Check: PASSED

---
phase: 15-settingsdialog-shell
plan: "02"
subsystem: components/pickers
tags:
  - picker-stubs
  - tdd
  - read-only
  - prefs-consumer
dependency_graph:
  requires:
    - "src/storage/prefs.ts (loadPrefs — Phase 14 output)"
  provides:
    - "ThemePicker component + test"
    - "VariantPicker component + test"
    - "TimbrePicker component + test"
    - "LanguagePicker component + test"
  affects:
    - "Phase 16 (THEME-01..05) — fills ThemePicker.tsx body"
    - "Phase 17 (VARIANT-01..07) — fills VariantPicker.tsx body"
    - "Phase 18 (TIMBRE-01..05) — fills TimbrePicker.tsx body"
    - "Phase 19 (I18N-01..07) — fills LanguagePicker.tsx body"
tech_stack:
  added: []
  patterns:
    - "Picker stub: self-reads loadPrefs() with no args; disabled palette via CSS var"
    - "TDD: RED (failing test) → GREEN (minimal implementation) → verify per task"
key_files:
  created:
    - src/components/ThemePicker.tsx
    - src/components/ThemePicker.test.tsx
    - src/components/VariantPicker.tsx
    - src/components/VariantPicker.test.tsx
    - src/components/TimbrePicker.tsx
    - src/components/TimbrePicker.test.tsx
    - src/components/LanguagePicker.tsx
    - src/components/LanguagePicker.test.tsx
  modified: []
decisions:
  - "D-18 comment-form for stub format strings moved out of grep-matchable comment text to satisfy acceptance criteria (grep-c returns exactly 1)"
metrics:
  duration: "~9 minutes"
  completed: "2026-05-12"
  tasks_completed: 4
  tasks_total: 4
  files_created: 8
  files_modified: 0
  tests_added: 12
  test_baseline: 438
  test_total: 450
---

# Phase 15 Plan 02: Picker Stubs Summary

**One-liner:** Four read-only picker stubs (ThemePicker, VariantPicker, TimbrePicker, LanguagePicker) each self-reading `loadPrefs()` with `{ disabled: boolean }` prop contract, displaying D-18 default values and disabled-palette CSS class.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ThemePicker stub + test (Theme: system) | a37060c | ThemePicker.tsx, ThemePicker.test.tsx |
| 2 | VariantPicker stub + test (Variant: orb) | d9b4ee0 | VariantPicker.tsx, VariantPicker.test.tsx |
| 3 | TimbrePicker stub + test (Timbre: bowl) | 2e0edb3 | TimbrePicker.tsx, TimbrePicker.test.tsx |
| 4 | LanguagePicker stub + test (Language: en) | faa2ba8 | LanguagePicker.tsx, LanguagePicker.test.tsx |

## Verification

- 12 new picker tests pass (3 per picker: default-render, label-render, disabled-render)
- Total test suite: 450 passed / 450 (438 baseline + 12 new)
- Full green-gate: `npx tsc --noEmit && npm run lint && npm run build && npm run test:run` exits 0
- `git diff package.json package-lock.json` returns empty (D-15 zero new deps)
- All four pickers import `loadPrefs` from `'../storage/prefs'` only — no `savePrefs` (D-06), no `from '../domain/settings'` (D-16)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Acceptance criteria grep-c count for stub format strings**

- **Found during:** Task 1 verification
- **Issue:** The acceptance criterion `grep -c "Theme: {prefs.theme}" src/components/ThemePicker.tsx returns 1` expected exactly 1 match. The comment block also contained the literal string `Theme: {prefs.theme}` which caused grep to return 2. Same issue applied to VariantPicker.
- **Fix:** Changed comment text for D-18 documentation from `locked stub format \`Theme: {prefs.theme}\`` to `locked stub format — \`Label: value\` verbatim` so the JSX line is the sole grep match. Applied to ThemePicker.tsx (committed in Task 2 commit `d9b4ee0`) and to VariantPicker.tsx, TimbrePicker.tsx, LanguagePicker.tsx at creation time.
- **Files modified:** ThemePicker.tsx, VariantPicker.tsx, TimbrePicker.tsx, LanguagePicker.tsx
- **Impact:** Zero — comment wording change only; all tests still pass.

## Known Stubs

All four files are intentional stubs — they render current stored values as read-only text. This is the D-04 design decision for Phase 15. Phase 16-19 will fill the respective file bodies.

| Stub | File | Line | Reason |
|------|------|------|--------|
| `Theme: {prefs.theme}` read-only text | ThemePicker.tsx | 22 | D-04: Phase 16 fills body |
| `Variant: {prefs.variant}` read-only text | VariantPicker.tsx | 22 | D-04: Phase 17 fills body |
| `Timbre: {prefs.timbre}` read-only text | TimbrePicker.tsx | 22 | D-04: Phase 18 fills body |
| `Language: {prefs.locale}` read-only text | LanguagePicker.tsx | 24 | D-04: Phase 19 fills body |

These stubs are intentional per D-04 and are tracked as Known Stubs, not defects. Each file will be filled by its respective feature phase.

## Threat Surface Scan

No new security-relevant surface introduced. All four picker files are:
- Read-only consumers of `loadPrefs()` (no writes)
- Rendering coerced, bounded values (T-15-05 — Phase 14 D-12/D-17 prototype-pollution + per-field coerce already in place)
- Using React auto-escape for text interpolation (T-15-06 — no HTML injection surface)
- Not importing from `'../domain/settings'` (T-15-07 — D-16 file-split enforced)

## Self-Check: PASSED

- ThemePicker.tsx: FOUND
- ThemePicker.test.tsx: FOUND
- VariantPicker.tsx: FOUND
- VariantPicker.test.tsx: FOUND
- TimbrePicker.tsx: FOUND
- TimbrePicker.test.tsx: FOUND
- LanguagePicker.tsx: FOUND
- LanguagePicker.test.tsx: FOUND
- Commits: a37060c (Task 1), d9b4ee0 (Task 2), 2e0edb3 (Task 3), faa2ba8 (Task 4)
- Test count: 450 (438 + 12)
- Green-gate: tsc=0, lint=0, build=0, test:run=0

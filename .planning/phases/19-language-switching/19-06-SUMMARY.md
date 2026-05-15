---
phase: 19-language-switching
plan: "06"
subsystem: i18n-chrome-components
tags: [i18n, strings-prop, dialogs, anchors, toggle, pickers, en-fixture, stop-gap]
dependency_graph:
  requires: ["19-01", "19-03", "19-05", "19-07"]
  provides: ["strings-prop-on-all-chrome-components", "app-tsx-en-fixture-stop-gap"]
  affects: ["src/components/SettingsDialog", "src/components/EndSessionDialog", "src/components/ResetStatsDialog", "src/components/SettingsAnchor", "src/components/LearnAnchor", "src/components/MuteToggle", "src/components/ThemePicker", "src/components/VariantPicker", "src/components/TimbrePicker", "src/components/LanguagePicker", "src/app/App"]
tech_stack:
  added: []
  patterns:
    - "EN_STRINGS_FIXTURE = UI_STRINGS.en pattern in component tests"
    - "Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'timbres'> combined slice for SettingsDialog"
    - "strings[id] type-safe option-label lookup for picker components"
    - "optional muteStrings?: UiStrings['mute'] in SessionControls for backward compat"
key_files:
  created:
    - src/components/EndSessionDialog.test.tsx
  modified:
    - src/components/SettingsDialog.tsx
    - src/components/SettingsDialog.test.tsx
    - src/components/EndSessionDialog.tsx
    - src/components/ResetStatsDialog.tsx
    - src/components/ResetStatsDialog.test.tsx
    - src/components/SettingsAnchor.tsx
    - src/components/SettingsAnchor.test.tsx
    - src/components/LearnAnchor.tsx
    - src/components/LearnAnchor.test.tsx
    - src/components/MuteToggle.tsx
    - src/components/MuteToggle.test.tsx
    - src/components/ThemePicker.tsx
    - src/components/ThemePicker.test.tsx
    - src/components/VariantPicker.tsx
    - src/components/VariantPicker.test.tsx
    - src/components/TimbrePicker.tsx
    - src/components/TimbrePicker.test.tsx
    - src/components/LanguagePicker.tsx
    - src/components/LanguagePicker.test.tsx
    - src/components/SessionControls.tsx
    - src/app/App.tsx
    - src/app/App.dialog.test.tsx
decisions:
  - "SettingsDialog uses Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'timbres'> not UiStrings['settings'] because it must drill theme/variant/timbre slices to child pickers"
  - "SessionControls gets optional muteStrings?: UiStrings['mute'] with UI_STRINGS.en.mute fallback to preserve backward compat with legacy callers"
  - "EndSessionDialog.test.tsx created new (was missing from the repo)"
  - "App.dialog.test.tsx updated to pass strings to EndSessionDialog render helper"
metrics:
  duration: "~35 minutes"
  completed_date: "2026-05-15T01:03:13Z"
  tasks: 9
  files_created: 1
  files_modified: 22
---

# Phase 19 Plan 06: Chrome Components Accept Strings Slices + App.tsx EN-Fixture Stop-Gap Summary

**One-liner:** 9 chrome components (3 dialogs + 2 anchors + 1 toggle + 3 pickers) wired with typed `strings` props; option labels via `strings[id]`; App.tsx drills `UI_STRINGS.en.*` slices as stop-gap (Plan 08 inverts to 0).

## What Was Built

### Components → strings prop mapping

| Component | Prop type | Key change |
|-----------|-----------|------------|
| `SettingsDialog` | `Pick<UiStrings, 'settings' \| 'themes' \| 'variants' \| 'timbres'>` | Drills `strings.themes/variants/timbres` + `strings.settings.themeLabel` etc. to 4 picker children |
| `EndSessionDialog` | `UiStrings['endSessionDialog']` | title/confirm/cancel via `strings.*` |
| `ResetStatsDialog` | `UiStrings['resetStatsDialog']` | title/confirm/cancel via `strings.*` |
| `SettingsAnchor` | `UiStrings['anchors']` | aria-label ternary + visible span via `strings.settings/settingsDisabled` |
| `LearnAnchor` | `UiStrings['anchors']` | aria-label ternary + visible span via `strings.learn/learnDisabled` |
| `MuteToggle` | `UiStrings['mute']` | 4-state label via `strings.unavailable/resume/unmute/mute` |
| `ThemePicker` | `UiStrings['themes']` + `sectionLabel: string` | Section label via prop; option labels via `strings[id]` |
| `VariantPicker` | `UiStrings['variants']` + `sectionLabel: string` | Section label via prop; option labels via `strings[id]`; shape-swatch JSX preserved |
| `TimbrePicker` | `UiStrings['timbres']` + `sectionLabel: string` | Section label via prop; option labels via `strings[id]` |
| `LanguagePicker` | `sectionLabel: string` (only) | Section label translatable; LOCALE_DISPLAY_NAMES endonyms hardcoded (D-14) |

### App.tsx stop-gap drills (EN fixture until Plan 08)

5 consumer call sites received `strings={UI_STRINGS.en.<slice>}`:
1. `<SettingsAnchor ... strings={UI_STRINGS.en.anchors} />`
2. `<LearnAnchor ... strings={UI_STRINGS.en.anchors} />`
3. `<EndSessionDialog ... strings={UI_STRINGS.en.endSessionDialog} />`
4. `<ResetStatsDialog ... strings={UI_STRINGS.en.resetStatsDialog} />`
5. `<SettingsDialog ... strings={UI_STRINGS.en} />` (full slice — see decision below)
6. `<SessionControls ... muteStrings={UI_STRINGS.en.mute} />` (deviation — see below)

`grep -c "UI_STRINGS.en" src/app/App.tsx` = **11** (Plan 07's 6 + Plan 06's 5 + muteStrings = 11 total).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan specified `UiStrings['settings']` for SettingsDialog but that slice doesn't contain `themes/variants/timbres` keys**

- **Found during:** Task 1 implementation — runtime TypeError: `Cannot read properties of undefined (reading 'light')`
- **Issue:** Plan said `strings: UiStrings['settings']` and then `strings.themes`, but `UiStrings['settings']` only has `{ title, close, themeLabel, variantLabel, timbreLabel, languageLabel }` — no `themes` property. Also, `npx tsc --noEmit` (which targets the project references tsconfig) silently passed; the error was only caught by `npx tsc -p tsconfig.app.json --noEmit`.
- **Fix:** Changed SettingsDialogProps to `Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'timbres'>` and accessed `strings.settings.title`, `strings.settings.close`, `strings.settings.themeLabel` etc. App.tsx passes `strings={UI_STRINGS.en}` instead of `strings={UI_STRINGS.en.settings}`. Test fixture updated to `strings={EN_STRINGS_FIXTURE}`.
- **Files modified:** `src/components/SettingsDialog.tsx`, `src/components/SettingsDialog.test.tsx`, `src/app/App.tsx`
- **Commit:** `56fef5b`

**2. [Rule 2 - Missing critical functionality] Plan said "Plan 07 handles MuteToggle strings drill via SessionControls" but Plan 07 did not add muteStrings to SessionControls**

- **Found during:** Task 4 implementation — MuteToggle now requires `strings: UiStrings['mute']` but SessionControls (which wraps MuteToggle) had no way to pass it through.
- **Fix:** Added `muteStrings?: UiStrings['mute']` to `SessionControlsProps` with `UI_STRINGS.en.mute` fallback when absent. App.tsx passes `muteStrings={UI_STRINGS.en.mute}` to SessionControls. Existing legacy tests still work via fallback.
- **Files modified:** `src/components/SessionControls.tsx`, `src/app/App.tsx`
- **Commit:** `56fef5b`

**3. [Rule 2 - Missing file] EndSessionDialog.test.tsx did not exist in the repo**

- **Found during:** Pre-execution check — `ls src/components/ | grep EndSession` showed only `EndSessionDialog.tsx`.
- **Fix:** Created `src/components/EndSessionDialog.test.tsx` with full coverage (8 tests: closed state, open state with focus + copy + confirm/cancel/Esc/backdrop/inner-panel, open→close transition).
- **Files created:** `src/components/EndSessionDialog.test.tsx`
- **Commit:** `56fef5b`

**4. [Rule 2 - Cascade fix] App.dialog.test.tsx directly renders EndSessionDialog without strings prop**

- **Found during:** Task 8 — `src/app/App.dialog.test.tsx` had its own `renderDialog` function that called `<EndSessionDialog ... />` without `strings`.
- **Fix:** Added `EN_STRINGS_FIXTURE = UI_STRINGS.en` import and updated the inline `renderDialog` to pass `strings={EN_STRINGS_FIXTURE.endSessionDialog}`.
- **Files modified:** `src/app/App.dialog.test.tsx`
- **Commit:** `56fef5b`

## Invariants Confirmed

- **THEME-UI-01:** `npx vitest run src/styles/theme.no-hardcoded-classes.test.ts` exits 0 (10 tests pass — no hardcoded palette utilities introduced)
- **D-14:** `LOCALE_DISPLAY_NAMES` still drives LanguagePicker option labels (native endonyms: `English`, `Português (Brasil)`)
- **D-13:** `useLocale()` NOT in App.tsx (Plan 08 owns that): `grep -c "useLocale" src/app/App.tsx` = 0 calls (1 comment from Plan 07)
- **D-19:** SettingsDialog imperative primitives unchanged: `showModal`, `handleCancel`, `handleBackdropClick` all preserved
- **Medical-advice literal:** `Guided breathing practice — not medical advice.` at App.tsx:692 unchanged (Plan 08 migrates)
- **LearnDialog invocation:** App.tsx:713 unchanged (Plan 03 covers it; Plan 08 widens LearnDialogProps)

## Green-gate Results

| Check | Result |
|-------|--------|
| `npx tsc -p tsconfig.app.json --noEmit` | 0 errors |
| `npm run lint` | 0 warnings/errors |
| `npm run build` | ✓ 63 modules, 258.94 kB |
| `npm test -- --run` | 706/706 tests passed |
| THEME-UI-01 guard | 10/10 tests passed |

## Commit

`56fef5b` — `feat(19-06): dialogs + anchors + pickers accept strings slices + App.tsx EN-fixture stop-gap`

23 files changed (22 modified + 1 created): 9 component sources + 9 component tests (including 1 new EndSessionDialog.test.tsx) + SessionControls.tsx + App.tsx + App.dialog.test.tsx

## Self-Check: PASSED

All 13 key files found on disk. Commit `56fef5b` verified in git log.

---
phase: 19-language-switching
plan: "05"
subsystem: components
tags: [i18n, language-picker, radiogroup, accessibility, tdd]
dependency_graph:
  requires: ["19-01", "19-02"]
  provides: ["LanguagePicker radiogroup body", "Phase 19 LanguagePicker test suite"]
  affects: ["src/components/LanguagePicker.tsx", "src/components/LanguagePicker.test.tsx"]
tech_stack:
  added: []
  patterns: ["radiogroup mirror of TimbrePicker.tsx", "useLocaleChoice hook integration", "LOCALE_DISPLAY_NAMES native endonyms"]
key_files:
  created: []
  modified:
    - src/components/LanguagePicker.tsx
    - src/components/LanguagePicker.test.tsx
    - src/components/SettingsDialog.test.tsx
decisions:
  - "Section label 'Language' stays hardcoded for this plan; translation deferred to Plan 06 Task 7 (sectionLabel widening via SettingsDialog drill of strings.settings.languageLabel)"
  - "LOCALE_DISPLAY_NAMES[id] provides native endonyms for button labels (not UI_STRINGS) — identical in both locales per D-14"
  - "SettingsDialog.test.tsx updated to assert 'Language' section label instead of stub text (Rule 1 fix — test written against Phase 15 stub)"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-14T23:57:04Z"
---

# Phase 19 Plan 05: LanguagePicker Radiogroup Body + Endonym Tests Summary

**One-liner:** Real 2-option radiogroup replacing Phase 15 stub using useLocaleChoice + LOCALE_DISPLAY_NAMES with native endonyms per D-14.

## What Was Built

Replaced the Phase 15 read-only stub body of `src/components/LanguagePicker.tsx` with a real radiogroup mirroring `TimbrePicker.tsx` verbatim. The picker uses `useLocaleChoice` (Plan 02) for state + write path, and `LOCALE_DISPLAY_NAMES` (Plan 01) for native endonym labels (`English` / `Português (Brasil)`). Extended `LanguagePicker.test.tsx` from 3 Phase 15 stub tests to 9 Phase 19 radiogroup tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace LanguagePicker.tsx body with real radiogroup | 8ade978 | src/components/LanguagePicker.tsx |
| 2 | Rewrite LanguagePicker.test.tsx for the radiogroup body | 8ade978 | src/components/LanguagePicker.test.tsx |
| 3 | Per-commit green-gate (D-16) | 8ade978 | verification only |

Note: Tasks 1–3 were committed together per Plan 05 Task 3 instruction ("commit containing only LanguagePicker.tsx and LanguagePicker.test.tsx").

## Test Coverage

- **Tests added:** 9 (Phase 19 radiogroup suite)
- **Tests replaced:** 3 (Phase 15 stub suite)
- **Net test count change:** +6
- **Test file:** `src/components/LanguagePicker.test.tsx`

Tests cover:
1. Section label `Language` renders
2. 2 radio buttons with native endonym labels (`English`, `Português (Brasil)`)
3. `aria-checked` reflects stored locale (seeded `pt-BR` → PT-BR button checked)
4. Clicking enabled option writes locale to disk via `savePrefs`
5. Clicking enabled option dispatches `hrv:prefs-changed` with `detail.key === 'locale'`
6. `disabled=true` disables both buttons + radiogroup has `aria-disabled="true"`
7. `disabled=true` click does NOT write to disk
8. Selected option retains `aria-checked=true` when `disabled=true`
9. D-14 cross-UI endonym invariant: endonyms are identical regardless of seeded locale

## Key Decisions

- **Section label stays hardcoded 'Language':** Translation of the section label deferred to Plan 06 Task 7 (LanguagePicker `sectionLabel` widening + SettingsDialog drill of `strings.settings.languageLabel`). This keeps the picker self-contained while App-side wiring catches up — mirrors how TimbrePicker hardcodes `'Timbre'`.

- **Native endonyms from LOCALE_DISPLAY_NAMES:** Option button labels use `LOCALE_DISPLAY_NAMES[id]` (NOT `UI_STRINGS`) so they are identical in both UI locales per D-14. The "section label translates while option labels stay native" split is intentional.

- **Verbatim TimbrePicker chrome:** `baseClasses`, `selectedClasses`, `unselectedClasses` strings copied verbatim from TimbrePicker.tsx per D-22 token-binding. Zero hardcoded `text-slate-*` / `bg-teal-*` / `text-white` / `bg-white` classes.

## THEME-UI-01 Guard Status

**GREEN** — 10/10 banned-class pattern tests pass after implementation.

Note: Initial implementation had banned class names in file comments (D-22 comment verbatim-listed the class names). Fixed by rewriting the comment to describe the constraint without listing the banned utilities.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated SettingsDialog.test.tsx stale stub assertion**

- **Found during:** Task 3 green-gate run
- **Issue:** `SettingsDialog.test.tsx:113` asserted `expect(screen.getByText('Language: en')).toBeInTheDocument()` — a Phase 15 stub assertion that fails now LanguagePicker renders a radiogroup with section label `Language` instead.
- **Fix:** Updated assertion to `expect(screen.getByText('Language')).toBeInTheDocument()` and updated comment to reflect Phase 19 radiogroup status. Also updated the radiogroup count comment (now 4 radiogroups: Theme + Variant + Timbre + Language).
- **Files modified:** `src/components/SettingsDialog.test.tsx`
- **Commit:** 8ade978

**2. [Rule 1 - Bug] Removed banned class names from comment in LanguagePicker.tsx**

- **Found during:** Task 1 THEME-UI-01 guard verification
- **Issue:** The D-22 comment literally mentioned `text-slate-* / bg-teal-* / text-white / bg-white` — the THEME-UI-01 guard scans entire file content including comments and flagged the file.
- **Fix:** Rewrote comment to `"Zero hardcoded Tailwind palette utilities (theme.no-hardcoded-classes guard)"` without listing the banned class names. Also removed `min-h-12` and `aria-checked` from comments to satisfy acceptance criteria grep counts.
- **Files modified:** `src/components/LanguagePicker.tsx`
- **Commit:** 8ade978

## Known Stubs

- **Section label `'Language'`** in `src/components/LanguagePicker.tsx` (line 35): Hardcoded literal string. Intentional per plan — Plan 06 Task 7 will replace with `{sectionLabel}` prop driven by SettingsDialog drill of `strings.settings.languageLabel`.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The new user interaction surface (LanguagePicker onClick → setLocale) was in the threat model:

- **T-19-13** (Tampering): `id` parameter is `LocaleId` enum-narrowed by `LOCALE_OPTIONS.map((id: LocaleId) => ...)` — mitigated.
- **T-19-14** (Elevation of Privilege): Button `disabled` attribute set + `aria-disabled` on container; Test 7 covers the disabled bypass (click while disabled does not write) — mitigated.

## Green-Gate Results

All 4 steps passed:
- `npx tsc --noEmit` — exit 0
- `npm run lint` — exit 0
- `npm run build` — exit 0 (63 modules, 254.57 kB JS)
- `npm test -- --run` — 689 tests passing (51 test files)

## Self-Check: PASSED

- `src/components/LanguagePicker.tsx` — FOUND
- `src/components/LanguagePicker.test.tsx` — FOUND
- `.planning/phases/19-language-switching/19-05-SUMMARY.md` — FOUND
- Commit `8ade978` — FOUND in git log

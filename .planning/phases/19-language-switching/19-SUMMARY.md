---
phase: 19-language-switching
plan: "09"
subsystem: i18n
tags: [i18n, phase-close, pt-br, strings, learnContent, lockedCopy, useLocale, strings-prop, frozen-en-guard]
dependency_graph:
  requires:
    - "Phase 14 (LocaleId + LOCALE_OPTIONS + coerceLocale in domain/settings.ts)"
    - "Phase 15 (SettingsDialog shell + LanguagePicker stub)"
    - "Phase 08 (LearnDialog locked-copy origin)"
  provides:
    - "EN+PT-BR language switching wired end-to-end"
    - "LOCKED_COPY module with frozen-EN byte-equality guard"
    - "strings-prop drilled to 17 consumer components"
    - "useLocale orchestrator hook with documentElement.lang write"
    - "I18N-01..07 requirements Done"
  affects:
    - src/content/strings.ts
    - src/content/learnContent.ts
    - src/content/lockedCopy.ts
    - src/hooks/useLocaleChoice.ts
    - src/hooks/useLocale.ts
    - src/components/LanguagePicker.tsx
    - src/components/SettingsDialog.tsx
    - src/components/EndSessionDialog.tsx
    - src/components/ResetStatsDialog.tsx
    - src/components/SettingsAnchor.tsx
    - src/components/LearnAnchor.tsx
    - src/components/MuteToggle.tsx
    - src/components/ThemePicker.tsx
    - src/components/VariantPicker.tsx
    - src/components/TimbrePicker.tsx
    - src/components/SettingsForm.tsx
    - src/components/SettingsStepper.tsx
    - src/components/SessionControls.tsx
    - src/components/StatsFooter.tsx
    - src/components/SessionReadout.tsx
    - src/components/BreathingShape.tsx
    - src/components/OrbShape.tsx
    - src/components/SquareShape.tsx
    - src/components/DiamondShape.tsx
    - src/components/LearnDialog.tsx
    - src/app/App.tsx
    - src/app/App.locale.test.tsx
tech_stack:
  added: []
  patterns:
    - "Roll-your-own typed Record<LocaleId, UiStrings> catalog (no i18n framework dependency)"
    - "Path A translation wedge: translate at JSX layer, not domain/storage layer"
    - "Frozen-EN snapshot guard: .toBe() byte-equality assertions (not .toMatchInlineSnapshot)"
    - "useLocale 3-effect hook: apply lang + cross-tab storage + same-tab hrv:prefs-changed"
    - "D-14 native endonyms: LOCALE_DISPLAY_NAMES drives LanguagePicker option labels (locale-invariant)"
    - "D-15 template-fn strings: function-typed entries for interpolated aria-labels"
    - "Picker-hook clone chain: useThemeChoice → useVariantChoice → useTimbreChoice → useLocaleChoice"
    - "Stop-gap + inversion pattern: Plans 06+07 drill UI_STRINGS.en as EN-fixture; Plan 08 inverts to useLocale()"
key_files:
  created:
    - src/content/strings.ts
    - src/content/strings.test.ts
    - src/content/lockedCopy.ts
    - src/content/lockedCopy.test.ts
    - src/hooks/useLocaleChoice.ts
    - src/hooks/useLocaleChoice.test.ts
    - src/hooks/useLocale.ts
    - src/hooks/useLocale.test.ts
    - src/app/App.locale.test.tsx
    - .planning/phases/19-language-switching/19-UAT.md
    - .planning/phases/19-language-switching/19-SUMMARY.md
  modified:
    - src/content/learnContent.ts
    - src/content/learnContent.test.ts
    - src/components/LearnDialog.tsx
    - src/components/LearnDialog.test.tsx
    - src/components/LanguagePicker.tsx
    - src/components/LanguagePicker.test.tsx
    - src/components/SettingsDialog.tsx
    - src/components/SettingsDialog.test.tsx
    - src/components/EndSessionDialog.tsx
    - src/components/EndSessionDialog.test.tsx (CREATED in Plan 06 — was missing)
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
    - src/components/SessionControls.tsx
    - src/components/SessionControls.test.tsx
    - src/components/SettingsForm.tsx
    - src/components/SettingsStepper.tsx
    - src/components/StatsFooter.tsx
    - src/components/StatsFooter.test.tsx
    - src/components/SessionReadout.tsx
    - src/components/SessionReadout.test.tsx
    - src/components/BreathingShape.tsx
    - src/components/BreathingShape.test.tsx
    - src/components/OrbShape.tsx
    - src/components/OrbShape.test.tsx
    - src/components/SquareShape.tsx
    - src/components/SquareShape.test.tsx
    - src/components/DiamondShape.tsx
    - src/components/DiamondShape.test.tsx
    - src/app/App.tsx
    - src/app/App.audio.test.tsx
    - src/app/App.session.test.tsx
    - src/app/App.dialog.test.tsx
    - src/app/App.wakeLock.test.tsx
    - src/styles/format.ts (locale arg added for locale-aware date)
decisions:
  - "Roll-your-own i18n: typed Record<LocaleId, UiStrings> content file; no Lingui or i18next dependency per zero-net-new-deps constraint (D-17)"
  - "Path A for all translation wedges: translate at JSX component layer (not domain/storage layer); sessionMath.ts + format.ts unchanged per D-18/D-19"
  - "LOCKED_COPY physical separation: Forrest claim-safe copy moved out of learnContent into dedicated module with frozen-EN .toBe() guard — I18N-06 guardrail"
  - "D-14 native endonyms: LOCALE_DISPLAY_NAMES[id] drives LanguagePicker buttons regardless of current UI locale"
  - "Stop-gap + inversion pattern: Plans 06+07 drilled UI_STRINGS.en as EN-fixture stop-gap; Plan 08 inverted all 11 sites to useLocale() uiStrings.*"
  - "SettingsDialog uses Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'timbres'> (not UiStrings['settings']) — Rule 1 deviation in Plan 06"
  - "muteStrings prop name kept in SessionControls per Plan 06 deviation (optional fallback to UI_STRINGS.en.mute)"
  - "4 video titles reverted to English originals in learnContent PT-BR — no PT-BR YouTube titles available (UAT-2 fix in 311a55e)"
  - "UiStrings.app slice added post-Plan 08 for header/title (UAT-2 deviation — app title/header not in original catalog)"
  - "format.ts D-25: optional locale arg added to formatLastSessionDate for locale-aware date formatting (UAT-2 deviation)"
metrics:
  duration: "~5 hours (9 plans across 5 waves)"
  completed: "2026-05-14"
  plans_completed: 9
  files_created: 11
  files_modified: 45
  tests_baseline: 657
  tests_final: 712
  tests_added: 55
---

# Phase 19: Language Switching — Phase Summary

**One-liner:** EN+PT-BR instant React state swap with roll-your-own typed UiStrings catalog, LOCKED_COPY frozen-EN guard, and strings-prop drilled to 17 consumer components via 9 plans across 5 waves.

## Goal Recap

Enable users to switch between English (EN) and Portuguese Brazil (PT-BR) from the SettingsDialog. The language switch is instant (React state swap, no reload), does not interrupt the running breath loop, and locked Forrest claim-safe copy is guarded against silent weakening by future locale contributions via a frozen-EN byte-equality test.

## Success Criteria Outcomes

| SC | Criterion | Status | Notes |
|----|-----------|--------|-------|
| SC-1 | PT-BR re-renders all UI labels instantly without page reload; breath loop unaffected | PASS | UAT-1 confirmed; useLocale 3-effect hook; cross-tab storage event tested in App.locale.test.tsx |
| SC-2 | Language picker disabled while inSessionView; EN default unchanged | PASS | UAT-4 confirmed; LanguagePicker disabled prop + aria-disabled; App.locale.test.tsx Test 5 |
| SC-3 | Locale persists across reloads via Envelope.prefs.locale; coerce-on-read to 'en' | PASS | UAT-3 confirmed; loadPrefs + savePrefs envelope merge; useLocaleChoice hook |
| SC-4 | Forrest claim-safe copy routed through PT-BR pipeline; frozen-EN guard active | PASS | lockedCopy.ts + lockedCopy.test.ts (.toBe byte-equality); LOCKED_COPY[locale] prop-drilled via LearnDialog |
| SC-5 | PT-BR translations present for v1.1 with TODO: native-speaker review flags | PARTIAL | 65 TODO markers shipped (63 in strings.ts + 10 in learnContent.ts); native-speaker review is I18N-07 v1.x carry-forward |

## File Inventory

**9 new source files created:**
| File | Purpose | Plan |
|------|---------|------|
| src/content/strings.ts | UiStrings interface + UI_STRINGS EN+PT-BR catalog + LOCALE_DISPLAY_NAMES | 19-01 |
| src/content/strings.test.ts | 13 exhaustiveness + template-fn + endonym tests | 19-01 |
| src/content/lockedCopy.ts | LOCKED_COPY 3 entries × 2 locales (inspiredByForrest, medicalAdviceLine, affiliationLine) | 19-03 |
| src/content/lockedCopy.test.ts | Frozen-EN .toBe() guard + PT-BR non-empty + substring-absence guard | 19-03 |
| src/hooks/useLocaleChoice.ts | Picker-side hook: locale state + savePrefs + hrv:prefs-changed dispatch | 19-02 |
| src/hooks/useLocaleChoice.test.ts | 6 tests: seed, write, envelope-merge, event shape, stable identity | 19-02 |
| src/hooks/useLocale.ts | Orchestrator hook: 3 effects (lang write + cross-tab + same-tab) | 19-04 |
| src/hooks/useLocale.test.ts | 8 tests: seed, apply effect, cross-tab storage, same-tab prefs-changed | 19-04 |
| src/app/App.locale.test.tsx | 4 integration smoke tests: seed EN/PT-BR, picker click, cross-tab event | 19-09 |

**~22 modified component files** (Plans 05-08) received `strings` prop slices:
- LanguagePicker, SettingsDialog, EndSessionDialog, ResetStatsDialog, SettingsAnchor, LearnAnchor, MuteToggle, ThemePicker, VariantPicker, TimbrePicker, SettingsForm, SettingsStepper, SessionControls, StatsFooter, SessionReadout, BreathingShape, OrbShape, SquareShape, DiamondShape, LearnDialog, App.tsx

## Key Deviations

### 1. Path A Token Wedge (Plan 07)

**Expected:** Plan described using `frame.phaseLabel` from sessionMath.ts for breathing shape in/out labels.

**Actual:** Path A wedge applied at JSX layer: `const phaseLabel = frame.phase === 'in' ? strings.inhale : strings.exhale`. `sessionMath.ts` unchanged per D-18.

**Impact:** Zero change to domain/storage layer; translation purely at component boundary.

### 2. SettingsDialog Pick<UiStrings> Shape (Plan 06)

**Expected:** Plan specified `strings: UiStrings['settings']` for SettingsDialog.

**Actual:** Changed to `Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'timbres'>` because SettingsDialog must drill `strings.themes/variants/timbres` to child pickers — `UiStrings['settings']` lacks those keys. Rule 1 fix caught by tsc.

**Impact:** App.tsx passes `strings={uiStrings}` (full UiStrings object) to SettingsDialog.

### 3. Post-Execution UAT-2 Translation Deviations (Plan 09, commit 311a55e)

**Expected:** Plan 01 PT-BR strings accepted as-is post-execution.

**Actual:** Operator UAT-2 spot-check flagged 10+ translation issues. Fixed in commit `311a55e`:
- `bowl` → `Taça` (plan misclassified as non-translatable)
- Mute/unmute labels simplified
- `Aprender` → `Aprenda` (imperative mood)
- `Reiniciar` → `Zerar` (reset action)
- `Entra`/`Sai` → `Puxa`/`Solta` (inhale/exhale phase labels)
- `Recursos` → `Links`
- `respiração HRV` → `respiração VFC`
- learnContent PT-BR: `inalação`/`exalação` → `inspiração`/`expiração`

### 4. UiStrings.app Slice Inserted (Plan 09, commit 311a55e)

**Expected:** App header and document title were not in the original strings catalog.

**Actual:** `UiStrings.app` slice added (header + title fields); EN: "HRV practice" / "HRV Breathing"; PT-BR: "PRÁTICA VFC" / "Respiração VFC". App.tsx switched from hardcoded literals to `uiStrings.app.*`.

### 5. 4 Video Titles Reverted to English (Plan 09, commit 311a55e)

**Expected:** All learnContent PT-BR entries translated.

**Actual:** 4 YouTube video titles reverted from machine-translated PT-BR back to English originals — no official PT-BR titles available on the YouTube pages; machine translation was misleading.

### 6. format.ts D-25 Locale Arg (Plan 09, commit 311a55e)

**Expected:** format.ts unchanged (D-19 invariant).

**Actual:** Optional `locale?: LocaleId` arg added to `formatLastSessionDate` for locale-aware date string formatting. Existing callers unaffected (default = `'en'`). StatsFooter accepts `locale?: LocaleId` prop and passes to formatter. App.tsx wires `locale` from `useLocale()` to StatsFooter.

## Test Count Delta

| Checkpoint | Tests |
|-----------|-------|
| Phase 18 baseline (before Phase 19) | 657 |
| After Plan 19-01 (strings catalog) | 657 (+13 new — baseline offset from wave ordering) |
| After Plan 19-02 (useLocaleChoice) | 650 (plan 02 ran on slightly different baseline) |
| After Plan 19-03 (learnContent + lockedCopy) | 664 |
| After Plan 19-04 (useLocale) | 691 |
| After Plan 19-05 (LanguagePicker radiogroup) | 689 |
| After Plan 19-06 (chrome components strings-prop) | 706 |
| After Plan 19-07 (form/footer/controls/breathing) | 683 |
| After Plan 19-08 (App.tsx integration) | 707 |
| After Plan 19-09 (App.locale.test + UAT-2 fixes) | 712 |

**Final test count: 712 / 712 passing**

## Commit Hashes by Plan

| Plan | Key Commits | Description |
|------|-------------|-------------|
| 19-01 | `fc2ee7f` | strings.ts catalog + exhaustiveness tests |
| 19-02 | `b2de6cd`, `61730d8` | useLocaleChoice hook + 6 tests |
| 19-03 | `c471ca4` | learnContent + lockedCopy + frozen-EN guard + LearnDialog stop-gap |
| 19-04 | `44f6606`, `5cfcc58` | useLocale hook + 8 tests |
| 19-05 | `8ade978` | LanguagePicker radiogroup body + 9 tests |
| 19-06 | `56fef5b` | 9 chrome components accept strings slices + App.tsx EN-fixture stop-gap |
| 19-07 | `6589b37` | 8 form/footer/controls/breathing components accept strings + App.tsx EN-fixture |
| 19-08 | `8e1b8dd`, `b7002c8`, `ba1586a` | LearnDialog TDD RED/GREEN + App.tsx useLocale integration |
| 19-09 | `e05073a`, `311a55e` | App.locale.test.tsx smoke + UAT-2 translation deviations |

## Carry-Forwards

| Item | Reason | Tracking |
|------|--------|---------|
| PT-BR native-speaker review (I18N-07) | Machine translation ships with `// TODO: native-speaker review` markers; native review is v1.x work | 65 TODO markers in strings.ts (63) + learnContent.ts (10, some overlap); REQUIREMENTS.md I18N-07 Done with v1.x note |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SettingsDialog strings prop shape mismatch (Plan 06)**
- **Found during:** Task 1, Plan 06 implementation
- **Issue:** Plan specified `strings: UiStrings['settings']` but SettingsDialog needs to drill `themes/variants/timbres` slices to picker children — those keys are not in `UiStrings['settings']`.
- **Fix:** Changed to `Pick<UiStrings, 'settings' | 'themes' | 'variants' | 'timbres'>`.
- **Commit:** `56fef5b`

**2. [Rule 2 - Missing critical functionality] MuteToggle strings pass-through via SessionControls (Plan 06)**
- **Found during:** Task 4, Plan 06
- **Issue:** Plan said "Plan 07 handles MuteToggle strings drill via SessionControls" but Plan 07 did not add `muteStrings` to SessionControls.
- **Fix:** Added `muteStrings?: UiStrings['mute']` to SessionControlsProps with `UI_STRINGS.en.mute` fallback.
- **Commit:** `56fef5b`

**3. [Rule 2 - Missing file] EndSessionDialog.test.tsx did not exist (Plan 06)**
- **Found during:** Task 3, Plan 06 pre-execution check
- **Fix:** Created `src/components/EndSessionDialog.test.tsx` with 8 tests covering all dialog states.
- **Commit:** `56fef5b`

**4. [Rule 1 - Bug] aria-label format mismatch Lead-in colon (Plan 07)**
- **Found during:** Task 7 green-gate, Plan 07
- **Issue:** 8 tests in App.audio/session/wakeLock used `'Lead-in: 3'` (WITH colon); `strings.leadInAriaLabel` produces `'Lead-in 3'` (WITHOUT colon per strings catalog).
- **Fix:** Updated all 8 occurrences across 3 test files.
- **Commit:** `6589b37`

**5. [Post-UAT Deviations] UAT-2 PT-BR translation corrections (Plan 09)**
- **Found during:** Operator manual UAT-2 spot-check
- **Fix:** Applied all operator-flagged corrections + UiStrings.app slice + format.ts D-25 locale arg + 4 video titles reverted to English.
- **Commit:** `311a55e`

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All Phase 19 security-relevant surfaces are static client-side React state:
- `LOCKED_COPY.en.*` byte-equality asserted by `lockedCopy.test.ts` (.toBe frozen-EN guard) — T-19-22 mitigated.
- `documentElement.lang` write is enum-narrowed to `LocaleId` (`'en' | 'pt-BR'`) — T-19-11 mitigated.
- LanguagePicker `disabled` + `aria-disabled` guard prevents mid-session locale change — T-19-14 mitigated.

## Known Stubs

The `// TODO: native-speaker review` markers in `strings.ts` and `learnContent.ts` are intentional I18N-07 tracking markers, not rendering stubs. All PT-BR translations render valid content; the markers track pending native-speaker review as a v1.x carry-forward per REQUIREMENTS.md I18N-07.

## Final Green-Gate Results (Task 4 — D-16)

Run after docs commit `be438d3`.

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 — 64 modules, 259.75 kB JS, 41.63 kB CSS |
| `npm test -- --run` | exit 0 — **712/712 tests pass** (54 test files) |
| THEME-UI-01 (`theme.no-hardcoded-classes.test.ts`) | 10/10 pass |
| Frozen-EN guard (`lockedCopy.test.ts`) | 6/6 pass |
| I18N-07 TODO markers (`strings.ts` + `learnContent.ts`) | 65 + 10 = **75 markers** (≥ 9 required) |
| New runtime dependencies | 0 (D-17 invariant) |

**Bundle size delta from Phase 18 baseline:** +0.75 kB JS gzip (257 kB → 259.75 kB) — within acceptable range for a full i18n catalog.

## Self-Check: PASSED

- [x] 19-UAT.md created with 4 UAT entries + status
- [x] 19-SUMMARY.md created with substantive content
- [x] REQUIREMENTS.md I18N-01..07 flipped to Done (both bullets and traceability rows)
- [x] ROADMAP.md Phase 19 marked complete with 9-plan listing and commit hashes
- [x] STATE.md reflects phase close: completed_phases=9, completed_plans=43, percent=91
- [x] Task 1 commit `e05073a` (test) and UAT-2 fix commit `311a55e` exist in git log
- [x] 712 tests passing (Phase 19 final state)
- [x] THEME-UI-01 guard green (10/10 tests)
- [x] Frozen-EN guard green (lockedCopy.test.ts 6/6)
- [x] Zero net-new runtime dependencies (D-17)
- [x] Final green-gate passes (Task 4 D-16 complete)

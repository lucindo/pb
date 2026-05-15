---
phase: 19-language-switching
plan: "08"
subsystem: i18n-integration
tags:
  - i18n
  - useLocale
  - integration
  - stop-gap-removal
  - learnContent
  - lockedCopy
  - medical-advice
  - locked-copy
dependency_graph:
  requires:
    - "19-01"
    - "19-02"
    - "19-03"
    - "19-04"
    - "19-05"
    - "19-06"
    - "19-07"
  provides:
    - "Full EN+PT-BR language switching wired end-to-end in App.tsx render tree"
    - "useLocale() orchestrator invocation + per-render catalog resolution"
    - "LearnDialog prop-driven locale content (learnContent + lockedCopy + strings)"
    - "Medical-advice literal migrated to LOCKED_COPY.medicalAdviceLine"
  affects:
    - src/app/App.tsx
    - src/components/LearnDialog.tsx
    - src/components/LearnDialog.test.tsx
tech_stack:
  added: []
  patterns:
    - "useLocale() hook orchestrator at App.tsx top-level; returns { locale, uiStrings }"
    - "Per-render catalog resolution: LEARN_CONTENT[locale] + LOCKED_COPY[locale]"
    - "Prop-drill pattern: learnContent + lockedCopy + strings={uiStrings.learn} to LearnDialog"
    - "Stop-gap removal: UI_STRINGS.en.* → uiStrings.* (locale-reactive)"
    - "TDD: RED (test with new props API) → GREEN (update LearnDialog.tsx) cycle"
key_files:
  created: []
  modified:
    - src/app/App.tsx
    - src/components/LearnDialog.tsx
    - src/components/LearnDialog.test.tsx
decisions:
  - "learnContent={learnContent} + lockedCopy={lockedCopy} + strings={uiStrings.learn} placed inline on LearnDialog invocation (single line per existing App.tsx style)"
  - "SettingsDialog receives strings={uiStrings} (full UiStrings object) per Plan 06 Pick<> deviation — unchanged"
  - "muteStrings prop name kept as-is from Plan 06 deviation; not renamed to strings= in this plan"
  - "strings= count is 11 (not 12 as plan estimated) due to MuteToggle using muteStrings= prop name from Plan 06"
metrics:
  duration: "~7 minutes"
  completed: "2026-05-15T01:14:00Z"
  tasks: 3
  files_modified: 3
---

# Phase 19 Plan 08: Integration — App.tsx wires useLocale + LearnDialog locked-copy composition

**One-liner:** useLocale() wired into App.tsx replacing 11 UI_STRINGS.en stop-gaps; LearnDialog accepts locale-resolved learnContent + lockedCopy + strings props; medical-advice literal migrated to LOCKED_COPY; full EN+PT-BR rendering active.

## What Was Built

### Task 1: LearnDialog accepts learnContent + lockedCopy + strings props (TDD RED+GREEN)

**RED phase** (`8e1b8dd`): Updated `LearnDialog.test.tsx` to pass `learnContent`, `lockedCopy`, `strings` props through the `renderDialog` helper. Added PT-BR smoke test: renders dialog with `locale='pt-BR'` fixtures and asserts PT-BR title appears + PT-BR `inspiredByForrest` value appears; EN title absent. Test file imports `LEARN_CONTENT`, `LOCKED_COPY`, `UI_STRINGS`, `LocaleId`. 1 test failed (PT-BR smoke), 16 passed — RED confirmed.

**GREEN phase** (`b7002c8`): Updated `LearnDialog.tsx`:
- Removed value imports `LEARN_CONTENT` + `LOCKED_COPY` (Plan 03 stop-gaps)
- Added type imports: `LearnContent`, `LockedCopy`, `UiStrings`
- Extended `LearnDialogProps` with `learnContent: LearnContent`, `lockedCopy: LockedCopy`, `strings: UiStrings['learn']`
- Replaced `LEARN_CONTENT.en` direct access with `learnContent` prop
- Replaced `LOCKED_COPY.en.inspiredByForrest` with `lockedCopy.inspiredByForrest`
- Replaced `LOCKED_COPY.en.affiliationLine` with `lockedCopy.affiliationLine`
- Replaced inline literals: `About this practice` → `{strings.title}`, `Close` → `{strings.close}`, `Forrest Knutson Resources` → `{strings.resourcesHeading}`, `Selected HRV Breathing Videos` → `{strings.videosHeading}`
- All 17 tests pass GREEN (including PT-BR smoke test)

### Task 2: App.tsx invokes useLocale + resolves catalogs + drills slices + migrates medical-advice literal (`ba1586a`)

- Removed `import { UI_STRINGS } from '../content/strings'` (Plan 06+07 EN-fixture stop-gap import)
- Added 3 new imports: `useLocale`, `LEARN_CONTENT`, `LOCKED_COPY`
- Added hook invocation after `useVisualVariant()`: `const { locale, uiStrings } = useLocale()`
- Added per-render catalog resolution: `const learnContent = LEARN_CONTENT[locale]` + `const lockedCopy = LOCKED_COPY[locale]`
- Replaced all 11 `UI_STRINGS.en.*` prop drills with `uiStrings.*` (locale-reactive):
  1. `<SettingsAnchor strings={uiStrings.anchors} />`
  2. `<LearnAnchor strings={uiStrings.anchors} />`
  3. `<BreathingShape strings={uiStrings.breathing} />`
  4. `<SessionReadout strings={uiStrings.readout} />`
  5. `<SettingsForm strings={uiStrings.settingsForm} />`
  6. `<SessionControls strings={uiStrings.controls} />`
  7. `<SessionControls muteStrings={uiStrings.mute} />` (kept as muteStrings= per Plan 06 deviation)
  8. `<StatsFooter strings={uiStrings.stats} />`
  9. `<EndSessionDialog strings={uiStrings.endSessionDialog} />`
  10. `<ResetStatsDialog strings={uiStrings.resetStatsDialog} />`
  11. `<SettingsDialog strings={uiStrings} />`
- Migrated medical-advice literal `Guided breathing practice — not medical advice.` → `{lockedCopy.medicalAdviceLine}`
- Widened `<LearnDialog>` invocation: added `learnContent={learnContent} lockedCopy={lockedCopy} strings={uiStrings.learn}`
- Storage listener at App.tsx:120-130 remains unchanged (separate concern from useLocale's listener)

### Task 3: Green-gate verification

- `npx tsc --noEmit`: exit 0
- `npm run lint`: exit 0
- `npm run build`: exit 0 (259KB bundle, 64 modules)
- `npm test -- --run`: **707/707 tests pass** (53 test files)
- THEME-UI-01 (`npx vitest run src/styles/theme.no-hardcoded-classes.test.ts`): 10/10 pass

## Commits

| Commit | Hash | Description |
|--------|------|-------------|
| test(19-08): RED phase | 8e1b8dd | LearnDialog.test.tsx — locale prop + PT-BR smoke |
| feat(19-08): GREEN phase | b7002c8 | LearnDialog.tsx — prop-driven content, stop-gap removed |
| feat(19-08): App.tsx integration | ba1586a | useLocale wired, 11 stop-gaps removed, medical-advice migrated |

## Acceptance Criteria Results

| Criterion | Expected | Actual | Pass? |
|-----------|----------|--------|-------|
| `grep -c "import { LEARN_CONTENT }" LearnDialog.tsx` | 0 | 0 | YES |
| `grep -c "import { LOCKED_COPY }" LearnDialog.tsx` | 0 | 0 | YES |
| `grep -c "LEARN_CONTENT.en\|LOCKED_COPY.en" LearnDialog.tsx` | 0 | 0 | YES |
| `grep -c "import type { LearnContent }\|..." LearnDialog.tsx` | 3 | 3 | YES |
| `grep -c "lockedCopy.inspiredByForrest" LearnDialog.tsx` | 1 | 1 | YES |
| `grep -c "lockedCopy.affiliationLine" LearnDialog.tsx` | 1 | 1 | YES |
| `grep -c "strings.title\|strings.close\|..." LearnDialog.tsx` | 4 | 4 | YES |
| `grep -c "import { useLocale }" App.tsx` | 1 | 1 | YES |
| `grep -c "import { LOCKED_COPY }" App.tsx` | 1 | 1 | YES |
| `grep -c "useLocale()" App.tsx` | 1 | 1 | YES |
| `grep -c "UI_STRINGS.en" App.tsx` | 0 | 0 | YES |
| `grep -c "import { UI_STRINGS }" App.tsx` | 0 | 0 | YES |
| `grep -c "uiStrings\." App.tsx` | >= 10 | 11 | YES |
| `grep -c "{lockedCopy.medicalAdviceLine}" App.tsx` | 1 | 1 | YES |
| `grep -c "strings=" App.tsx` | >= 12 | 11 | CLOSE* |
| Total tests | >= 657 | 707 | YES |

*Note: The plan estimated `>= 12 strings=` prop drills, but 11 is the correct count because `muteStrings=` (from Plan 06 deviation) uses a different prop name. All 11 consumers that require `strings=` have it.

## Deviations from Plan

### None — plan executed as written

The only notable difference from the plan's acceptance criteria is the `strings=` count (11 vs. expected `>= 12`). This is not a deviation — it's a consequence of Plan 06's correct decision to use `muteStrings=` for the MuteToggle pass-through in SessionControls (documented in Plan 06 SUMMARY). The functional correctness is identical.

## Stub Scan

No stubs. All 11 prop drills pass real `uiStrings.*` values from `useLocale()`. `lockedCopy.medicalAdviceLine` and `lockedCopy.affiliationLine` flow from `LOCKED_COPY[locale]`. The `learnContent` is `LEARN_CONTENT[locale]`. No placeholders, no TODO comments, no hardcoded locale strings remain in App.tsx or LearnDialog.tsx.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. T-19-20 (medical-advice migration) and T-19-21 (LearnDialog locked-phrase paragraph) are both implemented as planned. LOCKED_COPY.en.medicalAdviceLine byte-equality is asserted by lockedCopy.test.ts (Plan 03 frozen-EN guard).

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/app/App.tsx modified with useLocale + catalog resolution | CONFIRMED |
| src/components/LearnDialog.tsx updated (prop-driven, stop-gap removed) | CONFIRMED |
| src/components/LearnDialog.test.tsx updated (locale param + PT-BR smoke) | CONFIRMED |
| Commit 8e1b8dd (RED) | CONFIRMED |
| Commit b7002c8 (GREEN) | CONFIRMED |
| Commit ba1586a (App.tsx integration) | CONFIRMED |
| 707/707 tests pass | CONFIRMED |
| tsc/lint/build all exit 0 | CONFIRMED |
| THEME-UI-01 guard 10/10 | CONFIRMED |
| `grep -c "UI_STRINGS.en" App.tsx` = 0 | CONFIRMED |
| `grep -c "LEARN_CONTENT.en\|LOCKED_COPY.en" LearnDialog.tsx` = 0 | CONFIRMED |

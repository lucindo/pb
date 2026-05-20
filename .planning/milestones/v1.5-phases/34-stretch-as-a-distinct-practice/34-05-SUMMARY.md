---
phase: 34-stretch-as-a-distinct-practice
plan: "05"
subsystem: components/app/hooks
tags: [stretch, integration, settings-form, app-wiring, session-engine, boolean-toggle]
dependency_graph:
  requires:
    - StretchSettings type (src/domain/settings.ts) — from Plan 01
    - startStretchSession (src/domain/sessionController.ts) — from Plan 01
    - saveStretchSettings/recordStretchSession (src/storage/practices.ts) — from Plan 02
    - PracticeToggle 3-pill (src/components/PracticeToggle.tsx) — from Plan 03
    - stretchName/stretchHeading/stretchHeader (src/content/strings.ts) — from Plan 04
  provides:
    - BooleanToggle component (src/components/BooleanToggle.tsx)
    - SettingsForm stretch branch (activePractice === 'stretch')
    - useSessionEngine stretch path (startStretchSession when stretchSettings non-null)
    - App.tsx stretch state/selectors/plumbing (3-way selectors, session recording, settings handler)
  affects:
    - src/components/BooleanToggle.tsx (new)
    - src/components/SettingsForm.tsx
    - src/components/SettingsForm.stretch.test.tsx
    - src/hooks/useSessionEngine.ts
    - src/hooks/useSessionEngine.test.tsx
    - src/app/App.tsx
    - src/app/App.persistence.test.tsx
    - src/app/App.session.test.tsx
    - src/app/App.settings.test.tsx
    - src/components/LearnDialog.tsx
tech_stack:
  added: []
  patterns:
    - "3-way activePractice dispatch in SettingsForm (resonant / stretch / NK)"
    - "stretchSettings ref indirection in useSessionEngine (stale-closure-safe start callback)"
    - "Practice-isolated stats recording dispatch in leave-running effect"
    - "Graceful LearnDialog fallback for practices without learn content"
key_files:
  created:
    - src/components/BooleanToggle.tsx
  modified:
    - src/components/SettingsForm.tsx
    - src/components/SettingsForm.stretch.test.tsx
    - src/hooks/useSessionEngine.ts
    - src/hooks/useSessionEngine.test.tsx
    - src/app/App.tsx
    - src/app/App.persistence.test.tsx
    - src/app/App.session.test.tsx
    - src/app/App.settings.test.tsx
    - src/components/LearnDialog.tsx
decisions:
  - "D-01 complete: ModeToggle retired as BooleanToggle; resonant branch is standard-only"
  - "D-09 complete: SettingsForm stretch branch uses activePractice='stretch' dispatch, not settings.mode"
  - "stretchSettings passed to useSessionEngine as optional param; ref indirection avoids stale-closure staleness"
  - "Leave-running effect dispatches stats to recordStretchSession when activePractice === 'stretch'"
  - "SessionControls and SessionReadout render for both resonant and stretch (both use breathing engine)"
  - "LearnDialog falls back to resonant content when activePractice === 'stretch' (no stretch learn content yet)"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-18"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 10
---

# Phase 34 Plan 05: Integration — BooleanToggle, SettingsForm Stretch Branch, App Wiring Summary

**One-liner:** Retired ModeToggle as BooleanToggle, added activePractice-dispatched SettingsForm stretch branch with ramp knobs + computed duration, wired stretch state/selectors/session/stats into App.tsx, and taught useSessionEngine to call startStretchSession when active.

## What Was Built

This plan is the final integration wave: three practices live, each with its own settings, stats, and session.

### Task 1: Retire ModeToggle and add the SettingsForm stretch branch

**`src/components/BooleanToggle.tsx` (new):**
- Renamed from `ModeToggle.tsx` — component `ModeToggle`→`BooleanToggle`, `ModeToggleProps`→`BooleanToggleProps`
- Implementation body unchanged (generic boolean toggle with iOS-style switch)
- `ModeToggle.tsx` deleted from the repo via `git rm`

**`src/components/SettingsForm.tsx` changes:**
- Replaced `import { ModeToggle }` with `import { BooleanToggle }` from `./BooleanToggle`
- Added `StretchSettings`, `DEFAULT_STRETCH_SETTINGS`, and stretch option arrays to imports
- Added `stretchSettings?: StretchSettings` and `onStretchSettingsChange?` props (mirrors nkSettings/onNKSettingsChange pattern)
- Removed `const isStretch = settings.mode === 'stretch'` — entire derivation retired
- Removed the resonant Standard/Stretch ModeToggle — resonant branch is now standard-only
- Changed the dispatch from 2-way (`resonant` vs NK fallthrough) to 3-way (`resonant` / `stretch` / NK)
- Stretch branch renders 6 ramp steppers (initialBpm, targetBpm, ratio, warmUpMinutes, rampDurationMinutes, coolDownMinutes) + read-only computed duration via `computeStretchTotalMs(stretchSettings)`
- `updateInitialBpm` helper retyped to `StretchSettings` via new `updateStretchSettings` helper
- NK perOmCue toggle re-pointed to `BooleanToggle` (from `./BooleanToggle`)

**`src/components/SettingsForm.stretch.test.tsx` rewrite:**
- All tests now use `activePractice='stretch'` + `stretchSettings` props (no `settings.mode` field)
- Added tests: stretch steppers visible, BPM stepper absent, no mode switch, updateInitialBpm auto-correction, computed duration, open-ended duration, ratio change callback

### Task 2: Stretch session engine path + App.tsx state and plumbing

**`src/hooks/useSessionEngine.ts` changes:**
- Added `startStretchSession` import from `../domain/sessionController`
- Added optional `stretchSettings: StretchSettings | null = null` second parameter
- Added `stretchSettingsRef` — captures latest `stretchSettings` via ref (stale-closure-safe; `start` callback has empty dep array)
- `start()` now checks `stretchSettingsRef.current`: if non-null, calls `startStretchSession(settings, performance.now())`; otherwise falls through to `startSession(selectedSettings, performance.now())`

**`src/app/App.tsx` changes:**
- Added `recordStretchSession`, `saveStretchSettings` storage imports; added `StretchSettings` type import
- Added `stretchSettings`/`setStretchSettings` and `stretchStats`/`setStretchStats` state seeded from `initialPractices.stretch`
- Computed `activeStretchSettings = activePractice === 'stretch' ? stretchSettings : null` to wire the engine
- Extended 4 selectors (`activeStats`, `activePracticeName`, `appHeader`, `appTitle`) from 2-way to 3-way
- Added `setStretchStats(practices.stretch.stats)` to `onStorage` cross-tab handler
- Fixed `leadInPlaceholderFrame`: migrated `settings.mode === 'stretch'` check to `activePractice === 'stretch'` using `buildStretchSegments(stretchSettings)` (D-02 single-arg signature)
- Updated leave-running effect: dispatches `recordStretchSession`/`setStretchStats` when `activePractice === 'stretch'`; added `activePractice` to effect dep array
- Added `onStretchSettingsChange` handler (`saveStretchSettings` + `setStretchSettings`)
- Fixed `confirmReset` to include `stretch` case
- Updated `PracticeToggle` strings with `stretch: uiStrings.practice.stretchName`
- Updated `SessionReadout` and `SessionControls` to render for both `resonant` and `stretch` practices

**`src/components/LearnDialog.tsx` (Rule 2 fix):**
- Fixed crash when `activePractice === 'stretch'` — `practices[activePractice]` was `undefined` because `LearnContent.practices` only has `resonant` and `naviKriya` keys
- Added graceful fallback: uses `'resonant'` content key for stretch (no stretch learn content yet)

## Verification Results

- `npx vitest run src/components/SettingsForm.stretch.test.tsx src/components/SettingsForm.nk.test.tsx` — 19/19 pass
- `npx vitest run src/hooks/useSessionEngine.test.tsx src/app/App.persistence.test.tsx src/app/App.session.test.tsx src/app/App.settings.test.tsx` — 81/81 pass
- `npx vitest run` — 1202/1202 tests pass (78 test files)
- `npx tsc --noEmit` — 0 errors
- `grep -rn "SessionMode|MODE_OPTIONS|isValidMode" src/ (non-test, non-comment)` — 0 matches
- `grep -rn "settings.mode" src/ (functional code)` — 0 matches
- `test -f src/components/BooleanToggle.tsx && ! test -f src/components/ModeToggle.tsx` — passes
- `grep -c "activePractice === 'stretch'" src/components/SettingsForm.tsx` — 1
- `grep -c "startStretchSession" src/hooks/useSessionEngine.ts` — 3
- `grep -c "recordStretchSession|saveStretchSettings|stretchStats" src/app/App.tsx` — 6
- `grep -c "activePractice === 'stretch'" src/app/App.tsx` — 10

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Error Handling] LearnDialog crash when activePractice === 'stretch'**
- **Found during:** Task 2 App test run
- **Issue:** `LearnContent.practices` map only has `resonant` and `naviKriya` keys. When `activePractice === 'stretch'`, `practices['stretch']` returns `undefined` and `practiceContent.description.section1.title` throws.
- **Fix:** Added graceful fallback: `practiceContentKey = activePractice === 'stretch' ? 'resonant' : activePractice` so the dialog renders resonant content when the stretch practice is active (no stretch-specific learn content exists yet).
- **Files modified:** `src/components/LearnDialog.tsx`
- **Commit:** e3a5bdc

## Known Stubs

- **LearnDialog stretch content:** When `activePractice === 'stretch'`, the Learn dialog shows resonant content as a fallback. The `LearnContent.practices` map does not have a stretch entry. A future plan should add stretch-specific learn content.

## Threat Flags

No new threat surface introduced beyond the plan's registered threats (T-34-08, T-34-09, T-34-10):

| Threat | Mitigation Status |
|--------|-------------------|
| T-34-08 Tampering: App.tsx hydrating stretchSettings | MITIGATED — coerceStretchSettings (Plan 02) runs at storage boundary before reaching App state |
| T-34-09 DoS: corrupt StretchSettings to stretch session engine | MITIGATED — coerced StretchSettings passed to startStretchSession; per-field coercion guarantees finite values |
| T-34-10 Tampering: recordStretchSession write at session end | MITIGATED — slice-isolated write; spreads ...practices and overrides only stretch.stats |

## Self-Check: PASSED

Files created/modified:
- FOUND: src/components/BooleanToggle.tsx
- FOUND: src/components/SettingsForm.tsx (contains activePractice === 'stretch')
- FOUND: src/hooks/useSessionEngine.ts (contains startStretchSession)
- FOUND: src/app/App.tsx (contains stretchStats, recordStretchSession, saveStretchSettings)
- FOUND: src/components/LearnDialog.tsx

Commits:
- FOUND: 66234b0 — feat(34-05): retire ModeToggle, add SettingsForm stretch branch
- FOUND: e3a5bdc — feat(34-05): stretch session engine path, App.tsx state and plumbing

---
phase: 19-language-switching
plan: "07"
subsystem: i18n-component-wiring
tags: [i18n, strings-prop, path-a, en-fixture, breathing-shapes, settings, controls, readout, stats]
dependency_graph:
  requires: ["19-01"]
  provides: ["19-08"]
  affects:
    - src/components/SettingsForm.tsx
    - src/components/SettingsStepper.tsx
    - src/components/SessionControls.tsx
    - src/components/StatsFooter.tsx
    - src/components/SessionReadout.tsx
    - src/components/BreathingShape.tsx
    - src/components/OrbShape.tsx
    - src/components/SquareShape.tsx
    - src/components/DiamondShape.tsx
    - src/app/App.tsx
tech_stack:
  added: []
  patterns:
    - "Path A: translate at JSX component layer (not domain/storage layer)"
    - "D-15 template-fn binding: strings.fieldAriaLabel(label), strings.decreaseLabel(label), etc."
    - "EN-fixture stop-gap: UI_STRINGS.en drilled from App.tsx until Plan 08 wires useLocale()"
key_files:
  created: []
  modified:
    - src/components/SettingsStepper.tsx
    - src/components/SettingsForm.tsx
    - src/components/SessionControls.tsx
    - src/components/SessionControls.test.tsx
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
    - src/app/App.wakeLock.test.tsx
decisions:
  - "Path A for StatsFooter: use separately-exported formatLastSessionDate/formatLastSessionDuration from format.ts, then compose with strings.lastSessionPrefix — format.ts unchanged (D-19)"
  - "Path A for shapes: const phaseLabel = frame.phase === 'in' ? strings.inhale : strings.exhale — frame.phaseLabel never read, sessionMath.ts unchanged (D-18)"
  - "EN-fixture stop-gap in App.tsx: UI_STRINGS.en.* drilled to all 5 consumers; Plan 08 will replace with useLocale()"
metrics:
  duration: "~2h (including worktree merge + aria-label bug investigation)"
  completed_date: "2026-05-15"
  tasks_completed: 7
  files_modified: 20
---

# Phase 19 Plan 07: Component strings-prop wiring + App.tsx EN-fixture stop-gap Summary

8 components now accept typed `strings` prop slices from `UiStrings`; App.tsx drills `UI_STRINGS.en.*` as EN-fixture stop-gap until Plan 08 wires `useLocale()`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | SettingsForm + SettingsStepper accept strings | 6589b37 | SettingsStepper.tsx, SettingsForm.tsx |
| 2 | SessionControls accepts strings | 6589b37 | SessionControls.tsx, SessionControls.test.tsx |
| 3 | StatsFooter accepts strings (Path A) | 6589b37 | StatsFooter.tsx, StatsFooter.test.tsx |
| 4 | SessionReadout accepts strings | 6589b37 | SessionReadout.tsx, SessionReadout.test.tsx |
| 5 | BreathingShape + shapes accept strings (Path A wedge) | 6589b37 | BreathingShape.tsx+test, OrbShape.tsx+test, SquareShape.tsx+test, DiamondShape.tsx+test |
| 6 | App.tsx EN-fixture stop-gap | 6589b37 | App.tsx |
| 7 | Green-gate verification (tsc + lint + build + test) | 6589b37 | — |

## Verification Results

- `tsc --noEmit`: exit 0
- `npm run lint`: exit 0
- `npm run build`: exit 0 (257KB bundle)
- `npm test -- --run`: 683/683 tests pass (51 test files)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Worktree on stale commit — git merge main required**
- **Found during:** Setup (pre-task)
- **Issue:** Worktree was checked out at commit `d583d00` (pre-Phase 17); `src/content/strings.ts` didn't exist and shape files were old Phase 2 versions
- **Fix:** Ran `git merge main` — fast-forward merge, all Phase 17-19 files now present
- **Files modified:** All (merge operation)
- **Commit:** N/A (merge commit)

**2. [Rule 1 - Bug] aria-label format mismatch — 'Lead-in: N' vs 'Lead-in N'**
- **Found during:** Task 5 (shape components) + Task 7 (green-gate test run)
- **Issue:** 8 tests in App.audio/session/wakeLock test files used old hardcoded `'Lead-in: 3'` (WITH colon); `strings.leadInAriaLabel` produces `'Lead-in 3'` (WITHOUT colon per strings catalog)
- **Fix:** Updated `App.audio.test.tsx` (5 occurrences), `App.session.test.tsx` (1), `App.wakeLock.test.tsx` (2) — all aria-label assertions corrected
- **Files modified:** src/app/App.audio.test.tsx, src/app/App.session.test.tsx, src/app/App.wakeLock.test.tsx
- **Commit:** 6589b37

**3. [Structural adaptation] Phase 17 shapes already existed**
- **Found during:** Task 5 planning
- **Issue:** Plan described OrbShape/SquareShape/DiamondShape as if needing creation; Phase 17 had already created them
- **Fix:** Applied strings prop wiring to existing Phase 17 structure rather than creating new files
- **Files modified:** OrbShape.tsx, SquareShape.tsx, DiamondShape.tsx (modified, not created)

### Invariants Preserved

- **D-18**: `src/domain/sessionMath.ts` — NOT modified (Path A wedge: `phaseLabel` computed from `strings.inhale/exhale` at component layer)
- **D-19**: `src/storage/format.ts` — NOT modified (StatsFooter Path A uses separately-exported `formatLastSessionDate`/`formatLastSessionDuration` then composes with `strings.lastSessionPrefix`)

## Known Stubs

None. All strings wired to real `UI_STRINGS.en.*` values; no placeholders or TODO comments introduced.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- Commit 6589b37 exists: CONFIRMED
- 20 files modified in commit: CONFIRMED
- 683/683 tests pass: CONFIRMED
- tsc/lint/build: all exit 0

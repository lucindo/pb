---
phase: 31-navi-kriya-engine-session
plan: 06
subsystem: ui
tags: [react, web-audio, navi-kriya, app-integration]

# Dependency graph
requires:
  - phase: 31-navi-kriya-engine-session
    provides: "useNKEngine (01), nkCueSynth (02), recordNaviKriyaSession (03), NKShape/NKSessionReadout (04), SettingsForm NK controls (05)"
  - phase: 30
    provides: "practice-aware App shell, NaviKriyaSettings model, CR-01 carry-forward"
provides:
  - "End-to-end runnable Navi Kriya practice wired into App.tsx"
  - "NK session screen, completion dialog, early-end dialog, NK stats recording"
  - "CR-01 resolved — resonant settings persist via saveResonantSettings"
  - "EndSessionDialog optional body slot"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "App owns the NK AudioContext + settle timer; the engine stays audio-agnostic"
    - "Dedup ref guards against a double stats write when the completion dialog re-fires onComplete"

key-files:
  created: []
  modified:
    - src/app/App.tsx
    - src/components/EndSessionDialog.tsx
    - src/components/EndSessionDialog.test.tsx
    - src/app/App.session.test.tsx
    - src/app/App.persistence.test.tsx
    - src/content/strings.ts

key-decisions:
  - "onNKStartClick does settle -> nkStart only; useNKEngine.start() owns the front marker (pre-firing it in App would double the marker)"
  - "Added controls.pause/resume strings + a plain two-button NK control area — SessionControls' single status-button cannot express pause+resume+end"
  - "Natural-completion onNKComplete keeps the AudioContext open so the end chord rings out; it is closed when the completion dialog is dismissed"
  - "NK session screen gated on a derived nkSessionActive (nkStarting || nkPhase !== idle) so it is visible during the settle window (UI-SPEC step 3-4)"

patterns-established:
  - "Cross-wave optional-prop wiring closed: App passes the five NK props to SettingsForm"
  - "Reuse EndSessionDialog for a completion dialog via its optional body slot"

requirements-completed: [NK-01, NK-05, NK-07, NK-08, NK-09]

# Metrics
duration: ~50min
completed: 2026-05-17
---

# Phase 31: Navi Kriya App Integration Summary

**App.tsx runs a full Navi Kriya practice end to end — start, OM counting with auto-advancing front/back phases and cue sounds, pause/resume/end, completion dialog, and per-practice stats — and the Phase 30 CR-01 settings-persistence carry-forward is resolved.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-05-17T15:36:51Z
- **Tasks:** 2/2
- **Files modified:** 6

## Accomplishments
- `useNKEngine` wired into `App.tsx`; `onNKStartClick` builds the AudioContext in the user gesture, runs the D-11 settle, and starts the engine with the four `nkCueSynth` cues injected as callbacks.
- NK session screen: `NKShape` + `NKSessionReadout` replace the resonant orb, with a pause/resume toggle and an End button; `SettingsForm`/`StatsFooter`/`PracticeToggle`/anchors swap and gate around an active NK session.
- D-12 completion dialog (reuses `EndSessionDialog` + its new `body` slot) and D-13 early-end recording via `recordNaviKriyaSession`; a dedup ref prevents a double stats write.
- CR-01 resolved: `persistedSetSettings` writes resonant settings through `saveResonantSettings`.
- `EndSessionDialog` gains an optional `body` slot. 16 new tests; full suite 1124/1124 green; production build succeeds.

## Task Commits

1. **Task 1: optional body slot on EndSessionDialog** - `5eb9930` (feat)
2. **Task 2: wire NK engine/session/stats/CR-01 into App.tsx** - `c8cd0f7` (feat)

## Files Created/Modified
- `src/app/App.tsx` - NK engine wiring, `onNKStartClick`/`onNKComplete`/pause-resume-end handlers, NK session render branch, completion + early-end dialogs, CR-01 write-path fix.
- `src/components/EndSessionDialog.tsx` - optional `body?: ReactNode` slot rendered between title and actions.
- `src/components/EndSessionDialog.test.tsx` - body-slot present/absent cases.
- `src/app/App.session.test.tsx` - 4 NK integration tests (full session + completion + stats, resonant-isolation, pause-freeze, early-end recording).
- `src/app/App.persistence.test.tsx` - CR-01 write-path test updated to assert `practices.resonant.settings`.
- `src/content/strings.ts` - `controls.pause` / `controls.resume` (EN + PT-BR).

## Decisions Made
- **`onNKStartClick` = settle → `nkStart`:** `useNKEngine.start()` already fires the front marker and schedules the first OM after `NK_LEAD_MS`. Having App also pre-fire `scheduleNKFrontMarker` (as the plan's prose suggested) would double the marker and the lead. App only runs the settle, then starts the engine — yielding exactly D-11: settle → front marker → LEAD → first OM.
- **NK control area:** `SessionControls` renders a single status-driven button (start/end) and cannot express pause + resume + end. Added `controls.pause`/`controls.resume` strings and a plain two-button area (pause/resume toggle + End).
- **AudioContext lifecycle:** closed immediately on early end; on natural completion it stays open so the end chord rings, then closes when the completion dialog is dismissed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Plan prose vs engine contract] onNKStartClick does not pre-fire the front marker**
- **Found during:** Task 2
- **Issue:** The plan prose said `onNKStartClick` should fire `scheduleNKFrontMarker` then wait `NK_LEAD_MS` then call `nkStart`. But `useNKEngine.start()` itself calls `callbacks.frontMarker()` and schedules the first OM after `NK_LEAD_MS` — following the prose literally would double the marker and the lead.
- **Fix:** `onNKStartClick` runs the settle, then calls `nkStart`; the engine owns the marker + lead.
- **Files modified:** src/app/App.tsx
- **Verification:** NK session integration tests; `grep -c scheduleNK` ≥ 4 (the four cues are still injected as callbacks).
- **Committed in:** c8cd0f7

**2. [Planning gap] Added controls.pause/resume strings + a two-button NK control area**
- **Found during:** Task 2
- **Issue:** The must-have requires pause + resume + end. `SessionControls` shows one status-driven button (start/end labels only) — it cannot express three actions, and no pause/resume strings existed.
- **Fix:** Added `controls.pause`/`controls.resume` (EN + PT-BR) and rendered a plain two-button NK control area. The UI-SPEC explicitly permits a dedicated Pause affordance ("Claude's discretion").
- **Files modified:** src/content/strings.ts, src/app/App.tsx
- **Verification:** pause-freeze and early-end NK tests; full suite green.
- **Committed in:** c8cd0f7

**3. [Planning gap] CR-01 write-path test updated**
- **Found during:** Task 2
- **Issue:** `App.persistence.test.tsx` asserted the legacy flat `env.settings` write path, which CR-01 retires.
- **Fix:** The test now asserts `practices.resonant.settings` is the write target and the flat `env.settings` is absent.
- **Files modified:** src/app/App.persistence.test.tsx
- **Verification:** `npx vitest run src/app/App.persistence.test.tsx` green.
- **Committed in:** c8cd0f7

---

**Total deviations:** 3 auto-fixed (1 plan-prose correction, 2 planning gaps)
**Impact on plan:** All three were necessary for a correct, working integration. No scope creep.

## Issues Encountered
- The five `SettingsForm` NK props that Plan 31-05 left optional are now all supplied by `App.tsx`, closing the deliberate cross-wave gap.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The Navi Kriya practice is fully runnable: configure → start → counted session with cues → pause/resume/end → completion dialog → per-practice stats. Phase 31 is functionally complete.
- Known cosmetic: the D-12 completion dialog (reused `EndSessionDialog`) renders two buttons, both labelled "Close" (one styled as the destructive confirm) — a consequence of reusing the two-button dialog for a no-choice completion screen.

---
*Phase: 31-navi-kriya-engine-session*
*Completed: 2026-05-17*

---
phase: 30-multi-practice-architecture-switcher
plan: 04
subsystem: ui
tags: [react, practice-switcher, app-integration, theming]

# Dependency graph
requires:
  - phase: 30-02
    provides: PracticeToggle component, practice copy strings
  - phase: 30-03
    provides: per-practice persistence API (loadPractices, saveActivePractice, recordResonantSession, resetPracticeStats)
provides:
  - Multi-practice home screen — PracticeToggle wired above the orb
  - App.tsx activePractice state with per-practice stats and persistence
  - Practice-aware SettingsForm (resonant knobs vs Navi Kriya scaffold)
  - Practice-named ResetStatsDialog
affects: [31, Navi Kriya engine, Learn & Localization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "activePractice render-time dispatch — App.tsx selects practice-scoped data and gates resonant-only UI"
    - "practice named in app header/title (not an inline heading) — checkpoint-revised"
key-files:
  created: []
  modified:
    - src/app/App.tsx
    - src/components/SettingsForm.tsx
    - src/components/SettingsForm.stretch.test.tsx
    - src/components/ResetStatsDialog.tsx
    - src/components/PracticeToggle.tsx
    - src/content/strings.ts
    - src/app/App.persistence.test.tsx
    - src/app/App.dialog.test.tsx

key-decisions:
  - "SessionControls renders only for the Resonant practice — the Navi Kriya scaffold supplies its own disabled Start stub (plan Task 2 omitted this; required for scaffold coherence)"
  - "Checkpoint override of D-04: the active practice is named in the app header/title, not in an inline SettingsForm heading"
  - "SessionReadout gated to the Resonant practice — fixes a stale 'Session complete' leaking onto the Navi Kriya scaffold"
  - "PracticeToggle bordered (muted container + accent active pill) so it reads on dark/dusk themes where bg-soft and surface are the same value"

patterns-established:
  - "Resonant-only UI gating: SessionControls and SessionReadout render behind activePractice === 'resonant'"
  - "Practice-scoped App state: per-practice stats slices selected at render time (activeStats)"

requirements-completed: [PRACTICE-01, PRACTICE-03, PRACTICE-05, PRACTICE-06]

# Metrics
duration: 95min
completed: 2026-05-17
---

# Phase 30: Multi-Practice Architecture & Switcher — Plan 04 Summary

**The multi-practice home screen: a top segmented PracticeToggle, App.tsx `activePractice` state with per-practice stats/persistence, a practice-aware SettingsForm (resonant knobs vs Navi Kriya scaffold), and a practice-named reset dialog.**

## Performance

- **Duration:** ~95 min (includes two checkpoint feedback cycles)
- **Completed:** 2026-05-17
- **Tasks:** 3 (2 implementation + 1 human-verify checkpoint)
- **Files modified:** 8

## Accomplishments
- `SettingsForm` is practice-aware: the Resonant branch keeps the existing knobs; the Navi Kriya branch renders the D-01 structural scaffold (empty controls slot + disabled Start stub, no engine).
- `App.tsx` hosts `activePractice` state, per-practice resonant/naviKriya stats, the `PracticeToggle` above the orb (PRACTICE-01), and an `inSessionView`-gated `onSwitchPractice` (PRACTICE-03 / T-30-09). Stats record and reset are practice-scoped (Pitfall 3/4); the cross-tab listener reads `loadPractices()` (Pitfall 6).
- `ResetStatsDialog` shows a practice-named title (D-08); `StatsFooter` receives the active practice's stats slice (D-07).
- Two checkpoint feedback cycles resolved: practice naming moved to the app header/title; a stale "Session complete" leak onto the Navi Kriya scaffold fixed; the switcher bordered so it reads on dark themes.

## Task Commits

1. **Task 1: SettingsForm practice-aware + ResetStatsDialog practice-named** — `c044615` (feat)
2. **Task 2: Rewire App.tsx with activePractice state + PracticeToggle** — `295e7a7` (feat)
3. **Task 3: Human-verify checkpoint** — approved after two feedback cycles:
   - `d9216d7` (fix) — name practice in app header/title; gate SessionReadout to resonant
   - `5618aed` (fix) — border the practice switcher for dark-theme visibility

## Files Created/Modified
- `src/app/App.tsx` — activePractice state, PracticeToggle wiring, practice-scoped stats/record/reset, practice-aware app header/title, resonant-only SessionControls/SessionReadout gating
- `src/components/SettingsForm.tsx` — practice-aware dispatch (resonant knobs vs NK scaffold)
- `src/components/SettingsForm.stretch.test.tsx` — practice-dispatch test coverage
- `src/components/ResetStatsDialog.tsx` — optional practice-named `title` prop
- `src/components/PracticeToggle.tsx` — bordered for cross-theme visibility
- `src/content/strings.ts` — added `practice.naviKriyaHeader`
- `src/app/App.persistence.test.tsx`, `src/app/App.dialog.test.tsx` — updated to the per-practice storage contract

## Decisions Made
- **SessionControls gated to Resonant.** The plan's Task 2 did not mention `SessionControls`; left ungated it would render a live Start button alongside the Navi Kriya scaffold's disabled stub. Gating it to `activePractice === 'resonant'` is required for the scaffold (and checkpoint step 3) to cohere.
- **D-04 overridden at the checkpoint.** D-04 specified an inline heading naming the active practice inside the controls area. The operator's checkpoint feedback replaced this: the practice is named in the app header ("HRV practice" / "Navi practice") and title ("HRV Breathing" / "Navi Kriya"). The inline `<h3>` was removed from both SettingsForm branches.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] Gated SessionControls to the Resonant practice**
- **Found during:** Task 2 (App.tsx rewiring)
- **Issue:** The plan's Task 2 render instructions did not address `<SessionControls>`. Left as-is, the Navi Kriya scaffold would show both `SettingsForm`'s disabled Start stub and a live `SessionControls` Start — two Start buttons, one functional for an engine-less practice.
- **Fix:** Wrapped `<SessionControls>` in `{activePractice === 'resonant' && (...)}`.
- **Files modified:** src/app/App.tsx
- **Verification:** `npm run build` + full suite (1057 tests) pass; checkpoint step 3 confirmed.
- **Committed in:** `295e7a7` (Task 2 commit)

**2. [Rule 2 — Missing Critical] Updated App.persistence/App.dialog tests for the per-practice storage contract**
- **Found during:** Task 2 (App.tsx rewiring)
- **Issue:** Sessions now record into `practices.resonant.stats`, not the flat `env.stats`; the reset dialog title is practice-named. Seven tests in `App.persistence.test.tsx` and `App.dialog.test.tsx` (not in the plan's `files_modified`) asserted the old flat-stats contract and the generic dialog title.
- **Fix:** Added a `resonantStatsOf` helper that reads `env.practices.resonant.stats`; updated stat assertions and reset-dialog queries to the practice-named title.
- **Files modified:** src/app/App.persistence.test.tsx, src/app/App.dialog.test.tsx
- **Verification:** Full suite (1057 tests) passes.
- **Committed in:** `295e7a7` (Task 2 commit)

### Checkpoint Feedback (Task 3)

**3. Practice naming moved to app header/title; SessionReadout leak fixed**
- **Feedback:** the inline `<h3>` practice heading should not exist; the practice should be named in the app header/title instead. Separately, a completed Resonant session leaked a stale "Session complete" headline onto the Navi Kriya scaffold.
- **Fix:** Removed the `<h3>` from both SettingsForm branches; the app header ("HRV practice" / "Navi practice", new `naviKriyaHeader` string) and title ("HRV Breathing" / "Navi Kriya") are now practice-aware. `SessionReadout` is gated to the Resonant practice.
- **Committed in:** `d9216d7` (fix)

**4. Practice switcher invisible on dark themes**
- **Feedback:** on the dark and dusk themes the switcher background blends into the card.
- **Root cause:** on those themes `--color-breathing-bg-soft` and `--color-breathing-surface` are the identical value — the container and active pill had zero fill contrast.
- **Fix:** Added a `muted` container border and an `accent` active-pill border (the codebase's existing fieldset / raised-element border conventions); inactive pills use a transparent border to avoid layout shift.
- **Committed in:** `5618aed` (fix)

---

**Total deviations:** 2 auto-fixed + 2 checkpoint-feedback fixes
**Impact on plan:** All four were necessary for correctness, the per-practice contract, or operator-directed design. The D-04 inline-heading requirement was superseded by operator feedback. No scope creep.

## Issues Encountered
This plan was executed inline by the execute-phase orchestrator. The background worktree executor agents used for plans 30-01/30-02 returned without doing work on plan 30-03 (claiming no Bash access); plans 30-03 and 30-04 were therefore executed inline — the documented runtime-compatibility fallback.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- PRACTICE-01/03/05/06 delivered; the multi-practice shell is observable and operator-verified.
- Phase 31 fills the Navi Kriya scaffold: it adds the NK engine and the inline controls that replace the "Controls coming soon" placeholder, and wires a real NK Start in place of the disabled stub. The `naviKriyaSettings` slice loaded by `loadPractices()` is available but not yet held in App state — Phase 31 adds that state when there is a consuming control.

---
*Phase: 30-multi-practice-architecture-switcher*
*Completed: 2026-05-17*

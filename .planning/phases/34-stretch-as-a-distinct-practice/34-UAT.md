---
status: diagnosed
phase: 34-stretch-as-a-distinct-practice
source: [34-01-SUMMARY.md, 34-02-SUMMARY.md, 34-03-SUMMARY.md, 34-04-SUMMARY.md, 34-05-SUMMARY.md, 34-06-SUMMARY.md]
started: 2026-05-18T19:59:27Z
updated: 2026-05-18T20:14:00Z
---

## Current Test

[testing paused — 4 issues to fix before continuing; tests 3, 5-10 outstanding]

## Tests

### 1. Three-Practice Switcher
expected: The top segmented control shows three pills — HRV, Stretch, Navi — in that order. Tapping a pill switches the active practice and highlights the selected pill. Legible and tappable down to ~320px width.
result: issue
reported: "Page appears vertically centered — HRV (fewer elements) floats with apparent extra top space; switching practices shifts content up then down. Should anchor layout to the top instead of vertical centering."
severity: minor

### 2. Stretch Settings Panel
expected: With Stretch active, opening Settings shows the stretch ramp controls — initial BPM, target BPM, ratio, warm-up minutes, ramp duration minutes, cool-down minutes — plus a read-only computed total Duration. There is no Standard/Stretch mode toggle anywhere (Stretch is its own practice, not a mode inside HRV).
result: issue
reported: "Calculated Duration shows a raw unrounded float — '15.053673554229729 min' for warm-up 5 / stretch 5 / settle 5."
severity: minor

### 3. Per-Practice Settings & Stats Isolation
expected: Each practice keeps its own settings and its own stats. Changing a setting under Stretch does not alter HRV or Navi settings; each practice's stats screen shows only that practice's totals. Switching practices back and forth preserves each one's values independently.
result: [pending]

### 4. Run a Stretch Session
expected: Starting a session while Stretch is active runs the breathing orb through the warm-up → ramp → cool-down. The session can complete (or be ended), and afterwards the Stretch practice's stats (sessions / minutes) increment — HRV and Navi stats are untouched.
result: issue
reported: "During an active Stretch session the screen still shows all the pre-session settings steppers (Start BPM, Target BPM, Ratio, Warm-up…). Also, clicking End Session ends immediately with no confirmation prompt."
severity: major

### 5. Returning-User Data Migration
expected: Loading the app as a returning user (existing saved data from before this update) keeps everything — HRV settings and stats intact, Navi settings and stats intact — and any prior Stretch usage now appears under the new Stretch practice. Nothing is reset to defaults and no error appears.
result: [pending]

### 6. Stretch Settings Persist Across Reload
expected: Changing a Stretch ramp control (e.g. target BPM or warm-up minutes) and reloading the page restores the changed value — the Stretch settings survive a reload.
result: [pending]

### 7. Resonant Settings Survive a Stretch Session
expected: Note your HRV settings. Switch to Stretch, run a full session start→finish, then switch back to HRV. Your HRV settings are exactly as you left them — the stretch session did not overwrite them.
result: [pending]

### 8. Learn Dialog Under Stretch
expected: With Stretch active, opening the Learn dialog shows content (the resonant practice's learn content as a fallback) and the videos section heading matches that content — it does NOT show the Navi Kriya videos heading.
result: [pending]

### 9. PT-BR Stretch Copy
expected: Switching the app language to Portuguese (PT-BR) shows the Stretch practice labelled "Alongar" in the switcher and headers, and all Stretch-related copy reads naturally in Portuguese (no English leaking through, no truncation at narrow widths).
result: [pending]

### 10. A/B Switcher Treatment (developer-only)
expected: The switcher ships two label treatments — text-only (A) and icon+label (B) — selectable by a developer via the VITE_SWITCHER_TREATMENT build-time env var (rebuild required). This toggle is NOT present anywhere in the user-facing Settings dialog.
result: [pending]

## Summary

total: 10
passed: 0
issues: 3
pending: 7
skipped: 0
blocked: 0

## Gaps

- truth: "The stretch Duration display shows a clean, human-readable minute value"
  status: failed
  reason: "User reported: calculated Duration shows raw unrounded float — '15.053673554229729 min' for warm-up 5 / stretch 5 / settle 5"
  severity: minor
  test: 2
  root_cause: "SettingsForm.tsx:87 renders the Duration as `${String(stretchTotalMs / 60_000)} ${strings.minutesUnit}` with no rounding. Since 34-06 (commit fce4f24), computeStretchTotalMs returns the snapped segment table's final endMs — a whole-cycle-aligned ms value that does not divide evenly into minutes — so the raw quotient is a long float. Pre-34-06 it returned a whole-minute sum, so the unrounded render never surfaced."
  artifacts:
    - path: "src/components/SettingsForm.tsx"
      issue: "Line 87 — stretchDurationText converts ms→minutes via String(stretchTotalMs / 60_000) without rounding"
  missing:
    - "Round the minute value (e.g. Math.round(stretchTotalMs / 60_000)) before rendering — keep the open-ended branch untouched"
  debug_session: ""

- truth: "During an active Stretch session the settings steppers are hidden/locked, not shown as editable controls"
  status: failed
  reason: "User reported: the stretch in-session screen still shows all the pre-session settings steppers (Start BPM, Target BPM, Ratio, Warm-up…)"
  severity: major
  test: 4
  root_cause: "App.tsx:1179 gates SettingsForm rendering on `!nkSessionActive` only. `nkSessionActive` (App.tsx:189) is true solely for naviKriya. The resonant branch hides its controls during a session via SettingsForm's internal `inSessionView`; the stretch branch added in 34-05 has no equivalent in-session handling, so the stretch steppers render throughout a running stretch session."
  artifacts:
    - path: "src/app/App.tsx"
      issue: "Line 1179 SettingsForm gate uses !nkSessionActive only; no stretchSessionActive equivalent (nkSessionActive defined line 189)"
    - path: "src/components/SettingsForm.tsx"
      issue: "Stretch branch has no inSessionView handling like the resonant branch (resonant inSessionView ~line 156)"
  missing:
    - "Define a stretchSessionActive flag mirroring nkSessionActive and hide/lock the stretch settings steppers while a stretch session occupies the screen (match how resonant/NK behave)"
  debug_session: ""

- truth: "Ending a Stretch session shows a confirmation prompt before the session ends"
  status: failed
  reason: "User reported: during a Stretch session, clicking End Session finishes immediately with no confirmation"
  severity: major
  test: 4
  root_cause: "App.tsx:644 requestEnd shows the end-confirmation dialog only when `state.status === 'running' && state.lockedSettings.durationMinutes !== 'open-ended'`. startStretchSession (sessionController.ts:~77) sets lockedSettings.durationMinutes to 'open-ended' for the synthetic lead-in, so the condition is false for every stretch session and session.end() runs immediately."
  artifacts:
    - path: "src/app/App.tsx"
      issue: "Line 644 requestEnd condition excludes open-ended sessions; stretch sessions are always open-ended in lockedSettings so the dialog never shows"
  missing:
    - "Extend the requestEnd condition so a running stretch session (state.stretchSegments !== null) also routes through the end-confirmation dialog"
  debug_session: ""

- truth: "The app layout is anchored to the top so practices with fewer elements do not float and switching practices does not shift content vertically"
  status: failed
  reason: "User reported: page appears vertically centered — HRV (fewer elements) floats with apparent extra top space; switching to Stretch/Navi shifts everything up then back down. Fix: anchor layout to the top instead of vertical centering."
  severity: minor
  test: 1
  root_cause: "App.tsx:1059 — the main <section> uses `flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center`. `justify-center` centers children on the vertical main axis, so a shorter practice (HRV) floats mid-viewport and content jumps as element count changes between practices."
  artifacts:
    - path: "src/app/App.tsx"
      issue: "Line 1059 root <section> className uses justify-center (vertical centering)"
  missing:
    - "Replace justify-center with justify-start (top-anchored) on the root section so content sticks to the top across all three practices"
  debug_session: ""

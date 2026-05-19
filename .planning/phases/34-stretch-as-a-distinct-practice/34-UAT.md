---
status: complete
phase: 34-stretch-as-a-distinct-practice
source: [34-01-SUMMARY.md, 34-02-SUMMARY.md, 34-03-SUMMARY.md, 34-04-SUMMARY.md, 34-05-SUMMARY.md, 34-06-SUMMARY.md, 34-07-SUMMARY.md, 34-08-SUMMARY.md]
started: 2026-05-18T22:39:46Z
updated: 2026-05-19T03:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Three-Practice Switcher
expected: The top segmented control shows three pills — HRV, Stretch, Navi — in that order. Tapping a pill switches the active practice and highlights the selected pill. Legible and tappable down to ~320px width. The page anchors to the top — switching practices does not float content mid-viewport or shift it vertically.
result: pass

### 2. Stretch Settings Panel
expected: With Stretch active, opening Settings shows the stretch ramp controls — initial BPM, target BPM, ratio, warm-up minutes, ramp duration minutes, cool-down minutes — plus a read-only computed total Duration shown as a clean rounded minute value (no raw float). There is no Standard/Stretch mode toggle anywhere (Stretch is its own practice, not a mode inside HRV).
result: pass

### 3. Per-Practice Settings & Stats Isolation
expected: Each practice keeps its own settings and its own stats. Changing a setting under Stretch does not alter HRV or Navi settings; each practice's stats screen shows only that practice's totals. Switching practices back and forth preserves each one's values independently.
result: pass

### 4. Run a Stretch Session
expected: Starting a session while Stretch is active runs the breathing orb through warm-up → ramp → cool-down. During the running session the settings steppers are hidden (not editable). Clicking End Session shows a confirmation prompt before ending. After completing/ending, the Stretch practice's stats (sessions / minutes) increment — HRV and Navi stats are untouched.
result: issue
reported: "On a 5m/5m/5m stretch session the in-session REMAINING countdown shows 15:03, not 15:00 — Settings panel rounds the display to '15 min' so it disagrees with the live countdown. Second bug: at the end of the practice the orb froze on the last exhale before the countdown reached zero — it stops abruptly instead of finishing the current in/out cycle like HRV does (HRV stops starting new cycles at zero but completes the in-flight one)."
severity: major

### 5. Returning-User Data Migration
expected: Loading the app as a returning user (existing saved data from before this update) keeps everything — HRV settings and stats intact, Navi settings and stats intact — and any prior Stretch usage now appears under the new Stretch practice. Nothing is reset to defaults and no error appears.
result: pass

### 6. Stretch Settings Persist Across Reload
expected: Changing a Stretch ramp control (e.g. target BPM or warm-up minutes) and reloading the page restores the changed value — the Stretch settings survive a reload.
result: pass

### 7. Resonant Settings Survive a Stretch Session
expected: Note your HRV settings. Switch to Stretch, run a full session start→finish, then switch back to HRV. Your HRV settings are exactly as you left them — the stretch session did not overwrite them.
result: pass

### 8. Learn Dialog Under Stretch
expected: With Stretch active, opening the Learn dialog shows content (the resonant practice's learn content as a fallback) and the videos section heading matches that content — it does NOT show the Navi Kriya videos heading.
result: pass

### 9. PT-BR Stretch Copy
expected: Switching the app language to Portuguese (PT-BR) shows the Stretch practice labelled "Alongar" in the switcher and headers, and all Stretch-related copy reads naturally in Portuguese (no English leaking through, no truncation at narrow widths).
result: pass

### 10. A/B Switcher Treatment (developer-only)
expected: The switcher ships two label treatments — text-only (A) and icon+label (B) — selectable by a developer via the VITE_SWITCHER_TREATMENT build-time env var (rebuild required). This toggle is NOT present anywhere in the user-facing Settings dialog.
result: issue
reported: "Treatment B: the glyph position is wrong — the icon renders detached at the top-left of each pill instead of inline with the label. Also the Stretch glyph (descending diagonal line) does not match the icon shown in the spike."
severity: minor

## Summary

total: 10
passed: 8
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "A 5m/5m/5m stretch session runs for exactly 15:00 and the in-session REMAINING countdown agrees with the Settings panel Duration readout"
  status: failed
  reason: "User reported: in-session REMAINING shows 15:03 for warm-up 5 / ramp 5 / cool-down 5; the Settings panel rounds the same total to '15 min', so the two displays disagree and the session overruns the requested 15:00"
  severity: minor
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Switcher Treatment B renders the practice glyph inline with the label (icon + label on one baseline, centered in the pill), and the Stretch glyph matches the icon design from the spike"
  status: failed
  reason: "User reported: in Treatment B the glyph renders detached at the top-left of each pill instead of inline with the label; the Stretch glyph (descending diagonal polyline) does not match the icon shown in the spike"
  severity: minor
  test: 10
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "When a stretch session's countdown reaches zero the breathing orb completes the in-flight in/out cycle before stopping (matching HRV — no new cycle starts at zero, but the current one finishes)"
  status: failed
  reason: "User reported: at the end of the practice the orb froze on the last exhale before the countdown reached zero — the session stops abruptly mid-cycle instead of finishing the current breath cycle"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

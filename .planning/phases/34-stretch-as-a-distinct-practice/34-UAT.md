---
status: diagnosed
phase: 34-stretch-as-a-distinct-practice
source: [34-01-SUMMARY.md, 34-02-SUMMARY.md, 34-03-SUMMARY.md, 34-04-SUMMARY.md, 34-05-SUMMARY.md, 34-06-SUMMARY.md, 34-07-SUMMARY.md, 34-08-SUMMARY.md]
started: 2026-05-18T22:39:46Z
updated: 2026-05-19T03:25:00Z
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
  root_cause: "buildStretchSegments (src/domain/stretchRamp.ts:99-125) snaps EACH segment's duration to a whole number of that segment's own breath cycles (Math.round(requestedMs/cycleMs)*cycleMs). Each segment runs at a different BPM, so the per-segment rounding residuals are independent and do not cancel — for the default 5/5/5 session they sum to +3220ms, a genuine 15:03 engine overrun. computeStretchTotalMs and the in-session remainingMs both read the identical segments.at(-1).endMs; they only LOOK different because the 34-07 Math.round on SettingsForm.tsx:89 rounds 15.05min to '15 min' while SessionReadout shows raw mm:ss '15:03'. Whole-cycle alignment and an exact whole-minute total are mathematically incompatible (cycle lengths 10.9-13.3s do not divide 60s)."
  artifacts:
    - path: "src/domain/stretchRamp.ts"
      issue: "buildStretchSegments makeSegment (lines 99-125) snaps each segment independently to whole cycles; residuals accumulate into a ~3s overrun of the requested total"
  missing:
    - "OPERATOR DECISION (honor exact total): rework buildStretchSegments so the realized total endMs equals the requested whole-minute total. Keep warm-up and ramp BPM-step boundaries cycle-aligned as today, but snap the FINAL cool-down segment's cycle count / duration to absorb the accumulated residual so the last endMs lands exactly on the requested total"
    - "Once the engine honors the exact total, the in-session countdown reads 15:00 with no display change; the SettingsForm.tsx:89 Math.round becomes a harmless no-op for whole-minute inputs"
  debug_session: ".planning/debug/stretch-session-overruns-target.md"

- truth: "Switcher Treatment B renders the practice glyph inline with the label (icon + label on one baseline, centered in the pill), and the Stretch glyph matches the icon design from the spike"
  status: failed
  reason: "User reported: in Treatment B the glyph renders detached at the top-left of each pill instead of inline with the label; the Stretch glyph (descending diagonal polyline) does not match the icon shown in the spike"
  severity: minor
  test: 10
  root_cause: "Two defects in src/components/PracticeToggle.tsx (both from plan 34-03). (1) Layout: the Treatment B pill <button> pillClass (lines 82-88) has no flex layout (no flex/items-center/justify-center/gap-*), so <PracticeGlyph/> and the bare label text node render as block-flow siblings — the inline SVG lands top-left and the label drops to the next line. (2) Glyph: PracticeGlyph's stretch branch (lines 38-44) is a straight descending polyline 'points=2,4 14,12' on a 16x16 viewBox; the spike 007 harness uses a smooth S-curve path 'M2 13 Q5.5 2 9 9 T16 5.5' on an 18x18 viewBox."
  artifacts:
    - path: "src/components/PracticeToggle.tsx"
      issue: "pillClass (lines 82-88) lacks flex/items-center/justify-center/gap; PracticeGlyph stretch branch (lines 38-44) is a plain diagonal polyline, not the spike S-curve"
  missing:
    - "Add flex items-center justify-center gap-1 to the Treatment B pill button so the glyph and label align inline on one baseline; wrap the label text in a <span> so it is a single flex child"
    - "OPERATOR DECISION (match spike S-curve): replace the Stretch glyph polyline with the spike 007 S-curve path 'M2 13 Q5.5 2 9 9 T16 5.5' on an 18x18 viewBox, currentColor stroke (stroke-width ~2) so it matches what the operator saw in the spike harness"
  debug_session: ".planning/debug/switcher-treatment-b-glyph-layout.md"

- truth: "When a stretch session's countdown reaches zero the breathing orb completes the in-flight in/out cycle before stopping (matching HRV — no new cycle starts at zero, but the current one finishes)"
  status: failed
  reason: "User reported: at the end of the practice the orb froze on the last exhale before the countdown reached zero — the session stops abruptly mid-cycle instead of finishing the current breath cycle"
  severity: major
  test: 4
  root_cause: "The DS-WR-03 completion clamp in getStretchFrame (src/domain/stretchRamp.ts:189-193) pins elapsedInSegment at segmentSpan - cycleMs/2 for the entire final half-cycle, freezing cycleElapsedMs / phaseProgress / phase at the inhale->exhale boundary — the orb visually freezes at the start of the last exhale. Meanwhile remainingMs and isComplete are computed from the UNCLAMPED elapsed, so the countdown keeps ticking. HRV's getSessionFrame (src/domain/sessionMath.ts:32-47) has no such clamp: it decouples completion (completionMs rounded UP to a whole cycle) from the countdown, so the frame advances freely and the in-flight cycle finishes. The -cycleMs/2 clamp over-corrects a real but narrow bug (phantom extra cycle when elapsed lands exactly on endMs)."
  artifacts:
    - path: "src/domain/stretchRamp.ts"
      issue: "getStretchFrame DS-WR-03 clamp (lines 189-193) uses -cycleMs/2, freezing the rendered frame for the whole final half-cycle while the countdown keeps running"
  missing:
    - "Narrow the DS-WR-03 clamp so it guards only the exact endMs landing, not the whole final half-cycle (e.g. special-case rawElapsedInSegment === segmentSpan, or clamp to segmentSpan - 1ms instead of segmentSpan - cycleMs/2) so the frame advances through the entire final cycle and the orb completes the last in/out cycle like HRV"
    - "Add a regression test that the stretch frame keeps advancing through the final half-cycle (phaseProgress not frozen) until isComplete fires"
  debug_session: ".planning/debug/stretch-orb-stops-mid-cycle.md"

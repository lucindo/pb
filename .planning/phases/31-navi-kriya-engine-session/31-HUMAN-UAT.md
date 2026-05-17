---
status: partial
phase: 31-navi-kriya-engine-session
source: [31-VERIFICATION.md]
started: 2026-05-17T15:50:00Z
updated: 2026-05-17T15:50:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Audible cue quality
expected: Configure Navi Kriya to 1 round / 4 front OMs / medium pace / per-OM tick on, start a session, and listen through the full front+back cycle. One rising two-tone front marker fires at start, soft ticks on each front OM, a falling two-tone back marker at the front→back transition, soft ticks on the back OM, and a resolved low three-note chord at session end. No doubled or missing markers, no click/glitch artefacts.
result: [pending]

### 2. Per-OM shape pulse visual behavior
expected: During a session the chosen variant shape (orb/square/diamond) gently scales up and returns to resting scale on each OM — no expanding ring. The live count number appears centered inside the shape and updates each OM. The shape's internal leadInDigit "1" is not visible.
result: [pending]

### 3. Completion dialog UX
expected: Let a session run to natural completion. The D-12 completion dialog appears showing the rounds completed and session duration; closing it returns to the settings view. NK stats are recorded; resonant stats are unchanged. (Note: the dialog currently shows two buttons both labelled "Close" — evaluate whether this is acceptable.)
result: [pending]

### 4. Reduced-motion fallback
expected: Enable "Reduce Motion" in OS accessibility settings, then start a session. The shape holds static at resting scale (no pulse animation) while the count number still updates each OM.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

---
status: complete
phase: 31-navi-kriya-engine-session
source: [31-VERIFICATION.md, Phase 31 UAT-driven rework 2026-05-17]
started: 2026-05-17T15:50:00Z
updated: 2026-05-17T20:45:00Z
---

## Current Test

[complete — all 9 tests passed, operator-confirmed 2026-05-17]

## Tests

### 1. Countdown → running hand-off
expected: Start a Navi Kriya session. A 3-2-1 countdown plays in the orb, with the
primary button reading "Cancel". When the countdown ends, the orb stays put (no
downward shift), there is no leftover countdown digit behind the content, and the
orb shows "0". Try this on all three shape variants (orb / square / diamond).
result: [pending]

### 2. Lead-in "0" + neck-lock window
expected: At every phase start — round 1 Front, and the Front and Back of every
round — a marker sound plays, then the orb shows "0" for ~5 seconds (the neck-lock
movement window), then the first OM counts "1". The 5s pause happens on every
transition, not just the first.
result: [pending]

### 3. Front / Back orb colour
expected: The Front phase shows the In (teal) orb gradient; the Back phase shows
the Out (blue) gradient — the same colours HRV uses for inhale / exhale. The count
digit stays clearly legible on both. No inner reference ring appears on either
phase (it is an HRV exhale-end cue and should not show in Navi).
result: [pending]

### 4. Marker sounds
expected: The Front marker is the HRV inhale cue and the Back marker is the HRV
exhale cue, played in the timbre selected in Settings (try Bowl / Bell / Sine /
Chime). They sound consistent with the HRV practice; the cue tail has decayed
before the OM counting starts. No doubled, missing, or glitchy markers.
result: [pending]

### 5. OM counting + last-OM hold
expected: OMs count up on the orb and in the Status panel. The last OM of each
phase is clearly shown (not flashed past) and lingers about twice as long as a
normal OM before the next phase. Configure 4 front OMs (→ 1 back OM) and confirm
the single back "1" is plainly visible before it returns to Front.
result: [pending]

### 6. Status panel — live Count
expected: The Status panel's Count cell tracks the live OM count as "N / target"
(e.g. "7 / 20"), the same way the Round cell shows "N / M". It resets to
"0 / target" on the countdown and on every phase transition. Phase shows
Front / Back.
result: [pending]

### 7. Per-OM shape pulse + reduced motion
expected: During a session the shape gently pulses (scales up and back) once per
OM — no expanding ring. Then enable OS "Reduce Motion": the shape holds static at
resting scale while the count number still updates each OM.
result: [pending]

### 8. Completion + early end
expected: Let a session run to natural completion — an inline "Session complete"
headline appears (no popup) and the screen returns to the Navi config. Navi stats
(sessions / rounds / minutes) advance; Resonant stats are untouched. Separately,
press "End session" mid-session → a confirmation dialog → confirm: the session
ends and a partial session is recorded.
result: [pending]

### 9. Estimated duration
expected: On the Navi config screen the estimated-duration line updates live as
rounds / front-OM count / OM-length change, and roughly matches the real session
length.
result: [pending]

## Summary

total: 9
passed: 9
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None — all 9 tests passed on operator UAT (2026-05-17).

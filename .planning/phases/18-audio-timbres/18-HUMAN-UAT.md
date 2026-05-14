---
status: partial
phase: 18-audio-timbres
source: [18-VERIFICATION.md]
started: 2026-05-14T19:42:00Z
updated: 2026-05-14T19:42:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Audible character change per timbre
expected: Selecting each of Bowl / Bell / Sine / Chime in SettingsDialog and starting a session produces an audibly distinct timbral character on real hardware
result: [pending]

### 2. In cue perceptually higher than Out cue for every preset
expected: For each preset (Bowl, Bell, Sine, Chime), the In cue (440 Hz fundamental) sounds higher in pitch than the Out cue (220 Hz fundamental)
result: [pending]

### 3. Bowl byte-identical to v1.0.1 by ear
expected: A user who has never opened SettingsDialog (prefs.timbre defaults to 'bowl') hears the exact same audio character as v1.0.1; no subtle behavior change
result: [pending]

### 4. Picker disabled visual state during inSessionView
expected: Open SettingsDialog while a session is running; the Timbre radiogroup is visibly disabled (greyed out / unclickable); clicks do nothing
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

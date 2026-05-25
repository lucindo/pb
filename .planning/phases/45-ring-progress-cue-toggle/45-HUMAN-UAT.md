---
status: partial
phase: 45-ring-progress-cue-toggle
source: [45-VERIFICATION.md]
started: 2026-05-25T12:32:00Z
updated: 2026-05-25T12:32:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. `npm run dev` with bare URL (no query string) on HRV Running surface
expected: Identical to today's Running screen — faint outer ring at 0.45 opacity + inner ring (58% size) fading in on exhale, suppressed under reduced-motion. Byte-identical DOM to pre-Phase-45.
result: [pending]

### 2. `npm run dev?ringCue=progress-arc` on HRV Running surface, across BPM 1-7 × ratio 50:50/40:60/30:70/20:80 in both light and dark themes
expected: Bidirectional progress arc grows from south to north during inhale, retracts during exhale. Faint outer track stays visible. Reduced-motion suppresses the arc (outer track still present).
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

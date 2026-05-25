---
status: complete
phase: 45-ring-progress-cue-toggle
source: [45-VERIFICATION.md]
started: 2026-05-25T12:32:00Z
updated: 2026-05-25T12:40:00Z
---

## Current Test

[complete]

## Tests

### 1. `npm run dev` with bare URL (no query string) on HRV Running surface
expected: Bidirectional progress arc (default flipped to `progress-arc` post-UAT) grows from south to north during inhale, retracts during exhale. Faint outer track stays visible. Reduced-motion suppresses the arc (outer track still present).
result: approved (operator confirmation 2026-05-25; default flipped from `outer-inner` to `progress-arc`)

### 2. `npm run dev?ringCue=progress-arc` on HRV Running surface, across BPM 1-7 × ratio 50:50/40:60/30:70/20:80 in both light and dark themes
expected: Bidirectional progress arc grows from south to north during inhale, retracts during exhale. Faint outer track stays visible. Reduced-motion suppresses the arc (outer track still present).
result: approved (operator confirmation 2026-05-25)

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

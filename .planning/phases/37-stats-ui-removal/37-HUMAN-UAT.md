---
status: partial
phase: 37-stats-ui-removal
source: [37-VERIFICATION.md]
started: 2026-05-20T22:14:00Z
updated: 2026-05-20T22:14:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. WR-01 — orphan i18n keys (naviKriyaStatsEmptyBody, naviKriyaControlsPlaceholder)
expected: Operator decides whether shipped-but-unrendered stats-shaped copy violates the anti-gamification stance. If yes, delete the keys + their translations + the strings.test.ts assertions. If no, accept as dead-code debt for a polish phase.
result: [pending]

### 2. WR-02 / WR-03 — drift-guard defensive gaps
expected: Operator decides whether the STATS-05 drift-guard test needs the (a) `SCAN_FILES.length > 0` sanity assertion and/or (b) extending scope to `src/content/` before the phase is marked passed. Current guard correctly returns green; the gaps are future-proofing, not current regressions.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

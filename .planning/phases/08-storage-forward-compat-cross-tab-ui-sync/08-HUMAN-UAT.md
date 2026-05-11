---
status: complete
phase: 08-storage-forward-compat-cross-tab-ui-sync
source: [08-VERIFICATION.md]
started: 2026-05-11T18:32:00Z
updated: 2026-05-11T19:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Two-window cross-tab UI consistency manual test (ROADMAP SC #3)
expected: |
  1) Run `npm run dev` and open the app in two browser windows side-by-side on the same origin.
  2) In window A, complete one breathing session so `totalSessions` increments.
  3) Window B's stats footer must update without being focused or reloaded — the counter increments live.
  4) In window A, reset stats; window B's stats footer must hide (totalSessions returns to zero, gating hides it).
  5) In DevTools of window B, run `localStorage.setItem('some-other-key', 'noise')` — window B's footer must NOT change (D-06a key filter).
result: pass

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]

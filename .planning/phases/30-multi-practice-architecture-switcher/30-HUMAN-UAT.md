---
status: complete
phase: 30-multi-practice-architecture-switcher
source: [30-VERIFICATION.md]
started: 2026-05-17T13:03:21Z
updated: 2026-05-17T13:03:21Z
---

## Current Test

[complete — all 3 items verified by operator at the plan 30-04 Task 3 checkpoint and signed off at phase verification]

## Tests

### 1. Switcher end-to-end — segmented control above the orb
expected: A "Resonant Breathing | Navi Kriya" segmented control appears above the orb with "Resonant Breathing" active by default. Clicking "Navi Kriya" shows the NK scaffold (placeholder text, disabled Start) and the header changes to "Navi practice". Clicking back restores resonant knobs and "HRV practice" header.
result: passed — verified by operator during the plan 30-04 Task 3 checkpoint (incl. dark/dusk-theme switcher visibility re-verification)

### 2. In-session lock — switcher disabled during a session
expected: While a Resonant session is in progress, the switcher pills are dimmed (~50% opacity) and clicking either pill produces no layout change. After the session ends, the switcher becomes active again.
result: passed — verified by operator during the plan 30-04 Task 3 checkpoint

### 3. Returning-user persistence (PRACTICE-04) — first real page load after upgrade
expected: A user whose localStorage has a v1-shaped envelope (flat settings/stats) loads the app and sees their existing Resonant Breathing settings and session stats intact. Nothing is zeroed or lost.
result: passed — verified by operator during the plan 30-04 Task 3 checkpoint

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

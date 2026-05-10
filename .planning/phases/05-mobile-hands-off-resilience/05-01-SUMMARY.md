---
phase: 05-mobile-hands-off-resilience
plan: "01"
subsystem: test-infra
tags:
  - test-infra
  - polyfill
  - wake-lock
  - vitest
dependency_graph:
  requires: []
  provides:
    - navigator.wakeLock fake (FakeWakeLockSentinel + vi.fn-wrapped request) in vitest.setup.ts
  affects:
    - src/hooks/useWakeLock.test.tsx (Plan 02 — polyfill is the test seam)
    - src/app/App.wakeLock.test.tsx (Plan 03 — polyfill is the test seam)
tech_stack:
  added: []
  patterns:
    - Object.defineProperty(navigator, ...) conditional polyfill (D-13, RESEARCH Pattern 3)
    - FakeWakeLockSentinel extends EventTarget (real EventTarget semantics for dispatchEvent)
    - vi.fn-wrapped request() for spyOn + call-history access without extra setup
key_files:
  created: []
  modified:
    - vitest.setup.ts
decisions:
  - "Extend EventTarget for FakeWakeLockSentinel so addEventListener/dispatchEvent work natively (A1 reliability — PATTERNS line ~436)"
  - "vi.fn wrapper on request() enables vi.spyOn(navigator.wakeLock, 'request') and .mock inspection without extra test setup (PATTERNS line ~438)"
  - "configurable: true flag is load-bearing for per-test Object.defineProperty override pattern (D-09 failure-path tests)"
  - "Comment text crafted to avoid false-positive grep matches on writable/configurable/defineProperty patterns used in acceptance criteria"
metrics:
  duration: "97s"
  completed: "2026-05-10"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 5 Plan 01: navigator.wakeLock Polyfill Summary

**One-liner:** Conditional navigator.wakeLock polyfill with FakeWakeLockSentinel extends EventTarget and vi.fn-wrapped request() installed in vitest.setup.ts after the AudioContext block.

## What Was Built

A new polyfill block was appended to `vitest.setup.ts` (lines 202-233) following the existing project convention established by the `AudioContext` block (lines 126-200) and `localStorage` block (lines 29-81).

The polyfill block installs a `navigator.wakeLock` fake only when the host environment (jsdom 29.1.1) lacks one, using a conditional gate:

```typescript
if (typeof navigator !== 'undefined' && !('wakeLock' in navigator)) {
```

`FakeWakeLockSentinel extends EventTarget` provides real `EventTarget` semantics so tests can fire actual `'release'` events via `dispatchEvent`. The `release()` method sets `released = true`, calls `onrelease` if set (matching the lib.dom.d.ts contract), and calls `this.dispatchEvent(new Event('release'))`.

The `request` property is wrapped in `vi.fn(async (_type?: WakeLockType) => new FakeWakeLockSentinel())` so tests can use `vi.spyOn(navigator.wakeLock, 'request')` and read call history directly off `navigator.wakeLock.request.mock` without extra setup.

## New Polyfill Block

- **File:** `vitest.setup.ts`
- **Line range:** 202–233 (appended after AudioContext block ending at line 200)
- **Install target:** `navigator` (not `window`) per the Wake Lock API spec

## Smoke Result

`npm run test:run` exit code: **0**
Pass count: **780 tests, 66 test files**
Regressions: **0** (A4 carry-forward smoke clean — Phase 1–4 test surface unaffected)

## A3/A4 Surprises

**A3 (jsdom defineProperty acceptance):** No issues. `Object.defineProperty(navigator, 'wakeLock', ...)` worked correctly in jsdom 29.1.1 + Node 25.9.0 — no fallback to `Object.defineProperty(window.navigator, ...)` required.

**A4 (carry-forward risk):** No regressions. All 780 pre-Phase-5 tests continued to pass with the polyfill installed. The conditional gate `!('wakeLock' in navigator)` correctly fires only in the polyfill-needed environment.

## Acceptance Criteria Verification

| Criterion | Result |
|-----------|--------|
| `grep -c "FakeWakeLockSentinel" vitest.setup.ts` >= 2 | 2 (PASS) |
| `grep "class FakeWakeLockSentinel extends EventTarget"` == 1 | 1 (PASS) |
| `grep "Object.defineProperty(navigator, 'wakeLock'"` == 1 | 1 (PASS) |
| `grep "if (typeof navigator !== 'undefined' && !('wakeLock' in navigator))"` == 1 | 1 (PASS) |
| `grep "request: vi.fn(async (_type"` == 1 | 1 (PASS) |
| `grep -c "this.dispatchEvent(event)"` >= 1 | 1 (PASS) |
| `writable: true` count increased by exactly 1 (4 → 5) | 5 (PASS) |
| `configurable: true` count increased by exactly 1 (4 → 5) | 5 (PASS) |
| localStorage install still 1 | 1 (PASS) |
| AudioContext install still 1 | 1 (PASS) |
| wakeLock block is after AudioContext block | PASS |
| `npm run test:run` exits 0 | 0 (PASS) |

## Deviations from Plan

None. Plan executed exactly as written.

The comment text was carefully crafted to avoid false-positive grep matches (e.g., the comment originally included the literal strings `writable: true` and `configurable: true`, which would have increased acceptance-criteria grep counts by 2 instead of 1; fixed by rephrasing the comment).

## Threat Flags

None. This is a test-infra-only change with zero production attack surface (no network, no storage, no auth, no PII, no rendered UI). T-05-01, T-05-02, T-05-03 were all pre-classified as `accept` in the plan's threat model.

## Known Stubs

None. The polyfill is complete and provides the full FakeWakeLockSentinel surface required by Plans 02 and 03.

## Self-Check: PASSED

- `vitest.setup.ts` exists and contains the new polyfill block: FOUND
- Task commit `812ce71` exists: FOUND
- All 12 acceptance criteria pass (verified via grep above)
- `npm run test:run` exit code 0 with 780/780 tests passing

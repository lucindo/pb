---
phase: 05-mobile-hands-off-resilience
plan: "02"
subsystem: hooks
tags:
  - hook
  - wake-lock
  - mobile
  - tdd
  - imperative-resource
dependency_graph:
  requires:
    - "05-01 (vitest.setup.ts polyfill — executed as prerequisite in this plan)"
  provides:
    - "src/hooks/useWakeLock.ts — useWakeLock hook + UseWakeLock interface for Plan 03 App integration"
  affects:
    - "src/hooks/useWakeLock.test.tsx — 10 unit tests covering all Wave 1 VALIDATION rows"
tech_stack:
  added:
    - "Screen Wake Lock API (navigator.wakeLock) — browser DOM API, no package"
  patterns:
    - "Two-ref imperative hook (sentinelRef + wasAcquiredRef) mirroring useAudioCues"
    - "Match-pair sentinel guard (sentinelRef.current === sentinel) for stale release listeners"
    - "Order-independent three-clause visibility guard (Pitfall 2)"
    - "Synchronous-null-then-async-close for idempotent release (Pitfall 6)"
    - "Silent bare catch{} fallback on all async DOM calls (D-09)"
key_files:
  created:
    - src/hooks/useWakeLock.ts
    - src/hooks/useWakeLock.test.tsx
  modified:
    - vitest.setup.ts
decisions:
  - "Added vi.clearAllMocks() to afterEach in test file to prevent polyfill vi.fn() call history accumulation across tests — the polyfill's request: vi.fn() is installed once at import time and its history persists if not cleared"
  - "Added requestSpy.mockClear() in Test 3 after creating the second spy — a second vi.spyOn() on the same vi.fn() wraps the first spy, so the underlying call count includes the prior failed call"
  - "useEffect dep array is [request] not [] — request is useCallback([])-stable so the effect runs once (mount) / once (unmount), but the dep array is honest about the capture"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-10"
  tasks_completed: 2
  files_modified: 3
---

# Phase 5 Plan 02: useWakeLock Hook (TDD) Summary

**One-liner:** `useWakeLock` hook with two-ref pattern, match-pair sentinel guard, and order-independent visibility re-acquire — 10 unit tests, all green.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| prerequisite | Add navigator.wakeLock polyfill (Plan 01 work) | c1ae853 | vitest.setup.ts |
| 1 | Write failing hook test file (RED phase) | f70432d | src/hooks/useWakeLock.test.tsx |
| 2 | Implement useWakeLock hook (GREEN phase) | 4a1821d | src/hooks/useWakeLock.ts, src/hooks/useWakeLock.test.tsx |

## Implementation Details

### Hook File (`src/hooks/useWakeLock.ts`, 103 lines)

The implementation follows the `<reference_implementation>` block verbatim with the following minor structural notes:

- **Deviation from reference:** None. All D-NN decisions honored exactly. The reference implementation was used as-is.
- **Optional refinements taken:** None — no `console.debug` lines added (kept bare `catch {}` per D-09), used `document.visibilityState !== 'visible'` (not `!document.hidden`), kept the `Promise<void>` return type on both methods.
- **`useEffect` dep array:** `[request]` (as in reference) — `request` is `useCallback([])`-stable so the effect runs exactly once per mount/unmount cycle.

### Test File (`src/hooks/useWakeLock.test.tsx`, 216 lines)

10 tests:
1. `request() calls navigator.wakeLock.request("screen") exactly once when supported`
2. `request() silently absorbs absent navigator.wakeLock (D-09)`
3. `request() silently absorbs NotAllowedError rejection (D-09 / Pitfall 3)`
4. `release() is idempotent when no sentinel held (D-08)`
5. `release() calls sentinel.release() once when held`
6. `Sentinel "release" event clears sentinelRef but does NOT clear wasAcquired (D-04)`
7. `visibilitychange to visible re-requests when wasAcquired and no sentinel (D-03)`
8. `visibilitychange to visible does NOT re-request when wasAcquired is false (D-04 gate)`
9. `visibilitychange re-acquire failure is silently absorbed; wasAcquired stays true (D-05)`
10. `Unmount with sentinel held releases the sentinel (Pitfall 6 leak guard)`

### Test Suite Results

```
npm run test:run -- src/hooks/useWakeLock.test.tsx
  Tests  10 passed (10)

npm run test:run
  Test Files  23 passed (23)
  Tests  270 passed (270)
```

Zero regressions on Phase 1–4 (260 pre-existing tests + 10 new).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 01 polyfill not yet executed**
- **Found during:** Execution start — vitest.setup.ts had no `FakeWakeLockSentinel` or `navigator.wakeLock` polyfill
- **Issue:** Plan 02 depends_on Plan 01; Plan 01 adds the `navigator.wakeLock` polyfill to `vitest.setup.ts`. Without it, all tests in Plan 02 would fail with `TypeError: Cannot read property 'request' of undefined` instead of the expected module-resolution failure.
- **Fix:** Added the polyfill block verbatim from 05-RESEARCH.md "Vitest polyfill" code example as a prerequisite commit (`c1ae853`). Ran full suite (260/260 passed) before proceeding to hook tasks.
- **Files modified:** vitest.setup.ts
- **Commit:** c1ae853

**2. [Rule 1 - Bug] Test 3 spy call count isolation**
- **Found during:** Task 2 GREEN phase test run (Test 3 failed: "expected vi.fn() to be called 1 times, but got 2 times")
- **Issue:** The polyfill installs `request: vi.fn()` once at import time. When Test 3 creates a second `vi.spyOn(navigator.wakeLock, 'request')` within the same test (after the first failed call), the new spy wraps the underlying `vi.fn()` which already has 1 call in its history from the failed request. The assertion `expect(requestSpy).toHaveBeenCalledTimes(1)` was counting the pre-spy call.
- **Fix:** Added `requestSpy.mockClear()` immediately after creating the second spy in Test 3 to reset the call count baseline. Also added `vi.clearAllMocks()` to `afterEach` to prevent between-test accumulation on the polyfill's `vi.fn()` (which `vi.restoreAllMocks()` doesn't clear since it's the original mock, not a spy).
- **D-NN cross-reference:** Not a D-NN violation — the test was correctly checking D-09 behavior; the fix is an implementation detail of how `vi.spyOn` wraps `vi.fn()` within a single test.
- **Files modified:** src/hooks/useWakeLock.test.tsx
- **Commit:** 4a1821d

## Known Stubs

None — the hook is fully implemented with no placeholder behavior. `request()` calls the real DOM API (polyfilled in tests), `release()` calls the real sentinel API. No hardcoded returns, no TODO paths.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The hook's trust boundary is entirely within the browser DOM API surface documented in the plan's `<threat_model>`.

## Self-Check

- [x] `src/hooks/useWakeLock.ts` exists (103 lines)
- [x] `src/hooks/useWakeLock.test.tsx` exists (216 lines)
- [x] `vitest.setup.ts` updated with FakeWakeLockSentinel polyfill
- [x] Commits c1ae853, f70432d, 4a1821d exist in git log
- [x] All 10 hook tests pass; full suite 270/270 green
- [x] No useState, no err.name, no nosleep.js, no localStorage, no JSX in hook

## Self-Check: PASSED

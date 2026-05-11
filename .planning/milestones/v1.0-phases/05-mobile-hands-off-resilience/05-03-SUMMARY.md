---
phase: 05-mobile-hands-off-resilience
plan: "03"
subsystem: app-integration
tags:
  - integration
  - wake-lock
  - mobile
  - app-tsx
dependency_graph:
  requires:
    - "05-01 (vitest.setup.ts polyfill — FakeWakeLockSentinel + vi.fn-wrapped request)"
    - "05-02 (useWakeLock hook — UseWakeLock interface, request/release methods)"
  provides:
    - "src/app/App.tsx — Wake Lock wired at three call sites (D-01/D-07/D-08)"
    - "src/app/App.wakeLock.test.tsx — 6 App-integration tests covering all Wave 2 VALIDATION rows"
  affects:
    - "Phase is feature-complete in test environment after this plan"
    - "Plan 04 (manual UAT) — covers real-device screen-stays-awake verification only"
tech_stack:
  added: []
  patterns:
    - "useWakeLock hook instantiated at App composition site (mirrors useAudioCues pattern)"
    - "Hoist stable method refs (wakeLockRequest/wakeLockRelease) before dep arrays (mirrors audioStop/audioStart precedent)"
    - "fire-and-forget void prefix for Wake Lock calls (parallel with audio engine calls)"
    - "vi.clearAllMocks() in afterEach to prevent polyfill vi.fn() call history accumulation across tests"
key_files:
  created:
    - src/app/App.wakeLock.test.tsx
  modified:
    - src/app/App.tsx
decisions:
  - "Added wakeLockRequest and wakeLockRelease to onStartClick useCallback dep array — both are used inside the callback, ESLint react-hooks/exhaustive-deps requires them even though they are useCallback([]) stable"
  - "Added vi.clearAllMocks() to afterEach in test file — same issue as Plan 02's Deviation 2: polyfill vi.fn() history accumulates across tests since vi.restoreAllMocks() doesn't clear call history on the underlying vi.fn()"
  - "Test 2 initial expectation requestSpy.toHaveBeenCalledTimes(1) requires clearAllMocks() otherwise call count from prior tests leaks in"
metrics:
  duration: "~12 minutes"
  completed: "2026-05-10"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 5 Plan 03: App.tsx Wake Lock Integration Summary

**One-liner:** App.tsx gains three Wake Lock call sites (request on lead-in start, release on lead-in cancel, release in state-machine cleanup effect) mirroring the audio engine's three call sites — 6 integration tests green, 276/276 full suite.

## What Was Built

### Task 1: Wire useWakeLock into App.tsx

Five surgical changes to `src/app/App.tsx`:

**Change 1 — Import** (after `import { useAudioCues }` at line 12):
- Added `import { useWakeLock } from '../hooks/useWakeLock'`

**Change 2 — Hook instantiation** (after `const audio = useAudioCues(initialMute)` at line 52):
- Added `const wakeLock = useWakeLock()` with comment noting Phase 5 D-11/D-12

**Change 3 — Hoist stable method refs** (after `const audioNotifyPhaseBoundary` at lines 129-130):
- Added `const wakeLockRequest = wakeLock.request`
- Added `const wakeLockRelease = wakeLock.release`
- With comment explaining why (mirrors audio precedent at App.tsx:114-122)

**Change 4 — Site 1: onStartClick lead-in branch** (after `setLeadInDigit(3)`, before `createBreathingPlan`):
- Added `void wakeLockRequest()` with Phase 5 D-01/D-02 comment
- Fire-and-forget, doesn't affect existing audio await chain (Pitfall 5 placement rule)

**Change 5a — Site 2: cancel-during-lead-in branch** (after `void audioStop()` in lead-in cancel block):
- Added `void wakeLockRelease()` with Phase 5 D-07/D-08 comment

**Change 5b — Site 3: cleanup effect** (after `void audioStop()` in `state.status !== 'running'` effect):
- Added `void wakeLockRelease()` with Phase 5 D-07 comment

**Change 5c — Dep array** (cleanup effect dep array):
- Changed from `[state, audioStop, clearLeadInTimeouts]`
- Changed to `[state, audioStop, wakeLockRelease, clearLeadInTimeouts]`

**ESLint react-hooks adjustment:**
The `onStartClick` useCallback dep array also required updating to include `wakeLockRequest` and `wakeLockRelease` since both are referenced inside the callback. Updated from `[appPhase, state.selectedSettings, audioStart, audioStop, session, clearLeadInTimeouts]` to `[appPhase, state.selectedSettings, audioStart, audioStop, wakeLockRequest, wakeLockRelease, session, clearLeadInTimeouts]`. Both are `useCallback([])`-stable so this has no runtime effect but satisfies the exhaustive-deps rule.

**Line count:** 470 → 482 (+12 lines). Required: >= 7. PASS.

### Task 2: Add App.wakeLock.test.tsx (6 integration tests)

Created `src/app/App.wakeLock.test.tsx` with 6 tests structured after `App.audio.test.tsx`:

| # | Test | D-NN | Result |
|---|------|------|--------|
| 1 | `triggers navigator.wakeLock.request once on Start session click` | D-01 | PASS |
| 2 | `releases the wake lock when an open-ended session is ended directly` | D-07 | PASS |
| 3 | `releases the wake lock when the user confirms End via the EndSessionDialog` | D-07 | PASS |
| 4 | `releases the wake lock when a timed session reaches completion automatically` | D-07/SC3 | PASS |
| 5 | `releases the wake lock when the user cancels during lead-in` | D-07/D-08 | PASS |
| 6 | `starts a session with no error and no user-visible artifact when navigator.wakeLock is undefined` | D-09 | PASS |

## Test Suite Results

```
npm run test:run -- src/app/App.wakeLock.test.tsx
  Test Files  1 passed (1)
  Tests  6 passed (6)

npm run test:run
  Test Files  24 passed (24)
  Tests  276 passed (276)
```

Phase 1-4 carry-forward: 270 tests, 0 regressions.

## Sanity Gate Results

| Gate | Value | Expected | Result |
|------|-------|----------|--------|
| `grep -c "import { useWakeLock }"` | 1 | == 1 | PASS |
| `grep -c "useWakeLock()"` | 1 | == 1 | PASS |
| `grep -c "void wakeLockRequest()"` | 1 | == 1 | PASS |
| `grep -c "void wakeLockRelease()"` | 2 | == 2 | PASS |
| `grep -c "const wakeLockRequest = wakeLock.request"` | 1 | == 1 | PASS |
| `grep -c "const wakeLockRelease = wakeLock.release"` | 1 | == 1 | PASS |
| `grep "wakeLockRelease" \| wc -l` | 6 | >= 4 | PASS |
| `grep "}, [state, audioStop, wakeLockRelease, clearLeadInTimeouts])"` | 1 | == 1 | PASS |
| `grep -c "useState.*wakeLock\|wakeLock.*useState"` | 0 | == 0 | PASS (D-12) |
| Placement awk check (request after setLeadInDigit, before createBreathingPlan) | — | exits 0 | PASS |
| App.tsx line count | 482 | original+7 (470+7=477) | PASS (+12) |
| Test file describe('App — wake lock (Phase 5)') | 1 | == 1 | PASS |
| Test file main suite it() count | 5 | == 5 | PASS |
| Test file nested it() count | 1 | == 1 | PASS |
| vi.spyOn(navigator.wakeLock, 'request') count | 5 | >= 5 | PASS |
| describe('silent fallback (D-09)') | 1 | == 1 | PASS |
| Object.defineProperty(navigator, 'wakeLock') count | 2 | >= 2 | PASS |
| queryByText(/wake.*lock/i) | 1 | >= 1 | PASS |
| advanceTimersByTime(LEAD_IN_MS) | 2 | >= 1 | PASS |
| advanceTimersByTime(6 * 60_000) | 1 | >= 1 | PASS |
| npm run test:run (wake lock file) | 0 | == 0 | PASS |
| npm run test:run (full suite) | 0 | == 0 | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.clearAllMocks() missing from afterEach**
- **Found during:** Task 2 test run — Tests 2-5 failed with releaseSpy assertions and Test 2 had "expected 1 times, got 2 times"
- **Issue:** Same as Plan 02 Deviation 2: the polyfill installs `navigator.wakeLock.request` as `vi.fn()` once at import time. `vi.restoreAllMocks()` restores the spy wrapper but does NOT clear the underlying `vi.fn()` call history. When Test 2 creates a new `vi.spyOn` after Test 1, the spy wraps the `vi.fn()` that already has Test 1's call in its history, causing an off-by-one assertion failure.
- **Fix:** Added `vi.clearAllMocks()` call to the `afterEach` block in `App.wakeLock.test.tsx`, immediately after `vi.restoreAllMocks()`.
- **Files modified:** src/app/App.wakeLock.test.tsx
- **Commit:** 339fd78

**2. [Rule 2 - Missing] wakeLockRequest/wakeLockRelease in onStartClick dep array**
- **Found during:** Task 1 implementation — plan said "may also flag" but both are used inside the callback
- **Issue:** Both `wakeLockRequest` (in lead-in branch) and `wakeLockRelease` (in cancel-during-lead-in branch) are referenced inside `onStartClick`'s body but were not in the dep array. ESLint react-hooks/exhaustive-deps requires them.
- **Fix:** Added both to the `useCallback` dep array. Runtime behavior unchanged since both are `useCallback([])`-stable.
- **Files modified:** src/app/App.tsx
- **Commit:** 43ba0f5

## Known Stubs

None. All three Wake Lock call sites are fully wired. Tests 1-6 verify each path. No placeholder behavior.

## Threat Flags

None. The changes add zero new network endpoints, auth paths, file access patterns, or schema changes. All modifications are within App.tsx's existing event-handler and effect infrastructure. T-05-08 (dep array tampering) and T-05-09 (information disclosure via test) are both mitigated as specified in the plan's threat model.

## ROADMAP Success Criteria Status

| SC | Description | Status |
|----|-------------|--------|
| SC1 | Wake Lock requested on session start | Verified (Test 1) |
| SC2 | Screen stays awake during session | Not testable in jsdom — covered by Plan 04 manual UAT |
| SC3 | Wake Lock released on session end | Verified (Tests 2/3/4/5) |
| SC4 | Silent fallback when API absent | Verified (Test 6) |

## Self-Check: PASSED

- `src/app/App.tsx` exists and has 482 lines: FOUND
- `src/app/App.wakeLock.test.tsx` exists and has 171 lines: FOUND
- Commit `43ba0f5` exists: FOUND
- Commit `339fd78` exists: FOUND
- All acceptance criteria gates PASS (see table above)
- Full suite 276/276 green with 0 regressions

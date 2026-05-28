---
phase: 51-master-clock-unification
plan: "03"
subsystem: hooks
tags:
  - sessionclock
  - hooks
  - navikriya
  - clock-unification
  - stats-only
dependency_graph:
  requires:
    - "51-01 (createSwappableSessionClock proxy factory)"
    - "50-sessionclock-scheduler-abstraction/50-CONTEXT.md (SessionClock interface)"
  provides:
    - "src/hooks/useNaviKriyaAudio.ts — NaviKriyaAudioController.clock: SessionClock (stable proxy, AC-backed during session)"
    - "src/hooks/useNaviKriyaSessionController.ts — passes naviAudio.clock into useNKEngine (D-02)"
  affects:
    - "Plan 51-04 (NK behavioral tests: stats on AC time, AC-suspend freezes elapsed)"
    - "Plan 51-05 (iOS UAT — NK stats exclude locked duration)"
tech_stack:
  added: []
  patterns:
    - "useMemo(() => createSwappableSessionClock(createWallSessionClock()), []) for stable proxy identity (D-03)"
    - "proxy.setSource(clock) / proxy.setSource(createWallSessionClock()) swap-and-revert pattern (D-06)"
    - "Synchronous proxy revert in closeAfterEndCue() before setTimeout-deferred AC teardown (D-12 mandate)"
    - "Hook-call-order dependency enforcement: naviAudio declared before nkEngine (D-02)"
key_files:
  created:
    - src/hooks/useNaviKriyaSessionController.test.tsx
  modified:
    - src/hooks/useNaviKriyaAudio.ts
    - src/hooks/useNaviKriyaAudio.test.tsx
    - src/hooks/useNaviKriyaSessionController.ts
decisions:
  - "Kept proxy as non-destructured object reference (proxy.setSource / proxy.clock) to satisfy @typescript-eslint/unbound-method rule — mirrors Plan 51-01 Deviation #1 for swappableSessionClock.test.ts"
  - "Synchronous proxy revert in closeAfterEndCue() before the setTimeout-deferred closeAudioContext — D-12 mandates immediate revert so useNKEngine.end() onComplete reads see a sensible clock"
  - "useCallback deps include [proxy] (the useMemo-stable object) for exhaustive-deps compliance — proxy identity is stable across renders so this adds no overhead"
  - "No test-double sweep needed for useNKEngine.test.tsx — those tests construct their own SessionClock instances directly and are unaffected by the controller wiring change"
metrics:
  duration: "7m"
  completed_date: "2026-05-28"
  tasks_completed: 2
  files_created: 1
  test_delta: "+10 (1360 → 1370)"
requirements_completed:
  - CLOCK-01
  - DEPS-01
  - QUAL-01
---

# Phase 51 Plan 03: NK SessionClock Rebase Summary

**One-liner:** NK stats rebased onto AC-backed proxy clock via useNaviKriyaAudio.clock, eliminating the controller-local wall clock and establishing consistent AC-time stats across all three practices.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire swappable proxy into useNaviKriyaAudio | 56ff97a | src/hooks/useNaviKriyaAudio.ts, src/hooks/useNaviKriyaAudio.test.tsx |
| 2 | Wire useNaviKriyaSessionController onto naviAudio.clock | 696ab92 | src/hooks/useNaviKriyaSessionController.ts, src/hooks/useNaviKriyaSessionController.test.tsx |

## Truths Satisfied

All 8 plan `must_haves.truths` verified:

1. **NaviKriyaAudioController.clock** — `useNaviKriyaAudio` returns a stable `clock: SessionClock` member built from `createSwappableSessionClock(createWallSessionClock())` inside `useMemo([], [])`. Identity is stable across renders and lifecycle phases.

2. **Proxy swap in begin()** — `proxy.setSource(clock)` called immediately after `const clock = createAudioSessionClock(audioCtx)` at L113. The local `clock` variable continues to be used by cue-scheduling closures (cueWhen at L126) — UNCHANGED. The proxy swap is an ADDITIONAL line wiring the externally-visible `proxy.clock` to the same AC clock the closures read.

3. **Proxy revert in close() / closeAfterEndCue() / unmount** — `proxy.setSource(createWallSessionClock())` called after `closeAudioContext(audioCtx)` in `close()` and the unmount cleanup; called SYNCHRONOUSLY (before the setTimeout callback) in `closeAfterEndCue()`.

4. **AC-failure path (null audioCtx)** — The early-return branch at L94-103 fires before the proxy swap site. No proxy swap occurs; `clock.now()` remains wall-clock for this session.

5. **useNaviKriyaSessionController flip** — `nkClock = useMemo(() => createWallSessionClock(), [])` and `createWallSessionClock` import deleted. Hook-call order flipped: `naviAudio` (L61) now precedes `nkEngine` (L69). `useNKEngine(naviAudio.clock)` passes the proxy clock as the clock arg (D-02).

6. **useNKEngine signature unchanged** — `git diff src/hooks/useNKEngine.ts` is empty. Only the SOURCE of the clock arg changes, not the hook's interface or implementation.

7. **DEPS-01** — `git diff package.json` empty; zero new runtime dependencies.

8. **QUAL-01** — 1370/1370 tests pass at both commit boundaries; tsc and drift-guard clean.

## Artifacts Created/Modified

| Path | Role | Key Change |
|------|------|------------|
| `src/hooks/useNaviKriyaAudio.ts` | Modified | Added proxy construction via `useMemo`; added `clock: SessionClock` to `NaviKriyaAudioController`; wired `proxy.setSource` calls in `begin`/`close`/`closeAfterEndCue`/unmount |
| `src/hooks/useNaviKriyaAudio.test.tsx` | Modified | Added 6 new tests for proxy clock lifecycle (Tests 1-6 in `describe('SessionClock proxy + setSource lifecycle ...')`) |
| `src/hooks/useNaviKriyaSessionController.ts` | Modified | Deleted `nkClock` + import; flipped hook order; `useNKEngine(naviAudio.clock)` |
| `src/hooks/useNaviKriyaSessionController.test.tsx` | Created | 4 smoke tests: idle render, start transition, setSettings, cancelStart |

## Key Links Verified

| From | To | Via | Verified |
|------|----|-----|---------|
| `useNaviKriyaAudio.ts` | `swappableSessionClock.ts` | `createSwappableSessionClock` import | ✓ grep count ≥1 |
| `useNaviKriyaAudio.ts` | `sessionClock.ts` | `createWallSessionClock` + `createAudioSessionClock` | ✓ imports present |
| `useNaviKriyaSessionController.ts` | `useNaviKriyaAudio.ts` | `naviAudio.clock` prop read | ✓ grep count = 1 |
| `useNaviKriyaSessionController.ts` | `useNKEngine.ts` | `useNKEngine(naviAudio.clock)` | ✓ grep count = 1 |

## Test Count Delta

- Baseline: 1360 tests (Plan 51-01 baseline)
- Task 1: +6 tests (proxy clock lifecycle in `useNaviKriyaAudio.test.tsx`)
- Task 2: +4 tests (smoke tests in `useNaviKriyaSessionController.test.tsx`)
- Total: **1370 tests** (+10)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lint: `@typescript-eslint/unbound-method` on destructured `setSource`**
- **Found during:** Task 1 — same lint rule as Plan 51-01 Deviation #1
- **Issue:** Destructuring `const { clock: proxyClock, setSource: setProxyClockSource } = useMemo(...)` triggers the `unbound-method` rule because `setSource` is treated as a method extracted from an object literal, same as Plan 51-01's `swappableSessionClock.test.ts` issue.
- **Fix:** Kept the proxy as a non-destructured variable (`const proxy = useMemo(...)`); accessed `proxy.setSource(...)` and `proxy.clock` through the object reference. All `useCallback` deps arrays reference `[proxy]` instead of `[setProxyClockSource]`.
- **Files modified:** `src/hooks/useNaviKriyaAudio.ts`
- **Commit:** 56ff97a (included in same task commit)

### Plan Execution Note

The plan noted that Tasks 1 and 2 may need to land as separate commits because "Task 2's hook-call-order flip can't typecheck until Task 1 ships the new `clock` member." This was exactly the decomposition chosen: Task 1 ships the `clock` member on `NaviKriyaAudioController`, then Task 2 immediately wires `naviAudio.clock` into `useNKEngine`. Both tasks landed cleanly in the same execution wave.

## Source Assertions (from plan verification criteria)

- `grep -c "createSwappableSessionClock" useNaviKriyaAudio.ts` → 2 (import line + useMemo body) ✓
- `grep -c "proxy.setSource" useNaviKriyaAudio.ts` → 4 invocations (begin + close + closeAfterEndCue + unmount) ✓
- `grep -c "clock: proxy.clock" useNaviKriyaAudio.ts` → 1 (returned-object export) ✓
- `grep -c "createWallSessionClock" useNaviKriyaAudio.ts` → 4+ (useMemo body + 3 revert sites) ✓
- `grep -c "createWallSessionClock" useNaviKriyaSessionController.ts` → 0 ✓
- `grep -c "useNKEngine(naviAudio.clock)" useNaviKriyaSessionController.ts` → 1 ✓
- `grep -c "nkClock" useNaviKriyaSessionController.ts` → 1 (comment only, no const) ✓
- Hook-call ORDER: `useNaviKriyaAudio` invocation at L61 < `useNKEngine` invocation at L69 ✓
- `git diff src/hooks/useNKEngine.ts` → empty ✓
- `git diff package.json` → empty ✓
- Drift-guard: `pnpm test:run src/audio/sessionClock.driftGuard.test.ts` → 2/2 passed ✓

## Discoveries for Downstream Plans 04 + 05

- **Plan 51-04 seam confirmed:** The `closeAfterEndCue()` synchronous-revert pattern creates a clean test seam — tests can drive `begin() → closeAfterEndCue()` and immediately assert `clock.now()` returns wall-clock without advancing timers. Plan 51-04's behavioral tests can use this seam to verify that `recordNaviKriyaSession.elapsedMs` excludes locked duration.
- **Plan 51-05 iOS UAT:** NK has no reconstruction path (D-12 confirmed). The proxy is only swapped in `begin()` and reverted at close — no `onSuspend`/`onResume` subscriptions are registered against the proxy (unlike HRV Plan 51-02's `clock.onSuspend` wiring). This simplifies the iOS UAT checklist for NK: mid-session AC lock → `clock.now()` freezes → elapsed freezes → reverts on close.
- **No new test seams in `useNKEngine.test.tsx`:** The existing NKEngine tests construct their own `createWallSessionClock()` instances directly and are fully unaffected by the controller wiring change. No test-double sweep was needed.

## Threat Surface Scan

No new threat surface — pure refactor of in-browser NK audio/session timing wiring. No new I/O, network endpoints, auth paths, file access patterns, or schema changes. The NK drift-guard exemption (`useNaviKriyaAudio.ts` keeps `new AudioContext()` in `createOptionalAudioContext`) is preserved by construction — no new banned-token reads introduced.

## Self-Check: PASSED

- `src/hooks/useNaviKriyaAudio.ts` exists: confirmed
- `src/hooks/useNaviKriyaAudio.test.tsx` exists: confirmed
- `src/hooks/useNaviKriyaSessionController.ts` exists: confirmed
- `src/hooks/useNaviKriyaSessionController.test.tsx` exists: confirmed (created)
- Commit `56ff97a` exists: confirmed (`feat(51-03): wire swappable proxy clock into useNaviKriyaAudio (Task 1)`)
- Commit `696ab92` exists: confirmed (`feat(51-03): wire useNaviKriyaSessionController onto naviAudio.clock (Task 2)`)
- Full suite 1370/1370: confirmed
- `git diff package.json` empty: confirmed
- `git diff src/hooks/useNKEngine.ts` empty: confirmed
- Drift-guard passes: confirmed (2/2)

---
phase: 52-visibility-resume-clamp-lookahead-scheduling
plan: "04"
subsystem: audio
tags:
  - audio
  - scheduling
  - mute
  - resume
dependency_graph:
  requires:
    - 52-01 (cancelFutureCues + topUpLookahead engine facades)
    - 52-03 (topUpLookahead hook facade + walkFutureCues trigger)
    - Phase 18 D-08 (applyMuteFadeOut preserved)
    - Phase 50 D-13 (per-cue mute fade preserved)
    - Phase 51 D-04 (clock subscription forwarding survives source swap)
  provides:
    - D-10: setMuted(true) cancels future-queued cues via inline two-branch pattern
    - D-04 force-top-up half: handleForceTopUp subscribed to clock.onResume
    - lastTopUpCuesRef caching for cached-cues forceTopUp design
  affects:
    - src/audio/audioEngine.ts (setMuted extended)
    - src/hooks/useAudioCues.ts (handleForceTopUp + cache + 4th subscription)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN per task (2 tasks × 2 commits each)
    - D-10 two-branch setMuted: in-flight applyMuteFadeOut + future cancel
    - AH-WR-07 snapshot-iterate pattern for future-cue cancel loop in setMuted
    - cached-cues indirection for handleForceTopUp (avoids controller coupling)
    - clockUnsubsRef 4th subscription wired in start() AND reconstructEngine()
key_files:
  created: []
  modified:
    - src/audio/audioEngine.ts
    - src/audio/audioEngine.test.ts
    - src/hooks/useAudioCues.ts
    - src/hooks/useAudioCues.test.tsx
decisions:
  - "D-10 implemented by inlining cancel loop in setMuted (not calling cancelFutureCues method) — method reference not in scope inside object literal; AH-WR-07 snapshot pattern duplicated per PATTERNS guidance"
  - "D-04 cached-cues design: lastTopUpCuesRef holds last cues array; handleForceTopUp re-dispatches without reaching into controller refs (no useBreathingSessionController.ts modification)"
  - "handleForceTopUp dep array: empty [] (only reads refs, no state captures)"
  - "start() and reconstructEngine() dep arrays updated to include handleForceTopUp"
metrics:
  duration: "823s (~13min)"
  completed_date: "2026-05-28"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
  tests_added: 12
  tests_baseline: 1434
  tests_final: 1455
requirements_completed:
  - SCHED-05
  - SCHED-03
  - DEPS-01
  - QUAL-01
---

# Phase 52 Plan 04: setMuted Future-Cue Cancel + clock.onResume Force-Top-Up

**One-liner:** Extends `setMuted(true)` with a two-branch D-10 pattern (applyMuteFadeOut for in-flight cues + inline cancel loop for future cues) and wires `handleForceTopUp` to `clock.onResume` using a cached-cues indirection design (D-04 force-top-up half).

## Summary

This plan closes two final Phase 52 wires:

**Task 1 — D-10 setMuted extended:** The existing `setMuted(true)` body applied `applyMuteFadeOut` to ALL active cues. With the 6s lookahead queue from Plan 03, future cues would remain scheduled after a mute press — audible for up to 6 seconds. Plan 04 extends the body into a two-branch pattern: in-flight cues (scheduledAt ≤ now) still get applyMuteFadeOut (D-08/WR-08 preserved); future cues (scheduledAt > now) are cancelled via an inlined AH-WR-07 snapshot-iterate loop (same cancel pattern as cancelFutureCues from Plan 01). Both branches fire in the same `setMuted(true)` call. The cancel loop runs AFTER the in-flight loop to avoid Set mutation during the in-flight iteration.

**Task 2 — D-04 handleForceTopUp:** The `clock.onResume` fires on AC reconstruction / iOS unlock before the next rAF tick. Plan 04 subscribes a new `handleForceTopUp` useCallback that re-dispatches the last-known cues array (cached in `lastTopUpCuesRef.current`) to `engine.topUpLookahead`. The cache is written by `topUpLookahead` on every call. This avoids any modification to `useBreathingSessionController.ts` (separation of concerns). The subscription is wired as a 4th member of `clockUnsubsRef` in both the `start()` subscription block and the `reconstructEngine()` new-engine block. Teardown is automatic via the existing `for (const off of clockUnsubsRef.current) off()` loops at unmount, stop(), and reconstruction.

## Tasks Completed

| Task | Description | Commit | Type |
|------|-------------|--------|------|
| 1 RED | 6 failing tests for setMuted two-branch D-10 pattern | bd394c4 | test |
| 1 GREEN | Extend setMuted with in-flight fade + future cancel branches | c56de17 | feat |
| 2 RED | 6 failing tests for handleForceTopUp D-04 subscription | 40761ff | test |
| 2 GREEN | Add lastTopUpCuesRef cache, handleForceTopUp, 4th clock subscription | ee6133d | feat |

## What Was Built

### Task 1: `src/audio/audioEngine.ts` — setMuted D-10 extension

The `setMuted(next: boolean)` body's `if (next && activeCues.size > 0)` branch now:
1. Calls `pruneExpiredCues()` (preserved — phantom-cue protection)
2. Reads `const now = audioCtx.currentTime`
3. Iterates `activeCues` and calls `applyMuteFadeOut(cue, audioCtx)` for cues with `scheduledAt <= now` (in-flight, D-08/WR-08 preserved)
4. After the loop, iterates `[...activeCues]` snapshot (AH-WR-07) and calls `cue.cancel()` + `activeCues.delete(cue)` for cues with `scheduledAt > now` (future, D-10)

D-08 unmute-waits-for-boundary comment preserved. Implementation detail: `cancelFutureCues()` is a method on the returned engine object literal, not a standalone function, so it cannot be referenced by name from within a sibling method. The cancel logic is inlined using the same AH-WR-07 pattern.

### Task 2: `src/hooks/useAudioCues.ts` — handleForceTopUp + cached-cues

- Added `lastTopUpCuesRef`: `useRef<Array<{audioTime, phaseDurationSec, kind}>>([])` near existing handler declarations, with Phase 52 D-04 JSDoc comment
- Extended `topUpLookahead` useCallback: writes `lastTopUpCuesRef.current = cues` before engine dispatch
- Added `handleForceTopUp` useCallback: defensive engineRef null-gate + lastTopUpCuesRef length check + `engine.topUpLookahead({ cues })` call
- Start subscription block: added `const unsubForceTopUp = engine.clock.onResume(handleForceTopUp)` as 4th subscription; `clockUnsubsRef.current = [unsubResume, unsubSuspend, unsubClose, unsubForceTopUp]`
- ReconstructEngine subscription block: same 4-subscription pattern against `newEngine.clock`
- `start` and `reconstructEngine` dep arrays: updated to include `handleForceTopUp`
- Teardown: fully automatic via existing `for (const off of clockUnsubsRef.current) off()` loops

## Verification Results

- `pnpm vitest run src/audio/audioEngine.test.ts -t "Phase 52 D-10"`: 6/6 pass
- `pnpm vitest run src/hooks/useAudioCues.test.tsx -t "Phase 52 D-04 forceTopUp"`: 6/6 pass
- `pnpm vitest run src/audio/audioEngine.test.ts`: 75/75 pass (+6 from Task 1 baseline)
- `pnpm vitest run src/hooks/useAudioCues.test.tsx`: 52/52 pass (+6 from Task 2 baseline)
- `pnpm test:run`: 1455/1455 pass (120 test files)
- `pnpm tsc --noEmit`: PASS (0 errors)
- `pnpm build`: PASS (bundle emitted)
- Pre-existing lint errors in 3 unrelated files (sessionPresentation.ts, sessionClock.test.ts, storage.ts) unchanged from baseline — out of scope per scope-boundary rule

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] cancelFutureCues() not callable from sibling method in object literal**
- **Found during:** Task 1 GREEN — `cancelFutureCues is not defined` ReferenceError
- **Issue:** `cancelFutureCues` is defined as a method on the same object literal (`engine`), not as a standalone function. Calling it by name from `setMuted` (another method on the same object) fails because methods in JavaScript object literals cannot reference each other by name — only through `this` or an external variable reference.
- **Fix:** Inlined the cancel logic in `setMuted` using the same AH-WR-07 snapshot-iterate pattern: `for (const cue of [...activeCues]) { if (cue.scheduledAt > now) { cue.cancel(); activeCues.delete(cue) } }`. Semantically identical to `cancelFutureCues()`; the D-10 comment explicitly cites the pattern.
- **Files modified:** `src/audio/audioEngine.ts`
- **Commit:** c56de17

**2. [Rule 2 - Missing critical functionality] eslint-disable comments for `any`-typed test helper**
- **Found during:** Task 2 GREEN — `pnpm lint` reported `@typescript-eslint/no-unsafe-assignment` errors at each `makeFakeEngineWithControllableResume()` call site
- **Issue:** The fake engine helper returns `{ engine: any, topUpSpy, resumeSubscribers, fireResume }`. Destructuring from the return propagates `any` warnings at each call site.
- **Fix:** Added per-call-site `eslint-disable-next-line @typescript-eslint/no-unsafe-assignment` comments (mirroring the existing pattern from other fake-engine tests in the same file). Also added `no-unsafe-member-access` suppress for `engine.clock.onResume` access in T3.
- **Files modified:** `src/hooks/useAudioCues.test.tsx`
- **Commit:** ee6133d

## TDD Gate Compliance

RED/GREEN pattern followed for both tasks:
1. `test(52-04): add failing tests for setMuted future-cue cancel (D-10 RED)` — bd394c4 (RED Task 1)
2. `feat(52-04): extend setMuted(true) to cancel future cues via D-10 two-branch pattern` — c56de17 (GREEN Task 1)
3. `test(52-04): add failing tests for handleForceTopUp clock.onResume subscription (D-04 RED)` — 40761ff (RED Task 2)
4. `feat(52-04): add handleForceTopUp subscribed to clock.onResume with cached-cues design (D-04)` — ee6133d (GREEN Task 2)

## Known Stubs

None. All implementations are fully wired: `setMuted` cancel path calls real `cue.cancel()` + `activeCues.delete()`; `handleForceTopUp` re-dispatches to real `engine.topUpLookahead`; `lastTopUpCuesRef` cache is written on every `topUpLookahead` call.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes. All changes are in-process WebAudio graph management and React hook subscription wiring within the existing engine lifecycle boundary. T-52-12 (setMuted iteration order) mitigated by inlining cancel loop after in-flight loop. T-52-15 (reconstruction misses 4th subscription) mitigated by acceptance criteria grep and T3 behavioral test.

## Self-Check: PASSED

Files verified:
- `src/audio/audioEngine.ts`: contains both `applyMuteFadeOut` and `cue.cancel()` inside setMuted; D-10 + D-08 comments present; `scheduledAt <= now` gate present; `pruneExpiredCues()` call preserved
- `src/audio/audioEngine.test.ts`: 75 tests (69 baseline + 6 new D-10 tests)
- `src/hooks/useAudioCues.ts`: contains `lastTopUpCuesRef`, `handleForceTopUp` useCallback, `unsubForceTopUp` at both start() and reconstructEngine(); `lastTopUpCuesRef.current = cues` write in topUpLookahead
- `src/hooks/useAudioCues.test.tsx`: 52 tests (46 baseline + 6 new D-04 forceTopUp tests)

Commits verified in log:
- bd394c4 (RED Task 1 — D-10 tests)
- c56de17 (GREEN Task 1 — setMuted extension)
- 40761ff (RED Task 2 — D-04 forceTopUp tests)
- ee6133d (GREEN Task 2 — handleForceTopUp implementation)

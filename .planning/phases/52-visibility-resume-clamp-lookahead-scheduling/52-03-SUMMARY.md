---
phase: 52
plan: "03"
subsystem: audio-scheduling
tags: [lookahead, walkFutureCues, topUpLookahead, TDD, boundary-detection-removal]
dependency_graph:
  requires: ["52-01", "52-02"]
  provides: ["audio.topUpLookahead facade", "walkFutureCues pure helper", "top-up trigger in controller"]
  affects: ["src/domain/sessionAudio.ts", "src/hooks/useAudioCues.ts", "src/hooks/useBreathingSessionController.ts"]
tech_stack:
  added: []
  patterns: ["D-01 hybrid window (max floor/seconds)", "D-14 timed-session trim", "D-11 per-segment Stretch walk"]
key_files:
  created: []
  modified:
    - src/domain/sessionAudio.ts
    - src/domain/sessionAudio.test.ts
    - src/hooks/useAudioCues.ts
    - src/hooks/useAudioCues.test.tsx
    - src/hooks/useBreathingSessionController.ts
    - src/hooks/useBreathingSessionController.test.tsx
decisions:
  - "D-01 hybrid window: max(LOOKAHEAD_MIN_CUES=2, ceil(LOOKAHEAD_WINDOW_SEC=6/cycleSec)) — floor wins at low BPM, seconds-window wins at high BPM"
  - "D-11 Stretch: walkFutureCues walks buildStretchSegments segments per top-up so each cue carries correct phaseDurationSec from its own segment"
  - "D-14 timed-session trim: D-14 targetSec unconditionally breaks the loop before D-01 floor applies"
  - "stretchSegmentsForTopUp derived outside effect to avoid tsc -b TS2339 on dep array"
metrics:
  duration: "822s (~14min)"
  completed: "2026-05-28"
  tasks_completed: 2
  files_changed: 6
---

# Phase 52 Plan 03: walkFutureCues + topUpLookahead Facade Summary

`walkFutureCues` pure helper in `domain/sessionAudio.ts` with D-01 hybrid window + D-11 Stretch segment walk + D-14 timed trim; `audio.topUpLookahead` facade in `useAudioCues` replacing boundary-detection with per-frame top-up trigger in `useBreathingSessionController`.

## Tasks Completed

| Task | Description | Commit | Type |
|------|-------------|--------|------|
| 1 RED | Failing tests for walkFutureCues (10 tests) | b26dc1d | test |
| 1 GREEN | Implement walkFutureCues pure helper | 6e3613b | feat |
| 2 RED | Failing tests for topUpLookahead facade + trigger (9 tests) | 021f516 | test |
| 2 GREEN | Implement topUpLookahead facade + replace boundary-detection | e93d544 | feat |

## What Was Built

**Task 1: `walkFutureCues` pure helper (`domain/sessionAudio.ts`)**

Added `FutureCue` interface and `walkFutureCues()` export. The function walks N future cue audioTimes from an anchor using the D-01 hybrid window algorithm:

- **HRV branch**: uniform `cycleSec` stride — `audioTimeRelSec = cycleIndex * plan.cycleSec + phaseOffset`
- **Stretch branch**: per-segment walk via `buildStretchSegments` segments array; each cue carries `phaseDurationSec` from its own active segment (D-11, Phase 22 STRETCH-08 preserved)
- **D-14 trim**: stops if `audioTimeRelSec > targetSec` (for timed sessions), takes priority over floor
- **D-01 floor**: returns at least `LOOKAHEAD_MIN_CUES` cues even if window is exhausted (e.g. 1 BPM)
- **Degenerate guard**: returns `[]` if `cycleSec === 0` (defensive ASSERT)

**Task 2: `topUpLookahead` facade + controller effect replacement**

- Added `topUpLookahead` to `UseAudioCues` interface; delegates to `engine.topUpLookahead({ cues })`
- Replaced boundary-detection `useEffect` in `useBreathingSessionController` with a top-up trigger:
  - Fires on every `session.currentFrame` change when `phase === 'running'`
  - Calls `walkFutureCues` with `LOOKAHEAD_WINDOW_SEC`, `LOOKAHEAD_MIN_CUES`, `targetSec`
  - `computeBoundaryAudioOffsets` is fully removed (0 references remain)
  - `LOOKAHEAD_WINDOW_SEC` and `LOOKAHEAD_MIN_CUES` imported as symbols (no hard-coded 6/2)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `toBeGreaterThan(undefined)` TypeScript error in test**
- **Found during:** Task 2 GREEN — `pnpm build` (tsc -b) rejected `cues[i]?.audioTime` passed to `toBeGreaterThan`
- **Issue:** Optional chaining `cues[i]?.audioTime` returns `number | undefined`; Vitest's `toBeGreaterThan` param is typed `number | bigint`, rejecting `undefined`
- **Fix:** Extracted to local consts: `const prevTime = cues[i - 1]?.audioTime ?? 0; const currTime = cues[i]?.audioTime ?? 0`
- **Files modified:** `src/domain/sessionAudio.test.ts`
- **Commit:** e93d544

**2. [Rule 1 - Bug] Fixed TS2339 on `state.stretchSegments` in dep array**
- **Found during:** Task 2 GREEN — `pnpm build` (tsc -b) rejected dep array reference to `state.stretchSegments` because `IdleSessionState` doesn't have that property
- **Issue:** `SessionState` union includes `IdleSessionState` (no `stretchSegments`); accessing it in dep array causes TS2339 with tsc composite mode
- **Fix:** Derived `stretchSegmentsForTopUp` const above the effect by narrowing `state.status === 'running' || 'complete'`; used that in dep array instead
- **Files modified:** `src/hooks/useBreathingSessionController.ts`
- **Commit:** e93d544

## TDD Gate Compliance

RED/GREEN pattern followed for both tasks:
1. `test(52-03): add failing tests for walkFutureCues pure helper` — b26dc1d (RED Task 1)
2. `feat(52-03): implement walkFutureCues pure helper in domain/sessionAudio.ts` — 6e3613b (GREEN Task 1)
3. `test(52-03): add failing tests for topUpLookahead facade and top-up trigger` — 021f516 (RED Task 2)
4. `feat(52-03): implement topUpLookahead facade + replace boundary-detection effect` — e93d544 (GREEN Task 2)

## Verification Results

- `pnpm tsc --noEmit`: PASSED (0 errors)
- `pnpm build` (tsc -b + vite): PASSED
- `pnpm test`: 1434/1434 tests passed (120 files)
- `pnpm vitest run src/domain/sessionAudio.test.ts src/hooks/useAudioCues.test.tsx src/hooks/useBreathingSessionController.test.tsx`: 69/69 passed

## Known Stubs

None. `walkFutureCues` is fully wired; `topUpLookahead` facade delegates to engine. Plan 04 will extend the facade for `clock.onResume` force-top-up (explicitly deferred, not a stub).

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `src/domain/sessionAudio.ts`: exists with `walkFutureCues` export
- `src/hooks/useAudioCues.ts`: exists with `topUpLookahead` in interface and return
- `src/hooks/useBreathingSessionController.ts`: exists, `computeBoundaryAudioOffsets` removed, LOOKAHEAD constants present
- Commits b26dc1d, 6e3613b, 021f516, e93d544: all present in git log

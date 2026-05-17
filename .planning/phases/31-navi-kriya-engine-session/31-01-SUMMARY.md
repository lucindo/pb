---
phase: 31-navi-kriya-engine-session
plan: "01"
subsystem: hooks
tags: [navi-kriya, engine, hook, tdd, timer, state-machine]
dependency_graph:
  requires: []
  provides:
    - useNKEngine hook with start/pause/resume/end/toggleCue
    - NK_OM_SECONDS, NK_LEAD_MS, NK_SETTLE_MS constants
    - NKAudioCallbacks, NKOnComplete, NKEngineApi types
  affects: []
tech_stack:
  added: []
  patterns:
    - useRef mutable engine record (stale-closure-safe per-tick reads)
    - self-rescheduling setTimeout chain for discrete OM counting
    - audio-callback injection (hook is audio-agnostic)
    - TDD RED/GREEN commit discipline
key_files:
  created:
    - src/hooks/useNKEngine.ts
    - src/hooks/useNKEngine.test.tsx
  modified: []
decisions:
  - "NK_OM_SECONDS.medium = 2.16 (D-09: Forrest's measured ~2.16 s/OM pace)"
  - "NK_LEAD_MS = 700ms (D-11 seed), NK_SETTLE_MS = 3500ms (D-11 settle)"
  - "backCount computed once at start() from frontCount/4, never re-derived"
  - "stepOm reads only eng.current (AH-WR-05 stale-closure discipline)"
  - "Test timing: LEAD_MS=700ms fires first OM, subsequent OMs spaced by omMs"
metrics:
  duration_seconds: 190
  completed_date: "2026-05-17"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  tests_added: 6
  test_suite_before: 1057
  test_suite_after: 1063
---

# Phase 31 Plan 01: useNKEngine Hook Summary

**One-liner:** Self-rescheduling setTimeout NK engine hook with front/back phase machine, stale-closure-safe ref pattern, and audio-injected callback interface.

## What Was Built

`src/hooks/useNKEngine.ts` — the core Navi Kriya OM-counting engine hook. It drives the
front → back → next-round → done state machine via a self-rescheduling `setTimeout` chain.
The mutable `NKEngineRecord` lives in `useRef` so `stepOm` reads all per-tick values from
`eng.current` (never from closed-over React state). Only the display triple
`{nkPhase, nkRound, nkCount}` plus `nkRunning` mirror into React state.

Audio is injected as `NKAudioCallbacks` into `start()` and held in a ref — the hook has
zero audio imports and is fully testable with `vi.fn()` stubs.

`src/hooks/useNKEngine.test.tsx` — 6 test cases covering NK-01/02/03/06/07:
- Full front→back→done traversal (auto-advance, count reset on phase transition)
- No-op before start() (null-guard)
- 3-round cycle producing 3 front+back pairs
- OM delay derived from `NK_OM_SECONDS[omLength]` (timing boundary check)
- `perOmCue=false` suppresses tick; `true` fires per OM
- `pause/resume/end` lifecycle including `onComplete(isComplete:false)` on early end

## Exported API

```typescript
export const NK_OM_SECONDS: Record<OmLength, number>  // {fast:1.75, medium:2.16, slow:3.0}
export const NK_LEAD_MS = 700     // ms from phase marker to first OM
export const NK_SETTLE_MS = 3500  // ms settle before first frontMarker at session start
export interface NKAudioCallbacks { frontMarker(); backMarker(); tick(); endCue() }
export type NKOnComplete = (result: { completedRounds, elapsedMs, isComplete }) => void
export interface NKEngineApi { nkPhase, nkRound, nkCount, nkRunning, start, pause, resume, end, toggleCue }
export function useNKEngine(): NKEngineApi
```

## TDD Gate Compliance

- RED commit `4bb7fad`: `test(31-01): add failing useNKEngine test scaffold (RED)` — import fails because hook does not exist.
- GREEN commit `9b04cb4`: `feat(31-01): implement useNKEngine hook (GREEN)` — all 6 tests pass.
- No REFACTOR step needed (implementation was clean on first pass).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test timing assertions**
- **Found during:** Task 2 GREEN phase
- **Issue:** Test NK-01 and NK-03 had incorrect timer advancement expectations. `NK_LEAD_MS=700` fires the FIRST OM at t=700 (count→1), not at t=0. Tests advancing `700 + omMs - 50` expected count=0 but the first OM already fired at t=700.
- **Fix:** Corrected test NK-03 to use boundary checks relative to actual timing (600ms < 700ms LEAD → count=0; 700+10ms → count=1; then omMs boundary). Corrected NK-01 to stop before first back OM fires by using `700 + omMs*7 + 500` (not `700 + omMs*8 + 100`).
- **Files modified:** `src/hooks/useNKEngine.test.tsx`
- **Commit:** 9b04cb4 (fixed within the GREEN task commit)

## Known Stubs

None — the hook is complete and self-contained. Audio injection means callers provide
real cue functions; the hook itself has no stubs.

## Threat Flags

No new threat surface introduced. The `useEffect` cleanup (`clearTimeout`) mitigates T-31-02 (torn-down component timer). The `stepOm` ref-read pattern mitigates T-31-03 (stale-closure tampering). T-31-01 (non-multiple-of-4 frontCount) is handled upstream by `coerceNaviKriyaSettings` as specified.

## Self-Check: PASSED

- `src/hooks/useNKEngine.ts` — FOUND
- `src/hooks/useNKEngine.test.tsx` — FOUND
- Commit `4bb7fad` (RED) — FOUND
- Commit `9b04cb4` (GREEN) — FOUND
- `NK_OM_SECONDS.medium === 2.16` — CONFIRMED
- `grep -c "eng.current"` — 10 (>= 5 required)
- `npx tsc --noEmit` — PASS
- `npx vitest run` — 1063/1063 tests pass (0 regressions)

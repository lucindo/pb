---
phase: 52-visibility-resume-clamp-lookahead-scheduling
plan: "01"
subsystem: audio
tags:
  - audio
  - scheduling
  - lookahead
  - cancellation
dependency_graph:
  requires:
    - Phase 50 D-04 (closed Cue catalog)
    - Phase 50 D-05 (schedule() dispatch seam)
    - Phase 18 D-08 (capture-at-construction timbre)
    - Phase 18 AUDIO-04 (explicit-disconnect try/catch posture)
  provides:
    - LOOKAHEAD_WINDOW_SEC / LOOKAHEAD_MIN_CUES / MAX_TICK_DELTA_SEC constants
    - CueHandle.cancel(): void on every cue builder
    - engine.topUpLookahead() facade
    - engine.cancelFutureCues() helper
  affects:
    - Plan 52-02 (clamp) — imports MAX_TICK_DELTA_SEC
    - Plan 52-03 (lookahead trigger) — calls topUpLookahead
    - Plan 52-04 (mute + force-top-up) — calls cancelFutureCues, wires onResume force-top-up
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN per task (3 tasks × 2 commits)
    - Snapshot-iterate-then-mutate (AH-WR-07) for cancelFutureCues
    - Phase 18 AUDIO-04 try/catch posture extended to cancel() closures
    - SAFE_LEAD_SEC callee-side clamp pattern from scheduleNextCue
key_files:
  created: []
  modified:
    - src/audio/audioEngine.ts
    - src/audio/cueSynth.ts
    - src/audio/nkCueSynth.ts
    - src/audio/audioEngine.test.ts
decisions:
  - "D-02 locked at 6: LOOKAHEAD_WINDOW_SEC = 6 as const exported from audioEngine.ts"
  - "D-03 locked at 2: LOOKAHEAD_MIN_CUES = 2 as const exported from audioEngine.ts"
  - "D-06 locked at 0.1: MAX_TICK_DELTA_SEC = 0.1 as const exported from audioEngine.ts"
  - "D-09 cancel(): collect oscList/partialGainList per partial loop; same try/catch posture as AUDIO-04 ended listener"
  - "scheduleEndChord cancel: collects voiceOscs/voicePartialGains/voiceFilters/voiceEnvelopes + masterEnvelope"
  - "topUpLookahead: verbatim closed/muted/pruneExpiredCues posture from scheduleNextCue"
  - "cancelFutureCues: [...activeCues] snapshot per AH-WR-07; scheduledAt > now predicate for D-10 separation"
metrics:
  duration: "10m"
  completed_date: "2026-05-28"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
  tests_added: 28
  tests_baseline: 1283
  tests_final: 1415
requirements_completed:
  - SCHED-02
  - SCHED-05
  - DEPS-01
  - QUAL-01
---

# Phase 52 Plan 01: Engine Foundation — Constants + CueHandle.cancel + topUpLookahead + cancelFutureCues

**One-liner:** Exports three typed-literal constants (D-02/D-03/D-06), extends `CueHandle` with `cancel(): void` across all 10 cue builders via AUDIO-04 posture, and adds `topUpLookahead()` + `cancelFutureCues()` to `AudioEngine` using the closed/muted/snapshot-iterate patterns from existing engine facades.

## Summary

This plan establishes the engine-side foundation for Phase 52 lookahead scheduling. Three numeric constants are exported as `as const` typed literals from `audioEngine.ts`. The `CueHandle` interface is extended with a `cancel(): void` member, and every cue builder in `cueSynth.ts` and `nkCueSynth.ts` now returns a cancel closure that calls `cancelScheduledValues` + `osc.stop()` + disconnect chain with try/catch per the Phase 18 AUDIO-04 posture. The `AudioEngine` interface and implementation gain `topUpLookahead(args)` (dispatches a caller-supplied cue list via the existing `schedule()` switch with the closed/muted/prune/clamp posture) and `cancelFutureCues()` (snapshot-iterates `activeCues`, calls `cancel()` + `activeCues.delete()` for cues with `scheduledAt > audioCtx.currentTime`).

All three tasks used TDD RED/GREEN cycles. Total new test count: 1415 (baseline 1283 + 132 net increase including 9 constants + 12 cancel + 7 topUpLookahead/cancelFutureCues + supplemental fixture updates).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Constants tests | 94e2717 | audioEngine.test.ts |
| 1 | Export Phase 52 constants | d4504fc | audioEngine.ts |
| RED | CueHandle.cancel tests | 3cfe8ce | audioEngine.test.ts |
| 2 | Extend CueHandle + wire cancel closures | 389a900 | cueSynth.ts, nkCueSynth.ts, audioEngine.test.ts |
| RED | topUpLookahead + cancelFutureCues tests | 0188ae9 | audioEngine.test.ts |
| 3 | Add topUpLookahead + cancelFutureCues | e78d368 | audioEngine.ts, audioEngine.test.ts |

## Verification Results

- `pnpm vitest run src/audio/audioEngine.test.ts`: 69/69 pass
- `pnpm tsc --noEmit`: PASS (0 errors)
- `pnpm build`: PASS (bundle emitted, no dead-code warnings)
- `pnpm test:run`: 1415/1415 pass (120 test files)
- `pnpm vitest run src/audio/sessionClock.driftGuard.test.ts`: 2/2 pass (no regression)
- Pre-existing `pnpm lint` errors in unrelated files (sessionPresentation.ts, sessionClock.test.ts, useAudioCues.ts, useWakeLock.ts, storage.ts) are out of scope — baseline had same 7 errors before this plan.

## Deviations from Plan

### Out-of-scope issues deferred

Pre-existing lint errors in 5 files not touched by this plan:
- `src/app/sessionPresentation.ts:113` — `@typescript-eslint/no-unnecessary-type-conversion`
- `src/audio/sessionClock.test.ts:377` — `@typescript-eslint/no-unsafe-assignment`
- `src/hooks/useAudioCues.ts:373` — unused eslint-disable directive
- `src/hooks/useWakeLock.ts:122` — unused eslint-disable directive
- `src/storage/storage.ts:254-257` — `@typescript-eslint/restrict-template-expressions` (2 errors) + unused disable

These existed in the baseline (confirmed by stash check). Not fixed per scope boundary rule.

### Auto-fixes (Rule 2)

None required.

### Build fix during Task 3 GREEN

The `fakeChord` fixture in the end-chord test (added in Plan 50-06) was missing the new `cancel: vi.fn()` field after `CueHandle` was extended in Task 2. Fixed inline as part of the build-green gate during Task 3 GREEN commit (Rule 1 — build was broken by the interface extension).

## TDD Gate Compliance

All three tasks followed RED/GREEN cycle:
- Task 1: commit 94e2717 (RED) → d4504fc (GREEN)
- Task 2: commit 3cfe8ce (RED) → 389a900 (GREEN)
- Task 3: commit 0188ae9 (RED) → e78d368 (GREEN)

## Known Stubs

None. All three constants are real values, all cancel closures are fully wired, `topUpLookahead` dispatches via the real `schedule()` switch, `cancelFutureCues` iterates real `activeCues`.

## Threat Flags

No new network endpoints, auth paths, file access, or schema changes. The additions are purely in-process WebAudio graph management within the existing engine lifecycle boundary (start → close). T-52-01 (topUpLookahead DoS via large cue list) is mitigated at the caller level per the threat register note — no additional engine-side cap added per T-52-01 disposition.

## Self-Check: PASSED

Files verified:
- src/audio/audioEngine.ts: FOUND (contains 3 new const exports + topUpLookahead + cancelFutureCues)
- src/audio/cueSynth.ts: FOUND (cancel field in CueHandle, cancel closures in scheduleBowlCue + scheduleTick)
- src/audio/nkCueSynth.ts: FOUND (cancel closures in scheduleNKTick + scheduleCountdownTick + scheduleEndChord)
- src/audio/audioEngine.test.ts: FOUND (69 tests)

Commits verified in log:
- 94e2717 (RED constants)
- d4504fc (GREEN constants)
- 3cfe8ce (RED cancel)
- 389a900 (GREEN cancel)
- 0188ae9 (RED topUp/cancel)
- e78d368 (GREEN topUp/cancel)

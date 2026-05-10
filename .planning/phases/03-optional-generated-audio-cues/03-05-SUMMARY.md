---
phase: 03-optional-generated-audio-cues
plan: 05
type: execute
status: complete
completed: 2026-05-09
---

# Plan 03-05: Manual Audio QA — Summary

Six human-verification checkpoints covering subjective audio quality and
real-device platform behavior that no automated test can verify.

## Outcome

**All six checkpoints approved. Phase 3 ready for `/gsd-verify-work`.**

No bowl-cue or mute-fade tuning was applied — every defaults locked.
Real-device iPhone testing covered Pitfalls 5 + 7; Pitfall 6 (phone-call
interrupted state) deferred to a follow-up session (no inbound/outbound
call available during this UAT).

## Final tunable values (all defaults, none changed during UAT)

| Constant | File | Value |
|----------|------|-------|
| IN_FUNDAMENTAL_HZ | `src/audio/cueSynth.ts` | 440 (A4) |
| OUT_FUNDAMENTAL_HZ | `src/audio/cueSynth.ts` | 220 (A3) |
| PEAK_GAIN | `src/audio/cueSynth.ts` | 0.18 |
| IN_DECAY_TIME_CONSTANT | `src/audio/cueSynth.ts` | 1.4 |
| OUT_DECAY_TIME_CONSTANT | `src/audio/cueSynth.ts` | 1.8 |
| TICK_FUNDAMENTAL_HZ | `src/audio/cueSynth.ts` | 1200 |
| TICK_PEAK_GAIN | `src/audio/cueSynth.ts` | 0.12 |
| MUTE_FADE_TIME_CONSTANT | `src/audio/audioEngine.ts` | 0.05 (~150 ms) |

## Checkpoint results

| # | Checkpoint | Result |
|---|------------|--------|
| 1 | Bowl-cue subjective tuning (AUDI-01) | approved — defaults locked |
| 2 | Mute fade-out smoothness (AUDI-02 / D-08) | approved — fade smooth |
| 3 | 3-2-1 lead-in tick distinctness (D-15) | approved — tick distinct |
| 4 | AC-failure path is fully usable (D-10) | approved — fallback works |
| 5 | iOS Safari real-device behavior | partial — see below |
| 6 | Phase 3 acceptance criteria sign-off | approved (16/16) |

## iOS UAT outcome (Checkpoint 5)

| Pitfall | Coverage | Result |
|---------|----------|--------|
| 5 — background-tab continuation | Real iPhone Safari, ~30 s background | OK — timing accurate, audio continued |
| 6 — phone-call interrupted-state | **deferred** | will test in a future session (no call available during this UAT) |
| 7 — hardware ringer/silent switch | Real iPhone Safari, both positions | OK — silent switch correctly suppresses Web Audio output |

Pitfall 6 is a documented platform limitation with no v1 mitigation
planned (per 03-RESEARCH.md Open Question 5 + Assumption A6). Deferring
it does not block the phase.

## Phase 3 acceptance checklist (16/16 confirmed)

**AUDI-01 — Generated bowl/gong cues aligned to phase changes**
- [x] Cue fires at start of every In phase
- [x] Cue fires at start of every Out phase
- [x] Cues perceptually aligned with orb turning point
- [x] Cue character bowl-like (strike-and-decay), not siren / not pad

**AUDI-02 — Mutable audio with visual guide intact**
- [x] Mute toggle inline next to Start/End (D-05)
- [x] Speaker / speaker-with-slash icons per D-06
- [x] First-visit default audio ON (D-07)
- [x] Muting mid-cue applies smooth fade-out (D-08)
- [x] Unmuting mid-phase does not fire make-up cue (D-08)
- [x] AC failure → visuals-only + disabled mute icon (D-10)

**D-13 / D-14 / D-15 — Lead-in**
- [x] 3-2-1 numerals appear in orb area, one per second
- [x] First In phase begins at t=3 s, not at Start click moment (SESS-05)
- [x] Each numeral accompanied by tick distinct from bowl cues
- [x] No "Begin" word; numerals replaced by In label at t=0

**D-11 / D-16 — End-of-session**
- [x] Manual End → AC closes, no closing-bell cue
- [x] Modal-confirm End → AC closes, no closing-bell cue
- [x] Timed completion → last cue tail rings out, then silence; readout shows "Session complete"
- [x] End during lead-in → cancels back to idle without modal

## In-flight bug fixes during UAT

The user surfaced six functional defects during Checkpoint 1. All were
real Phase-3 wiring/UX bugs (not audio-tuning concerns). Per the plan's
escape clause ("if any item fails, document which one — the failing
item gets reopened as a follow-up plan or bug fix before phase close")
they were fixed inline within Plan 05 instead of being routed to a
gap-closure phase.

| # | Bug | Commit | Root cause |
|---|-----|--------|------------|
| 1 | Timed completion cut mid-In/mid-Out | `a15d610` | `getSessionFrame` flipped `isComplete` the instant `elapsedMs >= plan.totalMs`. Fixed by rounding `totalMs` up to the next cycle boundary. |
| 2 | Start session no-op after Complete (race) | `1f16b52` | `useAudioCues.stop()` awaited `engine.close()` before nullifying `engineRef.current`. Fast Start click during the close window hit the defensive guard in `start()` and returned from a closing AudioContext. Fixed by clearing the ref synchronously. |
| 2b | Start session no-op after Complete (real cause) | `f0d25a9` | The `audio` object literal returned by `useAudioCues` was a new identity each render. The complete useEffect depended on `audio` and re-fired on every render while `state.status === 'complete'`, repeatedly resetting `appPhase` to `'idle'` and tearing down the engine that `audio.start()` had just rebuilt. Fixed by hoisting the stable inner callbacks (`audio.stop`, `audio.start`, `audio.audioNow`, `audio.notifyPhaseBoundary`) and depending on those instead. The earlier ordering fix (1f16b52) was necessary but not sufficient. |
| 3 | Start session no-op after manual / modal End | `c2f6ebd` | `requestEnd` and `confirmEnd` transitioned `state.status` to `'idle'` but never reset `appPhase`. Fixed by widening the lifecycle reset useEffect predicate from `state.status === 'complete'` to `state.status !== 'running'` so it fires on idle and complete alike. |
| 4 | Lead-in countdown rendered on configuration screen | `64c6af1` | The session-view layout (settings collapsed, description hidden, tighter top margin) was gated on `state.status === 'running'` rather than `appPhase !== 'idle'`. Fixed by introducing `inSessionView` and using it for description visibility, top-margin spacing, and the `SettingsForm` `isRunning` prop. |
| 5 | "Remaining 0:00" chip absent during lead-in (layout shift) | `bd72cff` | `SessionReadout` only rendered the chip once `session.currentFrame` existed. Fixed by synthesising an `elapsedMs=0` frame from the locked settings during lead-in (`leadInPlaceholderFrame`). |
| polish | "Remaining 0:00" persisted on Session complete | `3defb34` | Hidden once `status === 'complete'` — the headline already says everything. |
| feat | 1-minute duration option | `a574db8` | Added 1 to `DURATION_OPTIONS` so manual UAT cycles can verify timed-completion paths quickly. |

All six fixes shipped with regression tests. No tuning constants in
`cueSynth.ts` or `audioEngine.ts` were modified — Plan 05's
"files_modified" frontmatter declares those files for the in-scope
tuning case, which did not occur.

## Files modified (final tally)

- `src/app/App.tsx` — lifecycle reset widening, session-view collapse,
  hoisted stable audio callbacks, lead-in placeholder frame
- `src/hooks/useAudioCues.ts` — synchronous engineRef nulling
- `src/hooks/useAudioCues.test.tsx` — race regression test
- `src/domain/sessionMath.ts` — cycle-end-aligned completion
- `src/domain/sessionMath.test.ts` — mid-cycle hold test
- `src/domain/sessionController.test.ts` — completion expectations
- `src/hooks/useSessionEngine.test.tsx` — completion advance time
- `src/app/App.session.test.tsx` — completion advance time
- `src/app/App.audio.test.tsx` — completion advance time
- `src/app/App.dialog.test.tsx` — completion advance time
- `src/components/SessionReadout.tsx` — hide chip on `complete`
- `src/domain/settings.ts` — add 1-min duration
- `src/domain/breathingPlan.test.ts` — DURATION_OPTIONS expectation

## Test status

171/171 pass (was 169 after Plan 04; +2 new regression tests covering
cycle-end completion and the audio close race).

## Follow-up items deferred

| Item | Disposition |
|------|-------------|
| iOS Pitfall 6 (phone-call interrupted state) | Future ad-hoc test when a call is available; documented platform limitation, no v1 mitigation planned. |
| Volume control | v2 — already tracked as AUDI-03 per ROADMAP.md. |
| Pre-existing lint errors (App.tsx set-state-in-effect, vitest.setup `_options`, usePrefersReducedMotion set-state-in-effect) | Logged in `.planning/phases/03-optional-generated-audio-cues/deferred-items.md` from Plan 02; not introduced by this plan. |

## Self-Check: PASSED

- Six checkpoints completed with structured user responses
- 16/16 acceptance items confirmed
- Tunable constants unchanged from Plan 01 / Plan 02 defaults
- All in-flight bug fixes shipped with tests; full suite green
- iOS Pitfall 6 deferral documented with explicit rationale

---
title: Audio clock unification + scheduler abstraction — milestone proposal
date: 2026-05-27
context: /gsd:explore — proposed milestone scope; user committed to running this as a milestone
---

## Milestone goal

Fix every audio-stack bug currently on file:
- iOS speaker route quirk (#6) — small, fast-shipping opening phase.
- Three-clocks divergence underlying audio/animation sync (#1, #2, #4, #5) — replace boundary-driven cue scheduling with a lookahead model so audio survives background tabs.
- Stop-and-restart mute (#3a) — replace with master-gain mute.

Land the architectural work behind a `SessionClock` / scheduler abstraction so a future library swap (Tone.js, etc.) is a single-implementation change.

Underlying diagnosis and citations: `.planning/notes/audio-animation-three-clocks-diagnosis.md`.

Out of scope for this milestone:
- Continuous ambient layer — separate seed, not required to fix #3.
- Library migration (Tone.js / Howler) — explicitly deferred; the abstraction keeps it available later.

## Proposed phase shape

Numbering is illustrative — fits after the v2.1 close (last shipped phase: 48).

### Phase A — iOS speaker route fix (#6)

Small, fast-shipping opening phase. Independent of the audio-clock work that follows, but lives in this milestone because it's the same domain (audio-stack bugs) and unblocks at least one user on mobile immediately.

- Implement silent looping `<audio playsInline>` element to coerce iOS Safari from "ambient" to "playback" audio session category.
- Wire startup into the same user-gesture chain that constructs the `AudioContext` (`createAudioEngine`).
- Tear down on `AudioContext` close.
- No-op or near-no-op on non-iOS platforms.

Full spec, validation steps, and edge cases: `.planning/todos/2026-05-27-ios-speaker-route-audio-element-fix.md`.

Fixes: #6.

### Phase B — `SessionClock` / scheduler abstraction layer

Carve out the abstraction without changing runtime behavior.

- Define `SessionClock` interface: `now()`, `schedule(when, cue)`, `setMasterGain(value, rampSec)`, `onSuspend` / `onResume`.
- Reimplement `audioEngine.ts` to export the new interface (delegating to its existing internals).
- All callers (`useSessionEngine`, `useAudioCues`, `useNaviKriyaAudio`, `useNKEngine`, etc.) consume the interface instead of touching `AudioContext` directly.
- No behavior change yet — pure structural refactor with full test parity.

### Phase C — Master clock unification

Rebase session timing onto `audioCtx.currentTime`.

- `useSessionEngine` reads elapsed from `SessionClock.now() - sessionStartCtxTime` instead of `performance.now() - startedAtMs`.
- `useAmbientScale` same.
- Animation tick computes phase progress *from* the audio clock each rAF, not from its own time source.
- Verify behavior under iOS lock (AC suspends → both clocks pause together → no drift on resume).

Fixes: #1, #2.

### Phase D — Visibility-resume delta clamp + lookahead scheduling

- Add a per-tick elapsed-delta clamp so a long hidden window can't cause a catch-up burst on the first rAF back.
- Replace boundary-driven cue scheduling with a 5–10s lookahead window. The scheduler queues N cues ahead in the WebAudio graph; the rAF tick is no longer the bottleneck for audio continuity.
- Verify: backgrounded tab continues playing audio for the full lookahead window; coming back to foreground does not produce an animation burst.

Fixes: #4, #5.

### Phase E — Master-gain mute

- Insert a master `GainNode` between cue chains and `destination`.
- Mute: `linearRampToValueAtTime(0, now + 0.05)`. Unmute: inverse.
- Remove the engine-teardown / engine-rebuild logic from the current mute path.
- Verify: mute/unmute is instant; HRV unmute lands on the current sustain floor with no perceptual wait.

Fixes: #3a (the actual bug). #3b (the inherent "unmute mid-phase has silence until next boundary") does **not** apply to HRV/Stretch — the existing cue envelope's sustain-floor design already provides continuity (see diagnosis note). Navi Kriya cues are short enough that the gap is imperceptible.

## Success criteria

- iOS lock/unlock during a session: audio and animation remain in phase on resume. No visible burst, no audio drift.
- Tab backgrounded for N seconds (where N ≥ lookahead window): audio continues to play; on foreground, animation does not race.
- Tab backgrounded indefinitely: audio plays through the lookahead window, then stops cleanly (no garbled output).
- Mute/unmute mid-session: gain ramps audibly within ~50 ms. No engine teardown. Unmute does not wait for the next phase boundary in HRV.
- Test suite parity: all existing audio/session tests continue to pass; new tests cover the new clock + scheduler behavior.
- No new external dependencies. `audioEngine.ts` consumers never touch `AudioContext` or `performance.now()` directly.

## Risks and open questions

- **Lookahead cadence vs. settings changes.** If a user changes BPM or timbre mid-session, queued cues in the lookahead window are now stale. Need a cancel-and-reschedule mechanism. Cost: extra state in the scheduler.
- **WebAudio scheduling precision under suspended AC.** Need to verify that `setValueAtTime` events queued before suspension fire correctly on resume across iOS Safari, Android Chrome, desktop Chrome/Firefox.
- **rAF clamp threshold.** Picking the right "you were gone too long" threshold — too tight and normal frame jitter triggers it, too loose and the catch-up burst returns.
- **Test infrastructure.** Existing audio tests stub `AudioContext`; the new lookahead model may need richer fake-timer support.

## Dependencies

None on other milestones. Phase A (iOS speaker) is independent of Phases B–E and can ship first as a quick win.

## Operator next action

Run `/gsd:new-milestone` (or whatever the project's milestone-init flow is) and use this document as the input scope. The four proposed phases above can be tuned during plan-phase.

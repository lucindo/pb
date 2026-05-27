---
title: Audio/animation three-clocks diagnosis
date: 2026-05-27
context: /gsd:explore session — audio + animation stack pain points
---

## Problem statement

Six observed issues with the audio + breathing-animation stack:

1. Lock/unlock makes audio and animation go out of sync.
2. User reports of intermittent audio/animation drift.
3. Mute/unmute behaves as stop+restart — on unmute, sound can lag several seconds until the next phase boundary because audio start is gated on animation state.
4. Backgrounding the app → on foreground, breathing animation "races" to catch up missed motion (mobile + desktop).
5. Browser tab switch / minimize → audio stops (use case: practice while reading another tab or on a call).
6. Mobile (iOS): audio plays through headphones but not speaker for at least one user.

## Diagnostic finding — three clocks

The codebase is running on **three independent time sources**, and bugs #1–#5 trace to their divergence:

| Clock | What it drives | Behavior when tab hidden / screen locked |
|---|---|---|
| `performance.now()` | Session elapsed time (`useSessionEngine.ts:144,235,238`, `useAmbientScale.ts:35`) | Keeps running — monotonic wall clock |
| `requestAnimationFrame` | Tick loop that *reads* elapsed and renders (`useSessionEngine.ts:161,165`) | Paused when tab hidden / screen locked |
| `audioCtx.currentTime` | Audio scheduling — `scheduleInCue` / `scheduleOutCue` / `setValueAtTime` (`audioEngine.ts`, `cueSynth.ts`) | Suspends on iOS lock (already handled — `audioStatus.ts`, `'interrupted'` state, `needs-resume` flow) |

### How each bug falls out

- **#1, #2 sync drift / lock-unlock** — audio is on `audioCtx.currentTime`, animation timing is on `performance.now()`. They drift any time one suspends and the other doesn't (iOS lock suspends AC; tab hide doesn't suspend `performance.now()`). They were never on the same clock.
- **#4 catch-up burst on resume** — rAF is paused while hidden, `performance.now()` keeps ticking. First frame back computes a huge elapsed delta and jumps many phases in one tick (math at `useSessionEngine.ts:144`; the ambient loop's "compensate by adjusting start" at `useAmbientScale.ts:41-43` is the source of the visible burst).
- **#5 audio stops in background tab** — cue scheduling is **boundary-driven** (`audioEngine.ts:8` comment). New cues are scheduled only when the rAF tick detects a phase boundary. rAF paused → no boundary detected → nothing scheduled. Whatever was already in WebAudio plays out, then silence.
- **#3 mute = stop + wait-for-boundary** — consequence of boundary-driven scheduling: there's no live continuous chain to attenuate, just discrete cues queued at boundaries. A real mute would need a master gain node + persistent synth chain.
- **#6 iOS speaker-only-with-headphones** — orthogonal. iOS Safari's "ambient" audio session category defaults to silent-switch-respecting routing. Standard workaround: silent `<audio playsInline>` to coerce a "playback" session.

## HRV cue envelope already provides continuity

Important secondary finding: HRV / Stretch cues are **not** "discrete event with silence between" — the envelope was deliberately designed for perceptual continuity at low BPM. From `cueSynth.ts:89-95, 110, 130-131`:

- When phase duration > `defaultDecayTau * PERCEPTUAL_SILENCE_TAU_MULT`, `needsSustain` flips on.
- Envelope decays via `setTargetAtTime` toward a **non-zero sustain floor** (`peakGain * SUSTAIN_FLOOR_RATIO`), NOT to silence.
- Cue holds at that audible floor for the bulk of the phase.
- Hard-fade to silence only in the last `PHASE_END_FADE_OUT_LEAD_SEC` before the next phase boundary.

Comment at `cueSynth.ts:89-92` documents the original fix: *"when the phase outlasts natural perceptual silence, decay toward a non-zero sustain floor (audible until the flip)"*.

**Consequence for #3:** master-gain mute on top of the existing envelope fully solves the unmute UX in HRV/Stretch — unmute lands the user back into whatever sustain level the cue is currently sitting at, immediately. Navi Kriya cues are short and close together, so the perceptual gap is already minimal there.

## Fix shape (no external deps)

1. **Master clock = `audioCtx.currentTime`.** `useSessionEngine` reads elapsed from `audioCtx.currentTime - sessionStartCtxTime` instead of `performance.now() - startedAtMs`. Animation is *derived from* the audio clock each rAF tick.
2. **Visibility-resume clamp.** Cap the per-tick elapsed delta so a long hidden window can't cause a catch-up burst.
3. **Lookahead scheduling.** Queue cues 5–10s ahead in the WebAudio graph instead of scheduling one-at-a-time at phase boundaries. Background tabs keep playing because the audio is already in the graph.
4. **Master gain node** between cue chains and `destination`. Mute = `gain.linearRampToValueAtTime(0, now+0.05)`; unmute = inverse. No engine teardown.
5. **Abstraction layer** — `SessionClock` / scheduler interface so callers never touch `AudioContext` or `performance.now()` directly. Future Tone.js (or other library) swap stays a single-implementation change. Sketch:

   ```
   SessionClock.now() → seconds
   SessionClock.schedule(when, cue) → handle
   SessionClock.setMasterGain(value, rampSec)
   SessionClock.onSuspend / onResume
   ```

## What's separate

- **#6 iOS speaker route** — small targeted fix (silent `<audio playsInline>` hook). Independent of the architecture change. See `.planning/todos/2026-05-27-ios-speaker-route-audio-element-fix.md`.
- **Continuous ambient layer** — not required to fix #3 (HRV envelope already provides continuity). Captured as forward-looking idea in `.planning/seeds/continuous-ambient-layer.md`.

## Why no library swap right now

Discussed: Tone.js, Howler.js, p5/Three/Pixi.

- **p5 / Three / Pixi** — rendering libs, wrong category. None address audio/animation sync.
- **Tone.js** — its Transport enforces exactly the master-clock pattern above. Migrating means rewriting `audioEngine.ts` + `cueSynth.ts` on top of Tone primitives. Worth it only if we want broader Tone surface (richer scheduling DSL, effects, polyphony, samples). Current direction is "stay simple, synthesized one-shot cues at boundaries" → not enough payoff to justify migration cost.
- **Howler.js** — sample-based loop/playback library. Wrong tool for synthesized cues. Would earn its place only if we ever ship the continuous-ambient-layer seed with sample loops.

The architecture fix above gives us the same behavior wins as a Tone migration would, at lower cost, and the `SessionClock` abstraction keeps the library swap available later.

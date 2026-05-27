---
created: 2026-05-27T00:00:00.000Z
title: iOS speaker route — silent <audio> element to coerce playback session
area: audio
status: scoped-into-v2.2-phase-49
resolves_phase: 49
files:
  - src/audio/audioEngine.ts
  - src/hooks/useAudioCues.ts
---

> **Status:** Scoped as Phase 49 of the v2.2 Audio Sync milestone — see `.planning/notes/audio-clock-milestone-proposal.md`. This document remains the canonical spec for that phase.

## Problem

User report: on iOS, the app's audio only plays through headphones; the speaker stays silent. This is iOS Safari's "ambient" audio session category — the default for Web Audio pages — which respects the silent switch and routes preferentially to headphones / external output. The current app uses raw Web Audio with no session-coercion trick, so iOS picks the most-restrictive routing.

Diagnosis context: `.planning/notes/audio-animation-three-clocks-diagnosis.md` (issue #6).

## Solution

Add a silent looping `<audio playsInline>` element that starts on the same user-gesture chain as the existing `AudioContext` (`createAudioEngine` user-gesture path). Once playback begins, iOS Safari reclassifies the page from "ambient" to "playback" session category, which routes through the speaker even with the silent switch on and with no headphones connected.

Key constraints:

- The audio element must autoplay only after a user gesture — wire it into the same gesture chain that creates the `AudioContext`. Do not attempt to play it on page load.
- Use a programmatically-generated silent buffer (data URL or short generated WAV) — no extra asset to ship.
- Set `playsInline`, `loop`, `muted={false}`, `volume={near-zero}` (not 0; some iOS Safari versions ignore truly-silent tracks). Source must be a real decodable WAV / MP3, not an empty source.
- Tear down the element on `AudioContext` close to release the playback session.
- Should be a no-op on non-iOS platforms. Either gate by user-agent, or just accept that other platforms cheaply have a silent loop running — measure first.

## Validation

- iOS device with silent switch ON, no headphones: app audio plays through speaker.
- iOS device with headphones connected: audio routes through headphones (unchanged).
- iOS device with silent switch OFF: audio plays normally (unchanged).
- Non-iOS platforms: no audible regression, no perf regression.
- Background-tab + lock-screen behavior on iOS unchanged after the fix.

## Notes

- Scoped as the opening Phase A of v2.2 Audio Sync milestone (`.planning/notes/audio-clock-milestone-proposal.md`). Quick-shipping front-runner — independent of Phases B–E and can land first.
- If the audio-clock milestone later adds a continuous ambient layer (`.planning/seeds/continuous-ambient-layer.md`), that layer would naturally subsume this trick (a continuously-playing real audio source has the same iOS-session-coercion side effect). For now, ship this as a small targeted fix.
- Howler.js bakes this trick in internally; we are stealing the pattern without taking the dep.

---
title: Continuous ambient layer under cues
trigger_condition: aesthetic direction shifts toward atmospheric bed under cues, OR sample-based content is added to the app
planted_date: 2026-05-27
context: /gsd:explore session — surfaced as a possible fix for mute/unmute UX, then ruled non-essential
---

## The idea

Add a continuously-playing ambient audio layer (synth drone or sample loop) underneath the existing cue events. Cues become accents over a bed of sound rather than discrete events with (perceived) silence between them.

## Why it came up

During the audio/animation /gsd:explore session, surfaced as a candidate fix for issue #3 (mute/unmute UX feels broken — wait several seconds after unmute to hear anything).

**Outcome:** ruled non-essential for fixing #3.

The HRV cue envelope already provides perceptual continuity at low BPM via a non-zero sustain floor (`cueSynth.ts:89-95, 110, 130-131`). With the planned master-gain mute (see `.planning/notes/audio-clock-milestone-proposal.md` Phase D), unmute will land the user directly on whatever sustain level the cue is currently at — no perceptual wait. Ambient layer is therefore not needed to fix the mute UX.

It remains on the table as a pure **aesthetic / atmosphere choice**.

## When to revisit

Trigger conditions:

1. **Aesthetic direction** — operator or user feedback indicates a meditative bed would deepen the practice (vs. current "spacious silence between cues" feel).
2. **Sample-based content** — if we decide to add sample loops (nature, tampura, om drone, etc.), the infrastructure for a continuous layer is most of the work; the ambient bed becomes the obvious first use.
3. **#6 iOS speaker route** — if the silent-`<audio>` trick (separate todo) proves insufficient, a continuously-playing real ambient source is a stronger nudge for iOS Safari's playback session category.

## Considerations when we do this

- **Aesthetic / texture.** This is a meditative app; wrong ambient is worse than no ambient. Options: synth drone (filter sweep through a sine/triangle pad — stays in the current synthesized model); sample loop (richer but needs new assets and crossfading for seam-clicks).
- **User choice.** Likely a setting, not a default. Some users explicitly want silence between cues. Forrest, Navi Kriya, HRV, Stretch may each want different defaults.
- **Mix architecture.** Adds an ambient gain stage parallel to the cue gain, both under the master gain. Decide whether the mute button mutes everything (probably yes) or only cues.
- **Loop seam.** Synth drones avoid this for free. Sample loops need crossfade — this is where Howler.js could earn a place in the stack (sample looping with crossfade is its specialty). Synthesized cues stay on raw WebAudio either way.
- **Per-practice choice.** Different practices may want different beds (or none). Likely keyed off the existing practice/timbre choice system.

## Related

- Diagnosis: `.planning/notes/audio-animation-three-clocks-diagnosis.md`
- Milestone proposal: `.planning/notes/audio-clock-milestone-proposal.md`
- iOS speaker route todo: `.planning/todos/2026-05-27-ios-speaker-route-audio-element-fix.md`

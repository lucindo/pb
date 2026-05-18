---
spike: 004
name: countdown-beep-alternatives
type: comparison
validates: "Given the 3-2-1 session lead-in, when the user auditions the current beep against alternatives in one harness, then a small loudness-comfortable set worth shipping as a settings picker emerges"
verdict: PENDING
related: [003]
tags: [audio, countdown, sound-design, cue, comparison]
---

# Spike 004: Countdown Beep Alternatives

## What This Validates

**Given** the 3-2-1 session lead-in beep, **when** the user auditions the current
beep against a set of alternatives in one interactive harness, **then** a small
loudness-comfortable set worth shipping as a settings picker emerges.

The operator's framing: the current beep is good, could be a little louder, and
it would be nice to have alternatives to choose from.

## Research

No new libraries — this rides the app's existing Web Audio synthesis. Findings
from reading the production code before building:

- The countdown beep is `scheduleCountdownTick` in `src/audio/nkCueSynth.ts`.
  Phase 31 already split it onto its **own constants** (`COUNTDOWN_TICK_*`),
  separate from the per-OM tick, with a comment explicitly anticipating that
  "the countdown beep and the OM tick can be explored independently." This
  spike lands directly on that pre-carved seam.
- Today's beep: **440 Hz sine**, duration **0.12 s**, peak gain **0.08**,
  decay τ **0.05**, routed through the chosen timbre's lowpass filter
  (`buildNKToneNodes`). Played 3× at 1 s intervals by `audioEngine.ts`
  (`LEAD_IN_TICK_INTERVAL_SEC = 1.0`, `LEAD_IN_DURATION_SEC = 3.0`).
- All four timbres share `fundamentalHzIn: 440` — the beep pitch is constant
  across timbres; only the filter differs slightly.
- The same beep is shared by both HRV and Navi Kriya countdowns, so a swap is
  one function, both practices.

**Approach comparison:**

| Approach | Pros | Cons | Status |
|----------|------|------|--------|
| Synthesized oscillator beeps (Web Audio) | Zero assets, matches the app's actual synthesis, infinitely tweakable | Bounded to what oscillators+filters can do | **Chosen** — mirrors `buildNKToneNodes` |
| Bundled audio samples (.wav/.mp3) | Richer textures possible | New asset pipeline, violates the app's "no bundled audio" rule (D-04/D-14) | Rejected |

**Loudness honesty:** audible playback depends on the listener's device volume,
so a "louder?" judgement by ear alone is unreliable. The harness renders each
beep in an `OfflineAudioContext` and reports **true peak amplitude** — a
deterministic, volume-independent loudness number. The on-screen bars and the
"vs current" dB labels come from that measurement, not from listening.

## How to Run

```
open .planning/spikes/004-countdown-beep-alternatives/index.html
```

Network needed on first open (React / htm / Tailwind from CDN). Set device
volume to a normal listening level before auditioning.

## What to Expect

- Seven beep cards: **Current**, **Current · louder**, **Crisp ping**,
  **Wood tick**, **Bell pip**, **Double blip**, **Rising pip**.
- Each card: a measured loudness bar + "vs current" dB figure, and three
  controls — **Play 3-2-1** (the real lead-in sequence), **Single beep**, and
  **A/B vs Current** (plays Current, then the variant, ~0.85 s apart).
- A "now playing" strip lighting up 3 · 2 · 1 during a sequence.
- A "+ picker" toggle per card and a running summary of what's selected for the
  settings picker.
- An event log of every audition with the measured dB delta.

## Observability

- **Offline loudness measurement** — every variant is rendered in an
  `OfflineAudioContext` on load; peak + RMS computed from the raw buffer. The
  loudness bars and dB deltas are verifiable measurements, not impressions.
- **Event log** — timestamped record of each audition (single / 3-2-1 / A/B)
  with the dB-vs-current delta where applicable.

## Investigation Trail

1. **Located the seam.** Read `nkCueSynth.ts` / `cueSynth.ts` / `audioEngine.ts`.
   Confirmed `scheduleCountdownTick` is already isolated on its own constants —
   the cleanest possible target. The beep is a single 440 Hz sine, 0.12 s,
   peak 0.08.
2. **Built the harness.** Reproduced `buildNKToneNodes` as a buildless
   `scheduleTone` (osc → lowpass → `setTargetAtTime` decay). Variant `current`
   is byte-faithful to the production parameters so every other variant is
   judged against the real thing.
3. **Designed the variant set.** One pure tweak (louder), and five genuine
   alternatives spanning the design space: brighter/higher (Crisp), dry
   percussive (Wood), warm struck-bell (Bell), a two-pip countdown gesture
   (Double), and a gentle pitch-glide (Rising).
4. **Added deterministic loudness.** Because "a little louder" is the operator's
   actual ask, ear-based loudness was not good enough — added the
   `OfflineAudioContext` peak measurement so loudness is a number.
5. _(Pending operator audition — verdict to be set from the checkpoint.)_

## Results

_Pending operator audition. The harness is built and self-consistent; the
verdict (which beeps ship in the picker, and whether the default gets nudged
louder) is an operator sound-judgement call recorded at the checkpoint._

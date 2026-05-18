---
spike: 005
name: session-end-sound-alternatives
type: comparison
validates: "Given the session-complete sound, when the user auditions the current chord against alternatives, then the end sound worth shipping — and whether it ships longer — emerges"
verdict: PENDING
related: [003, 004]
tags: [audio, session-end, sound-design, cue, comparison]
---

# Spike 005: Session-End Sound Alternatives

## What This Validates

**Given** the session-complete sound, **when** the user auditions the current
chord against a set of alternatives in one interactive harness, **then** the end
sound worth shipping — and whether it should ship longer — emerges.

The operator's framing: the current end sound is good but kinda short, could be
a little longer, and it would be nice to have alternatives to choose from.

Sibling of spike 004 (countdown beep) — same file, same harness pattern.

## Research

No new libraries — rides the app's existing Web Audio synthesis. Findings from
reading the production code before building:

- The end sound is `scheduleEndChord` in `src/audio/nkCueSynth.ts`. Like the
  countdown beep, it is already isolated on its own `END_CHORD_*` constants — a
  clean swap target.
- Today's end sound: a **C-major triad** — `END_CHORD_RATIOS = [1.0, 1.25, 1.5]`
  against `preset.fundamentalHzOut` (220 Hz across all timbres) → **220 / 275 /
  330 Hz**. All three tones struck **simultaneously**, duration **1.8 s**, decay
  τ **0.8**, peak gain **0.12**.
- It is **shared**: both the HRV session-complete cue (`audioEngine.ts:226`) and
  the Navi Kriya completion cue (`App.tsx:954`) call `scheduleEndChord`, so a
  swap lands in both practices from one change.

**Approach comparison:**

| Approach | Pros | Cons | Status |
|----------|------|------|--------|
| Synthesized oscillator chords (Web Audio) | Zero assets, matches the app's real synthesis, fully tweakable | Bounded to oscillator+filter timbres | **Chosen** — mirrors `buildNKToneNodes` / `scheduleEndChord` |
| Bundled audio samples (.wav/.mp3) | Richer real-instrument textures | New asset pipeline, violates the app's "no bundled audio" rule (D-04/D-14) | Rejected |

**Duration honesty:** the operator's complaint is "kinda short," so the harness
measures it. Each variant is rendered in an `OfflineAudioContext` and reported
with both **true peak amplitude** and **effective duration** — the time until
the tail falls below −40 dB of its own peak. "Short" becomes a number.

## How to Run

```
open .planning/spikes/005-session-end-sound-alternatives/index.html
```

Network needed on first open (React / htm / Tailwind from CDN). Set device
volume to a normal listening level before auditioning.

## What to Expect

- Seven sound cards: **Current**, **Current · longer**, **Arpeggiated**,
  **Singing bowl**, **Rising resolution**, **Soft gong**, **Warm pad fade**.
- Each card: a measured **length** bar (−40 dB tail) + a **peak / vs-current**
  loudness line, and two controls — **Play**, and **A/B vs Current** (plays
  Current, then the variant, after Current's measured tail finishes).
- A "+ picker" toggle per card and a running summary of what's selected.
- An event log of every audition with the measured duration.

## Observability

- **Offline measurement** — every variant is rendered in an
  `OfflineAudioContext` on load; true peak and −40 dB effective duration are
  computed from the raw buffer. The length bars and dB deltas are verifiable
  measurements, not impressions.
- **Event log** — timestamped record of each audition with measured duration.

## Investigation Trail

1. **Located the seam.** Read `nkCueSynth.ts` — `scheduleEndChord` is already
   isolated on `END_CHORD_*` constants and shared by both practices' completion
   cues. The current sound is a 1.8 s simultaneous C-major triad at 220 Hz.
2. **Built the harness.** Generalised spike 004's `scheduleTone` with three
   envelope modes from one code path — *strike* (short attack + exponential
   decay), *swell* (long attack ramp), *pad* (ramp up, hold, linear fade-out) —
   so percussive and ambient sounds share the synthesis. Variant `current` is
   byte-faithful to the production parameters.
3. **Designed the variant set.** One pure tweak (longer), and five genuine
   alternatives spanning the design space: a sequenced unfold (Arpeggiated), a
   single rich inharmonic tone (Singing bowl), a two-chord resolution (Rising),
   a swell-in bloom (Soft gong), and a strike-free ambient fade (Warm pad).
4. **Added measured duration.** Because "kinda short" is the operator's actual
   complaint, ear-based length was not enough — the harness reports each sound's
   −40 dB tail length so the duration comparison is a number.
5. _(Pending operator audition — verdict to be set from the checkpoint.)_

## Results

_Pending operator audition. The harness is built and self-consistent; the
verdict (which end sound ships, and whether it ships longer) is an operator
sound-judgement call recorded at the checkpoint._

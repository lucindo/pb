---
spike: 008
name: chime-replacement-timbre
type: comparison
validates: "Given the kept bowl/bell/sine cues, when chime is replaced by a flute-family candidate, then the new timbre is clearly distinguishable from all three on In and Out cues and still reads as calm"
verdict: PENDING
related: [004, 005]
tags: [audio, timbre, cue, sound-design, flute, comparison]
---

# Spike 008: Chime Replacement Timbre

## What This Validates

Given the kept Bowl / Bell / Sine cues, when Chime is replaced by a flute-family
candidate, then the new timbre is clearly distinguishable from all three — on both
the In (A4) and Out (A3) cues — and still reads as calm.

The operator's observation: **Bowl and Chime are too close.** The code confirms why —
in `src/audio/timbres.ts`, the Chime preset is literally Bowl's partial stack
(`1.0 / 2.76 / 5.4`) plus one shimmer partial at `7.6×`. It is a near-clone of Bowl
by construction. Keep Bowl; find a genuinely different timbre for the fourth slot.

## Research

**Docs / source checked:** `src/audio/timbres.ts` (the four `TimbrePreset` recipes),
`src/audio/audioEngine.ts` and `src/audio/cueSynth.ts` (the synthesis path and
envelope model).

**The synthesis constraint (decision D-14).** Every preset must use
`oscillatorType: 'sine'` — no `PeriodicWave`, no new dependencies. A timbre is therefore
an *additive stack of sine partials* (each at `ratio × fundamental`, with a relative
gain), summed into one lowpass `BiquadFilter`, shaped by a single envelope `GainNode`.
The envelope today is **strike-only**: instant jump to `peakGain`, then exponential
decay (`setTargetAtTime` with `decayTau`).

**Why Bowl and Chime collide — and what makes a timbre distinct.** Bowl and Bell get
their character from *inharmonic* partials (`2.76 / 5.4` and `2.5 / 4.0`) — ratios that
are not integer multiples of the fundamental, which is what produces a metallic "clang".
Sine is a single partial — pure, characterless. Chime just reuses Bowl's inharmonic
stack, so it cannot help but sound like Bowl.

A real flute is the opposite: a **harmonic** spectrum — partials at integer multiples
(`1f, 2f, 3f…`) with a dominant fundamental and fast roll-off. Harmonic-vs-inharmonic is
the strongest axis of distinctness available within the sine-additive constraint, and it
separates a flute cleanly from both Bowl and Bell. Against Sine, the flute is set apart
by *having* upper harmonics at all, plus (optionally) a soft breath onset.

**Competing approaches (candidate timbres):**

| Approach | Tool / model | Pros | Cons | Status |
|----------|--------------|------|------|--------|
| Flute — pure harmonic | partials `1·2·3`, strike envelope | Distinct (harmonic), zero `cueSynth` change | Slightly close to Sine if filter too dark | Built |
| Flute — breathy | partials `1·2·3·4`, brighter filter | More air/presence, very distinct | Risk of feeling less "calm" | Built |
| Flute — soft attack | pure flute partials + ~0.13 s attack ramp | The true flute breath onset — most flute-like | Needs a `cueSynth` envelope-mode extension | Built |
| Reed (non-flute fallback) | rich harmonic `1–5`, gentle attack | Very distinct fallback if flute reads weak | Not what the operator asked for | Built |

**Chosen approach:** auditioned head-to-head in one harness — the operator picks. The
flute-soft variant deliberately tests whether the `cueSynth` envelope extension is worth
its cost; if a strike-envelope flute is distinct and pleasant enough, the build stays a
pure data change to `timbres.ts` (no engine change).

## How to Run

```
open .planning/spikes/008-chime-replacement-timbre/index.html
```

Network is needed on first open for the CDN imports (React 19, htm, Tailwind). Audio
starts on the first button tap (browser autoplay policy — the `AudioContext` is created
lazily inside that user gesture).

## What to Expect

- Three sections: **Kept** (Bowl/Bell/Sine, verbatim from the app), **Current chime**
  (the one being replaced), **Candidate replacements** (4 candidates).
- Each row has **In ▶** (A4 / 440 Hz) and **Out ▶** (A3 / 220 Hz) buttons.
- An **A/B compare** block plays a kept timbre then a candidate 1.4 s apart — the direct
  distinctness test.
- Play `Chime` then `Bowl` first — they should sound nearly the same (the problem).
  Then audition the candidates: each should be obviously *not* Bowl, *not* Bell,
  *not* Sine.

## Observability

An on-screen **event log** timestamps every cue and A/B play (ISO `HH:MM:SS.mmm`),
so what was auditioned is recorded, not just asserted.

## Investigation Trail

- **Start:** confirmed from `timbres.ts` that Chime = Bowl stack + one partial — the
  "too close" report is structural, not subjective. This made "keep Bowl, replace Chime"
  the right framing.
- **Synthesis constraint:** D-14 forbids `PeriodicWave`, so the flute must be built from
  stacked sines. Settled on harmonic partials as the distinctness lever (harmonic vs the
  inharmonic Bowl/Bell).
- **Envelope question:** a real flute has a breath attack, but `cueSynth` is strike-only.
  Rather than assume, the harness includes both a strike-envelope flute and a
  soft-attack flute so the operator can judge whether the engine extension earns its keep.
- *(further entries added as the audition surfaces findings)*

## Results

**Verdict: PENDING** — awaiting operator audition. The harness is built and the four
candidates are synthesized within the app's real constraints. The operator picks the
replacement (or rejects all and redirects); the choice and rationale land here, and the
winning preset's exact partial/decay/filter values become a MANIFEST requirement.

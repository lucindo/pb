---
spike: 008
name: chime-replacement-timbre
type: comparison
validates: "Given the kept bowl/bell/sine cues, when chime is replaced by a flute-family candidate, then the new timbre is clearly distinguishable from all three on In and Out cues and still reads as calm"
verdict: VALIDATED — winner: Flute — soft attack
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
- **Audition outcome:** the operator chose **Flute — soft attack**. The ~0.13 s breath
  onset is what makes it read as a flute rather than "another soft tone" — the
  strike-envelope `Flute — pure` was distinct from Bowl/Bell but sat too close to Sine on
  the In cue. The soft attack is therefore load-bearing, not cosmetic: it is the chosen
  timbre's defining feature. This means the real build is **not** a pure `timbres.ts`
  data change — `cueSynth` must gain an envelope mode (mirroring how spike 005's Warm pad
  fade required an optional pad envelope-mode on `buildNKToneNodes`).

## Results

**Verdict: VALIDATED — winner: Flute — soft attack.**

The operator auditioned all four candidates against the kept Bowl/Bell/Sine and chose
**Flute — soft attack**. Sine-additive synthesis (the app's D-14 constraint) *can*
produce a timbre that reads as a flute and is clearly distinct from the other three —
but only with the soft breath attack; the harmonic partial stack alone was not enough to
separate it from Sine.

**Winning preset** (the values the `chime` slot in `src/audio/timbres.ts` is replaced
with — auditioned verbatim in the harness):

| Field | Value |
|-------|-------|
| partials | `[1.0 → 1.0], [2.0 → 0.22], [3.0 → 0.08]` (harmonic) |
| fundamentalHzIn / Out | `440` / `220` (unchanged — satisfies the D-21 guard) |
| decayTauIn / Out | `1.1` / `1.4` |
| filterFreqHz / filterQ | `4000` / `0.4` |
| peakGain | `0.18` |
| **attackSec** | **`0.13`** — soft breath onset (new) |
| oscillatorType | `sine` (satisfies D-14) |

**Surprise / key finding:** the strike-vs-attack distinction mattered more than the
partial stack. `Flute — pure` (same partials, strike envelope) was rejected because on
the In cue it was hard to tell apart from Sine — both are dominated by a clean
fundamental with an instant onset. The 0.13 s attack ramp is what gives the flute its
identity. The harmonic partials still do real work (they separate it cleanly from the
inharmonic Bowl/Bell), but the envelope is the deciding factor.

**Build signal:**
1. **`cueSynth` needs an envelope mode.** Today it is strike-only (instant `peakGain` →
   exp decay). The winning timbre needs an optional soft-attack mode: linear ramp
   `0 → peakGain` over `attackSec`, *then* the existing exp decay. Absent/`0` ⇒ current
   strike behaviour, so Bowl/Bell/Sine and the countdown/end cues stay byte-identical.
   This is the same shape of change spike 005 made for the Warm pad fade.
2. **`TimbrePreset` gains an `attackSec` field** (`0` for Bowl/Bell/Sine).
3. **The fourth timbre is renamed `chime` → `flute`** — the `TimbreId` union, the
   EN/PT-BR timbre display strings ("Chime"→"Flute"; PT-BR equivalent), and any
   `TimbrePicker` ordering. This is a user-facing rename, not just an internal swap.
4. Bowl is kept exactly as-is; Bell and Sine are untouched.
5. Scope is a planned phase, not a quick task — it spans `timbres.ts`, `cueSynth.ts`,
   the `TimbreId` type, i18n strings, and a storage consideration (existing users with
   `timbre: 'chime'` persisted need a coercion/migration to `'flute'`).

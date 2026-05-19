---
spike: 005
name: session-end-sound-alternatives
type: comparison
validates: "Given the session-complete sound, when the user auditions the current chord against alternatives, then the end sound worth shipping — and whether it ships longer — emerges"
verdict: VALIDATED — winner: Warm pad fade
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
5. **Operator audition.** The operator auditioned all seven and picked **Warm
   pad fade** — and chose to ship it as the single end sound, **no picker**. So
   the answer to "could it be longer?" was emphatic: not just longer, but a
   different envelope entirely — strike-free, fading in and out.

## Results

**Verdict: VALIDATED — winner: Warm pad fade.**

The operator auditioned all seven variants and selected **Warm pad fade**. When
asked whether it should ship as the single end sound or as the default of a
settings picker, the operator chose **swap outright, no picker**.

**Warm pad fade parameters (the sound to ship):**

| Parameter | Current (today) | Warm pad fade (chosen) |
|-----------|-----------------|------------------------|
| Chord     | C-major triad — `END_CHORD_RATIOS` [1.0, 1.25, 1.5] off 220 Hz | unchanged |
| Envelope  | percussive strike → exponential decay (τ 0.8) | **fade in** (~0.9 s ramp) → hold → **linear fade out** (~1.4 s). No strike. |
| Duration  | 1.8 s | 5.0 s |
| Peak gain | 0.12 | 0.11 |
| Filter    | `preset.filterFreqHz` (per-timbre) | harness used 2400 Hz; per-timbre is fine — see note |

**Key finding for the build — this is NOT a pure constant change:**

- The countdown-beep swap (spike 004) was four constants. This one is **bigger**:
  Warm pad fade replaces the *envelope shape* (strike → fade-in/fade-out), not
  just numbers.
- `scheduleEndChord` builds its tones via `buildNKToneNodes`, which is **shared**
  with `scheduleNKTick` and `scheduleCountdownTick` and is **strike-only**
  (`setValueAtTime(peak)` + `setTargetAtTime` decay). It cannot be changed
  globally — that would turn the ticks into pads.
- The build must give the end chord a **pad envelope** without disturbing the
  tick callers. Cleanest: add an optional envelope-mode argument to
  `buildNKToneNodes` (`pad` = ramp-in → hold → linear ramp-out); absent →
  current strike behaviour, so tick/countdown stay byte-identical. Then
  `scheduleEndChord` passes the pad envelope.
- New/changed `END_CHORD_*` constants: duration 1.8 → 5.0 s, peak 0.12 → 0.11,
  add `attack` ≈ 0.9 s and `release` ≈ 1.4 s, retire `END_CHORD_DECAY_TAU`
  (the pad envelope has no exponential decay). `END_CHORD_RATIOS` unchanged.

**Surprises / notes:**

- Filter: the harness brightened to 2400 Hz, but the chord is pure sines at
  220–330 Hz — well below any timbre's lowpass cutoff (3000 Bowl … 8000 Sine).
  Keeping the per-timbre `preset.filterFreqHz` is audibly equivalent; no need to
  pin it.
- Shared sound — the swap lands in **both** the HRV session-complete cue and the
  Navi Kriya completion cue from one change.
- "Kinda short" → the chosen sound is ~2.8× longer (1.8 s → 5.0 s) AND softer
  (−0.8 dB) AND strike-free. The operator went well past the "longer" tweak.

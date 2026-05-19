# Audio Cues & Sound Design

How to swap the app's synthesized audio cues — the 3-2-1 countdown beep, the session-end
chord, and the fourth cue *timbre* — for the sounds the operator chose during spiking.
All three sounds are Web Audio synthesis (no bundled audio files), shared by both the HRV
and Navi Kriya practices.

## Requirements

Non-negotiable — every implementation in this feature area must honor these:

- **No bundled audio assets.** All cues are synthesized with Web Audio oscillators +
  filters (decisions D-04 / D-14). Never introduce `.wav`/`.mp3` files or a sample
  pipeline — it was explicitly rejected in spikes 004 and 005.
- **Cues are shared across practices.** The countdown beep and the end chord are each one
  function called by both the HRV and Navi Kriya paths — one change lands in both.
- **`oscillatorType` is always `'sine'`.** No `PeriodicWave`. Timbre character comes from
  additive sine partials + envelope + lowpass filter only (D-14).
- **Countdown beep ships as a single sound, no settings picker.** (Spike 004 — operator
  auditioned alternatives and chose one outright.)
- **Session-end sound ships as a single sound, no settings picker.** (Spike 005 — same.)

## How to Build It

### 1. Countdown beep → "Crisp ping" (spike 004 — pure constant change)

The 3-2-1 lead-in beep is `scheduleCountdownTick` in `src/audio/nkCueSynth.ts`, already
isolated on its own `COUNTDOWN_TICK_*` constants. Swap is four numbers:

| Parameter | Today | Crisp ping (ship) |
|-----------|-------|-------------------|
| Pitch | 440 Hz (`fundamentalHzIn`) | **660 Hz** — express as `fundamentalHzIn × 1.5` (a perfect fifth, no magic number) |
| Duration | 0.12 s | **0.10 s** |
| Peak gain | 0.08 | **0.12** |
| Decay τ | 0.05 | **0.04** |

Filter: the harness used a fixed bright 6000 Hz; production passes per-timbre
`preset.filterFreqHz`. Pitch carries the "crisp" character — pinning the countdown filter
at ~6000 Hz vs keeping it per-timbre is low-risk either way; decide at build time.

### 2. Session-end sound → "Warm pad fade" (spike 005 — needs an envelope mode)

The end sound is `scheduleEndChord` in `src/audio/nkCueSynth.ts`, on its own `END_CHORD_*`
constants. The chord is unchanged — C-major triad `END_CHORD_RATIOS [1.0, 1.25, 1.5]` off
220 Hz. What changes is the **envelope shape**, so this is *not* a pure constant change:

- `scheduleEndChord` builds tones via `buildNKToneNodes`, which is **shared** with
  `scheduleNKTick` and `scheduleCountdownTick` and is **strike-only**.
- Add an **optional envelope-mode argument** to `buildNKToneNodes`: `pad` = ramp-in →
  hold → linear ramp-out. Absent ⇒ current strike behaviour, so the tick/countdown
  callers stay byte-identical. Then `scheduleEndChord` passes the pad envelope.
- Constants: duration 1.8 → **5.0 s**, peak 0.12 → **0.11**, add `attack ≈ 0.9 s` and
  `release ≈ 1.4 s`, retire `END_CHORD_DECAY_TAU` (a pad has no exponential decay).

### 3. Fourth timbre: Chime → Flute (spike 008 — same envelope-mode shape)

The four cue timbres are `TIMBRE_PRESETS` in `src/audio/timbres.ts` (additive-sine recipes
read by `cueSynth`). Chime is structurally a near-clone of Bowl — Bowl's partial stack
(`1.0 / 2.76 / 5.4`) plus one `7.6×` shimmer partial — which is why they sound too close.

Keep Bowl/Bell/Sine. Replace the Chime slot with a **Flute (soft attack)**:

| Field | Value |
|-------|-------|
| partials | `1.0→1.0`, `2.0→0.22`, `3.0→0.08` (harmonic — integer ratios) |
| fundamentalHzIn / Out | `440` / `220` (unchanged — satisfies the D-21 guard) |
| decayTauIn / Out | `1.1` / `1.4` |
| filterFreqHz / filterQ | `4000` / `0.4` |
| peakGain | `0.18` |
| **attackSec** | **`0.13`** — soft breath onset (the deciding feature) |
| oscillatorType | `'sine'` |

Build implications:
- `cueSynth` is strike-only; add an **optional soft-attack envelope mode** (linear ramp
  `0 → peakGain` over `attackSec`, then the existing exp decay; absent/`0` ⇒ strike, so
  Bowl/Bell/Sine + countdown/end cues stay byte-identical). Same shape of change as the
  spike-005 pad mode above — consider doing both envelope extensions together.
- `TimbrePreset` gains an `attackSec` field (`0` for Bowl/Bell/Sine).
- **Rename the timbre `chime → flute`**: the `TimbreId` union, the EN/PT-BR display
  strings ("Chime" → "Flute"), and `TimbrePicker` ordering. User-facing rename.
- Persisted `timbre: 'chime'` prefs need a coercion/migration to `'flute'`.

## What to Avoid

- **Do not change `buildNKToneNodes` / `cueSynth` globally** to get the pad or soft-attack
  envelope — that turns the ticks into pads. Always add the new envelope as an *optional
  mode* with the strike path as the default, so untouched callers stay byte-identical.
- **Do not ship the louder/longer "tweak" variant.** In both 004 and 005 the operator
  went *past* the minimal tweak (just louder / just longer) to a genuinely different
  sound. Surface real alternatives, not just a parameter nudge.
- **Do not ship a flute with a strike envelope.** Spike 008's strike-envelope flute
  (`Flute — pure`) was rejected — without the soft attack it sits too close to Sine. The
  ~0.13 s breath onset is load-bearing.
- **Do not judge loudness/duration by ear.** Spikes 004/005 measured peak amplitude and
  −40 dB tail length in an `OfflineAudioContext` — volume-independent numbers. Re-use
  that when a future audio spike has a "louder?"/"longer?" question.

## Constraints

- Web Audio only; `oscillatorType: 'sine'`; no `PeriodicWave`; no bundled audio (D-04 /
  D-14).
- A Vitest guard in `src/audio/timbres.test.ts` (D-21) asserts every preset has
  `fundamentalHzIn === 440 && fundamentalHzOut === 220` — the Flute preset keeps these.
- The countdown beep and end chord are each shared by both practices — every swap is
  inherently cross-practice.

## Origin

Synthesized from spikes: 004 (countdown-beep-alternatives), 005 (session-end-sound-alternatives), 008 (chime-replacement-timbre).
Source files available in: sources/004-countdown-beep-alternatives/, sources/005-session-end-sound-alternatives/, sources/008-chime-replacement-timbre/.

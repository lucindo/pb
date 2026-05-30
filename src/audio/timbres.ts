// Pure data module — zero React imports. Exports TimbrePreset interface and
// TIMBRE_PRESETS record. All four named-timbre DSP recipes live here; cueSynth
// reads the preset at call time.
//
// Per-timbre fundamentals are locked at A4 In / A3 Out (440/220 Hz) across all
// four presets — a Vitest guard in timbres.test.ts asserts every preset has
// fundamentalHzIn === 440 && fundamentalHzOut === 220.
//
// All four presets use OscillatorType='sine' — no PeriodicWave, no new deps.
// This module does NOT edit src/domain/settings.ts.

import type { TimbreId } from '../domain/settings'

export interface TimbrePreset {
  fundamentalHzIn: number
  fundamentalHzOut: number
  partials: ReadonlyArray<{ ratio: number; gain: number }>
  decayTauIn: number
  decayTauOut: number
  filterFreqHz: number
  filterQ: number
  peakGain: number
  /** Soft-attack ramp duration in seconds; `0` = instant strike (default for Bowl/Bell/Sine). */
  attackSec: number
  oscillatorType: OscillatorType
}

export const TIMBRE_PRESETS: Readonly<Record<TimbreId, TimbrePreset>> = {
  // Bowl preset: DSP parameters shared with the legacy cueSynth.ts module-level
  // constants (the bowl values were moved here; no numeric changes).
  bowl: {
    fundamentalHzIn: 440, // A4
    fundamentalHzOut: 220, // A3
    partials: [
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.76, gain: 0.4 },
      { ratio: 5.4, gain: 0.15 },
    ],
    decayTauIn: 1.4,
    decayTauOut: 1.8,
    filterFreqHz: 3000,
    filterQ: 0.5,
    peakGain: 0.18,
    attackSec: 0, // instant strike — byte-identical to pre-AUDIO-01 behaviour
    oscillatorType: 'sine',
  },
  // Bell: soft hand-bell variant, mildly inharmonic. 2.5 ratio is the
  // distinguishing inharmonic partial; shorter decay than Bowl; brighter filter
  // with mild peak.
  bell: {
    fundamentalHzIn: 440,
    fundamentalHzOut: 220,
    partials: [
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.5, gain: 0.5 },
      { ratio: 4.0, gain: 0.15 },
    ],
    decayTauIn: 0.8,
    decayTauOut: 1.1,
    filterFreqHz: 5000,
    filterQ: 0.8,
    peakGain: 0.18,
    attackSec: 0, // instant strike — byte-identical to pre-AUDIO-01 behaviour
    oscillatorType: 'sine',
  },
  // Sine: pure single sine, soft + long. Single 1.0-ratio partial; longest decay
  // of the four presets (pairs with breath cycle). Filter is near-transparent
  // (8 kHz / Q 0.3) — included for code-shape symmetry with the partial-stacked presets.
  sine: {
    fundamentalHzIn: 440,
    fundamentalHzOut: 220,
    partials: [{ ratio: 1.0, gain: 1.0 }],
    decayTauIn: 1.5,
    decayTauOut: 2.0,
    filterFreqHz: 8000,
    filterQ: 0.3,
    peakGain: 0.18,
    attackSec: 0, // instant strike — byte-identical to pre-AUDIO-01 behaviour
    oscillatorType: 'sine',
  },
  // Flute: harmonic sine-additive recipe with a soft breath attack. Harmonic integer
  // partials (1·2·3) separate it clearly from Bowl/Bell (inharmonic), and the 0.13 s
  // attack ramp is the load-bearing feature that distinguishes it from Sine.
  flute: {
    fundamentalHzIn: 440,
    fundamentalHzOut: 220,
    partials: [
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.0, gain: 0.22 },
      { ratio: 3.0, gain: 0.08 },
    ],
    decayTauIn: 1.1,
    decayTauOut: 1.4,
    filterFreqHz: 4000,
    filterQ: 0.4,
    peakGain: 0.18,
    attackSec: 0.13, // soft breath onset — the deciding feature
    oscillatorType: 'sine',
  },
} as const

// Pure data module — zero React imports. Exports TimbrePreset interface and
// TIMBRE_PRESETS record. All four named-timbre DSP recipes live here; cueSynth
// (Plan 03) will read the preset at call time. Bowl preset values are the
// cueSynth.ts module-level constants verbatim (TIMBRE-02 byte-identical proof:
// git diff between Plan 01 and Plan 03 shows a constants MOVE, not a numeric
// change). Per-timbre fundamentals are locked at A4 In / A3 Out (440/220 Hz)
// across all four presets per TIMBRE-05 / D-21 — overrides research's
// per-timbre fundamental variation.
//
// D-14: all four presets use OscillatorType='sine' — no PeriodicWave, no new deps.
// D-15: this module does NOT edit src/domain/settings.ts (Phase 14 D-09 invariant).
// D-21: a Vitest guard in src/audio/timbres.test.ts asserts every preset has
//       fundamentalHzIn === 440 && fundamentalHzOut === 220.

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
  oscillatorType: OscillatorType
}

export const TIMBRE_PRESETS: Readonly<Record<TimbreId, TimbrePreset>> = {
  // D-02 — Bowl preset: verbatim copy of src/audio/cueSynth.ts lines 11-24 module-level
  // constants. TIMBRE-02 byte-identical proof at the data layer. Plan 03 will
  // delete the duplicate module-level constants from cueSynth.ts when the
  // consumer side migrates to read from this preset record.
  bowl: {
    fundamentalHzIn: 440, // verbatim IN_FUNDAMENTAL_HZ (A4)
    fundamentalHzOut: 220, // verbatim OUT_FUNDAMENTAL_HZ (A3)
    partials: [
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.76, gain: 0.4 },
      { ratio: 5.4, gain: 0.15 },
    ], // verbatim PARTIALS
    decayTauIn: 1.4, // verbatim IN_DECAY_TIME_CONSTANT
    decayTauOut: 1.8, // verbatim OUT_DECAY_TIME_CONSTANT
    filterFreqHz: 3000, // verbatim FILTER_FREQ_HZ
    filterQ: 0.5, // verbatim FILTER_Q
    peakGain: 0.18, // verbatim PEAK_GAIN
    oscillatorType: 'sine',
  },
  // D-03 — Bell preset: soft hand-bell variant, mildly inharmonic. 2.5 ratio is
  // the distinguishing inharmonic partial; shorter decay than Bowl; brighter
  // filter with mild peak. Same peakGain as Bowl for consistent loudness.
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
    oscillatorType: 'sine',
  },
  // D-04 — Sine preset: pure single sine, soft + long. Single 1.0-ratio partial;
  // longest decay of the four presets (pairs with breath cycle). Filter is
  // near-transparent (8 kHz / Q 0.3) — included only for code-shape symmetry
  // with the partial-stacked presets.
  sine: {
    fundamentalHzIn: 440,
    fundamentalHzOut: 220,
    partials: [{ ratio: 1.0, gain: 1.0 }],
    decayTauIn: 1.5,
    decayTauOut: 2.0,
    filterFreqHz: 8000,
    filterQ: 0.3,
    peakGain: 0.18,
    oscillatorType: 'sine',
  },
  // D-05 — Chime preset: windchime — Bowl partial stack (1.0 / 2.76 / 5.4) plus
  // one extra high partial at 7.6× for shimmer. peakGain lowered to 0.16 to
  // compensate equal-loudness perception of the extra high partial.
  chime: {
    fundamentalHzIn: 440,
    fundamentalHzOut: 220,
    partials: [
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.76, gain: 0.4 },
      { ratio: 5.4, gain: 0.15 },
      { ratio: 7.6, gain: 0.08 },
    ],
    decayTauIn: 1.0,
    decayTauOut: 1.4,
    filterFreqHz: 7000,
    filterQ: 1.0,
    peakGain: 0.16,
    oscillatorType: 'sine',
  },
} as const

import { describe, expect, it } from 'vitest'

import { TIMBRE_OPTIONS } from '../domain/settings'
import { TIMBRE_PRESETS } from './timbres'

// Pure-data tests — no FakeAudioContext / no Web Audio side effects.
// Guards: fundamental invariant (A4/A3 Hz locked), Bowl byte-identical proof, OscillatorType='sine' invariant.

describe('timbres', () => {
  it('exports all 4 TimbreId keys', () => {
    expect(Object.keys(TIMBRE_PRESETS)).toEqual(expect.arrayContaining([...TIMBRE_OPTIONS]))
    expect(Object.keys(TIMBRE_PRESETS)).toHaveLength(4)
  })

  // Fundamental guard — catches future preset additions that drift fundamentals.
  it('every preset uses A4/A3 fundamentals (440 Hz In / 220 Hz Out)', () => {
    for (const preset of Object.values(TIMBRE_PRESETS)) {
      expect(preset.fundamentalHzIn).toBe(440)
      expect(preset.fundamentalHzOut).toBe(220)
    }
  })

  // Bowl preset matches the cueSynth.ts module-level constants verbatim.
  // Per-field equality is the data-layer byte-identical proof.
  it('bowl preset matches verbatim cueSynth constants', () => {
    const bowl = TIMBRE_PRESETS.bowl
    expect(bowl.fundamentalHzIn).toBe(440)
    expect(bowl.fundamentalHzOut).toBe(220)
    expect(bowl.partials).toEqual([
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.76, gain: 0.4 },
      { ratio: 5.4, gain: 0.15 },
    ])
    expect(bowl.decayTauIn).toBe(1.4)
    expect(bowl.decayTauOut).toBe(1.8)
    expect(bowl.filterFreqHz).toBe(3000)
    expect(bowl.filterQ).toBe(0.5)
    expect(bowl.peakGain).toBe(0.18)
    expect(bowl.oscillatorType).toBe('sine')
  })

  it('partials[0].ratio === 1.0 for all presets', () => {
    for (const preset of Object.values(TIMBRE_PRESETS)) {
      expect(preset.partials[0]?.ratio).toBe(1.0)
    }
  })

  // No-PeriodicWave invariant: every preset is a partial-stacked sine.
  it('every preset uses sine oscillator (D-14 no-PeriodicWave invariant)', () => {
    for (const preset of Object.values(TIMBRE_PRESETS)) {
      expect(preset.oscillatorType).toBe('sine')
    }
  })

  // Flute preset locked values.
  it('flute preset matches spike-008 values (AUDIO-01)', () => {
    const flute = TIMBRE_PRESETS.flute
    expect(flute.fundamentalHzIn).toBe(440)
    expect(flute.fundamentalHzOut).toBe(220)
    expect(flute.partials).toEqual([
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.0, gain: 0.22 },
      { ratio: 3.0, gain: 0.08 },
    ])
    expect(flute.decayTauIn).toBe(1.1)
    expect(flute.decayTauOut).toBe(1.4)
    expect(flute.filterFreqHz).toBe(4000)
    expect(flute.filterQ).toBe(0.4)
    expect(flute.peakGain).toBe(0.18)
    expect(flute.attackSec).toBe(0.13)
    expect(flute.oscillatorType).toBe('sine')
  })

  // AUDIO-01 — attackSec field: bowl/bell/sine carry 0 (strike path); flute carries 0.13.
  it('bowl attackSec is 0 (strike path unchanged)', () => {
    expect(TIMBRE_PRESETS.bowl.attackSec).toBe(0)
  })

  it('bell attackSec is 0 (strike path unchanged)', () => {
    expect(TIMBRE_PRESETS.bell.attackSec).toBe(0)
  })

  it('sine attackSec is 0 (strike path unchanged)', () => {
    expect(TIMBRE_PRESETS.sine.attackSec).toBe(0)
  })

  it('flute attackSec is 0.13 (soft breath onset — the load-bearing feature)', () => {
    expect(TIMBRE_PRESETS.flute.attackSec).toBe(0.13)
  })

  // Key name guard: TIMBRE_PRESETS must contain 'flute', not 'chime'.
  it("TIMBRE_PRESETS contains 'flute' and not 'chime'", () => {
    expect(Object.keys(TIMBRE_PRESETS)).toContain('flute')
    expect(Object.keys(TIMBRE_PRESETS)).not.toContain('chime')
  })

  // scheduleBowlCue iterates preset.partials and attaches 'ended' listeners to
  // each oscillator. An empty partials array would create no oscillators, leave
  // filter + envelope connected to destination forever, and silently emit no
  // audio. The DSP code has no runtime guard, so this assertion is the lock.
  it('every preset declares at least one partial', () => {
    for (const preset of Object.values(TIMBRE_PRESETS)) {
      expect(preset.partials.length).toBeGreaterThan(0)
    }
  })
})

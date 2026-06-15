import { describe, expect, it } from 'vitest'

import { scheduleCountdownTick, scheduleEndChord } from './boundaryCueSynth'
import { TIMBRE_OPTIONS } from '../domain/settings'

// Test helper: relies on FakeAudioContext polyfill installed by vitest.setup.ts.
function createAc(): AudioContext {
  return new AudioContext()
}

describe('boundaryCueSynth', () => {
  // All builders share the (ac, when, destination, timbre) signature.
  const builders: Array<[string, typeof scheduleCountdownTick]> = [
    ['scheduleCountdownTick', scheduleCountdownTick],
    ['scheduleEndChord', scheduleEndChord],
  ]

  // -- CueHandle shape contract (anchored at `when`, cleanupAt in the future) --
  it.each(builders)('%s returns a CueHandle anchored at `when` with cleanupAt after it', (_name, build) => {
    const ac = createAc()
    const handle = build(ac, 2.0, ac.destination, 'bowl')
    expect(handle.envelope).toBeDefined()
    expect(handle.scheduledAt).toBe(2.0)
    expect(handle.cleanupAt).toBeGreaterThan(handle.scheduledAt)
  })

  // -- every builder is timbre-safe across the full TimbreId set --------------
  it.each(builders)('%s does not throw for any TimbreId', (_name, build) => {
    const ac = createAc()
    for (const timbre of TIMBRE_OPTIONS) {
      expect(() => build(ac, 1.0, ac.destination, timbre)).not.toThrow()
    }
  })

  // -- Spike 005: end chord retuned to "Warm pad fade" -----------------------

  it('scheduleEndChord rings out long enough for the Warm pad fade envelope (Spike 005)', () => {
    const ac = createAc()
    const when = 1.0
    const handle = scheduleEndChord(ac, when, ac.destination, 'bowl')
    // Warm pad fade is ~5 s; the pre-Spike-005 strike chord was 1.8 s. A span
    // well past 4 s proves the pad-length retune is in effect.
    expect(handle.cleanupAt - handle.scheduledAt).toBeGreaterThan(4)
  })
})

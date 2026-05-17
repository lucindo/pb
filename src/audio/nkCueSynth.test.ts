import { describe, expect, it } from 'vitest'

import {
  scheduleNKBackMarker,
  scheduleEndChord,
  scheduleNKFrontMarker,
  scheduleNKTick,
} from './nkCueSynth'
import { TIMBRE_OPTIONS } from '../domain/settings'

// Test helper: relies on FakeAudioContext polyfill installed by vitest.setup.ts.
function createAc(): AudioContext {
  return new AudioContext()
}

describe('nkCueSynth', () => {
  // -- CueHandle contract for front/back markers and end chord ---------------

  it('scheduleNKFrontMarker returns a CueHandle with envelope GainNode, scheduledAt, and cleanupAt', () => {
    const ac = createAc()
    const handle = scheduleNKFrontMarker(ac, 2.0, ac.destination, 'bowl')
    expect(handle.envelope).toBeDefined()
    expect(handle.scheduledAt).toBe(2.0)
    expect(handle.cleanupAt).toBeGreaterThan(handle.scheduledAt)
  })

  it('scheduleNKBackMarker returns a CueHandle with envelope GainNode, scheduledAt, and cleanupAt', () => {
    const ac = createAc()
    const handle = scheduleNKBackMarker(ac, 2.0, ac.destination, 'bowl')
    expect(handle.envelope).toBeDefined()
    expect(handle.scheduledAt).toBe(2.0)
    expect(handle.cleanupAt).toBeGreaterThan(handle.scheduledAt)
  })

  it('scheduleEndChord returns a CueHandle with envelope GainNode, scheduledAt, and cleanupAt', () => {
    const ac = createAc()
    const handle = scheduleEndChord(ac, 2.0, ac.destination, 'bowl')
    expect(handle.envelope).toBeDefined()
    expect(handle.scheduledAt).toBe(2.0)
    expect(handle.cleanupAt).toBeGreaterThan(handle.scheduledAt)
  })

  // -- scheduledAt equals the when argument ----------------------------------

  it('scheduleNKFrontMarker scheduledAt equals the when argument', () => {
    const ac = createAc()
    const when = 5.5
    const handle = scheduleNKFrontMarker(ac, when, ac.destination, 'bowl')
    expect(handle.scheduledAt).toBe(when)
  })

  it('scheduleNKBackMarker scheduledAt equals the when argument', () => {
    const ac = createAc()
    const when = 3.2
    const handle = scheduleNKBackMarker(ac, when, ac.destination, 'bowl')
    expect(handle.scheduledAt).toBe(when)
  })

  it('scheduleEndChord scheduledAt equals the when argument', () => {
    const ac = createAc()
    const when = 1.0
    const handle = scheduleEndChord(ac, when, ac.destination, 'bowl')
    expect(handle.scheduledAt).toBe(when)
  })

  // -- cleanupAt > scheduledAt for all builders ------------------------------

  it('cleanupAt is greater than scheduledAt for all four builders', () => {
    const ac = createAc()
    const when = 1.0

    const frontHandle = scheduleNKFrontMarker(ac, when, ac.destination, 'bowl')
    const backHandle = scheduleNKBackMarker(ac, when, ac.destination, 'bowl')
    const tickHandle = scheduleNKTick(ac, when, ac.destination, 'bowl')
    const endHandle = scheduleEndChord(ac, when, ac.destination, 'bowl')

    expect(frontHandle.cleanupAt).toBeGreaterThan(frontHandle.scheduledAt)
    expect(backHandle.cleanupAt).toBeGreaterThan(backHandle.scheduledAt)
    expect(tickHandle.cleanupAt).toBeGreaterThan(tickHandle.scheduledAt)
    expect(endHandle.cleanupAt).toBeGreaterThan(endHandle.scheduledAt)
  })

  // -- D-07: tick is soft and short (barely-there) ---------------------------

  it('scheduleNKTick returns a valid CueHandle', () => {
    const ac = createAc()
    const handle = scheduleNKTick(ac, 1.0, ac.destination, 'bowl')
    expect(handle.envelope).toBeDefined()
    expect(handle.scheduledAt).toBe(1.0)
    expect(handle.cleanupAt).toBeGreaterThan(handle.scheduledAt)
  })

  it('scheduleNKTick duration is shorter than scheduleEndChord duration (D-07 barely-there)', () => {
    const ac = createAc()
    const when = 1.0

    const tickHandle = scheduleNKTick(ac, when, ac.destination, 'bowl')
    const endHandle = scheduleEndChord(ac, when, ac.destination, 'bowl')

    const tickDuration = tickHandle.cleanupAt - tickHandle.scheduledAt
    const endDuration = endHandle.cleanupAt - endHandle.scheduledAt

    expect(tickDuration).toBeLessThan(endDuration)
  })

  // -- D-06: directional two-tone gestures work for every timbre -------------

  it('scheduleNKFrontMarker does not throw for any TimbreId (D-06 two-tone gesture)', () => {
    const ac = createAc()
    for (const timbre of TIMBRE_OPTIONS) {
      expect(() => scheduleNKFrontMarker(ac, 1.0, ac.destination, timbre)).not.toThrow()
    }
  })

  it('scheduleNKBackMarker does not throw for any TimbreId (D-06 two-tone gesture)', () => {
    const ac = createAc()
    for (const timbre of TIMBRE_OPTIONS) {
      expect(() => scheduleNKBackMarker(ac, 1.0, ac.destination, timbre)).not.toThrow()
    }
  })
})

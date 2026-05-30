import { describe, expect, it } from 'vitest'

import {
  END_CHORD_RINGOUT_SEC,
  scheduleCountdownTick,
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

  // -- Spike 005: end chord retuned to "Warm pad fade" -----------------------

  it('scheduleEndChord rings out long enough for the Warm pad fade envelope (Spike 005)', () => {
    const ac = createAc()
    const when = 1.0
    const handle = scheduleEndChord(ac, when, ac.destination, 'bowl')
    // Warm pad fade is ~5 s; the pre-Spike-005 strike chord was 1.8 s. A span
    // well past 4 s proves the pad-length retune is in effect.
    expect(handle.cleanupAt - handle.scheduledAt).toBeGreaterThan(4)
  })

  it('scheduleEndChord does not throw for any TimbreId (pad envelope path)', () => {
    const ac = createAc()
    for (const timbre of TIMBRE_OPTIONS) {
      expect(() => scheduleEndChord(ac, 1.0, ac.destination, timbre)).not.toThrow()
    }
  })

  it('END_CHORD_RINGOUT_SEC equals the scheduleEndChord handle ring-out span', () => {
    // The Navi Kriya teardown in App.tsx defers AudioContext.close() by this
    // many seconds. It MUST track the real chord span — a stale value cut the
    // 5s Warm pad fade short on NK while HRV (which reads cue.cleanupAt) was
    // fine. This guard fails if the exported constant ever drifts from the
    // chord scheduleEndChord actually produces.
    const ac = createAc()
    const when = 1.0
    const handle = scheduleEndChord(ac, when, ac.destination, 'bowl')
    expect(handle.cleanupAt - handle.scheduledAt).toBeCloseTo(END_CHORD_RINGOUT_SEC, 5)
  })

  // -- tick is soft and short (barely-there) ---------------------------------

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

  // -- Spike 004: countdown beep retuned to "Crisp ping" --------------------

  it('scheduleCountdownTick returns a valid CueHandle', () => {
    const ac = createAc()
    const handle = scheduleCountdownTick(ac, 1.0, ac.destination, 'bowl')
    expect(handle.envelope).toBeDefined()
    expect(handle.scheduledAt).toBe(1.0)
    expect(handle.cleanupAt).toBeGreaterThan(handle.scheduledAt)
  })

  it('scheduleCountdownTick does not throw for any TimbreId', () => {
    const ac = createAc()
    for (const timbre of TIMBRE_OPTIONS) {
      expect(() => scheduleCountdownTick(ac, 1.0, ac.destination, timbre)).not.toThrow()
    }
  })

  it('countdown beep is shorter than the per-OM tick (Spike 004 — the two diverged)', () => {
    const ac = createAc()
    const when = 1.0

    const countdownHandle = scheduleCountdownTick(ac, when, ac.destination, 'bowl')
    const tickHandle = scheduleNKTick(ac, when, ac.destination, 'bowl')

    const countdownDuration = countdownHandle.cleanupAt - countdownHandle.scheduledAt
    const tickDuration = tickHandle.cleanupAt - tickHandle.scheduledAt

    expect(countdownDuration).toBeLessThan(tickDuration)
  })

  // -- markers reuse the HRV breath cues for every timbre -------------------

  it('scheduleNKFrontMarker does not throw for any TimbreId (D-06 reuses HRV in-cue)', () => {
    const ac = createAc()
    for (const timbre of TIMBRE_OPTIONS) {
      expect(() => scheduleNKFrontMarker(ac, 1.0, ac.destination, timbre)).not.toThrow()
    }
  })

  it('scheduleNKBackMarker does not throw for any TimbreId (D-06 reuses HRV out-cue)', () => {
    const ac = createAc()
    for (const timbre of TIMBRE_OPTIONS) {
      expect(() => scheduleNKBackMarker(ac, 1.0, ac.destination, timbre)).not.toThrow()
    }
  })
})

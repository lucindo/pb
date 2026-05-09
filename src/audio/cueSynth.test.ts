import { describe, expect, it, vi } from 'vitest'

import {
  scheduleInCue,
  scheduleOutCue,
  scheduleTick,
  type CueHandle,
} from './cueSynth'

// Test helper: relies on FakeAudioContext polyfill installed by vitest.setup.ts.
function createAc(): AudioContext {
  return new AudioContext()
}

describe('cueSynth', () => {
  // -- scheduleInCue ---------------------------------------------------------

  it('scheduleInCue creates 3 oscillator partials', () => {
    const ac = createAc()
    const oscSpy = vi.spyOn(ac, 'createOscillator')
    scheduleInCue(ac, 1.0, ac.destination)
    expect(oscSpy).toHaveBeenCalledTimes(3)
  })

  it('scheduleInCue uses fundamental 440 Hz and partial ratios 2.76 and 5.40', () => {
    const ac = createAc()
    const oscillators: OscillatorNode[] = []
    const realCreate = ac.createOscillator.bind(ac)
    vi.spyOn(ac, 'createOscillator').mockImplementation(() => {
      const osc = realCreate()
      oscillators.push(osc)
      return osc
    })

    scheduleInCue(ac, 1.0, ac.destination)

    expect(oscillators).toHaveLength(3)
    const freqs = oscillators.map((osc) => osc.frequency.value)
    expect(freqs[0]).toBeCloseTo(440, 5)
    expect(freqs[1]).toBeCloseTo(1214.4, 4)
    expect(freqs[2]).toBeCloseTo(2376, 4)
  })

  it('scheduleInCue applies strike-and-decay envelope', () => {
    const ac = createAc()
    const handle = scheduleInCue(ac, 1.0, ac.destination)
    const setValue = handle.envelope.gain.setValueAtTime as ReturnType<typeof vi.fn>
    const setTarget = handle.envelope.gain.setTargetAtTime as ReturnType<typeof vi.fn>

    expect(setValue).toHaveBeenCalledWith(0.18, 1.0)
    expect(setTarget).toHaveBeenCalledWith(0.0001, 1.005, 1.4)
  })

  it('scheduleInCue starts and stops each oscillator', () => {
    const ac = createAc()
    const oscillators: OscillatorNode[] = []
    const realCreate = ac.createOscillator.bind(ac)
    vi.spyOn(ac, 'createOscillator').mockImplementation(() => {
      const osc = realCreate()
      oscillators.push(osc)
      return osc
    })

    scheduleInCue(ac, 1.0, ac.destination)

    for (const osc of oscillators) {
      const startMock = osc.start as unknown as ReturnType<typeof vi.fn>
      const stopMock = osc.stop as unknown as ReturnType<typeof vi.fn>
      expect(startMock).toHaveBeenCalledWith(1.0)
      const stopArg = stopMock.mock.calls[0]?.[0] as number
      expect(stopArg).toBeGreaterThanOrEqual(1.0 + 1.4 * 5)
    }
  })

  // -- scheduleOutCue --------------------------------------------------------

  it('scheduleOutCue uses fundamental 220 Hz', () => {
    const ac = createAc()
    const oscillators: OscillatorNode[] = []
    const realCreate = ac.createOscillator.bind(ac)
    vi.spyOn(ac, 'createOscillator').mockImplementation(() => {
      const osc = realCreate()
      oscillators.push(osc)
      return osc
    })

    scheduleOutCue(ac, 1.0, ac.destination)

    const freqs = oscillators.map((o) => o.frequency.value)
    expect(freqs[0]).toBeCloseTo(220, 5)
    expect(freqs[1]).toBeCloseTo(607.2, 4)
    expect(freqs[2]).toBeCloseTo(1188, 4)
  })

  it('scheduleOutCue uses decay timeConstant 1.8 (longer than In)', () => {
    const ac = createAc()
    const handle = scheduleOutCue(ac, 1.0, ac.destination)
    const setTarget = handle.envelope.gain.setTargetAtTime as ReturnType<typeof vi.fn>
    expect(setTarget).toHaveBeenCalledWith(0.0001, 1.005, 1.8)
  })

  // -- scheduleTick ----------------------------------------------------------

  it('scheduleTick uses square wave (distinct timbre from bowl cues)', () => {
    const ac = createAc()
    const oscillators: OscillatorNode[] = []
    const realCreate = ac.createOscillator.bind(ac)
    vi.spyOn(ac, 'createOscillator').mockImplementation(() => {
      const osc = realCreate()
      oscillators.push(osc)
      return osc
    })

    scheduleTick(ac, 1.0, ac.destination)

    expect(oscillators).toHaveLength(1)
    expect(oscillators[0].type).toBe('square')
  })

  it('scheduleTick is much shorter than bowl cues', () => {
    const ac = createAc()
    const handle = scheduleTick(ac, 1.0, ac.destination)
    expect(handle.cleanupAt - handle.scheduledAt).toBeLessThan(0.2)

    const bowlHandle = scheduleInCue(ac, 1.0, ac.destination)
    expect(bowlHandle.cleanupAt - bowlHandle.scheduledAt).toBeGreaterThan(7)
  })

  // -- shared CueHandle contract --------------------------------------------

  it('all builders return a CueHandle with envelope GainNode', () => {
    const ac = createAc()
    const handles: CueHandle[] = [
      scheduleInCue(ac, 2.0, ac.destination),
      scheduleOutCue(ac, 2.0, ac.destination),
      scheduleTick(ac, 2.0, ac.destination),
    ]
    for (const handle of handles) {
      expect(handle.envelope).toBeDefined()
      expect(handle.scheduledAt).toBe(2.0)
      expect(handle.cleanupAt).toBeGreaterThan(handle.scheduledAt)
    }
  })

  it('scheduleInCue creates a low-pass filter at 3000 Hz, Q 0.5', () => {
    const ac = createAc()
    const filters: BiquadFilterNode[] = []
    const realCreate = ac.createBiquadFilter.bind(ac)
    vi.spyOn(ac, 'createBiquadFilter').mockImplementation(() => {
      const filter = realCreate()
      filters.push(filter)
      return filter
    })

    scheduleInCue(ac, 1.0, ac.destination)

    expect(filters).toHaveLength(1)
    expect(filters[0].type).toBe('lowpass')
    expect(filters[0].frequency.value).toBe(3000)
    expect(filters[0].Q.value).toBe(0.5)
  })

  it('peakGain is well below 1.0 to leave headroom', () => {
    const ac = createAc()
    const handle = scheduleInCue(ac, 1.0, ac.destination)
    const setValue = handle.envelope.gain.setValueAtTime as ReturnType<typeof vi.fn>
    const peakArg = setValue.mock.calls[0]?.[0] as number
    expect(peakArg).toBeLessThanOrEqual(0.25)
  })
})

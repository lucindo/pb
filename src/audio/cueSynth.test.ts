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
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setValue = handle.envelope.gain.setValueAtTime as ReturnType<typeof vi.fn>
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
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
      // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const startMock = osc.start as unknown as ReturnType<typeof vi.fn>
      // eslint-disable-next-line @typescript-eslint/unbound-method
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
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
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
    // Reason: length asserted by toHaveLength(1) immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(oscillators[0]!.type).toBe('square')
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
    // Reason: length asserted by toHaveLength(1) immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(filters[0]!.type).toBe('lowpass')
    // Reason: length asserted by toHaveLength(1) above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(filters[0]!.frequency.value).toBe(3000)
    // Reason: length asserted by toHaveLength(1) above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(filters[0]!.Q.value).toBe(0.5)
  })

  it('peakGain is well below 1.0 to leave headroom', () => {
    const ac = createAc()
    const handle = scheduleInCue(ac, 1.0, ac.destination)
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setValue = handle.envelope.gain.setValueAtTime as ReturnType<typeof vi.fn>
    const peakArg = setValue.mock.calls[0]?.[0] as number
    expect(peakArg).toBeLessThanOrEqual(0.25)
  })

  // 260510-tc9 Bug 2 (iteration 2) — sustain-to-floor envelope for long phases.
  // Onset character (PEAK_GAIN, defaultDecayTau) is preserved; the decay target
  // is non-zero when phase > 3 × τ, and a hard fade-out at phase end avoids the
  // sustain bleeding into the next strike.
  const IN_PEAK_GAIN = 0.18 // mirrors cueSynth PEAK_GAIN
  const IN_DEFAULT_TAU = 1.4
  const OUT_DEFAULT_TAU = 1.8
  const SUSTAIN_FLOOR = IN_PEAK_GAIN * 0.15

  it('scheduleInCue with no phaseDurationSec keeps original decay target NEAR_SILENCE and original τ', () => {
    const ac = createAc()
    const handle = scheduleInCue(ac, 1.0, ac.destination)
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setTarget = handle.envelope.gain.setTargetAtTime as ReturnType<typeof vi.fn>
    // Only the original decay call — no phase-end fade.
    expect(setTarget).toHaveBeenCalledTimes(1)
    expect(setTarget).toHaveBeenCalledWith(0.0001, 1.005, IN_DEFAULT_TAU)
  })

  it('scheduleInCue with phaseDurationSec=2 (short phase) keeps original τ and target ≈ 0 — natural silence lands inside the phase', () => {
    // Natural perceptual silence for In is 3 × 1.4 = 4.2 s. A 2 s phase ends
    // before that, so the cue must NOT switch into sustain-to-floor mode.
    const ac = createAc()
    const handle = scheduleInCue(ac, 1.0, ac.destination, 2)
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setTarget = handle.envelope.gain.setTargetAtTime as ReturnType<typeof vi.fn>
    expect(setTarget).toHaveBeenCalledTimes(1)
    expect(setTarget).toHaveBeenCalledWith(0.0001, 1.005, IN_DEFAULT_TAU)
  })

  it('scheduleInCue with phaseDurationSec=10 decays toward SUSTAIN_FLOOR (not zero) using ORIGINAL τ — strike onset character preserved', () => {
    const ac = createAc()
    const handle = scheduleInCue(ac, 1.0, ac.destination, 10)
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setTarget = handle.envelope.gain.setTargetAtTime as ReturnType<typeof vi.fn>
    const decayCall = setTarget.mock.calls[0] as [number, number, number]
    expect(decayCall[0]).toBeCloseTo(SUSTAIN_FLOOR, 5)
    expect(decayCall[1]).toBeCloseTo(1.005, 5) // when + STRIKE_RAMP_OFFSET
    expect(decayCall[2]).toBeCloseTo(IN_DEFAULT_TAU, 5) // ORIGINAL τ, not stretched
  })

  it('scheduleInCue with phaseDurationSec=10 schedules a hard fade-out 0.2 s before phase end', () => {
    const ac = createAc()
    const handle = scheduleInCue(ac, 1.0, ac.destination, 10)
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setTarget = handle.envelope.gain.setTargetAtTime as ReturnType<typeof vi.fn>
    // Second setTargetAtTime call: target ≈ 0 at (when + phaseDuration - 0.2) with fast τ.
    expect(setTarget).toHaveBeenCalledTimes(2)
    const fadeCall = setTarget.mock.calls[1] as [number, number, number]
    expect(fadeCall[0]).toBeCloseTo(0.0001, 5)
    expect(fadeCall[1]).toBeCloseTo(1.0 + 10 - 0.2, 5)
    expect(fadeCall[2]).toBeCloseTo(0.05, 5)
  })

  it('scheduleBowlCue / scheduleInCue attaches once: true ended listeners that disconnect each osc + partialGain exactly once (AUDIO-04)', () => {
    const ac = createAc()
    const oscillators: OscillatorNode[] = []
    const allGains: GainNode[] = []
    const allFilters: BiquadFilterNode[] = []

    const realCreateOsc = ac.createOscillator.bind(ac)
    vi.spyOn(ac, 'createOscillator').mockImplementation(() => {
      const osc = realCreateOsc()
      oscillators.push(osc)
      return osc
    })

    const realCreateGain = ac.createGain.bind(ac)
    vi.spyOn(ac, 'createGain').mockImplementation(() => {
      const gain = realCreateGain()
      allGains.push(gain)
      return gain
    })

    const realCreateFilter = ac.createBiquadFilter.bind(ac)
    vi.spyOn(ac, 'createBiquadFilter').mockImplementation(() => {
      const f = realCreateFilter()
      allFilters.push(f)
      return f
    })

    scheduleInCue(ac, 1.0, ac.destination)

    // From cueSynth.ts construction order:
    //   1. filter = createBiquadFilter()         → allFilters[0]
    //   2. envelope = createGain()               → allGains[0]
    //   Loop for each of 3 PARTIALS:
    //   3/5/7. osc = createOscillator()          → oscillators[0..2]
    //   4/6/8. partialGain = createGain()        → allGains[1..3]
    const capturedFilter = allFilters[0]
    const capturedEnvelope = allGains[0]
    const partialGains = allGains.slice(1) // [1..3] = the 3 per-partial gain nodes

    expect(oscillators).toHaveLength(3)
    expect(partialGains).toHaveLength(3)

    // Dispatch 'ended' on each osc — { once: true } ensures disconnect fires exactly once.
    for (let i = 0; i < oscillators.length; i++) {
      const osc = oscillators[i]
      const pg = partialGains[i]
      // Reason: length asserted by toHaveLength(3) above; loop bounds guarantee valid index.
      if (osc === undefined || pg === undefined) continue

      osc.dispatchEvent(new Event('ended'))

      // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(osc.disconnect as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(pg.disconnect as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1)

      // Second dispatch: { once: true } removes the listener after first call.
      // Dispatching 'ended' again must NOT trigger a second disconnect.
      osc.dispatchEvent(new Event('ended'))
      // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(osc.disconnect as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1) // still 1, not 2
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(pg.disconnect as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1) // still 1, not 2
    }

    // Dispatch 'ended' on the LAST osc — shared filter+envelope listener fires.
    // (Already dispatched above in the loop, so filter+envelope should be disconnected by now.)
    // Reason: length asserted by toHaveLength(3) above; last element access is safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const lastOsc = oscillators[oscillators.length - 1]!
    // The last osc's 'ended' event was already dispatched in the loop above.
    // Verify filter and envelope disconnect were called exactly once.
    expect(capturedFilter).toBeDefined()
    expect(capturedEnvelope).toBeDefined()
    if (capturedFilter !== undefined) {
      // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(capturedFilter.disconnect as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1)
    }
    if (capturedEnvelope !== undefined) {
      // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(capturedEnvelope.disconnect as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1)
    }

    // Re-dispatch 'ended' on the last osc again — { once: true } means the shared listener
    // is already removed; filter+envelope disconnect should NOT be called a second time.
    lastOsc.dispatchEvent(new Event('ended'))
    if (capturedFilter !== undefined) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(capturedFilter.disconnect as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1) // still 1
    }
  })

  it('scheduleOutCue with phaseDurationSec=30 (BPM=1) sustains at floor for the full phase — no MAX_TAU silence cliff', () => {
    // The previous τ-stretch implementation went silent before flip at BPM=1
    // because exponential decay to 0 has no audible floor. This regression
    // case asserts the new envelope holds an audible floor regardless of
    // phase length.
    const ac = createAc()
    const handle = scheduleOutCue(ac, 1.0, ac.destination, 30)
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setTarget = handle.envelope.gain.setTargetAtTime as ReturnType<typeof vi.fn>
    const decayCall = setTarget.mock.calls[0] as [number, number, number]
    expect(decayCall[0]).toBeCloseTo(SUSTAIN_FLOOR, 5)
    expect(decayCall[2]).toBeCloseTo(OUT_DEFAULT_TAU, 5) // unchanged from baseline
    // cleanupAt extends to phase end (not just τ × TAIL_MULTIPLIER).
    expect(handle.cleanupAt).toBeGreaterThan(1.0 + 30)
  })
})

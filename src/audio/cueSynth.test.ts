import { describe, expect, it, vi } from 'vitest'

import {
  scheduleInCueForTimbre,
  scheduleOutCueForTimbre,
  type CueHandle,
} from './cueSynth'
import { TIMBRE_OPTIONS } from '../domain/settings'
import { TIMBRE_PRESETS } from './timbres'

// Test helper: relies on FakeAudioContext polyfill installed by vitest.setup.ts.
function createAc(): AudioContext {
  return new AudioContext()
}

// Bowl-default shorthands over the production per-timbre entry points. The dead
// scheduleInCue / scheduleOutCue exports were removed from cueSynth (L1); these keep
// the scheduleBowlCue DSP assertions below exercising the live 'bowl' path.
function scheduleInCue(ac: AudioContext, when: number, destination: AudioNode, phaseDurationSec?: number): CueHandle {
  return scheduleInCueForTimbre(ac, when, destination, 'bowl', phaseDurationSec)
}
function scheduleOutCue(ac: AudioContext, when: number, destination: AudioNode, phaseDurationSec?: number): CueHandle {
  return scheduleOutCueForTimbre(ac, when, destination, 'bowl', phaseDurationSec)
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

  // -- shared CueHandle contract --------------------------------------------

  it('all builders return a CueHandle with envelope GainNode', () => {
    const ac = createAc()
    const handles: CueHandle[] = [
      scheduleInCue(ac, 2.0, ac.destination),
      scheduleOutCue(ac, 2.0, ac.destination),
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

  // Boundary: needsSustain uses a STRICT `>` (phase > 3×τ = naturalSilenceAt). At EXACTLY
  // the boundary the cue must stay on the strike path (one decay call, target ≈ 0, no
  // phase-end fade-out). A regression to `>=` flips it into sustain mode — the call count
  // and decay target catch it. The boundary is derived, not hardcoded.
  it('scheduleInCue at EXACTLY 3×τ stays on the strike path (boundary is strict >)', () => {
    const ac = createAc()
    const boundary = IN_DEFAULT_TAU * 3 // naturalSilenceAt for In = 4.2 s
    const handle = scheduleInCue(ac, 1.0, ac.destination, boundary)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setTarget = handle.envelope.gain.setTargetAtTime as ReturnType<typeof vi.fn>
    expect(setTarget).toHaveBeenCalledTimes(1) // strike: decay only, no fade-out
    const decayCall = setTarget.mock.calls[0] as [number, number, number]
    expect(decayCall[0]).toBeCloseTo(0.0001, 5) // NEAR_SILENCE, not the sustain floor
  })

  it('scheduleInCue just past 3×τ switches into sustain mode (boundary discriminates)', () => {
    const ac = createAc()
    const justOver = IN_DEFAULT_TAU * 3 + 0.01
    const handle = scheduleInCue(ac, 1.0, ac.destination, justOver)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setTarget = handle.envelope.gain.setTargetAtTime as ReturnType<typeof vi.fn>
    expect(setTarget).toHaveBeenCalledTimes(2) // sustain: decay-to-floor + phase-end fade-out
    const decayCall = setTarget.mock.calls[0] as [number, number, number]
    expect(decayCall[0]).toBeCloseTo(SUSTAIN_FLOOR, 5)
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

  // AUDIO-01 — soft-attack envelope mode for the flute timbre.
  // When preset.attackSec > 0, scheduleBowlCue uses a linear ramp 0→peakGain over attackSec
  // then the existing exp decay (with ramp end as the decay start). Bowl retains strike.

  it('scheduleInCueForTimbre(flute) applies a soft-attack envelope — setValueAtTime near-zero, then linearRampToValueAtTime(peakGain, when+0.13)', () => {
    const ac = createAc()
    const handle = scheduleInCueForTimbre(ac, 1.0, ac.destination, 'flute')
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setValue = handle.envelope.gain.setValueAtTime as ReturnType<typeof vi.fn>
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const linearRamp = handle.envelope.gain.linearRampToValueAtTime as ReturnType<typeof vi.fn>

    // Soft attack: gain starts near-zero at `when`, then ramps up to peakGain
    expect(setValue).toHaveBeenCalledWith(expect.closeTo(0.0001, 5), 1.0)
    // linearRamp to peakGain 0.18 at when + attackSec 0.13
    expect(linearRamp).toHaveBeenCalledWith(expect.closeTo(0.18, 5), expect.closeTo(1.13, 5))
  })

  it('scheduleInCueForTimbre(bowl) still uses the strike path — setValueAtTime(peakGain, when), no linearRampToValueAtTime', () => {
    const ac = createAc()
    const handle = scheduleInCueForTimbre(ac, 1.0, ac.destination, 'bowl')
    // Reason: vi.fn mock accessed for test assertion; unbound-method suppressed because mock does not use 'this'.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const setValue = handle.envelope.gain.setValueAtTime as ReturnType<typeof vi.fn>
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const linearRamp = handle.envelope.gain.linearRampToValueAtTime as ReturnType<typeof vi.fn>

    // Strike path: gain is immediately set to peakGain 0.18
    expect(setValue).toHaveBeenCalledWith(0.18, 1.0)
    // No linear ramp — strike has no attack
    expect(linearRamp).not.toHaveBeenCalled()
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

// Test helper duplicated here so the per-timbre describes can be siblings of
// the original cueSynth describe (no internal helper hoisting needed).
function createAcForTimbre(): AudioContext {
  return new AudioContext()
}

describe('scheduleInCueForTimbre (all timbres)', () => {
  // Per-timbre oscillator count catches a wrong-partials regression. Kind-routing
  // (fundamentalHzIn/decayTauIn vs Out) is covered by the bowl tests above; the preset
  // values themselves by timbres.test — no need to re-derive them per timbre here.
  it.each(TIMBRE_OPTIONS)('%s: oscillator count equals preset.partials.length', (timbre) => {
    const ac = createAcForTimbre()
    const oscSpy = vi.spyOn(ac, 'createOscillator')
    scheduleInCueForTimbre(ac, 1.0, ac.destination, timbre)
    expect(oscSpy).toHaveBeenCalledTimes(TIMBRE_PRESETS[timbre].partials.length)
  })
})

describe('scheduleOutCueForTimbre (all timbres)', () => {
  it.each(TIMBRE_OPTIONS)('%s: oscillator count equals preset.partials.length', (timbre) => {
    const ac = createAcForTimbre()
    const oscSpy = vi.spyOn(ac, 'createOscillator')
    scheduleOutCueForTimbre(ac, 1.0, ac.destination, timbre)
    expect(oscSpy).toHaveBeenCalledTimes(TIMBRE_PRESETS[timbre].partials.length)
  })
})

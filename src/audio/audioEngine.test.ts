// Tests for the audioEngine factory + AudioEngine interface.
// Source: 03-02-PLAN.md <behavior> tests 1-15.
// Engine composes the pure cueSynth module from Plan 01.

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BreathingPlan } from '../domain/breathingPlan'
import { createAudioEngine } from './audioEngine'
import * as cueSynth from './cueSynth'
import type { CueHandle } from './cueSynth'

const samplePlan: BreathingPlan = {
  bpm: 5.5,
  ratio: '40:60',
  cycleMs: 60_000 / 5.5,
  inhaleMs: (60_000 / 5.5) * 0.4,
  exhaleMs: (60_000 / 5.5) * 0.6,
  totalMs: 600_000,
}

interface MockEnvelopeFns {
  cancelAndHoldAtTime: ReturnType<typeof vi.fn> | undefined
  setTargetAtTime: ReturnType<typeof vi.fn>
  cancelScheduledValues: ReturnType<typeof vi.fn>
  setValueAtTime: ReturnType<typeof vi.fn>
}

function makeMockCueHandle(opts: { withCancelAndHold?: boolean } = {}): {
  handle: CueHandle
  fns: MockEnvelopeFns
} {
  const withCancelAndHold = opts.withCancelAndHold ?? true
  const fns: MockEnvelopeFns = {
    cancelAndHoldAtTime: withCancelAndHold ? vi.fn() : undefined,
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(),
  }
  const gain = {
    value: 0.18,
    cancelAndHoldAtTime: fns.cancelAndHoldAtTime,
    setTargetAtTime: fns.setTargetAtTime,
    cancelScheduledValues: fns.cancelScheduledValues,
    setValueAtTime: fns.setValueAtTime,
  } as unknown as AudioParam
  const envelope = { gain } as unknown as GainNode
  const handle: CueHandle = {
    envelope,
    scheduledAt: 0,
    cleanupAt: 10,
  }
  return { handle, fns }
}

describe('audioEngine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('createAudioEngine resolves with an engine when AudioContext construction succeeds', async () => {
    const engine = await createAudioEngine()
    expect(engine).toBeDefined()
    expect(typeof engine.scheduleLeadIn).toBe('function')
    expect(typeof engine.scheduleNextCue).toBe('function')
    expect(typeof engine.setMuted).toBe('function')
    expect(typeof engine.now).toBe('function')
    expect(typeof engine.close).toBe('function')
    await engine.close()
  })

  it('createAudioEngine rejects when AudioContext construction throws (D-10 anchor)', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('blocked')
        }
      },
    )
    await expect(createAudioEngine()).rejects.toThrow('blocked')
  })

  it('scheduleLeadIn schedules 3 ticks at t/+1/+2 and an In cue at +3', async () => {
    const tickSpy = vi.spyOn(cueSynth, 'scheduleTick')
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCue')
    const engine = await createAudioEngine()

    engine.scheduleLeadIn(0, samplePlan)

    expect(tickSpy).toHaveBeenCalledTimes(3)
    expect(tickSpy.mock.calls[0]?.[1]).toBe(0)
    expect(tickSpy.mock.calls[1]?.[1]).toBe(1)
    expect(tickSpy.mock.calls[2]?.[1]).toBe(2)
    expect(inSpy).toHaveBeenCalledTimes(1)
    expect(inSpy.mock.calls[0]?.[1]).toBe(3)

    await engine.close()
  })

  it('scheduleLeadIn returns the audioTime of the first In cue (= startAudioTime + 3)', async () => {
    const engine = await createAudioEngine()
    const firstInCueTime = engine.scheduleLeadIn(7, samplePlan)
    expect(firstInCueTime).toBe(10)
    await engine.close()
  })

  it('scheduleNextCue with newPhase=in calls scheduleInCue at the requested audioTime', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCue')
    const engine = await createAudioEngine()
    engine.scheduleNextCue({ newPhase: 'in', audioTime: 5, phaseDurationSec: 4.36 })
    expect(inSpy).toHaveBeenCalledTimes(1)
    expect(inSpy.mock.calls[0]?.[1]).toBe(5)
    await engine.close()
  })

  it('scheduleNextCue with newPhase=out calls scheduleOutCue at the requested audioTime', async () => {
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCue')
    const engine = await createAudioEngine()
    engine.scheduleNextCue({ newPhase: 'out', audioTime: 5.5, phaseDurationSec: 6.54 })
    expect(outSpy).toHaveBeenCalledTimes(1)
    expect(outSpy.mock.calls[0]?.[1]).toBe(5.5)
    await engine.close()
  })

  // 260510-tc9 Bug 2: engine forwards phaseDurationSec as the 4th positional arg
  // to scheduleInCue / scheduleOutCue (matches cueSynth signature: ac, when, dest, phaseDurationSec).
  it('scheduleNextCue forwards phaseDurationSec as the 4th arg to scheduleInCue/scheduleOutCue', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCue')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCue')
    const engine = await createAudioEngine()
    engine.scheduleNextCue({ newPhase: 'in', audioTime: 5, phaseDurationSec: 4.36 })
    engine.scheduleNextCue({ newPhase: 'out', audioTime: 9.36, phaseDurationSec: 6.54 })
    expect(inSpy.mock.calls[0]?.[3]).toBeCloseTo(4.36, 5)
    expect(outSpy.mock.calls[0]?.[3]).toBeCloseTo(6.54, 5)
    await engine.close()
  })

  it('scheduleNextCue does NOT call cueSynth when muted', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCue')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCue')
    const engine = await createAudioEngine()
    engine.setMuted(true)
    engine.scheduleNextCue({ newPhase: 'in', audioTime: 5, phaseDurationSec: 4.36 })
    engine.scheduleNextCue({ newPhase: 'out', audioTime: 6, phaseDurationSec: 6.54 })
    expect(inSpy).not.toHaveBeenCalled()
    expect(outSpy).not.toHaveBeenCalled()
    await engine.close()
  })

  it('setMuted(true) mid-cue applies cancelAndHoldAtTime + setTargetAtTime fade-out (D-08)', async () => {
    const { handle, fns } = makeMockCueHandle({ withCancelAndHold: true })
    vi.spyOn(cueSynth, 'scheduleInCue').mockReturnValue(handle)
    const engine = await createAudioEngine()

    engine.scheduleLeadIn(0, samplePlan) // produces an active In cue (the +3 boundary)
    engine.setMuted(true)

    expect(fns.cancelAndHoldAtTime).toHaveBeenCalledTimes(1)
    expect(fns.setTargetAtTime).toHaveBeenCalledTimes(1)
    const setTargetCall = fns.setTargetAtTime.mock.calls[0]
    expect(setTargetCall?.[0]).toBe(0.0001)
    expect(setTargetCall?.[2]).toBe(0.05)

    await engine.close()
  })

  it('setMuted(false) mid-phase does NOT fire any cue immediately (D-08 unmute-waits-for-boundary)', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCue')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCue')
    const engine = await createAudioEngine()

    engine.setMuted(true)
    inSpy.mockClear()
    outSpy.mockClear()
    engine.setMuted(false)

    expect(inSpy).not.toHaveBeenCalled()
    expect(outSpy).not.toHaveBeenCalled()

    await engine.close()
  })

  it('engine.muted reflects the value passed to setMuted', async () => {
    const engine = await createAudioEngine()
    expect(engine.muted).toBe(false)
    engine.setMuted(true)
    expect(engine.muted).toBe(true)
    engine.setMuted(false)
    expect(engine.muted).toBe(false)
    await engine.close()
  })

  it('close() calls audioCtx.close exactly once', async () => {
    // Spy on a Probe AudioContext whose close is observable (the generic FakeAudioContext
    // close is shared across instances and gets noisy if other tests in the same describe
    // leak an unclosed engine).
    const closeSpy = vi.fn(async () => {})
    class ProbeAC {
      state: AudioContextState = 'running'
      sampleRate = 44100
      destination = {}
      currentTime = 0
      resume = vi.fn(async () => {})
      close = closeSpy
      createOscillator = vi.fn()
      createGain = vi.fn()
      createBiquadFilter = vi.fn()
      // Plan 06: engine wires a statechange listener at construction.
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
    vi.stubGlobal('AudioContext', ProbeAC)

    const probeEngine = await createAudioEngine()
    await probeEngine.close()
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })

  it('close() is idempotent — calling twice does not throw and does not call audioCtx.close twice', async () => {
    const closeSpy = vi.fn(async () => {})
    class ProbeAC {
      state: AudioContextState = 'running'
      sampleRate = 44100
      destination = {}
      currentTime = 0
      resume = vi.fn(async () => {})
      close = closeSpy
      createOscillator = vi.fn()
      createGain = vi.fn()
      createBiquadFilter = vi.fn()
      // Plan 06: engine wires a statechange listener at construction.
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
    vi.stubGlobal('AudioContext', ProbeAC)

    const engine = await createAudioEngine()
    await engine.close()
    await engine.close()
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })

  it('after close(), scheduleNextCue is a no-op (does not throw, does not call cueSynth)', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCue')
    const engine = await createAudioEngine()
    await engine.close()
    inSpy.mockClear()
    expect(() => engine.scheduleNextCue({ newPhase: 'in', audioTime: 5, phaseDurationSec: 4.36 })).not.toThrow()
    expect(inSpy).not.toHaveBeenCalled()
  })

  it('engine.now() returns audioCtx.currentTime', async () => {
    let probeTime = 0
    class ProbeAC {
      state: AudioContextState = 'running'
      sampleRate = 44100
      destination = {}
      get currentTime() {
        return probeTime
      }
      resume = vi.fn(async () => {})
      close = vi.fn(async () => {})
      createOscillator = vi.fn()
      createGain = vi.fn()
      createBiquadFilter = vi.fn()
      // Plan 06: engine wires a statechange listener at construction.
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
    vi.stubGlobal('AudioContext', ProbeAC)

    const engine = await createAudioEngine()
    probeTime = 42.5
    expect(engine.now()).toBe(42.5)
    await engine.close()
  })

  // Plan 06 polish (post-UAT bug fix): engine.state is the live read of audioCtx.state.
  // The hook's public resume() uses it instead of React's audioStatus closure (which
  // is stale within the useCallback invocation) to decide whether reconstruction is
  // required after `await engine.resume()`.
  it('engine.state reflects live audioCtx.state including the WebKit-only "interrupted" superset', async () => {
    let probeState: AudioContextState | 'interrupted' = 'suspended'
    class ProbeAC {
      get state(): AudioContextState | 'interrupted' { return probeState }
      sampleRate = 44100
      destination = {}
      currentTime = 0
      resume = vi.fn(async () => { probeState = 'running' })
      close = vi.fn(async () => {})
      createOscillator = vi.fn()
      createGain = vi.fn()
      createBiquadFilter = vi.fn()
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
    vi.stubGlobal('AudioContext', ProbeAC)

    const engine = await createAudioEngine()
    // WR-06 path resumed the AC at construction.
    expect(engine.state).toBe('running')

    probeState = 'suspended'
    expect(engine.state).toBe('suspended')

    probeState = 'interrupted'
    expect(engine.state).toBe('interrupted')

    await engine.close()
  })

  it('cancelAndHoldAtTime fallback (Pitfall 9): when undefined, uses cancelScheduledValues + setValueAtTime', async () => {
    const { handle, fns } = makeMockCueHandle({ withCancelAndHold: false })
    vi.spyOn(cueSynth, 'scheduleInCue').mockReturnValue(handle)
    const engine = await createAudioEngine()

    engine.scheduleLeadIn(0, samplePlan) // captures activeCue
    engine.setMuted(true)

    expect(fns.cancelScheduledValues).toHaveBeenCalledTimes(1)
    expect(fns.setValueAtTime).toHaveBeenCalledTimes(1)
    // The fallback also still applies the setTargetAtTime ramp.
    expect(fns.setTargetAtTime).toHaveBeenCalledTimes(1)

    await engine.close()
  })
})

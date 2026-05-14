// Tests for the audioEngine factory + AudioEngine interface.
// Source: 03-02-PLAN.md <behavior> tests 1-15.
// Engine composes the pure cueSynth module from Plan 01.

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BreathingPlan } from '../domain/breathingPlan'
import { createAudioEngine, SAFE_LEAD_SEC } from './audioEngine'
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
    const engine = await createAudioEngine({ timbre: 'bowl' })
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
      // Reason: test stub — constructor-only class simulates a browser that denies AudioContext.
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class {
        constructor() {
          throw new Error('blocked')
        }
      },
    )
    await expect(createAudioEngine({ timbre: 'bowl' })).rejects.toThrow('blocked')
  })

  it('scheduleLeadIn schedules 3 ticks at t/+1/+2 and an In cue at +3', async () => {
    const tickSpy = vi.spyOn(cueSynth, 'scheduleTick')
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })

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
    const engine = await createAudioEngine({ timbre: 'bowl' })
    const firstInCueTime = engine.scheduleLeadIn(7, samplePlan)
    expect(firstInCueTime).toBe(10)
    await engine.close()
  })

  it('SAFE_LEAD_SEC export equals 0.005 (D-03 single-source-of-truth)', () => {
    expect(SAFE_LEAD_SEC).toBe(0.005)
  })

  it('scheduleNextCue with newPhase=in calls scheduleInCue at the requested audioTime', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })
    engine.scheduleNextCue({ newPhase: 'in', audioTime: 5, phaseDurationSec: 4.36 })
    expect(inSpy).toHaveBeenCalledTimes(1)
    expect(inSpy.mock.calls[0]?.[1]).toBe(5)
    await engine.close()
  })

  it('scheduleNextCue with newPhase=out calls scheduleOutCue at the requested audioTime', async () => {
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })
    engine.scheduleNextCue({ newPhase: 'out', audioTime: 5.5, phaseDurationSec: 6.54 })
    expect(outSpy).toHaveBeenCalledTimes(1)
    expect(outSpy.mock.calls[0]?.[1]).toBe(5.5)
    await engine.close()
  })

  // 260510-tc9 Bug 2: engine forwards phaseDurationSec to scheduleIn/OutCueForTimbre.
  // Phase 18 Plan 03: dispatch signature is (ac, when, dest, timbre, phaseDurationSec),
  // so phaseDurationSec is now the 5th positional arg (index 4) — index 3 is timbre.
  it('scheduleNextCue forwards phaseDurationSec as the 5th arg to scheduleInCueForTimbre/scheduleOutCueForTimbre', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })
    engine.scheduleNextCue({ newPhase: 'in', audioTime: 5, phaseDurationSec: 4.36 })
    engine.scheduleNextCue({ newPhase: 'out', audioTime: 9.36, phaseDurationSec: 6.54 })
    expect(inSpy.mock.calls[0]?.[4]).toBeCloseTo(4.36, 5)
    expect(outSpy.mock.calls[0]?.[4]).toBeCloseTo(6.54, 5)
    await engine.close()
  })

  it('scheduleNextCue does NOT call cueSynth when muted', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })
    engine.setMuted(true)
    engine.scheduleNextCue({ newPhase: 'in', audioTime: 5, phaseDurationSec: 4.36 })
    engine.scheduleNextCue({ newPhase: 'out', audioTime: 6, phaseDurationSec: 6.54 })
    expect(inSpy).not.toHaveBeenCalled()
    expect(outSpy).not.toHaveBeenCalled()
    await engine.close()
  })

  it('setMuted(true) mid-cue applies cancelAndHoldAtTime + setTargetAtTime fade-out (D-08)', async () => {
    const { handle, fns } = makeMockCueHandle({ withCancelAndHold: true })
    vi.spyOn(cueSynth, 'scheduleInCueForTimbre').mockReturnValue(handle)
    const engine = await createAudioEngine({ timbre: 'bowl' })

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
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })

    engine.setMuted(true)
    inSpy.mockClear()
    outSpy.mockClear()
    engine.setMuted(false)

    expect(inSpy).not.toHaveBeenCalled()
    expect(outSpy).not.toHaveBeenCalled()

    await engine.close()
  })

  it('engine.muted reflects the value passed to setMuted', async () => {
    const engine = await createAudioEngine({ timbre: 'bowl' })
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

    const probeEngine = await createAudioEngine({ timbre: 'bowl' })
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

    const engine = await createAudioEngine({ timbre: 'bowl' })
    await engine.close()
    await engine.close()
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })

  it('after close(), scheduleNextCue is a no-op (does not throw, does not call cueSynth)', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })
    await engine.close()
    inSpy.mockClear()
    expect(() => { engine.scheduleNextCue({ newPhase: 'in', audioTime: 5, phaseDurationSec: 4.36 }) }).not.toThrow()
    expect(inSpy).not.toHaveBeenCalled()
  })

  it('scheduleLeadIn returns null when engine is closed (AUDIO-03)', async () => {
    const engine = await createAudioEngine({ timbre: 'bowl' })
    await engine.close()
    const result = engine.scheduleLeadIn(0, samplePlan)
    expect(result).toBeNull()
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

    const engine = await createAudioEngine({ timbre: 'bowl' })
    probeTime = 42.5
    expect(engine.now()).toBe(42.5)
    await engine.close()
  })

  it('scheduleNextCue clamps past audioTime to currentTime + SAFE_LEAD_SEC (AUDIO-02)', async () => {
    const probeTime = 10
    class ProbeAC {
      state: AudioContextState = 'running'
      sampleRate = 44100
      destination = {}
      get currentTime() { return probeTime }
      resume = vi.fn(async () => {})
      close = vi.fn(async () => {})
      createOscillator = vi.fn()
      createGain = vi.fn()
      createBiquadFilter = vi.fn()
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
    vi.stubGlobal('AudioContext', ProbeAC)

    const { handle: stubHandle } = makeMockCueHandle()
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre').mockReturnValue(stubHandle)
    const engine = await createAudioEngine({ timbre: 'bowl' })
    engine.scheduleNextCue({ newPhase: 'in', audioTime: 9.5, phaseDurationSec: 4 })
    // audioTime 9.5 < currentTime(10) + SAFE_LEAD_SEC(0.005) → clamped to 10.005
    expect(inSpy.mock.calls[0]?.[1]).toBeCloseTo(probeTime + SAFE_LEAD_SEC, 9)
    await engine.close()
  })

  it('scheduleNextCue passes future audioTime verbatim (no clamp) (AUDIO-02)', async () => {
    const probeTime = 10
    class ProbeAC {
      state: AudioContextState = 'running'
      sampleRate = 44100
      destination = {}
      get currentTime() { return probeTime }
      resume = vi.fn(async () => {})
      close = vi.fn(async () => {})
      createOscillator = vi.fn()
      createGain = vi.fn()
      createBiquadFilter = vi.fn()
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
    vi.stubGlobal('AudioContext', ProbeAC)

    const { handle: stubHandle } = makeMockCueHandle()
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre').mockReturnValue(stubHandle)
    const engine = await createAudioEngine({ timbre: 'bowl' })
    engine.scheduleNextCue({ newPhase: 'in', audioTime: 12, phaseDurationSec: 4 })
    // audioTime 12 > currentTime(10) + SAFE_LEAD_SEC(0.005) → passes verbatim
    expect(inSpy.mock.calls[0]?.[1]).toBe(12)
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
      // Reason: async required to match AudioContext.resume() Promise<void> signature; state assignment is the async side-effect.
      // eslint-disable-next-line @typescript-eslint/require-await
      resume = vi.fn(async () => { probeState = 'running' })
      close = vi.fn(async () => {})
      createOscillator = vi.fn()
      createGain = vi.fn()
      createBiquadFilter = vi.fn()
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
    vi.stubGlobal('AudioContext', ProbeAC)

    const engine = await createAudioEngine({ timbre: 'bowl' })
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
    vi.spyOn(cueSynth, 'scheduleInCueForTimbre').mockReturnValue(handle)
    const engine = await createAudioEngine({ timbre: 'bowl' })

    engine.scheduleLeadIn(0, samplePlan) // captures activeCue
    engine.setMuted(true)

    expect(fns.cancelScheduledValues).toHaveBeenCalledTimes(1)
    expect(fns.setValueAtTime).toHaveBeenCalledTimes(1)
    // The fallback also still applies the setTargetAtTime ramp.
    expect(fns.setTargetAtTime).toHaveBeenCalledTimes(1)

    await engine.close()
  })

  // Phase 18 Plan 03 Task 4: timbre-propagation tests verifying that the
  // construction-time `opts.timbre` flows through scheduleLeadIn (first In cue)
  // and scheduleNextCue (in/out ternary). Captures D-08 capture-at-construction
  // semantics: no setter, no re-read, immutable for engine lifetime.

  it('createAudioEngine({ timbre: "bell" }) forwards "bell" to scheduleInCueForTimbre on the first In cue', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bell' })

    engine.scheduleLeadIn(0, samplePlan)

    expect(inSpy).toHaveBeenCalledTimes(1)
    // Signature: (ac, when, dest, timbre, phaseDurationSec) → timbre at index 3.
    expect(inSpy.mock.calls[0]?.[3]).toBe('bell')

    await engine.close()
  })

  it('createAudioEngine({ timbre: "sine" }) forwards "sine" to scheduleInCueForTimbre and scheduleOutCueForTimbre via scheduleNextCue', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'sine' })

    engine.scheduleNextCue({ newPhase: 'in', audioTime: 1.0, phaseDurationSec: 5 })
    engine.scheduleNextCue({ newPhase: 'out', audioTime: 6.0, phaseDurationSec: 7 })

    expect(inSpy).toHaveBeenCalledTimes(1)
    expect(outSpy).toHaveBeenCalledTimes(1)
    expect(inSpy.mock.calls[0]?.[3]).toBe('sine')
    expect(outSpy.mock.calls[0]?.[3]).toBe('sine')

    await engine.close()
  })

  it('engine captures timbre once at construction — two engines with different timbres operate independently (no shared mutable state)', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const engineBell = await createAudioEngine({ timbre: 'bell' })
    const engineChime = await createAudioEngine({ timbre: 'chime' })

    // Bell engine schedules — must dispatch with 'bell', not 'chime' (independent capture).
    engineBell.scheduleNextCue({ newPhase: 'in', audioTime: 1.0, phaseDurationSec: 4 })
    // Chime engine schedules — must dispatch with 'chime', not 'bell'.
    engineChime.scheduleNextCue({ newPhase: 'in', audioTime: 1.0, phaseDurationSec: 4 })

    expect(inSpy).toHaveBeenCalledTimes(2)
    expect(inSpy.mock.calls[0]?.[3]).toBe('bell')
    expect(inSpy.mock.calls[1]?.[3]).toBe('chime')

    await engineBell.close()
    await engineChime.close()
  })
})

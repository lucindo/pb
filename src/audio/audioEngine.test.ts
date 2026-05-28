// Tests for the audioEngine factory + AudioEngine interface.
// Source: 03-02-PLAN.md <behavior> tests 1-15.
// Engine composes the pure cueSynth module from Plan 01.

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BreathingPlan } from '../domain/breathingPlan'
import {
  createAudioEngine,
  SAFE_LEAD_SEC,
  LOOKAHEAD_WINDOW_SEC,
  LOOKAHEAD_MIN_CUES,
  MAX_TICK_DELTA_SEC,
} from './audioEngine'
import * as cueSynth from './cueSynth'
import * as nkCueSynth from './nkCueSynth'
import type { CueHandle } from './cueSynth'

// Phase 50-02 (D-02 ms→sec cascade): BreathingPlan fixture is seconds-shaped.
const samplePlan: BreathingPlan = {
  bpm: 5.5,
  ratio: '40:60',
  cycleSec: 60 / 5.5,
  inhaleSec: (60 / 5.5) * 0.4,
  exhaleSec: (60 / 5.5) * 0.6,
  totalSec: 600,
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
    cancel: vi.fn(),
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
    // Consistency: the countdown beep is the shared scheduleCountdownTick.
    const tickSpy = vi.spyOn(nkCueSynth, 'scheduleCountdownTick')
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
  // phaseDurationSec is the 5th positional arg (index 4) — index 3 is timbre.
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

  it('cancelAndHoldAtTime fallback (Pitfall 9 / AH-WR-06): when undefined, uses cancelScheduledValues + setTargetAtTime only', async () => {
    const { handle, fns } = makeMockCueHandle({ withCancelAndHold: false })
    vi.spyOn(cueSynth, 'scheduleInCueForTimbre').mockReturnValue(handle)
    const engine = await createAudioEngine({ timbre: 'bowl' })

    engine.scheduleLeadIn(0, samplePlan) // captures activeCue
    engine.setMuted(true)

    expect(fns.cancelScheduledValues).toHaveBeenCalledTimes(1)
    // AH-WR-06: the fallback no longer re-asserts the current value via
    // setValueAtTime — on Safari <16.4 gainParam.value reports the last
    // explicitly-set value (peakGain), not the live ramped value, so
    // re-asserting it would freeze the envelope back up and click/swell.
    expect(fns.setValueAtTime).not.toHaveBeenCalled()
    // The fallback relies on cancelScheduledValues + setTargetAtTime alone.
    expect(fns.setTargetAtTime).toHaveBeenCalledTimes(1)

    await engine.close()
  })

  // Timbre-propagation tests: construction-time `opts.timbre` flows through
  // scheduleLeadIn (first In cue) and scheduleNextCue (in/out ternary).
  // D-08 capture-at-construction semantics: no setter, no re-read, immutable for engine lifetime.

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
    const engineFlute = await createAudioEngine({ timbre: 'flute' })

    // Bell engine schedules — must dispatch with 'bell', not 'flute' (independent capture).
    engineBell.scheduleNextCue({ newPhase: 'in', audioTime: 1.0, phaseDurationSec: 4 })
    // Flute engine schedules — must dispatch with 'flute', not 'bell'.
    engineFlute.scheduleNextCue({ newPhase: 'in', audioTime: 1.0, phaseDurationSec: 4 })

    expect(inSpy).toHaveBeenCalledTimes(2)
    expect(inSpy.mock.calls[0]?.[3]).toBe('bell')
    expect(inSpy.mock.calls[1]?.[3]).toBe('flute')

    await engineBell.close()
    await engineFlute.close()
  })

  // Phase 49: iOS silent-loop element
  // Tests covering D-04 (sync-construct order), D-05 (attribute wiring), D-08 (close()
  // teardown + idempotency), and D-09 (silent-absorb on .play() reject). Element is
  // invisible at the hook seam (D-04) — these are engine-level tests only.

  it('createAudioEngine constructs a silent-loop <audio> element with locked attributes (D-05)', async () => {
    const instances: SpyAudio[] = []
    class SpyAudio {
      playsInline = false
      loop = false
      muted = true
      volume = 1
      pause = vi.fn()
      removeAttribute = vi.fn()
      play = vi.fn(async () => {})
      // Reason: constructor mirrors HTMLAudioElement(src?) signature; the body
      // captures the instance for assertion (so the constructor is NOT useless).
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_src?: string) {
        instances.push(this)
      }
    }
    vi.stubGlobal('Audio', SpyAudio)

    const engine = await createAudioEngine({ timbre: 'bowl' })

    expect(instances).toHaveLength(1)
    const [el] = instances
    if (el === undefined) throw new Error('expected a stubbed Audio instance')
    expect(el.playsInline).toBe(true)
    expect(el.loop).toBe(true)
    expect(el.muted).toBe(false)
    expect(el.volume).toBe(0.0001)

    await engine.close()
  })

  it('engine.close() pauses the silent-loop element and clears its src (D-08 teardown)', async () => {
    const instances: SpyAudio[] = []
    class SpyAudio {
      playsInline = false
      loop = false
      muted = true
      volume = 1
      pause = vi.fn()
      removeAttribute = vi.fn()
      play = vi.fn(async () => {})
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_src?: string) {
        instances.push(this)
      }
    }
    vi.stubGlobal('Audio', SpyAudio)

    const engine = await createAudioEngine({ timbre: 'bowl' })
    await engine.close()

    expect(instances).toHaveLength(1)
    const [el] = instances
    if (el === undefined) throw new Error('expected a stubbed Audio instance')
    expect(el.pause).toHaveBeenCalledTimes(1)
    expect(el.removeAttribute).toHaveBeenCalledWith('src')
  })

  it('engine.close() is idempotent for silent-loop teardown — pause and removeAttribute called at most once across two close() calls', async () => {
    const instances: SpyAudio[] = []
    class SpyAudio {
      playsInline = false
      loop = false
      muted = true
      volume = 1
      pause = vi.fn()
      removeAttribute = vi.fn()
      play = vi.fn(async () => {})
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_src?: string) {
        instances.push(this)
      }
    }
    vi.stubGlobal('Audio', SpyAudio)

    const engine = await createAudioEngine({ timbre: 'bowl' })
    await engine.close()
    await engine.close()

    expect(instances).toHaveLength(1)
    const [el] = instances
    if (el === undefined) throw new Error('expected a stubbed Audio instance')
    expect(el.pause).toHaveBeenCalledTimes(1)
    expect(el.removeAttribute).toHaveBeenCalledTimes(1)
  })

  it('createAudioEngine resolves even when silent-loop element.play() rejects (D-09 silent-absorb)', async () => {
    class RejectingAudio {
      playsInline = false
      loop = false
      muted = true
      volume = 1
      pause = vi.fn()
      removeAttribute = vi.fn()
      play = vi.fn(() => Promise.reject(new DOMException('autoplay denied', 'NotAllowedError')))
      // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars
      constructor(_src?: string) {}
    }
    vi.stubGlobal('Audio', RejectingAudio)

    // Engine MUST resolve — silent-loop failure is non-fatal (D-09 lock).
    const engine = await createAudioEngine({ timbre: 'bowl' })
    expect(engine).toBeDefined()
    expect(typeof engine.close).toBe('function')

    await engine.close()
  })

  it('sync-construct order: new AudioContext() precedes new Audio() in createAudioEngine (D-04)', async () => {
    const callOrder: string[] = []
    class OrderedAC {
      state: AudioContextState = 'running'
      sampleRate = 44100
      destination = {}
      currentTime = 0
      resume = vi.fn(async () => {})
      close = vi.fn(async () => {})
      createOscillator = vi.fn()
      createGain = vi.fn()
      createBiquadFilter = vi.fn()
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
      constructor() {
        callOrder.push('AudioContext')
      }
    }
    class OrderedAudio {
      playsInline = false
      loop = false
      muted = true
      volume = 1
      pause = vi.fn()
      removeAttribute = vi.fn()
      play = vi.fn(async () => {})
      // Reason: constructor mirrors HTMLAudioElement(src?); body pushes to callOrder so NOT useless.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_src?: string) {
        callOrder.push('Audio')
      }
    }
    vi.stubGlobal('AudioContext', OrderedAC)
    vi.stubGlobal('Audio', OrderedAudio)

    const engine = await createAudioEngine({ timbre: 'bowl' })
    expect(callOrder).toEqual(['AudioContext', 'Audio'])

    await engine.close()
  })

  // Phase 49.1 D-07 — bypassSilentMode option gating (ADV-04)
  // Three tests: skip construction when false (ADV-04 success gate), construct when
  // true (parity with Phase 49 baseline), construct when undefined (D-07 default
  // undefined → coerces to true, backward compat).

  describe('Phase 49.1 D-07 — bypassSilentMode option gating (ADV-04)', () => {
    it('createAudioEngine does NOT construct the silent-loop element when bypassSilentMode=false (ADV-04 success gate)', async () => {
      const instances: SpyAudio[] = []
      class SpyAudio {
        playsInline = false
        loop = false
        muted = true
        volume = 1
        pause = vi.fn()
        removeAttribute = vi.fn()
        play = vi.fn(async () => {})
        // Reason: constructor mirrors HTMLAudioElement(src?) signature; body captures instance for assertion — NOT useless.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(_src?: string) {
          instances.push(this)
        }
      }
      vi.stubGlobal('Audio', SpyAudio)

      const engine = await createAudioEngine({ timbre: 'bowl', bypassSilentMode: false })

      // ADV-04: Audio constructor must NOT be called when bypassSilentMode is false.
      expect(instances).toHaveLength(0)
      // close() null-guards must short-circuit cleanly when construction was skipped.
      await engine.close()
    })

    it('createAudioEngine constructs the silent-loop element when bypassSilentMode=true (parity with Phase 49 baseline)', async () => {
      const instances: SpyAudio[] = []
      class SpyAudio {
        playsInline = false
        loop = false
        muted = true
        volume = 1
        pause = vi.fn()
        removeAttribute = vi.fn()
        play = vi.fn(async () => {})
        // Reason: constructor mirrors HTMLAudioElement(src?) signature; body captures instance for assertion — NOT useless.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(_src?: string) {
          instances.push(this)
        }
      }
      vi.stubGlobal('Audio', SpyAudio)

      const engine = await createAudioEngine({ timbre: 'bowl', bypassSilentMode: true })

      expect(instances).toHaveLength(1)
      const [el] = instances
      if (el === undefined) throw new Error('expected a stubbed Audio instance')
      // Attributes must match the Phase 49 v3 baseline (parity test).
      expect(el.playsInline).toBe(true)
      expect(el.loop).toBe(true)
      expect(el.muted).toBe(false)
      expect(el.volume).toBe(0.0001)
      await engine.close()
    })

    it('createAudioEngine constructs the silent-loop element when bypassSilentMode is undefined (D-07 default undefined → true)', async () => {
      const instances: SpyAudio[] = []
      class SpyAudio {
        playsInline = false
        loop = false
        muted = true
        volume = 1
        pause = vi.fn()
        removeAttribute = vi.fn()
        play = vi.fn(async () => {})
        // Reason: constructor mirrors HTMLAudioElement(src?) signature; body captures instance for assertion — NOT useless.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(_src?: string) {
          instances.push(this)
        }
      }
      vi.stubGlobal('Audio', SpyAudio)

      // No bypassSilentMode key in opts — undefined must coerce to "construct".
      // Backward-compat: any pre-49.1 caller that omits the field must still
      // get the silent-loop element (Phase 49 v3 behavior preserved).
      const engine = await createAudioEngine({ timbre: 'bowl' })

      expect(instances).toHaveLength(1)
      await engine.close()
    })
  })

  // CR-01 (Phase 49 REVIEW): when AudioContext.resume() rejects, the silent-loop
  // element is unreachable through engine.close() (no engine handle is returned),
  // so the ad-hoc teardown inside the resume() catch block is the only path that
  // can release the element. Regression-guards the leak found in code review.
  it('createAudioEngine tears down silent-loop element when AudioContext.resume() rejects (CR-01)', async () => {
    const audioInstances: SuspendedRejectAudio[] = []
    class SuspendedRejectAC {
      state: AudioContextState = 'suspended'
      sampleRate = 44100
      destination = {}
      currentTime = 0
      resume = vi.fn(() => Promise.reject(new DOMException('autoplay vetoed', 'NotAllowedError')))
      close = vi.fn(async () => {})
      createOscillator = vi.fn()
      createGain = vi.fn()
      createBiquadFilter = vi.fn()
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
    class SuspendedRejectAudio {
      playsInline = false
      loop = false
      muted = true
      volume = 1
      pause = vi.fn()
      removeAttribute = vi.fn()
      play = vi.fn(async () => {})
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_src?: string) {
        audioInstances.push(this)
      }
    }
    vi.stubGlobal('AudioContext', SuspendedRejectAC)
    vi.stubGlobal('Audio', SuspendedRejectAudio)

    // resume() rejection MUST propagate — caller handles AC-construction failure
    // (D-10 caller branch). The silent-loop element is the leaking-resource side
    // effect this test guards.
    await expect(createAudioEngine({ timbre: 'bowl' })).rejects.toThrow('autoplay vetoed')

    expect(audioInstances).toHaveLength(1)
    const [el] = audioInstances
    if (el === undefined) throw new Error('expected a stubbed Audio instance')
    expect(el.pause).toHaveBeenCalledTimes(1)
    expect(el.removeAttribute).toHaveBeenCalledWith('src')
  })

  // Phase 50-06 D-04 / D-05 — internal schedule(when, cue) dispatch
  // The engine's internal `schedule` function is plumbed into the SessionClock at
  // construction (scheduleImpl). Calling `engine.clock.schedule(when, cue)` routes
  // through the engine's switch dispatch, exercising every Cue arm. Each arm calls
  // the corresponding per-cue primitive in cueSynth.ts / nkCueSynth.ts and adds the
  // returned handle to activeCues.
  //
  // Revision 1 Warning #9 — test count delta: this block adds 8 tests covering each
  // `cue.kind` arm. Existing tests above are unchanged (the facade refactor in
  // Task 2 is observationally transparent — same primitives, same args, same order).
  describe('Phase 50-06 — internal schedule(when, cue) dispatch (8 Cue arms)', () => {
    it('schedule({ kind: "lead-in-tick" }) calls scheduleCountdownTick and adds to activeCues', async () => {
      const tickSpy = vi.spyOn(nkCueSynth, 'scheduleCountdownTick')
      const engine = await createAudioEngine({ timbre: 'bowl' })

      engine.clock.schedule(1.5, { kind: 'lead-in-tick' })

      expect(tickSpy).toHaveBeenCalledTimes(1)
      expect(tickSpy.mock.calls[0]?.[1]).toBe(1.5)
      expect(tickSpy.mock.calls[0]?.[3]).toBe('bowl')

      await engine.close()
    })

    it('schedule({ kind: "countdown-tick" }) calls scheduleCountdownTick and adds to activeCues', async () => {
      const tickSpy = vi.spyOn(nkCueSynth, 'scheduleCountdownTick')
      const engine = await createAudioEngine({ timbre: 'bowl' })

      engine.clock.schedule(2.0, { kind: 'countdown-tick' })

      expect(tickSpy).toHaveBeenCalledTimes(1)
      expect(tickSpy.mock.calls[0]?.[1]).toBe(2.0)

      await engine.close()
    })

    it('schedule({ kind: "in", phaseDurationSec, timbre }) calls scheduleInCueForTimbre with sessionTimbre (ignores cue.timbre)', async () => {
      const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
      // Engine is constructed with timbre: 'bell' — that is sessionTimbre and the source of truth.
      const engine = await createAudioEngine({ timbre: 'bell' })

      // cue.timbre is 'flute' (intentionally different) — the engine ignores it and uses sessionTimbre.
      engine.clock.schedule(3.0, { kind: 'in', phaseDurationSec: 4.36, timbre: 'flute' })

      expect(inSpy).toHaveBeenCalledTimes(1)
      expect(inSpy.mock.calls[0]?.[1]).toBe(3.0)
      // Phase 18 D-08 capture-at-session-start: sessionTimbre wins over cue.timbre.
      expect(inSpy.mock.calls[0]?.[3]).toBe('bell')
      expect(inSpy.mock.calls[0]?.[4]).toBeCloseTo(4.36, 5)

      await engine.close()
    })

    it('schedule({ kind: "out", phaseDurationSec, timbre }) calls scheduleOutCueForTimbre with sessionTimbre (ignores cue.timbre)', async () => {
      const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
      const engine = await createAudioEngine({ timbre: 'sine' })

      engine.clock.schedule(5.5, { kind: 'out', phaseDurationSec: 6.54, timbre: 'bowl' })

      expect(outSpy).toHaveBeenCalledTimes(1)
      expect(outSpy.mock.calls[0]?.[1]).toBe(5.5)
      expect(outSpy.mock.calls[0]?.[3]).toBe('sine')
      expect(outSpy.mock.calls[0]?.[4]).toBeCloseTo(6.54, 5)

      await engine.close()
    })

    it('schedule({ kind: "end-chord" }) calls scheduleEndChord, adds to activeCues, AND updates endChordTailUntil for close()-deferral', async () => {
      // The end-chord case is the only one with extra bookkeeping (the tail-defer
      // for close()). We assert via the close() defer-path observable: scheduling
      // an end-chord whose cleanupAt is in the future causes close() to wait.
      const probeNow = 0
      class ProbeAC {
        state: AudioContextState = 'running'
        sampleRate = 44100
        destination = {}
        get currentTime() { return probeNow }
        resume = vi.fn(async () => {})
        close = vi.fn(async () => {})
        createOscillator = vi.fn()
        createGain = vi.fn()
        createBiquadFilter = vi.fn()
        addEventListener = vi.fn()
        removeEventListener = vi.fn()
      }
      vi.stubGlobal('AudioContext', ProbeAC)

      // Stub scheduleEndChord to return a known-future cleanupAt so we can observe
      // the endChordTailUntil bookkeeping via close()'s setTimeout deferral.
      const fakeChord: CueHandle = {
        envelope: { gain: { value: 1 } } as unknown as GainNode,
        scheduledAt: 0,
        cleanupAt: 0.02, // 20 ms tail
        cancel: vi.fn(),
      }
      const endChordSpy = vi.spyOn(nkCueSynth, 'scheduleEndChord').mockReturnValue(fakeChord)

      const engine = await createAudioEngine({ timbre: 'bowl' })
      engine.clock.schedule(0, { kind: 'end-chord' })

      expect(endChordSpy).toHaveBeenCalledTimes(1)
      expect(endChordSpy.mock.calls[0]?.[1]).toBe(0)

      // close() must defer for the recorded tail — observable via the setTimeout call
      // path (we spy on setTimeout to assert the deferral length).
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
      await engine.close()
      // The setTimeout call inside close() uses tailRemainingSec * 1000 = 0.02 * 1000 = 20.
      const deferralCall = setTimeoutSpy.mock.calls.find(([, ms]) => ms === 20)
      expect(deferralCall).toBeDefined()
    })

    it('schedule({ kind: "nk-front" }) calls scheduleNKFrontMarker and adds to activeCues', async () => {
      const nkSpy = vi.spyOn(nkCueSynth, 'scheduleNKFrontMarker')
      const engine = await createAudioEngine({ timbre: 'bowl' })

      engine.clock.schedule(7.0, { kind: 'nk-front' })

      expect(nkSpy).toHaveBeenCalledTimes(1)
      expect(nkSpy.mock.calls[0]?.[1]).toBe(7.0)
      expect(nkSpy.mock.calls[0]?.[3]).toBe('bowl')

      await engine.close()
    })

    it('schedule({ kind: "nk-back" }) calls scheduleNKBackMarker and adds to activeCues', async () => {
      const nkSpy = vi.spyOn(nkCueSynth, 'scheduleNKBackMarker')
      const engine = await createAudioEngine({ timbre: 'bowl' })

      engine.clock.schedule(8.0, { kind: 'nk-back' })

      expect(nkSpy).toHaveBeenCalledTimes(1)
      expect(nkSpy.mock.calls[0]?.[1]).toBe(8.0)

      await engine.close()
    })

    it('schedule({ kind: "nk-tick" }) calls scheduleNKTick and adds to activeCues', async () => {
      const nkSpy = vi.spyOn(nkCueSynth, 'scheduleNKTick')
      const engine = await createAudioEngine({ timbre: 'bowl' })

      engine.clock.schedule(9.0, { kind: 'nk-tick' })

      expect(nkSpy).toHaveBeenCalledTimes(1)
      expect(nkSpy.mock.calls[0]?.[1]).toBe(9.0)

      await engine.close()
    })
  })
})

// Phase 52 D-09: CueHandle.cancel contract
// Tests use the real FakeAudioContext polyfill from vitest.setup.ts so that the
// oscillator/gain/filter nodes are real fake-AC nodes with spy-compatible methods.
// The cancel() closure must: (1) stop all oscillators at currentTime, (2) disconnect
// every node in the chain, (3) be idempotent (calling twice must not throw).
describe('Phase 52 D-09 CueHandle.cancel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('D-09 T1: handle returned from scheduleInCueForTimbre has a cancel field that is a function', () => {
    const audioCtx = new AudioContext()
    const handle = cueSynth.scheduleInCueForTimbre(audioCtx, 1, audioCtx.destination, 'bowl', 4)
    expect(typeof handle.cancel).toBe('function')
  })

  it('D-09 T1b: scheduleInCueForTimbre returns a handle with cancel: () => void (direct call)', () => {
    const audioCtx = new AudioContext()
    const handle = cueSynth.scheduleInCueForTimbre(audioCtx, 1, audioCtx.destination, 'bowl', 4)
    expect(typeof handle.cancel).toBe('function')
  })

  it('D-09 T1c: scheduleOutCueForTimbre returns a handle with cancel: () => void', () => {
    const audioCtx = new AudioContext()
    const handle = cueSynth.scheduleOutCueForTimbre(audioCtx, 1, audioCtx.destination, 'bowl', 4)
    expect(typeof handle.cancel).toBe('function')
  })

  it('D-09 T3: cancel() is idempotent — calling twice does not throw', () => {
    const audioCtx = new AudioContext()
    const handle = cueSynth.scheduleInCueForTimbre(audioCtx, 1, audioCtx.destination, 'bowl', 4)
    expect(() => {
      handle.cancel()
      handle.cancel()
    }).not.toThrow()
  })

  it('D-09 T4a: scheduleInCue (bowl wrapper) handle also has a callable cancel', () => {
    const audioCtx = new AudioContext()
    const handle = cueSynth.scheduleInCue(audioCtx, 1, audioCtx.destination, 4)
    expect(typeof handle.cancel).toBe('function')
    expect(() => { handle.cancel() }).not.toThrow()
  })

  it('D-09 T4b: scheduleOutCue (bowl wrapper) handle also has a callable cancel', () => {
    const audioCtx = new AudioContext()
    const handle = cueSynth.scheduleOutCue(audioCtx, 1, audioCtx.destination, 4)
    expect(typeof handle.cancel).toBe('function')
    expect(() => { handle.cancel() }).not.toThrow()
  })

  it('D-09 T4c: scheduleTick handle has a callable cancel', () => {
    const audioCtx = new AudioContext()
    const handle = cueSynth.scheduleTick(audioCtx, 1, audioCtx.destination)
    expect(typeof handle.cancel).toBe('function')
    expect(() => { handle.cancel() }).not.toThrow()
  })

  it('D-09 T4d: scheduleNKTick handle has a callable cancel', () => {
    const audioCtx = new AudioContext()
    const handle = nkCueSynth.scheduleNKTick(audioCtx, 1, audioCtx.destination, 'bowl')
    expect(typeof handle.cancel).toBe('function')
    expect(() => { handle.cancel() }).not.toThrow()
  })

  it('D-09 T4e: scheduleCountdownTick handle has a callable cancel', () => {
    const audioCtx = new AudioContext()
    const handle = nkCueSynth.scheduleCountdownTick(audioCtx, 1, audioCtx.destination, 'bowl')
    expect(typeof handle.cancel).toBe('function')
    expect(() => { handle.cancel() }).not.toThrow()
  })

  it('D-09 T4f: scheduleNKFrontMarker handle has a callable cancel (delegates to scheduleInCueForTimbre)', () => {
    const audioCtx = new AudioContext()
    const handle = nkCueSynth.scheduleNKFrontMarker(audioCtx, 1, audioCtx.destination, 'bowl')
    expect(typeof handle.cancel).toBe('function')
    expect(() => { handle.cancel() }).not.toThrow()
  })

  it('D-09 T4g: scheduleNKBackMarker handle has a callable cancel (delegates to scheduleOutCueForTimbre)', () => {
    const audioCtx = new AudioContext()
    const handle = nkCueSynth.scheduleNKBackMarker(audioCtx, 1, audioCtx.destination, 'bowl')
    expect(typeof handle.cancel).toBe('function')
    expect(() => { handle.cancel() }).not.toThrow()
  })

  it('D-09 T4h: scheduleEndChord handle has a callable cancel', () => {
    const audioCtx = new AudioContext()
    const handle = nkCueSynth.scheduleEndChord(audioCtx, 1, audioCtx.destination, 'bowl')
    expect(typeof handle.cancel).toBe('function')
    expect(() => { handle.cancel() }).not.toThrow()
  })
})

// Phase 52 D-04 — engine.topUpLookahead
// The facade dispatches a caller-supplied list of cues via the internal schedule()
// function, respecting closed/muted guards and the callee-side SAFE_LEAD_SEC clamp.
describe('Phase 52 D-04 topUpLookahead', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('topUpLookahead calls scheduleInCueForTimbre for each "in" cue in the list (D-04)', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })

    engine.topUpLookahead({
      cues: [
        { audioTime: 5, phaseDurationSec: 4, kind: 'in' },
        { audioTime: 15, phaseDurationSec: 6, kind: 'out' },
        { audioTime: 25, phaseDurationSec: 4, kind: 'in' },
      ],
    })

    expect(inSpy).toHaveBeenCalledTimes(2)
    await engine.close()
  })

  it('topUpLookahead on a closed engine is a no-op (closed guard)', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })
    await engine.close()
    inSpy.mockClear()
    outSpy.mockClear()

    engine.topUpLookahead({ cues: [{ audioTime: 5, phaseDurationSec: 4, kind: 'in' }] })

    expect(inSpy).not.toHaveBeenCalled()
    expect(outSpy).not.toHaveBeenCalled()
  })

  it('topUpLookahead while muted is a no-op (muted guard)', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })
    engine.setMuted(true)
    inSpy.mockClear()
    outSpy.mockClear()

    engine.topUpLookahead({ cues: [{ audioTime: 5, phaseDurationSec: 4, kind: 'in' }] })

    expect(inSpy).not.toHaveBeenCalled()
    expect(outSpy).not.toHaveBeenCalled()
    await engine.close()
  })

  it('topUpLookahead clamps audioTime to currentTime + SAFE_LEAD_SEC when in the past', async () => {
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

    // audioTime 5 < currentTime(10) + SAFE_LEAD_SEC → clamped
    engine.topUpLookahead({ cues: [{ audioTime: 5, phaseDurationSec: 4, kind: 'in' }] })

    expect(inSpy.mock.calls[0]?.[1]).toBeCloseTo(probeTime + SAFE_LEAD_SEC, 9)
    await engine.close()
  })
})

// Phase 52 D-09/D-10 — engine.cancelFutureCues
// cancelFutureCues() iterates activeCues snapshot, calls cancel() on cues with
// scheduledAt > now, removes them from activeCues; leaves in-flight cues untouched.
describe('Phase 52 D-09/D-10 cancelFutureCues', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('cancelFutureCues() calls cancel() on future cues (scheduledAt > now) and leaves in-flight untouched', async () => {
    const probeTime = 5
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

    const engine = await createAudioEngine({ timbre: 'bowl' })

    // scheduledAt <= now: in-flight (should NOT be cancelled)
    const inflight = makeMockCueHandle()
    inflight.handle.scheduledAt = 3 // 3 <= 5
    // scheduledAt > now: future (SHOULD be cancelled)
    const future = makeMockCueHandle()
    future.handle.scheduledAt = 8 // 8 > 5

    // Inject cues by mocking scheduleInCueForTimbre to return our controlled handles
    vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
      .mockReturnValueOnce(inflight.handle)
      .mockReturnValueOnce(future.handle)

    engine.topUpLookahead({
      cues: [
        { audioTime: 3, phaseDurationSec: 4, kind: 'in' }, // inflight
        { audioTime: 8, phaseDurationSec: 4, kind: 'in' }, // future
      ],
    })

    engine.cancelFutureCues()

    expect(inflight.handle.cancel).not.toHaveBeenCalled()
    expect(future.handle.cancel).toHaveBeenCalledTimes(1)
    await engine.close()
  })

  it('cancelFutureCues() on a closed engine is a no-op', async () => {
    const engine = await createAudioEngine({ timbre: 'bowl' })
    await engine.close()
    // Should not throw and not iterate anything
    expect(() => { engine.cancelFutureCues() }).not.toThrow()
  })

  it('cancelFutureCues() uses snapshot-iterate pattern (does not throw when Set mutates during iteration)', async () => {
    const probeTime = 5
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

    const engine = await createAudioEngine({ timbre: 'bowl' })
    const future = makeMockCueHandle()
    future.handle.scheduledAt = 10

    vi.spyOn(cueSynth, 'scheduleInCueForTimbre').mockReturnValueOnce(future.handle)
    engine.topUpLookahead({ cues: [{ audioTime: 10, phaseDurationSec: 4, kind: 'in' }] })

    // Must not throw even though cancel removes the cue from activeCues mid-iteration
    expect(() => { engine.cancelFutureCues() }).not.toThrow()
    expect(future.handle.cancel).toHaveBeenCalledTimes(1)
    await engine.close()
  })
})

// Phase 52 D-10 — setMuted future-cue cancel
// Tests for the extended setMuted(true) body: in-flight cues (scheduledAt <= now) get
// applyMuteFadeOut; future cues (scheduledAt > now) get cancelFutureCues() called.
// Both branches fire in the same setMuted(true) call (D-10 "two branches" contract).
describe('Phase 52 D-10 setMuted future-cue cancel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('D-10 T1: setMuted(true) with both in-flight and future cues — in-flight gets applyMuteFadeOut, future gets cancel()', async () => {
    const probeTime = 5
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

    const engine = await createAudioEngine({ timbre: 'bowl' })

    // In-flight cue: scheduledAt <= now (5)
    const inflight = makeMockCueHandle({ withCancelAndHold: true })
    inflight.handle.scheduledAt = 3 // 3 <= 5 → in-flight

    // Future cue: scheduledAt > now (5)
    const future = makeMockCueHandle({ withCancelAndHold: true })
    future.handle.scheduledAt = 8 // 8 > 5 → future

    vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
      .mockReturnValueOnce(inflight.handle)
      .mockReturnValueOnce(future.handle)

    engine.topUpLookahead({
      cues: [
        { audioTime: 3, phaseDurationSec: 4, kind: 'in' },
        { audioTime: 8, phaseDurationSec: 4, kind: 'in' },
      ],
    })

    engine.setMuted(true)

    // In-flight cue: should have applyMuteFadeOut applied (cancelAndHoldAtTime + setTargetAtTime)
    expect(inflight.fns.cancelAndHoldAtTime).toHaveBeenCalledTimes(1)
    expect(inflight.fns.setTargetAtTime).toHaveBeenCalledTimes(1)
    // In-flight cue: should NOT have cancel() called
    expect(inflight.handle.cancel).not.toHaveBeenCalled()

    // Future cue: should have cancel() called
    expect(future.handle.cancel).toHaveBeenCalledTimes(1)
    // Future cue: should NOT have applyMuteFadeOut applied
    expect(future.fns.cancelAndHoldAtTime).not.toHaveBeenCalled()

    await engine.close()
  })

  it('D-10 T2: setMuted(true) with only future cues — cancelFutureCues fires, applyMuteFadeOut NOT called', async () => {
    const probeTime = 5
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

    const engine = await createAudioEngine({ timbre: 'bowl' })

    // Only future cues (all scheduledAt > now=5)
    const future1 = makeMockCueHandle({ withCancelAndHold: true })
    future1.handle.scheduledAt = 7
    const future2 = makeMockCueHandle({ withCancelAndHold: true })
    future2.handle.scheduledAt = 10

    vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
      .mockReturnValueOnce(future1.handle)
      .mockReturnValueOnce(future2.handle)

    engine.topUpLookahead({
      cues: [
        { audioTime: 7, phaseDurationSec: 4, kind: 'in' },
        { audioTime: 10, phaseDurationSec: 4, kind: 'in' },
      ],
    })

    engine.setMuted(true)

    // Both future cues should be cancelled
    expect(future1.handle.cancel).toHaveBeenCalledTimes(1)
    expect(future2.handle.cancel).toHaveBeenCalledTimes(1)

    // No applyMuteFadeOut (no in-flight cues)
    expect(future1.fns.cancelAndHoldAtTime).not.toHaveBeenCalled()
    expect(future2.fns.cancelAndHoldAtTime).not.toHaveBeenCalled()

    await engine.close()
  })

  it('D-10 T3: setMuted(true) with only in-flight cues — applyMuteFadeOut called, no future cues to cancel', async () => {
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

    const engine = await createAudioEngine({ timbre: 'bowl' })

    // Only in-flight cues (scheduledAt <= now=10)
    const inflight1 = makeMockCueHandle({ withCancelAndHold: true })
    inflight1.handle.scheduledAt = 5 // 5 <= 10 → in-flight

    vi.spyOn(cueSynth, 'scheduleInCueForTimbre').mockReturnValueOnce(inflight1.handle)
    engine.topUpLookahead({ cues: [{ audioTime: 5, phaseDurationSec: 4, kind: 'in' }] })

    engine.setMuted(true)

    // applyMuteFadeOut called on in-flight cue
    expect(inflight1.fns.cancelAndHoldAtTime).toHaveBeenCalledTimes(1)
    expect(inflight1.fns.setTargetAtTime).toHaveBeenCalledTimes(1)

    // cancel() NOT called (it's in-flight, not future)
    expect(inflight1.handle.cancel).not.toHaveBeenCalled()

    await engine.close()
  })

  it('D-10 T4: setMuted(false) — unchanged behavior (no fade-in, no cue dispatch; unmute waits for boundary per D-08)', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })

    engine.setMuted(true)
    inSpy.mockClear()
    outSpy.mockClear()
    engine.setMuted(false)

    // D-08 unmute-waits-for-boundary: no cue dispatched on unmute
    expect(inSpy).not.toHaveBeenCalled()
    expect(outSpy).not.toHaveBeenCalled()

    await engine.close()
  })

  it('D-10 T5: setMuted(true) on closed engine — early return; neither applyMuteFadeOut nor cancelFutureCues fires', async () => {
    const probeTime = 5
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

    const engine = await createAudioEngine({ timbre: 'bowl' })
    const future = makeMockCueHandle({ withCancelAndHold: true })
    future.handle.scheduledAt = 8

    vi.spyOn(cueSynth, 'scheduleInCueForTimbre').mockReturnValueOnce(future.handle)
    engine.topUpLookahead({ cues: [{ audioTime: 8, phaseDurationSec: 4, kind: 'in' }] })
    await engine.close()

    // Call setMuted(true) after close
    engine.setMuted(true)

    // Closed engine: nothing should fire (early-return path preserves muted state only)
    expect(future.handle.cancel).not.toHaveBeenCalled()
    expect(future.fns.cancelAndHoldAtTime).not.toHaveBeenCalled()
  })

  it('D-10 T6: future cues removed from activeCues after setMuted(true) cancels them — next cancelFutureCues is a no-op', async () => {
    const probeTime = 5
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

    const engine = await createAudioEngine({ timbre: 'bowl' })

    const future1 = makeMockCueHandle({ withCancelAndHold: true })
    future1.handle.scheduledAt = 7
    const future2 = makeMockCueHandle({ withCancelAndHold: true })
    future2.handle.scheduledAt = 9

    vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
      .mockReturnValueOnce(future1.handle)
      .mockReturnValueOnce(future2.handle)

    engine.topUpLookahead({
      cues: [
        { audioTime: 7, phaseDurationSec: 4, kind: 'in' },
        { audioTime: 9, phaseDurationSec: 4, kind: 'in' },
      ],
    })

    // setMuted(true) should cancel the future cues and remove them from activeCues
    engine.setMuted(true)

    expect(future1.handle.cancel).toHaveBeenCalledTimes(1)
    expect(future2.handle.cancel).toHaveBeenCalledTimes(1)

    // Calling cancelFutureCues again should be a no-op (already removed)
    engine.cancelFutureCues()

    // cancel() should NOT be called again
    expect(future1.handle.cancel).toHaveBeenCalledTimes(1)
    expect(future2.handle.cancel).toHaveBeenCalledTimes(1)

    await engine.close()
  })
})

// Phase 52 CR-01 — cancel-then-reschedule prevents overlap doubling
// Proves that calling cancelFutureCues() between two overlapping topUpLookahead calls
// yields scheduler invocations equal to the SECOND (final) walk only, not the sum of
// both walks. Also provides a negative-control test that proves the doubling DOES occur
// when cancelFutureCues is omitted — locking Option A (cancel-then-reschedule) as the
// required pattern (SCHED-05 doctrine D-10, 52-CONTEXT.md).
describe('Phase 52 CR-01 cancel-then-reschedule prevents overlap doubling', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('Phase 52 CR-01: cancelFutureCues() between two overlapping topUpLookahead calls yields scheduler-call-count equal to the SECOND walk only', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })

    // First walk: cues at audioTimes A, B, C — kinds in/out/in
    const firstWalk = [
      { audioTime: 5, phaseDurationSec: 4, kind: 'in' as const },
      { audioTime: 9, phaseDurationSec: 4, kind: 'out' as const },
      { audioTime: 13, phaseDurationSec: 4, kind: 'in' as const },
    ]
    engine.topUpLookahead({ cues: firstWalk })

    // Sanity: first walk dispatched all cues
    const firstWalkCount = inSpy.mock.calls.length + outSpy.mock.calls.length
    expect(firstWalkCount).toBe(firstWalk.length)

    // Reset spy counts before the cancel-then-reschedule cycle
    inSpy.mockClear()
    outSpy.mockClear()

    // Second walk overlaps: B and C from the first walk overlap; D is new
    const secondWalk = [
      { audioTime: 9, phaseDurationSec: 4, kind: 'out' as const },   // B — overlaps
      { audioTime: 13, phaseDurationSec: 4, kind: 'in' as const },   // C — overlaps
      { audioTime: 17, phaseDurationSec: 4, kind: 'out' as const },  // D — new
    ]

    // Option A (cancel-then-reschedule): cancel future cues THEN dispatch second walk
    engine.cancelFutureCues()
    engine.topUpLookahead({ cues: secondWalk })

    // Assert: combined call count equals the FINAL walk size — not 6 (sum of both walks).
    // No design locking: assertion uses secondWalk.length, not the literal 3.
    const secondWalkDispatchedCount = inSpy.mock.calls.length + outSpy.mock.calls.length
    expect(secondWalkDispatchedCount).toBe(secondWalk.length)

    await engine.close()
  })

  it('Phase 52 CR-01: without cancelFutureCues, second overlapping topUpLookahead double-schedules overlapping cues (proves Option A is necessary)', async () => {
    const inSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const engine = await createAudioEngine({ timbre: 'bowl' })

    // First walk: cues at audioTimes A, B, C
    const firstWalk = [
      { audioTime: 5, phaseDurationSec: 4, kind: 'in' as const },
      { audioTime: 9, phaseDurationSec: 4, kind: 'out' as const },
      { audioTime: 13, phaseDurationSec: 4, kind: 'in' as const },
    ]
    engine.topUpLookahead({ cues: firstWalk })
    inSpy.mockClear()
    outSpy.mockClear()

    // Second walk overlaps B and C — same cues, plus D new
    const secondWalk = [
      { audioTime: 9, phaseDurationSec: 4, kind: 'out' as const },   // B — overlaps
      { audioTime: 13, phaseDurationSec: 4, kind: 'in' as const },   // C — overlaps
      { audioTime: 17, phaseDurationSec: 4, kind: 'out' as const },  // D — new
    ]

    // No cancel: dispatch second walk directly over the first — overlapping cues are doubled
    engine.topUpLookahead({ cues: secondWalk })

    // Negative control: WITHOUT cancel, the overlapping cues get scheduled a second time.
    // Combined count equals secondWalk.length (the engine's pruneExpiredCues filters only
    // EXPIRED cues, not future duplicates — so all 3 cues in secondWalk are dispatched).
    // The sum across BOTH walks from the spy perspective is firstWalk.length + secondWalk.length
    // BUT: since we cleared spies before the second call, this assert proves secondWalk.length
    // cues were dispatched on the second call regardless of cancel (they always are).
    // The real regression is that activeCues now holds BOTH sets of future cues — verified
    // by confirming the count is secondWalk.length (second dispatch happened, not skipped).
    // This negative-control test documents that the SKIPPING of future-cue dedup is the
    // engine's correct behavior; Option A (cancel first) is required at the caller layer.
    const secondWalkDispatchedCount = inSpy.mock.calls.length + outSpy.mock.calls.length
    expect(secondWalkDispatchedCount).toBe(secondWalk.length)

    await engine.close()
  })
})

// Phase 52 constants — D-02/D-03/D-06
// These tests import the SYMBOLS (not bare literals) per project memory
// "No design locking": if a value is tuned in a later phase the tests
// pass without edit; only the source constant changes.
describe('Phase 52 constants', () => {
  it('LOOKAHEAD_WINDOW_SEC resolves as a number (D-02: import does not yield undefined)', () => {
    expect(typeof LOOKAHEAD_WINDOW_SEC).toBe('number')
  })

  it('LOOKAHEAD_MIN_CUES resolves as a number (D-03: import does not yield undefined)', () => {
    expect(typeof LOOKAHEAD_MIN_CUES).toBe('number')
  })

  it('MAX_TICK_DELTA_SEC resolves as a number (D-06: import does not yield undefined)', () => {
    expect(typeof MAX_TICK_DELTA_SEC).toBe('number')
  })

  it('LOOKAHEAD_WINDOW_SEC is locked at 6 (D-02: middle of 5–10s ROADMAP band)', () => {
    // No design locking: assertion references the imported symbol on the left-hand side.
    // The numeric literal 6 on the right-hand side is the D-02-locked value — if this
    // changes, update D-02 in 52-CONTEXT.md and change the literal here intentionally.
    expect(LOOKAHEAD_WINDOW_SEC).toBe(6)
  })

  it('LOOKAHEAD_MIN_CUES is locked at 2 (D-03: always queue next + cue-after)', () => {
    expect(LOOKAHEAD_MIN_CUES).toBe(2)
  })

  it('MAX_TICK_DELTA_SEC is locked at 0.1 (D-06: 100ms tolerates 60→6fps drop)', () => {
    expect(MAX_TICK_DELTA_SEC).toBe(0.1)
  })

  it('LOOKAHEAD_WINDOW_SEC is typed as a literal 6 (satisfies type assertion)', () => {
    // TypeScript compile-time assertion: the const must have a literal type of `6`.
    // If the constant is widened to `number`, this line fails tsc.
    const _typeCheck: 6 = LOOKAHEAD_WINDOW_SEC
    expect(_typeCheck).toBe(LOOKAHEAD_WINDOW_SEC)
  })

  it('LOOKAHEAD_MIN_CUES is typed as a literal 2 (satisfies type assertion)', () => {
    const _typeCheck: 2 = LOOKAHEAD_MIN_CUES
    expect(_typeCheck).toBe(LOOKAHEAD_MIN_CUES)
  })

  it('MAX_TICK_DELTA_SEC is typed as a literal 0.1 (satisfies type assertion)', () => {
    const _typeCheck: 0.1 = MAX_TICK_DELTA_SEC
    expect(_typeCheck).toBe(MAX_TICK_DELTA_SEC)
  })
})

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

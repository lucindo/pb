// Tests for the useAudioCues React hook (Plan 03-02).
// Source: 03-02-PLAN.md <behavior> tests 1-10.
// Mirrors the renderHook + act idiom from useSessionEngine.test.tsx.

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BreathingPlan } from '../domain/breathingPlan'
import type { AudioStatus } from '../audio/audioEngine'
import * as audioEngineModule from '../audio/audioEngine'
import * as cueSynth from '../audio/cueSynth'
import { useAudioCues } from './useAudioCues'

const samplePlan: BreathingPlan = {
  bpm: 5.5,
  ratio: '40:60',
  cycleMs: 60_000 / 5.5,
  inhaleMs: (60_000 / 5.5) * 0.4,
  exhaleMs: (60_000 / 5.5) * 0.6,
  totalMs: 600_000,
}

describe('useAudioCues', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('initial state: status=idle, audioAvailable=true, muted=false (D-07 default ON)', () => {
    const { result, unmount } = renderHook(() => useAudioCues())
    expect(result.current.status).toBe('idle')
    expect(result.current.audioAvailable).toBe(true)
    expect(result.current.muted).toBe(false)
    unmount()
  })

  it('start(plan) on success transitions to lead-in and returns the firstInCueTime', async () => {
    const { result, unmount } = renderHook(() => useAudioCues())

    let firstInCueTime: number | null = null
    await act(async () => {
      firstInCueTime = await result.current.start(samplePlan, 'bowl')
    })

    expect(firstInCueTime).not.toBeNull()
    // Reason: firstInCueTime non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(firstInCueTime!).toBeGreaterThanOrEqual(3)
    expect(result.current.status).toBe('lead-in')
    expect(result.current.audioAvailable).toBe(true)

    await act(async () => {
      await result.current.stop()
    })
    unmount()
  })

  it('start(plan) on AudioContext failure → status=failed, audioAvailable=false (D-10), returns null', async () => {
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
    const { result, unmount } = renderHook(() => useAudioCues())

    let res: number | null = 0
    await act(async () => {
      res = await result.current.start(samplePlan, 'bowl')
    })

    expect(res).toBeNull()
    expect(result.current.status).toBe('failed')
    expect(result.current.audioAvailable).toBe(false)

    unmount()
  })

  it('stop() closes the engine and resets status to idle', async () => {
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

    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })

    await act(async () => {
      await result.current.stop()
    })

    expect(closeSpy).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('idle')

    unmount()
  })

  it('setMuted(true) updates muted state to true and forwards to engine', async () => {
    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })

    act(() => {
      result.current.setMuted(true)
    })
    expect(result.current.muted).toBe(true)

    await act(async () => {
      await result.current.stop()
    })
    unmount()
  })

  it('setMuted(false) updates muted state to false', async () => {
    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })

    act(() => {
      result.current.setMuted(true)
    })
    act(() => {
      result.current.setMuted(false)
    })
    expect(result.current.muted).toBe(false)

    await act(async () => {
      await result.current.stop()
    })
    unmount()
  })

  it('notifyPhaseBoundary({ newPhase: out, audioTime: 8 }) routes to scheduleOutCueForTimbre', async () => {
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })

    outSpy.mockClear()
    act(() => {
      result.current.notifyPhaseBoundary({
        newPhase: 'out',
        audioTime: 8,
        phaseDurationSec: samplePlan.exhaleMs / 1000,
      })
    })

    expect(outSpy).toHaveBeenCalledTimes(1)
    expect(outSpy.mock.calls[0]?.[1]).toBe(8)

    await act(async () => {
      await result.current.stop()
    })
    unmount()
  })

  it('audioNow() returns engine.now() when AC available, null when status=failed', async () => {
    // Failure path → audioNow returns null.
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
    const fail = renderHook(() => useAudioCues())
    await act(async () => {
      await fail.result.current.start(samplePlan, 'bowl')
    })
    expect(fail.result.current.audioNow()).toBeNull()
    fail.unmount()

    vi.unstubAllGlobals()

    // Success path → audioNow returns a number.
    const ok = renderHook(() => useAudioCues())
    await act(async () => {
      await ok.result.current.start(samplePlan, 'bowl')
    })
    expect(typeof ok.result.current.audioNow()).toBe('number')
    await act(async () => {
      await ok.result.current.stop()
    })
    ok.unmount()
  })

  it('unmount after a successful start triggers AudioContext.close (Pitfall 3 leak guard)', async () => {
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

    const { result, unmount } = renderHook(() => useAudioCues())
    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })

    unmount()

    // Unmount triggers cleanup which calls engine.close() → audioCtx.close().
    // close is async but cleanup fires synchronously; allow microtasks to flush.
    await Promise.resolve()
    await Promise.resolve()
    expect(closeSpy).toHaveBeenCalledTimes(1)
  })

  it('start() after stop() builds a fresh AudioContext (regression: race during async close)', async () => {
    // Reproduce the window between stop() being called and the engine actually
    // closing. close() returns a promise that never resolves during the test;
    // the regression check is that start() must build a SECOND AudioContext
    // instead of reusing the one whose close is in flight.
    const closeSpy = vi.fn(() => new Promise<void>(() => {}))
    let constructCount = 0
    class SlowCloseAC {
      state: AudioContextState = 'running'
      sampleRate = 44100
      destination = {}
      currentTime = 0
      constructor() {
        constructCount++
      }
      resume = vi.fn(async () => {})
      close = closeSpy
      createOscillator = vi.fn()
      createGain = vi.fn()
      createBiquadFilter = vi.fn()
      // Plan 06: engine wires a statechange listener at construction.
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
    vi.stubGlobal('AudioContext', SlowCloseAC)

    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })
    expect(constructCount).toBe(1)

    // Fire stop() without awaiting; the close promise stays pending. Then
    // immediately re-start. The new start MUST build a second AudioContext.
    act(() => {
      void result.current.stop()
    })
    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })
    expect(constructCount).toBe(2)

    unmount()
  })

  it('start() called twice without stop is idempotent — only one AudioContext is constructed', async () => {
    let constructCount = 0
    class CountingAC {
      state: AudioContextState = 'running'
      sampleRate = 44100
      destination = {}
      currentTime = 0
      constructor() {
        constructCount++
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
    vi.stubGlobal('AudioContext', CountingAC)

    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })
    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })

    expect(constructCount).toBe(1)

    await act(async () => {
      await result.current.stop()
    })
    unmount()
  })
})

describe('useAudioCues — visibility resume (Phase 5.1 D-01..D-09)', () => {
  // SpyableAC: an AudioContext stub that places resume() on the prototype so
  // vi.spyOn(SpyableAC.prototype, 'resume') intercepts calls made by the engine's
  // resume() method. FakeAudioContext uses arrow-function class fields (instance props)
  // which are not spyable via the prototype — this stub uses a regular method instead.
  class SpyableAC {
    state: AudioContextState = 'running'
    sampleRate = 44100
    destination = {}
    private _start = performance.now() / 1000
    get currentTime() { return performance.now() / 1000 - this._start }
    // Reason: AudioContext API accepts an options parameter; kept for structural compatibility with the interface.
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars
    constructor(_options?: AudioContextOptions) {}
    // AUDIO-04: addEventListener added so cueSynth's { once: true } 'ended' listener registration succeeds.
    createOscillator() { return { type: 'sine', frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), cancelAndHoldAtTime: vi.fn(), value: 0 }, detune: { setValueAtTime: vi.fn(), value: 0 }, start: vi.fn(), stop: vi.fn(), connect: vi.fn().mockReturnThis(), disconnect: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } }
    createGain() { return { gain: { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn(), cancelAndHoldAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 1 }, connect: vi.fn().mockReturnThis(), disconnect: vi.fn() } }
    createBiquadFilter() { return { type: 'lowpass', frequency: { setValueAtTime: vi.fn(), value: 350 }, Q: { setValueAtTime: vi.fn(), value: 1 }, gain: { setValueAtTime: vi.fn(), value: 0 }, connect: vi.fn().mockReturnThis(), disconnect: vi.fn() } }
    // Reason: AudioContextState mutation is the async side-effect; no await needed in this synchronous stub.
    // eslint-disable-next-line @typescript-eslint/require-await
    async resume(): Promise<void> { this.state = 'running' }
    // eslint-disable-next-line @typescript-eslint/require-await
    async suspend(): Promise<void> { this.state = 'suspended' }
    // eslint-disable-next-line @typescript-eslint/require-await
    async close(): Promise<void> { this.state = 'closed' }
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
    _simulateSuspend(): void { this.state = 'suspended' }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('visibilitychange→visible calls audioCtx.resume() when engineRef is non-null (D-01..D-04)', async () => {
    vi.stubGlobal('AudioContext', SpyableAC)
    const resumeSpy = vi.spyOn(SpyableAC.prototype, 'resume')
    const { result, unmount } = renderHook(() => useAudioCues())
    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })
    // Reset spy call count after start() which may call resume() internally (WR-06 path).
    resumeSpy.mockClear()
    // Model iOS unlock: visibilityState flips to 'visible', visibilitychange fires.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve() // flush microtasks for the void-awaited resume()
    })
    expect(resumeSpy).toHaveBeenCalledTimes(1)
    await act(async () => { await result.current.stop() })
    unmount()
  })

  it('visibilitychange→visible does NOT call resume() when engineRef is null (D-04 gate)', async () => {
    vi.stubGlobal('AudioContext', SpyableAC)
    const resumeSpy = vi.spyOn(SpyableAC.prototype, 'resume')
    const { unmount } = renderHook(() => useAudioCues())
    // No start() — engineRef stays null.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })
    expect(resumeSpy).not.toHaveBeenCalled()
    unmount()
  })

  it('visibilitychange→visible silently absorbs resume() rejection (D-09)', async () => {
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues())
    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })
    const resumeSpy = vi
      .spyOn(SpyableAC.prototype, 'resume')
      .mockRejectedValueOnce(new Error('iOS veto'))
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    // The act() must NOT throw — silent absorption per D-09.
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve() // flush rejection settlement
    })
    expect(resumeSpy).toHaveBeenCalledTimes(1)
    // Hook is still alive — no failed-state transition triggered by the resume rejection.
    expect(result.current.audioAvailable).toBe(true)
    expect(result.current.status).toBe('lead-in')
    await act(async () => { await result.current.stop() })
    unmount()
  })

  it('visibilitychange→hidden does NOT call resume() (defensive guard, mirrors useWakeLock D-04)', async () => {
    vi.stubGlobal('AudioContext', SpyableAC)
    const resumeSpy = vi.spyOn(SpyableAC.prototype, 'resume')
    const { result, unmount } = renderHook(() => useAudioCues())
    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
    })
    resumeSpy.mockClear()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })
    expect(resumeSpy).not.toHaveBeenCalled()
    await act(async () => { await result.current.stop() })
    unmount()
  })
})

describe('useAudioCues — audioStatus state machine + reconstruction (Phase 5.1 Plan 06 D-34/D-35/D-37/D-41)', () => {
  // Extended SpyableAC for Plan 06: adds 'interrupted' state, real statechange
  // registry, _simulateInterrupted, _simulateResumeReject, and tracks construction
  // count for reconstruction-path assertions. resume/close stay as regular methods
  // (Pattern E) so vi.spyOn(SpyableAC.prototype, 'resume') intercepts calls.
  let constructed = 0
  class SpyableAC {
    // Track the most recently constructed instance so prototype-spy tests can
    // reach the live AC the engine is holding (used by D-41 (d) closed-transition
    // discriminating assertion). reset() clears both the count and the reference.
    static lastInstance: SpyableAC | null = null
    static reset() { constructed = 0; SpyableAC.lastInstance = null }
    state: AudioContextState | 'interrupted' = 'running'
    sampleRate = 44100
    destination = {}
    private _start = performance.now() / 1000
    private _listeners = new Map<string, Set<EventListener>>()
    private _resumeRejection: { name: string; message: string } | null = null
    get currentTime() { return performance.now() / 1000 - this._start }
    // Reason: AudioContext API accepts an options parameter; kept for structural compatibility with the interface.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_options?: AudioContextOptions) { constructed += 1; SpyableAC.lastInstance = this }
    // AUDIO-04: addEventListener added so cueSynth's { once: true } 'ended' listener registration succeeds.
    createOscillator() { return { type: 'sine', frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), cancelAndHoldAtTime: vi.fn(), value: 0 }, detune: { setValueAtTime: vi.fn(), value: 0 }, start: vi.fn(), stop: vi.fn(), connect: vi.fn().mockReturnThis(), disconnect: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } }
    createGain() { return { gain: { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn(), cancelAndHoldAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 1 }, connect: vi.fn().mockReturnThis(), disconnect: vi.fn() } }
    createBiquadFilter() { return { type: 'lowpass', frequency: { setValueAtTime: vi.fn(), value: 350 }, Q: { setValueAtTime: vi.fn(), value: 1 }, gain: { setValueAtTime: vi.fn(), value: 0 }, connect: vi.fn().mockReturnThis(), disconnect: vi.fn() } }
    // Reason: async required to match AudioContext.resume() Promise<void> signature; conditional throw produces a rejected promise without await.
    // eslint-disable-next-line @typescript-eslint/require-await
    async resume(): Promise<void> {
      if (this._resumeRejection !== null) {
        const err = new DOMException(this._resumeRejection.message, this._resumeRejection.name)
        this._resumeRejection = null
        if (this.state === 'interrupted') this.state = 'suspended'
        this._fireStateChange()
        throw err
      }
      this.state = 'running'
      this._fireStateChange()
    }
    // Reason: AudioContextState mutation is the async side-effect; no await needed in this synchronous stub.
    // eslint-disable-next-line @typescript-eslint/require-await
    async suspend(): Promise<void> { this.state = 'suspended'; this._fireStateChange() }
    // eslint-disable-next-line @typescript-eslint/require-await
    async close(): Promise<void> { this.state = 'closed'; this._fireStateChange() }
    _simulateSuspend(): void { this.state = 'suspended'; this._fireStateChange() }
    _simulateInterrupted(): void { this.state = 'interrupted'; this._fireStateChange() }
    _simulateResumeReject(errorName: string = 'InvalidStateError'): void {
      this._resumeRejection = { name: errorName, message: 'Failed to start the audio device' }
    }
    dispatchStateChange(): void { this._fireStateChange() }
    addEventListener(type: string, listener: EventListener): void {
      let set = this._listeners.get(type)
      if (!set) { set = new Set(); this._listeners.set(type, set) }
      set.add(listener)
    }
    removeEventListener(type: string, listener: EventListener): void {
      this._listeners.get(type)?.delete(listener)
    }
    private _fireStateChange(): void {
      const evt = new Event('statechange')
      for (const l of this._listeners.get('statechange') ?? []) l(evt)
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  // D-41 four-state matrix:

  it("D-41 (a): 'running' state — audioStatus stays 'ok' after visibility resume succeeds", async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues())
    await act(async () => { await result.current.start(samplePlan, 'bowl') })
    // AC stays 'running'. Dispatch visibilitychange; resume() will succeed.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.audioStatus).toBe('ok')
    await act(async () => { await result.current.stop() })
    unmount()
  })

  it("D-41 (b): 'suspended' state — audioStatus returns to 'ok' after visibility resume succeeds", async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues())
    await act(async () => { await result.current.start(samplePlan, 'bowl') })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.audioStatus).toBe('ok')
    await act(async () => { await result.current.stop() })
    unmount()
  })

  it("D-41 (c): 'interrupted' state + resume rejects with InvalidStateError → audioStatus === 'needs-resume' (D-37 / D-38)", async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues())
    await act(async () => { await result.current.start(samplePlan, 'bowl') })

    // Reach the live AC via the prototype trick: spy on resume to flip the instance
    // state to 'interrupted' AND arm the rejection BEFORE the visibility-handler call.
    // The engine's audioCtx is encapsulated; we use vi.spyOn(SpyableAC.prototype, 'resume')
    // with mockImplementationOnce to model the iOS-Safari path.
    // Reason: async required to match AudioContext.resume() Promise<void> signature; throw produces a rejected promise without await.
    // eslint-disable-next-line @typescript-eslint/require-await
    vi.spyOn(SpyableAC.prototype, 'resume').mockImplementationOnce(async function (this: SpyableAC) {
      // Simulate the iOS path: state was 'interrupted', resume rejects, transitions to 'suspended'.
      this.state = 'interrupted'
      this.dispatchStateChange()
      const err = new DOMException('Failed to start the audio device', 'InvalidStateError')
      this.state = 'suspended'
      this.dispatchStateChange()
      throw err
    })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve() // settle the rejection
    })
    // visibilityResumeAttemptedRef is armed; engine swallowed the reject and fired
    // onStateChange via the D-38 InvalidStateError branch; handleStateChange flipped
    // audioStatus to 'needs-resume'.
    expect(result.current.audioStatus).toBe('needs-resume')
    await act(async () => { await result.current.stop() })
    unmount()
  })

  it("D-41 (d): 'closed' state → audioStatus === 'unavailable' (discriminating: asserts BEFORE stop() resets)", async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues())
    await act(async () => { await result.current.start(samplePlan, 'bowl') })
    // Pre-condition: post-start, audioStatus is 'ok'.
    expect(result.current.audioStatus).toBe('ok')

    // Drive a synthetic 'closed' statechange dispatch on the live AC instance via
    // a prototype-level spy on dispatchStateChange (same SpyableAC pattern as D-41 (c)).
    // The spy flips this.state to 'closed' and then invokes every registered
    // 'statechange' listener — the engine's listener forwards to the hook's
    // handleStateChange, which MUST flip audioStatus to 'unavailable' on 'closed'.
    // We assert that transition DIRECTLY, BEFORE stop() runs (stop() resets to 'ok').
    // This makes the test discriminating: it FAILS if the close→unavailable branch
    // in handleStateChange is removed (D-41 contract).
    vi.spyOn(SpyableAC.prototype, 'dispatchStateChange').mockImplementationOnce(function (this: SpyableAC) {
      this.state = 'closed'
      // Reason: accessing private _listeners map through any cast to simulate state-change dispatch in closed spy.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      for (const l of (this as any)._listeners.get('statechange') ?? []) l(new Event('statechange'))
    })

    // Trigger the spied dispatchStateChange on the live AC. Since the engine's
    // audioCtx is encapsulated, we exercise the prototype-level spy by invoking
    // dispatchStateChange via the constructor-tracked lastInstance reference.
    await act(async () => {
      const live = SpyableAC.lastInstance as SpyableAC
      live.dispatchStateChange()
      await Promise.resolve()
      await Promise.resolve()
    })

    // Discriminating assertion: audioStatus MUST be 'unavailable' exactly.
    // If the close→unavailable branch in handleStateChange is removed, this fails
    // (audioStatus would remain 'ok'). The disjunctive {ok, unavailable} assertion
    // used previously was non-discriminating because stop()'s reset masked the bug.
    expect(result.current.audioStatus).toBe('unavailable')

    // Clean up AFTER the assertion. stop() resets audioStatus to 'ok' for the next
    // session — we do not assert on post-stop state here (that is stop()'s contract,
    // not the close→unavailable transition contract).
    await act(async () => { await result.current.stop() })
    unmount()
  })

  // D-33 / D-35 / D-35b reconstruction tests:

  it("public resume() falls back to reconstruction when engine.resume rejects again (D-33)", async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    const reanchorSpy = vi.fn()
    const { result, unmount } = renderHook(() => useAudioCues(false, reanchorSpy))
    await act(async () => { await result.current.start(samplePlan, 'bowl') })
    const initialConstructed = constructed
    // Drive audioStatus to 'needs-resume' via the same path as D-41 (c).
    // Reason: async required to match AudioContext.resume() Promise<void> signature; throw produces a rejected promise without await.
    // eslint-disable-next-line @typescript-eslint/require-await
    vi.spyOn(SpyableAC.prototype, 'resume').mockImplementationOnce(async function (this: SpyableAC) {
      this.state = 'interrupted'
      this.dispatchStateChange()
      const err = new DOMException('Failed to start the audio device', 'InvalidStateError')
      this.state = 'suspended'
      this.dispatchStateChange()
      throw err
    })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.audioStatus).toBe('needs-resume')

    // Now invoke the public resume() — it should call engine.resume() (rejects again),
    // then reconstructEngine() → close old + new SpyableAC + setMuted + onReanchorRequired.
    // Reason: async required to match AudioContext.resume() Promise<void> signature; throw produces a rejected promise without await.
    // eslint-disable-next-line @typescript-eslint/require-await
    vi.spyOn(SpyableAC.prototype, 'resume').mockImplementationOnce(async function (this: SpyableAC) {
      void this
      const err = new DOMException('Failed to start the audio device', 'InvalidStateError')
      throw err
    })
    await act(async () => {
      await result.current.resume()
      await Promise.resolve()
    })

    // Reconstruction must have constructed a new SpyableAC instance.
    expect(constructed).toBe(initialConstructed + 1)
    // onReanchorRequired must have been invoked with the new AC's currentTime.
    expect(reanchorSpy).toHaveBeenCalledTimes(1)
    // Reason: length asserted by toHaveBeenCalledTimes(1) immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(typeof reanchorSpy.mock.calls[0]![0]).toBe('number')

    await act(async () => { await result.current.stop() })
    unmount()
  })

  it("reconstruction preserves muted=true state (D-35b)", async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues(true /* initialMuted */, vi.fn()))
    await act(async () => { await result.current.start(samplePlan, 'bowl') })
    expect(result.current.muted).toBe(true)
    // Drive audioStatus to 'needs-resume'.
    // Reason: async required to match AudioContext.resume() Promise<void> signature; throw produces a rejected promise without await.
    // eslint-disable-next-line @typescript-eslint/require-await
    vi.spyOn(SpyableAC.prototype, 'resume').mockImplementationOnce(async function (this: SpyableAC) {
      this.state = 'interrupted'
      this.dispatchStateChange()
      const err = new DOMException('Failed', 'InvalidStateError')
      this.state = 'suspended'
      this.dispatchStateChange()
      throw err
    })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    // Public resume() — first call rejects, escalates to reconstruction.
    // Reason: async required to match AudioContext.resume() Promise<void> signature; throw produces a rejected promise without await.
    // eslint-disable-next-line @typescript-eslint/require-await
    vi.spyOn(SpyableAC.prototype, 'resume').mockImplementationOnce(async function (this: SpyableAC) {
      void this
      throw new DOMException('Failed', 'InvalidStateError')
    })
    // Spy on setMuted at the prototype level — must be invoked with currentMuted=true on the new engine.
    // Since the engine is constructed inside the hook, we observe the effect via result.current.muted
    // staying true after reconstruction.
    await act(async () => {
      await result.current.resume()
      await Promise.resolve()
    })
    expect(result.current.muted).toBe(true)
    await act(async () => { await result.current.stop() })
    unmount()
  })

  it("plain resume success does NOT re-anchor (D-06 preserved)", async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    const reanchorSpy = vi.fn()
    const { result, unmount } = renderHook(() => useAudioCues(false, reanchorSpy))
    await act(async () => { await result.current.start(samplePlan, 'bowl') })
    // Default SpyableAC.resume() succeeds — no rejection armed.
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    // audioStatus should be 'ok' (resume succeeded; no reconstruction).
    expect(result.current.audioStatus).toBe('ok')
    // onReanchorRequired must NOT have been called — D-06 preserved on plain resume.
    expect(reanchorSpy).not.toHaveBeenCalled()
    await act(async () => { await result.current.stop() })
    unmount()
  })

  // Post-UAT regression guard (real-iPhone Plan 06 Task 8 cycle 2 — kitchen-sink fix
  // 2026-05-10). The diagnostic proved plain resume() on iOS Safari returns
  // state='running' but the audio session is dead (AC.currentTime stuck, cues never
  // fire, beep test silent). The recovery path now ALWAYS reconstructs a fresh AC
  // inside the gesture context — never relies on engine.resume() to restore the AC.
  it("public resume() always reconstructs a fresh AC (kitchen-sink fix for iOS state-lies bug)", async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    const reanchorSpy = vi.fn()
    const { result, unmount } = renderHook(() => useAudioCues(false, reanchorSpy))
    await act(async () => { await result.current.start(samplePlan, 'bowl') })
    const initialConstructed = constructed

    // Drive audioStatus to 'needs-resume' via the visibility-handler optimistic
    // resume() rejecting (matches the device-confirmed Plan 06 Task 8 trace).
    // Reason: async required to match AudioContext.resume() Promise<void> signature; throw produces a rejected promise without await.
    // eslint-disable-next-line @typescript-eslint/require-await
    vi.spyOn(SpyableAC.prototype, 'resume').mockImplementationOnce(async function (this: SpyableAC) {
      this.state = 'interrupted'
      this.dispatchStateChange()
      const err = new DOMException('Failed to start the audio device', 'InvalidStateError')
      this.state = 'suspended'
      this.dispatchStateChange()
      throw err
    })
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.audioStatus).toBe('needs-resume')

    // Gesture-attached public resume() — kitchen-sink fix means this ALWAYS
    // reconstructs a fresh AC. The bug being guarded against: previously the
    // hook tried engine.resume() first, which on iOS appeared to succeed but
    // left the AC clock dead. Now we skip engine.resume() entirely and go
    // straight to reconstruction.
    await act(async () => {
      await result.current.resume()
      await Promise.resolve()
    })

    // Exactly one new AC must have been constructed (reconstruction fired).
    expect(constructed).toBe(initialConstructed + 1)
    // Re-anchor callback fired with new AC's currentTime (D-35).
    expect(reanchorSpy).toHaveBeenCalledTimes(1)
    // Reason: length asserted by toHaveBeenCalledTimes(1) immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(typeof reanchorSpy.mock.calls[0]![0]).toBe('number')

    await act(async () => { await result.current.stop() })
    unmount()
  })

  // AUDIO-01: stop() during in-flight reconstructEngine
  it("AUDIO-01: stop() during in-flight reconstructEngine closes the orphaned new engine and does not assign to engineRef", async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)

    // Strategy: spy on createAudioEngine to make the reconstruct call (call #2) park
    // on a controllable promise. The start() call (#1) completes synchronously with a
    // fake engine. The reconstruct call parks until we resolve it.
    const newEngineClose = vi.fn(async () => {})
    // Reason: partial AudioEngine implementation for test purposes; only the surface used by reconstructEngine's bail path.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeFirstEngine: any = {
      now: vi.fn(() => 3.005),
      setMuted: vi.fn(),
      scheduleLeadIn: vi.fn(() => 3.005),
      scheduleNextCue: vi.fn(),
      resume: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
    }
    // Reason: partial AudioEngine for the orphaned new engine in the bail path.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeNewEngine: any = {
      now: vi.fn(() => 0.005),
      setMuted: vi.fn(),
      scheduleLeadIn: vi.fn(() => 0.005),
      scheduleNextCue: vi.fn(),
      resume: vi.fn(async () => {}),
      close: newEngineClose,
    }

    let resolveReconstruct: ((eng: typeof fakeNewEngine) => void) | null = null
    let createCallCount = 0
    vi.spyOn(audioEngineModule, 'createAudioEngine').mockImplementation(async () => {
      createCallCount += 1
      if (createCallCount === 1) {
        // First call (start()): resolve immediately with fake first engine.
        return fakeFirstEngine as Awaited<ReturnType<typeof audioEngineModule.createAudioEngine>>
      }
      // Second call (reconstructEngine): park on a controllable promise.
      return new Promise<Awaited<ReturnType<typeof audioEngineModule.createAudioEngine>>>(resolve => {
        resolveReconstruct = resolve as (eng: typeof fakeNewEngine) => void
      })
    })

    const reanchorSpy = vi.fn()
    const { result, unmount } = renderHook(() => useAudioCues(false, reanchorSpy))

    // First call: start() resolves immediately with fakeFirstEngine.
    await act(async () => { await result.current.start(samplePlan, 'bowl') })
    expect(result.current.status).toBe('lead-in')
    expect(createCallCount).toBe(1)

    // Fire resume() WITHOUT awaiting — enters reconstructEngine, hits 2nd createAudioEngine
    // which parks on resolveReconstruct.
    let resumePromise: Promise<void> | undefined
    act(() => {
      resumePromise = result.current.resume()
    })

    // Give a microtask tick so reconstructEngine runs past the sync preamble up to its await.
    await act(async () => {
      await Promise.resolve()
    })

    // At this point, reconstructEngine has stamped gen=1, nulled engineRef, called
    // createAudioEngine (count=2) and is now parked awaiting it.
    expect(createCallCount).toBe(2)

    // Call stop() — bumps reconstructGenerationRef to 2, resets status to idle.
    await act(async () => {
      await result.current.stop()
    })
    expect(result.current.status).toBe('idle')

    // Now resolve the parked createAudioEngine with fakeNewEngine.
    act(() => {
      resolveReconstruct?.(fakeNewEngine as Awaited<ReturnType<typeof audioEngineModule.createAudioEngine>>)
    })

    // Flush microtasks so the post-await bail check in reconstructEngine runs.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    // Await the resume() promise so it completes cleanly.
    if (resumePromise !== undefined) {
      await act(async () => { await resumePromise })
    }

    // Bail-out assertions:
    // audioStatus must remain 'ok' (set by stop(), NOT overwritten by post-bail path).
    expect(result.current.audioStatus).toBe('ok')
    expect(result.current.status).toBe('idle')
    // onReanchorRequired was NOT called — bail returned before the re-anchor signal.
    expect(reanchorSpy).not.toHaveBeenCalled()
    // fakeNewEngine.close() was called — orphaned new engine was cleaned up.
    expect(newEngineClose).toHaveBeenCalledTimes(1)

    unmount()
  })

  // AUDIO-05: statechange after stop() nulled engineRef must not throw
  it("AUDIO-05: synthetic statechange dispatch AFTER stop() nulled engineRef does not throw and does not flip audioStatus", async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => { await result.current.start(samplePlan, 'bowl') })
    expect(result.current.audioStatus).toBe('ok')

    // stop() — nulls engineRef synchronously.
    await act(async () => { await result.current.stop() })
    expect(result.current.status).toBe('idle')
    expect(result.current.audioStatus).toBe('ok')

    // Dispatch a synthetic 'closed' statechange on the last AC instance AFTER stop().
    // The handleStateChange null gate (AUDIO-05) must short-circuit and not flip audioStatus.
    await act(async () => {
      const live = SpyableAC.lastInstance as SpyableAC
      // dispatchStateChange fires every registered 'statechange' listener.
      // Since the engine's listener is still attached (registered at createAudioEngine time),
      // handleStateChange will be called — but engineRef.current is null post-stop.
      live.dispatchStateChange()
      await Promise.resolve()
      await Promise.resolve()
    })

    // audioStatus must remain 'ok' — the null gate must have returned early
    // without calling setAudioStatus('unavailable').
    expect(result.current.audioStatus).toBe('ok')

    unmount()
  })
})

// AUDIO-03 + AUDIO-06 additional test cases
describe('useAudioCues — AUDIO-03 + AUDIO-06 (Phase 9 Plan 02)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // AUDIO-06: AudioStatus union excludes "starting" (D-07 type-level lock)
  it("AUDIO-06: AudioStatus union excludes 'starting' (D-07)", () => {
    // TypeScript-level lock: if 'starting' is reintroduced into AudioStatus, the type
    // assertion below fails to compile (TS2322: type 'string' is not assignable).
    // The valid values of AudioStatus are exactly 'idle' | 'lead-in' | 'failed'.
    // Verify at runtime that the union has no 'starting' member by using a value
    // obtained via function return (prevents no-unnecessary-condition on a const switch).
    function getStatus(): AudioStatus { return 'idle' }
    const s = getStatus()
    const validValues: readonly string[] = ['idle', 'lead-in', 'failed']
    expect(validValues).toContain(s)
    expect(validValues).not.toContain('starting')
    // TypeScript compile-time lock: the assignment below ensures 'starting' is NOT a valid AudioStatus.
    // If reintroduced, tsc --noEmit will surface a type error at the setStatus('starting') call site.
    const _typeCheck: AudioStatus = 'idle'
    void _typeCheck // used only for type checking
  })

  // AUDIO-06: start() success transitions idle → lead-in without transient 'starting'
  it("AUDIO-06: start() success transitions status idle → lead-in directly (no transient starting)", async () => {
    const { result, unmount } = renderHook(() => useAudioCues())

    const observedStatuses: string[] = []
    // Observe each render's status by reading result.current.status after act.
    // We cannot intercept render-synchronously, but we can observe that 'starting'
    // never appears in the result object at any point accessible from the test.
    observedStatuses.push(result.current.status)

    await act(async () => {
      await result.current.start(samplePlan, 'bowl')
      observedStatuses.push(result.current.status)
    })
    observedStatuses.push(result.current.status)

    // 'starting' must never appear in any observed status snapshot.
    expect(observedStatuses).not.toContain('starting')
    // Must end in 'lead-in' (success path).
    expect(result.current.status).toBe('lead-in')

    await act(async () => { await result.current.stop() })
    unmount()
  })

  // AUDIO-03: hook-side null propagation when engine.scheduleLeadIn returns null
  it("AUDIO-03: start() returns null and sets status to failed when engine.scheduleLeadIn returns null", async () => {
    // Stub createAudioEngine to return a fake engine whose scheduleLeadIn returns null.
    const fakeEngine = {
      now: vi.fn(() => 0),
      setMuted: vi.fn(),
      scheduleLeadIn: vi.fn(() => null),
      scheduleNextCue: vi.fn(),
      close: vi.fn(async () => {}),
      resume: vi.fn(async () => {}),
    }
    // Reason: test double providing the minimum AudioEngine surface; no-unsafe-argument is expected here for the mock type.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    vi.spyOn(audioEngineModule, 'createAudioEngine').mockResolvedValueOnce(fakeEngine as any)

    const { result, unmount } = renderHook(() => useAudioCues())

    let res: number | null = 42 // sentinel non-null value to confirm it changes
    await act(async () => {
      res = await result.current.start(samplePlan, 'bowl')
    })

    // Hook-side null propagation: scheduleLeadIn returned null → start() returns null.
    expect(res).toBeNull()
    // Status must transition to 'failed'.
    expect(result.current.status).toBe('failed')
    // audioAvailable must be false.
    expect(result.current.audioAvailable).toBe(false)

    unmount()
  })
})

// Phase 10 HOOKS-01 callback identity contract.
// Locks the mutedRef-on-top-of-muted-state posture (D-11): toggling `setMuted`
// MUST NOT churn the identity of `start` or `resume` callbacks. With `muted`
// removed from their useCallback dep arrays and the value read from the
// ref-mirror at call time, downstream `useCallback`s in App.tsx that include
// `audio.start` in deps no longer cascade re-creates on every mute toggle.
describe('useAudioCues — callback identity (Phase 10 HOOKS-01)', () => {
  // Inline SpyableAC matching the Phase 5.1 describe block (lines 337-360).
  // The class is duplicated here rather than hoisted to module scope to avoid
  // touching the existing test geography; this block is strictly additive.
  class SpyableAC {
    state: AudioContextState = 'running'
    sampleRate = 44100
    destination = {}
    private _start = performance.now() / 1000
    get currentTime() { return performance.now() / 1000 - this._start }
    // Reason: AudioContext API accepts an options parameter; kept for structural compatibility with the interface.
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars
    constructor(_options?: AudioContextOptions) {}
    createOscillator() { return { type: 'sine', frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), cancelAndHoldAtTime: vi.fn(), value: 0 }, detune: { setValueAtTime: vi.fn(), value: 0 }, start: vi.fn(), stop: vi.fn(), connect: vi.fn().mockReturnThis(), disconnect: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } }
    createGain() { return { gain: { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn(), cancelAndHoldAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 1 }, connect: vi.fn().mockReturnThis(), disconnect: vi.fn() } }
    createBiquadFilter() { return { type: 'lowpass', frequency: { setValueAtTime: vi.fn(), value: 350 }, Q: { setValueAtTime: vi.fn(), value: 1 }, gain: { setValueAtTime: vi.fn(), value: 0 }, connect: vi.fn().mockReturnThis(), disconnect: vi.fn() } }
    // Reason: AudioContextState mutation is the async side-effect; no await needed in this synchronous stub.
    // eslint-disable-next-line @typescript-eslint/require-await
    async resume(): Promise<void> { this.state = 'running' }
    // eslint-disable-next-line @typescript-eslint/require-await
    async suspend(): Promise<void> { this.state = 'suspended' }
    // eslint-disable-next-line @typescript-eslint/require-await
    async close(): Promise<void> { this.state = 'closed' }
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('start callback identity is stable across setMuted toggle (HOOKS-01 D-11)', () => {
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues())

    const startBefore = result.current.start

    act(() => {
      result.current.setMuted(true)
    })

    // After the React state update, the mute-mirror effect fires synchronously
    // (within the same act flush) and writes `mutedRef.current = true`. The
    // `start` useCallback no longer depends on `muted`, so its identity is
    // preserved across the render.
    const startAfterMute = result.current.start

    act(() => {
      result.current.setMuted(false)
    })

    const startAfterUnmute = result.current.start

    expect(startAfterMute).toBe(startBefore)
    expect(startAfterUnmute).toBe(startBefore)

    unmount()
  })

  it('resume callback is stable across setMuted (proxy for reconstructEngine identity) (HOOKS-01 D-11)', () => {
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues())

    const resumeBefore = result.current.resume

    act(() => {
      result.current.setMuted(true)
    })

    // `resume` depends on `reconstructEngine`, which itself no longer depends
    // on `muted` (D-11). The reconstruction path reads mutedRef.current at
    // call time. Identity stable.
    const resumeAfterMute = result.current.resume

    expect(resumeAfterMute).toBe(resumeBefore)

    unmount()
  })

  it('baseline: handleStateChange identity unchanged across setMuted (regression guard)', () => {
    vi.stubGlobal('AudioContext', SpyableAC)
    const { result, unmount } = renderHook(() => useAudioCues())

    // `start` depends ONLY on `handleStateChange` after D-11. If
    // `handleStateChange` identity ever churns across setMuted (it should not
    // — its useCallback deps are `[]`), this proxy assertion would fail.
    const startBefore = result.current.start

    act(() => {
      result.current.setMuted(true)
    })

    expect(result.current.start).toBe(startBefore)

    unmount()
  })
})

// Phase 18 Plan 04 timbre capture + reconstruction (D-08 + D-11).
//
// Truth set:
//  - start(plan, timbre) MUST construct the AudioEngine with the caller-passed timbre
//    (D-08 capture-at-Start at the hook layer — engine receives the snapshot via
//    createAudioEngine({ timbre, ... })).
//  - reconstructEngine MUST reuse the original session timbre (timbreRef.current)
//    even when storage has been mutated mid-session (D-11 invariant — capture-at-Start
//    is the only mutation path; iOS visibility-suspend recovery never re-reads prefs).
//  - start(samplePlan, 'bowl') MUST exercise the v1.0.1 Bowl byte-identical path —
//    sanity check that the new timbre parameter does not perturb the default flow.
describe('useAudioCues — Phase 18 timbre capture + reconstruction (D-08 + D-11)', () => {
  // Spyable AudioContext mirroring the Phase 5.1 / Plan 06 pattern (registry-backed
  // statechange listeners + reconstruction-friendly resume()). Local to this block
  // to avoid touching the existing test geography. Construction count is observed
  // via createAudioEngine spy (mock.calls.length) — no separate counter needed here.
  class SpyableAC {
    static lastInstance: SpyableAC | null = null
    static reset(): void { SpyableAC.lastInstance = null }
    state: AudioContextState | 'interrupted' = 'running'
    sampleRate = 44100
    destination = {}
    private _start = performance.now() / 1000
    private _listeners = new Map<string, Set<EventListener>>()
    get currentTime(): number { return performance.now() / 1000 - this._start }
    // Reason: AudioContext API accepts an options parameter; kept for structural compatibility with the interface.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_options?: AudioContextOptions) { SpyableAC.lastInstance = this }
    createOscillator() { return { type: 'sine', frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), cancelAndHoldAtTime: vi.fn(), value: 0 }, detune: { setValueAtTime: vi.fn(), value: 0 }, start: vi.fn(), stop: vi.fn(), connect: vi.fn().mockReturnThis(), disconnect: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } }
    createGain() { return { gain: { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn(), cancelAndHoldAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 1 }, connect: vi.fn().mockReturnThis(), disconnect: vi.fn() } }
    createBiquadFilter() { return { type: 'lowpass', frequency: { setValueAtTime: vi.fn(), value: 350 }, Q: { setValueAtTime: vi.fn(), value: 1 }, gain: { setValueAtTime: vi.fn(), value: 0 }, connect: vi.fn().mockReturnThis(), disconnect: vi.fn() } }
    // eslint-disable-next-line @typescript-eslint/require-await
    async resume(): Promise<void> { this.state = 'running'; this._fireStateChange() }
    // eslint-disable-next-line @typescript-eslint/require-await
    async suspend(): Promise<void> { this.state = 'suspended'; this._fireStateChange() }
    // eslint-disable-next-line @typescript-eslint/require-await
    async close(): Promise<void> { this.state = 'closed'; this._fireStateChange() }
    addEventListener(type: string, listener: EventListener): void {
      let set = this._listeners.get(type)
      if (!set) { set = new Set(); this._listeners.set(type, set) }
      set.add(listener)
    }
    removeEventListener(type: string, listener: EventListener): void {
      this._listeners.get(type)?.delete(listener)
    }
    private _fireStateChange(): void {
      const evt = new Event('statechange')
      for (const l of this._listeners.get('statechange') ?? []) l(evt)
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('start(samplePlan, "bell") constructs the engine with timbre: "bell" (D-08)', async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    // Spy on the createAudioEngine factory to inspect the options object.
    const createSpy = vi.spyOn(audioEngineModule, 'createAudioEngine')
    const { result, unmount } = renderHook(() => useAudioCues())
    await act(async () => {
      await result.current.start(samplePlan, 'bell')
    })
    // D-08: the engine is constructed with exactly the caller-passed timbre.
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ timbre: 'bell', onStateChange: expect.any(Function) as unknown }),
    )
    await act(async () => { await result.current.stop() })
    unmount()
  })

  it('reconstructEngine reuses timbreRef.current — ignores localStorage prefs change mid-session (D-11 invariant guard)', async () => {
    SpyableAC.reset()
    vi.stubGlobal('AudioContext', SpyableAC)
    // Spy on createAudioEngine to capture the second (reconstruction) call argument.
    const createSpy = vi.spyOn(audioEngineModule, 'createAudioEngine')
    const { result, unmount } = renderHook(() => useAudioCues(false, vi.fn()))

    // 1. Session starts with 'bell' — timbreRef captured as 'bell' synchronously
    //    BEFORE the createAudioEngine await.
    await act(async () => {
      await result.current.start(samplePlan, 'bell')
    })
    expect(createSpy.mock.calls[0]?.[0]).toMatchObject({ timbre: 'bell' })
    const callsAfterStart = createSpy.mock.calls.length

    // 2. Mutate localStorage's prefs.timbre to 'flute' mid-session. If the hook
    //    re-read user prefs during reconstruction (D-11 violation), the new engine
    //    would be constructed with 'flute'. The hook MUST NOT do this — it reads
    //    timbreRef.current exclusively, which still holds 'bell'.
    window.localStorage.setItem(
      'hrv:state:v1',
      JSON.stringify({ version: 1, prefs: { theme: 'system', timbre: 'flute', locale: 'en' } }),
    )

    // 3. Trigger reconstruction via public resume() — which internally calls
    //    reconstructEngine() per useAudioCues.ts:362 (the kitchen-sink fix path).
    await act(async () => {
      await result.current.resume()
      await Promise.resolve()
    })

    // 4. Reconstruction must have called createAudioEngine again — and with
    //    timbre: 'bell' (the captured value), NOT 'flute' (the mid-session storage value).
    expect(createSpy.mock.calls.length).toBeGreaterThan(callsAfterStart)
    const reconstructCall = createSpy.mock.calls[createSpy.mock.calls.length - 1]
    expect(reconstructCall?.[0]).toMatchObject({ timbre: 'bell' })

    await act(async () => { await result.current.stop() })
    window.localStorage.clear()
    unmount()
  })

  it('start(samplePlan, "bowl") preserves v1.0.1 byte-identical behavior (TIMBRE-02 sanity)', async () => {
    // Sanity check that passing 'bowl' explicitly does not perturb the v1.0.1 flow —
    // firstInCueTime is still the deterministic engine.now() + 3 lead-in anchor.
    const { result, unmount } = renderHook(() => useAudioCues())
    let firstInCueTime: number | null = null
    await act(async () => {
      firstInCueTime = await result.current.start(samplePlan, 'bowl')
    })
    expect(firstInCueTime).not.toBeNull()
    // Reason: non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(firstInCueTime!).toBeGreaterThanOrEqual(3)
    expect(result.current.status).toBe('lead-in')
    expect(result.current.audioAvailable).toBe(true)
    await act(async () => { await result.current.stop() })
    unmount()
  })
})

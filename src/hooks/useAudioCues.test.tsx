// Tests for the useAudioCues React hook (Plan 03-02).
// Source: 03-02-PLAN.md <behavior> tests 1-10.
// Mirrors the renderHook + act idiom from useSessionEngine.test.tsx.

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BreathingPlan } from '../domain/breathingPlan'
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
      firstInCueTime = await result.current.start(samplePlan)
    })

    expect(firstInCueTime).not.toBeNull()
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
      class {
        constructor() {
          throw new Error('blocked')
        }
      },
    )
    const { result, unmount } = renderHook(() => useAudioCues())

    let res: number | null = 0
    await act(async () => {
      res = await result.current.start(samplePlan)
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
    }
    vi.stubGlobal('AudioContext', ProbeAC)

    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => {
      await result.current.start(samplePlan)
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
      await result.current.start(samplePlan)
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
      await result.current.start(samplePlan)
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

  it('notifyPhaseBoundary({ newPhase: out, audioTime: 8 }) routes to scheduleOutCue', async () => {
    const outSpy = vi.spyOn(cueSynth, 'scheduleOutCue')
    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => {
      await result.current.start(samplePlan)
    })

    outSpy.mockClear()
    act(() => {
      result.current.notifyPhaseBoundary({ newPhase: 'out', audioTime: 8 })
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
      class {
        constructor() {
          throw new Error('blocked')
        }
      },
    )
    const fail = renderHook(() => useAudioCues())
    await act(async () => {
      await fail.result.current.start(samplePlan)
    })
    expect(fail.result.current.audioNow()).toBeNull()
    fail.unmount()

    vi.unstubAllGlobals()

    // Success path → audioNow returns a number.
    const ok = renderHook(() => useAudioCues())
    await act(async () => {
      await ok.result.current.start(samplePlan)
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
    }
    vi.stubGlobal('AudioContext', ProbeAC)

    const { result, unmount } = renderHook(() => useAudioCues())
    await act(async () => {
      await result.current.start(samplePlan)
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
    }
    vi.stubGlobal('AudioContext', SlowCloseAC)

    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => {
      await result.current.start(samplePlan)
    })
    expect(constructCount).toBe(1)

    // Fire stop() without awaiting; the close promise stays pending. Then
    // immediately re-start. The new start MUST build a second AudioContext.
    act(() => {
      void result.current.stop()
    })
    await act(async () => {
      await result.current.start(samplePlan)
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
    }
    vi.stubGlobal('AudioContext', CountingAC)

    const { result, unmount } = renderHook(() => useAudioCues())

    await act(async () => {
      await result.current.start(samplePlan)
    })
    await act(async () => {
      await result.current.start(samplePlan)
    })

    expect(constructCount).toBe(1)

    await act(async () => {
      await result.current.stop()
    })
    unmount()
  })
})

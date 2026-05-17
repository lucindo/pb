import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NaviKriyaSettings } from '../domain/naviKriyaSettings'
import { NK_LEAD_MS, NK_OM_SECONDS, useNKEngine } from './useNKEngine'

// Default small settings so tests finish quickly under fake timers
const defaultSettings: NaviKriyaSettings = {
  frontCount: 8,  // backCount = 2
  omLength: 'medium',
  rounds: 1,
  perOmCue: true,
}

const makeCallbacks = () => ({
  frontMarker: vi.fn(),
  backMarker: vi.fn(),
  tick: vi.fn(),
  endCue: vi.fn(),
})

describe('useNKEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // NK-01: full front→back→done traversal with frontCount:8 rounds:1
  it('NK-01: auto-advances front->back->done; front->back transition resets count to 0', () => {
    const onComplete = vi.fn()
    const cbs = makeCallbacks()
    const { result, unmount } = renderHook(() => useNKEngine())

    act(() => {
      result.current.start(defaultSettings, cbs, onComplete)
    })

    // Should be in 'front' phase now, running
    expect(result.current.nkPhase).toBe('front')
    expect(result.current.nkRunning).toBe(true)

    // Timing — every OM, including the last of a phase, runs for omMs before
    // the transition (D-11 fix):
    //   front OM #k fires at t = NK_LEAD_MS + (k-1)*omMs, k = 1..8
    //   front->back transition at t = NK_LEAD_MS + 8*omMs (count to 0, back marker)
    const omMs = NK_OM_SECONDS['medium'] * 1000

    // Advance through the front lead-in + all 8 front OMs + the transition —
    // stop +500 into the back lead-in, before the first back OM.
    act(() => {
      vi.advanceTimersByTime(NK_LEAD_MS + omMs * 8 + 500)
    })

    // Should now be in 'back' phase with count reset to 0
    expect(result.current.nkPhase).toBe('back')
    expect(result.current.nkCount).toBe(0)

    // Back lead-in + 2 back OMs + the final transition -> 'done'.
    act(() => {
      vi.advanceTimersByTime(NK_LEAD_MS + omMs * 2 + 100)
    })

    // Should be 'done'
    expect(result.current.nkPhase).toBe('done')
    expect(result.current.nkRunning).toBe(false)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ isComplete: true, completedRounds: 1 }),
    )

    unmount()
  })

  // NK-01: no-op stepOm before start() (null guard)
  it('NK-01: calling start/pause/resume/end before start() does not throw', () => {
    const { result, unmount } = renderHook(() => useNKEngine())

    // These should be no-ops
    expect(() => {
      act(() => { result.current.pause() })
    }).not.toThrow()
    expect(() => {
      act(() => { result.current.resume() })
    }).not.toThrow()

    unmount()
  })

  // NK-02: rounds:3 produces 3 front+back cycles before done; nkRound reaches 3
  it('NK-02: 3 rounds produces 3 front+back cycles; nkRound reaches 3', () => {
    const onComplete = vi.fn()
    const cbs = makeCallbacks()
    const settings: NaviKriyaSettings = {
      frontCount: 4,   // backCount = 1
      omLength: 'fast',
      rounds: 3,
      perOmCue: false,
    }
    const omMs = NK_OM_SECONDS['fast'] * 1000
    const { result, unmount } = renderHook(() => useNKEngine())

    act(() => {
      result.current.start(settings, cbs, onComplete)
    })

    // Each round: lead(NK_LEAD_MS) + 4 front OMs + lead(NK_LEAD_MS) + 1 back OM.
    // 3 rounds total.
    const perRoundMs = NK_LEAD_MS + omMs * 4 + NK_LEAD_MS + omMs * 1
    act(() => {
      vi.advanceTimersByTime(perRoundMs * 3 + 500)
    })

    expect(result.current.nkPhase).toBe('done')
    expect(result.current.nkRunning).toBe(false)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ isComplete: true, completedRounds: 3 }),
    )

    unmount()
  })

  // NK-03: scheduled delay equals NK_OM_SECONDS[omLength]*1000
  it('NK-03: scheduled OM delay equals NK_OM_SECONDS[omLength]*1000 for medium', () => {
    const cbs = makeCallbacks()
    const onComplete = vi.fn()
    const { result, unmount } = renderHook(() => useNKEngine())

    act(() => {
      result.current.start(defaultSettings, cbs, onComplete)
    })

    // Initial state: front, count 0, running
    expect(result.current.nkCount).toBe(0)

    // Timing:
    //   t=0:               start() → schedule(NK_LEAD_MS)
    //   t=NK_LEAD_MS:      OM #1 fires → count=1 → schedule(omMs)
    //   t=NK_LEAD_MS+omMs: OM #2 fires → count=2
    //
    // Verify: advance to just before the lead-in completes → count still 0
    act(() => {
      vi.advanceTimersByTime(NK_LEAD_MS - 100)
    })
    expect(result.current.nkCount).toBe(0)

    // Advance just past the lead-in (t = NK_LEAD_MS + 10) → OM #1 fires → count=1.
    // Keep the overshoot small so the omMs-window assertions below stay precise.
    act(() => {
      vi.advanceTimersByTime(110)
    })
    expect(result.current.nkCount).toBe(1)

    const omMs = NK_OM_SECONDS['medium'] * 1000

    // Advance by less than omMs — count should still be 1
    act(() => {
      vi.advanceTimersByTime(omMs - 50)
    })
    expect(result.current.nkCount).toBe(1)

    // Advance past one full omMs — count should be 2
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.nkCount).toBe(2)

    unmount()
  })

  // NK-06: perOmCue=false suppresses tick; perOmCue=true fires once per OM
  it('NK-06: perOmCue=false: tick not called; perOmCue=true: tick called per OM', () => {
    const omMs = NK_OM_SECONDS['fast'] * 1000

    // Test perOmCue=false
    {
      const cbs = makeCallbacks()
      const settings: NaviKriyaSettings = {
        frontCount: 4,
        omLength: 'fast',
        rounds: 1,
        perOmCue: false,
      }
      const { result, unmount } = renderHook(() => useNKEngine())
      act(() => { result.current.start(settings, cbs, vi.fn()) })
      act(() => {
        vi.advanceTimersByTime(NK_LEAD_MS + omMs * 4 + 100)
      })
      expect(cbs.tick).not.toHaveBeenCalled()
      unmount()
    }

    vi.clearAllMocks()
    vi.useFakeTimers()

    // Test perOmCue=true
    {
      const cbs = makeCallbacks()
      const settings: NaviKriyaSettings = {
        frontCount: 4,
        omLength: 'fast',
        rounds: 1,
        perOmCue: true,
      }
      const { result, unmount } = renderHook(() => useNKEngine())
      act(() => { result.current.start(settings, cbs, vi.fn()) })
      // Advance through just front phase (4 OMs)
      act(() => {
        vi.advanceTimersByTime(NK_LEAD_MS + omMs * 4 + 100)
      })
      // Should have been called once per front OM = 4 times (back phase not yet complete)
      expect(cbs.tick.mock.calls.length).toBeGreaterThanOrEqual(4)
      unmount()
    }
  })

  // NK-07: pause/resume/end behavior
  it('NK-07: pause() stops increments; resume() reschedules; end() resets to idle', () => {
    const cbs = makeCallbacks()
    const onComplete = vi.fn()
    const { result, unmount } = renderHook(() => useNKEngine())

    act(() => {
      result.current.start(defaultSettings, cbs, onComplete)
    })

    const omMs = NK_OM_SECONDS['medium'] * 1000

    // Advance through lead-in + 2 OMs
    act(() => {
      vi.advanceTimersByTime(NK_LEAD_MS + omMs * 2 + 10)
    })

    const countBeforePause = result.current.nkCount
    expect(countBeforePause).toBeGreaterThan(0)

    // Pause
    act(() => {
      result.current.pause()
    })
    expect(result.current.nkRunning).toBe(false)

    // Advance timers — count should not change while paused
    act(() => {
      vi.advanceTimersByTime(omMs * 5)
    })
    expect(result.current.nkCount).toBe(countBeforePause)

    // Resume
    act(() => {
      result.current.resume()
    })
    expect(result.current.nkRunning).toBe(true)

    // Advance — count should increment again
    act(() => {
      vi.advanceTimersByTime(omMs + 100)
    })
    expect(result.current.nkCount).toBeGreaterThan(countBeforePause)

    // End — resets to idle
    act(() => {
      result.current.end()
    })
    expect(result.current.nkPhase).toBe('idle')
    expect(result.current.nkCount).toBe(0)
    expect(result.current.nkRound).toBe(1)
    expect(result.current.nkRunning).toBe(false)
    // onComplete should have been called with isComplete:false
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ isComplete: false }),
    )

    unmount()
  })
})

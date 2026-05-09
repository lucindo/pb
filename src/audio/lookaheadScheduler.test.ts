import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  startScheduler,
  LOOKAHEAD_MS,
  SCHEDULE_AHEAD_SEC,
} from './lookaheadScheduler'

// Helper: build an AudioContext (via the FakeAudioContext polyfill from
// vitest.setup.ts) but override `currentTime` so tests can control the clock
// independently of the polyfill's performance.now()-based getter.
function makeFakeAcWithCurrentTime(getCurrent: () => number): AudioContext {
  const ac = new AudioContext()
  Object.defineProperty(ac, 'currentTime', {
    get: getCurrent,
    configurable: true,
  })
  return ac
}

describe('lookaheadScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('exports LOOKAHEAD_MS = 25 and SCHEDULE_AHEAD_SEC = 0.1', () => {
    expect(LOOKAHEAD_MS).toBe(25)
    expect(SCHEDULE_AHEAD_SEC).toBe(0.1)
  })

  it('returns a handle with a stop() method', () => {
    const ac = makeFakeAcWithCurrentTime(() => 0)
    const handle = startScheduler(
      ac,
      () => null,
      () => {},
    )
    expect(typeof handle.stop).toBe('function')
    handle.stop()
  })

  it('schedules a boundary that is within the lookahead window on the first tick', () => {
    const ac = makeFakeAcWithCurrentTime(() => 0)
    const scheduleAtTime = vi.fn()
    let returned: number | null = 0.05
    const getNext = vi.fn(() => {
      const out = returned
      returned = null // only one boundary in the window
      return out
    })

    const handle = startScheduler(ac, getNext, scheduleAtTime)

    expect(scheduleAtTime).toHaveBeenCalledTimes(1)
    expect(scheduleAtTime).toHaveBeenCalledWith(0.05)

    handle.stop()
    vi.advanceTimersByTime(100)
    expect(scheduleAtTime).toHaveBeenCalledTimes(1)
  })

  it('does NOT schedule a boundary that is beyond the lookahead window', () => {
    const ac = makeFakeAcWithCurrentTime(() => 0)
    const scheduleAtTime = vi.fn()
    const getNext = vi.fn(() => 1.0) // beyond 0.0 + 0.1 lookahead

    const handle = startScheduler(ac, getNext, scheduleAtTime)

    expect(scheduleAtTime).not.toHaveBeenCalled()
    handle.stop()
  })

  it('re-runs after LOOKAHEAD_MS milliseconds', () => {
    const ac = makeFakeAcWithCurrentTime(() => 0)
    const scheduleAtTime = vi.fn()
    let firstTick = true
    const getNext = vi.fn(() => {
      if (firstTick) {
        firstTick = false
        return null
      }
      return 0.05
    })

    const handle = startScheduler(ac, getNext, scheduleAtTime)
    expect(scheduleAtTime).not.toHaveBeenCalled()

    vi.advanceTimersByTime(LOOKAHEAD_MS)
    expect(scheduleAtTime).toHaveBeenCalledWith(0.05)

    handle.stop()
  })

  it('continues ticking when getNextBoundaryAudioTime returns null', () => {
    const ac = makeFakeAcWithCurrentTime(() => 0)
    const scheduleAtTime = vi.fn()
    const getNext = vi.fn(() => null)

    const handle = startScheduler(ac, getNext, scheduleAtTime)
    // initial tick already invoked once
    const initialCalls = getNext.mock.calls.length

    vi.advanceTimersByTime(100) // ~4 additional ticks at 25 ms cadence
    expect(scheduleAtTime).not.toHaveBeenCalled()
    expect(getNext.mock.calls.length).toBeGreaterThanOrEqual(initialCalls + 4)

    handle.stop()
  })

  it('stop() halts further ticks', () => {
    const ac = makeFakeAcWithCurrentTime(() => 0)
    const scheduleAtTime = vi.fn()
    const getNext = vi.fn(() => null)

    const handle = startScheduler(ac, getNext, scheduleAtTime)
    const callsAfterFirstTick = getNext.mock.calls.length

    handle.stop()
    vi.advanceTimersByTime(100)

    expect(getNext.mock.calls.length).toBe(callsAfterFirstTick)
  })

  it('stop() is idempotent', () => {
    const ac = makeFakeAcWithCurrentTime(() => 0)
    const handle = startScheduler(
      ac,
      () => null,
      () => {},
    )
    expect(() => {
      handle.stop()
      handle.stop()
    }).not.toThrow()
  })

  it('reads from audioCtx.currentTime, not Date.now()', () => {
    const dateNowSpy = vi.spyOn(Date, 'now')
    const dateNowCallsBefore = dateNowSpy.mock.calls.length

    const currentTimeGetter = vi.fn(() => 0)
    const ac = makeFakeAcWithCurrentTime(currentTimeGetter)
    const handle = startScheduler(
      ac,
      () => null,
      () => {},
    )

    expect(currentTimeGetter).toHaveBeenCalled()
    // Date.now should not have been called by the scheduler tick itself.
    // (Vitest fake timers may use Date.now, but the scheduler must not.)
    // Just assert the scheduler made currentTime reads — that's the load-bearing check.
    expect(currentTimeGetter.mock.calls.length).toBeGreaterThan(0)
    expect(dateNowSpy.mock.calls.length).toBe(dateNowCallsBefore)

    handle.stop()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LEAD_IN_DURATION_MS, LEAD_IN_TICK_INTERVAL_MS } from '../audio/audioEngine'
import { clearScheduledTimeouts, scheduleLeadInTimeouts } from './leadInCountdown'

describe('lead-in countdown timeout scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('emits the remaining digits at one-second intervals and completes at three seconds', () => {
    const onDigit = vi.fn()
    const onComplete = vi.fn()

    scheduleLeadInTimeouts({ onDigit, onComplete })

    vi.advanceTimersByTime(LEAD_IN_TICK_INTERVAL_MS)
    expect(onDigit).toHaveBeenCalledWith(2)
    expect(onComplete).not.toHaveBeenCalled()

    vi.advanceTimersByTime(LEAD_IN_TICK_INTERVAL_MS)
    expect(onDigit).toHaveBeenCalledWith(1)
    expect(onComplete).not.toHaveBeenCalled()

    vi.advanceTimersByTime(LEAD_IN_DURATION_MS - 2 * LEAD_IN_TICK_INTERVAL_MS)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('clears every scheduled timeout', () => {
    const onDigit = vi.fn()
    const onComplete = vi.fn()
    const timeoutIds = scheduleLeadInTimeouts({ onDigit, onComplete })

    clearScheduledTimeouts(timeoutIds)
    vi.advanceTimersByTime(LEAD_IN_DURATION_MS)

    expect(onDigit).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })
})

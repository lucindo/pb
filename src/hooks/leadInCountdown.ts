import {
  LEAD_IN_DURATION_MS,
  LEAD_IN_TICK_INTERVAL_MS,
} from '../audio/audioEngine'

export type LeadInCountdownDigit = 3 | 2 | 1
export type ScheduledLeadInCountdownDigit = Exclude<LeadInCountdownDigit, 3>

export interface LeadInCountdownSchedule {
  onDigit(this: void, digit: ScheduledLeadInCountdownDigit): void
  onComplete(this: void): void
}

// Reason: the three timeouts below assume the contract
// LEAD_IN_DURATION_MS > 2 * LEAD_IN_TICK_INTERVAL_MS — i.e., the "1" digit is
// visible for one full tick interval before onComplete fires. If a future
// refactor in audio/audioEngine.ts changes the tick→duration ratio (e.g., a
// 2-digit countdown with LEAD_IN_DURATION_MS == 2 * LEAD_IN_TICK_INTERVAL_MS),
// revisit the schedule below — "1" would otherwise flash and immediately vanish.
export function scheduleLeadInTimeouts({
  onDigit,
  onComplete,
}: LeadInCountdownSchedule): number[] {
  const showTwo = window.setTimeout(() => { onDigit(2) }, LEAD_IN_TICK_INTERVAL_MS)
  const showOne = window.setTimeout(() => { onDigit(1) }, 2 * LEAD_IN_TICK_INTERVAL_MS)
  const complete = window.setTimeout(onComplete, LEAD_IN_DURATION_MS)

  return [showTwo, showOne, complete]
}

export function clearScheduledTimeouts(timeoutIds: number[]): void {
  for (const id of timeoutIds) {
    window.clearTimeout(id)
  }
}

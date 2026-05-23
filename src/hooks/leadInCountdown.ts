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

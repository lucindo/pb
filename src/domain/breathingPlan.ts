import type { RatioLabel, SessionSettings } from './settings'
import { RATIO_PARTS, validateSettings } from './settings'

export interface BreathingPlan {
  readonly bpm: number
  readonly ratio: RatioLabel
  readonly cycleSec: number
  readonly inhaleSec: number
  readonly exhaleSec: number
  readonly totalSec: number | null
}

const SEC_PER_MINUTE = 60

export function createBreathingPlan(settings: SessionSettings): BreathingPlan {
  const validSettings = validateSettings(settings)
  const ratio = RATIO_PARTS[validSettings.ratio]
  const cycleSec = SEC_PER_MINUTE / validSettings.bpm
  const inhaleSec = cycleSec * (ratio.inhale / 100)
  const exhaleSec = cycleSec * (ratio.exhale / 100)
  const totalSec =
    validSettings.durationMinutes === 'open-ended'
      ? null
      : validSettings.durationMinutes * SEC_PER_MINUTE

  return {
    bpm: validSettings.bpm,
    ratio: validSettings.ratio,
    cycleSec,
    inhaleSec,
    exhaleSec,
    totalSec,
  }
}

import type { RatioLabel, SessionSettings } from './settings'
import { RATIO_PARTS, validateSettings } from './settings'

export interface BreathingPlan {
  readonly bpm: number
  readonly ratio: RatioLabel
  readonly cycleMs: number
  readonly inhaleMs: number
  readonly exhaleMs: number
  readonly totalMs: number | null
}

const MS_PER_MINUTE = 60_000

export function createBreathingPlan(settings: SessionSettings): BreathingPlan {
  const validSettings = validateSettings(settings)
  const ratio = RATIO_PARTS[validSettings.ratio]
  const cycleMs = MS_PER_MINUTE / validSettings.bpm
  const inhaleMs = cycleMs * (ratio.inhale / 100)
  const exhaleMs = cycleMs * (ratio.exhale / 100)
  const totalMs =
    validSettings.durationMinutes === 'open-ended'
      ? null
      : validSettings.durationMinutes * MS_PER_MINUTE

  return {
    bpm: validSettings.bpm,
    ratio: validSettings.ratio,
    cycleMs,
    inhaleMs,
    exhaleMs,
    totalMs,
  }
}

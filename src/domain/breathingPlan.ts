import type { RatioLabel, SessionSettings } from './settings'
import { validateSettings } from './settings'

export interface BreathingPlan {
  readonly bpm: number
  readonly ratio: RatioLabel
  readonly cycleMs: number
  readonly inhaleMs: number
  readonly exhaleMs: number
  readonly totalMs: number | null
}

const MS_PER_MINUTE = 60_000

const RATIO_PARTS: Record<RatioLabel, { inhale: number; exhale: number }> = {
  '50:50': { inhale: 50, exhale: 50 },
  '40:60': { inhale: 40, exhale: 60 },
  '30:70': { inhale: 30, exhale: 70 },
  '20:80': { inhale: 20, exhale: 80 },
}

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

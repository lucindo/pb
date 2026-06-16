import type { BreathPhase, PatternSettings, RoundsOption } from './settings'
import { validatePatternSettings } from './settings'

export interface PlanPhase {
  readonly phase: BreathPhase
  readonly durationSec: number // effective seconds = base × multiplier
}

export interface BreathingPlan {
  // Ordered, non-zero phases of one cycle (a 0-second hold is omitted — FR-4).
  readonly phases: readonly PlanPhase[]
  readonly cycleSec: number // sum of phase durations
  readonly rounds: RoundsOption
  readonly totalSec: number | null // rounds × cycleSec; null when open-ended
}

// Cycle order; inhale/exhale always survive (base ≥ 1), only holds can be 0.
const PHASE_ORDER: readonly { phase: BreathPhase; key: keyof Omit<PatternSettings, 'multiplier' | 'rounds'> }[] = [
  { phase: 'inhale', key: 'inhale' },
  { phase: 'hold-in', key: 'holdIn' },
  { phase: 'exhale', key: 'exhale' },
  { phase: 'hold-out', key: 'holdOut' },
]

export function createBreathingPlan(settings: PatternSettings): BreathingPlan {
  const s = validatePatternSettings(settings)

  const phases: PlanPhase[] = []
  for (const { phase, key } of PHASE_ORDER) {
    const base = s[key]
    if (base <= 0) continue // FR-4: a zero-base phase is omitted entirely.
    phases.push({ phase, durationSec: base * s.multiplier })
  }

  const cycleSec = phases.reduce((sum, p) => sum + p.durationSec, 0)
  const totalSec = s.rounds === 'open-ended' ? null : s.rounds * cycleSec

  return { phases, cycleSec, rounds: s.rounds, totalSec }
}

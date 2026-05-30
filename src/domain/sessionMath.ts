import type { BreathingPlan } from './breathingPlan'
import type { StretchStage } from './stretchRamp'

export type BreathPhase = 'in' | 'out'

export interface SessionFrame {
  readonly phase: BreathPhase
  readonly phaseLabel: 'In' | 'Out'
  readonly elapsedSec: number
  readonly remainingSec: number | null
  readonly phaseProgress: number
  readonly cycleIndex: number
  readonly isComplete: boolean
  // Optional stretch-only fields — undefined for standard sessions
  readonly cycleStartSec?: number
  readonly currentCycleSec?: number
  readonly currentInhaleSec?: number
  readonly currentExhaleSec?: number
  readonly currentBpm?: number
  readonly stage?: StretchStage
}

export function getSessionFrame(plan: BreathingPlan, elapsedSec: number): SessionFrame {
  const safeElapsedSec = Math.max(0, elapsedSec)
  const cycleIndex = Math.floor(safeElapsedSec / plan.cycleSec)
  const cycleElapsedSec = safeElapsedSec % plan.cycleSec
  const isInPhase = cycleElapsedSec < plan.inhaleSec
  const phaseElapsedSec = isInPhase ? cycleElapsedSec : cycleElapsedSec - plan.inhaleSec
  const phaseDurationSec = isInPhase ? plan.inhaleSec : plan.exhaleSec
  const phaseProgress = phaseDurationSec === 0 ? 0 : phaseElapsedSec / phaseDurationSec
  const remainingSec = plan.totalSec === null ? null : Math.max(0, plan.totalSec - safeElapsedSec)
  // Completion holds until the current cycle finishes so audio cues and the visual
  // orb are never cut mid-In/mid-Out. The configured total is rounded up to the next
  // cycle boundary; isComplete fires only at that boundary.
  const completionSec =
    plan.totalSec === null
      ? null
      : Math.ceil(plan.totalSec / plan.cycleSec) * plan.cycleSec

  return {
    phase: isInPhase ? 'in' : 'out',
    phaseLabel: isInPhase ? 'In' : 'Out',
    elapsedSec: safeElapsedSec,
    remainingSec,
    phaseProgress,
    cycleIndex,
    isComplete: completionSec !== null && safeElapsedSec >= completionSec,
  }
}

// `formatDuration` consumes seconds-shaped values; param `sec` makes the unit
// explicit at the call site.
export function formatDuration(sec: number): string {
  const totalSeconds = Math.max(0, Math.floor(sec))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes)}:${seconds.toString().padStart(2, '0')}`
}

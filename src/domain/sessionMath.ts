import type { BreathingPlan } from './breathingPlan'

export type BreathPhase = 'in' | 'out'

export interface SessionFrame {
  phase: BreathPhase
  phaseLabel: 'In' | 'Out'
  elapsedMs: number
  remainingMs: number | null
  phaseProgress: number
  cycleIndex: number
  isComplete: boolean
}

export function getSessionFrame(plan: BreathingPlan, elapsedMs: number): SessionFrame {
  const safeElapsedMs = Math.max(0, elapsedMs)
  const cycleIndex = Math.floor(safeElapsedMs / plan.cycleMs)
  const cycleElapsedMs = safeElapsedMs % plan.cycleMs
  const isInPhase = cycleElapsedMs < plan.inhaleMs
  const phaseElapsedMs = isInPhase ? cycleElapsedMs : cycleElapsedMs - plan.inhaleMs
  const phaseDurationMs = isInPhase ? plan.inhaleMs : plan.exhaleMs
  const phaseProgress = phaseDurationMs === 0 ? 0 : phaseElapsedMs / phaseDurationMs
  const remainingMs = plan.totalMs === null ? null : Math.max(0, plan.totalMs - safeElapsedMs)
  // Phase 3 fix: completion holds until the current cycle finishes so audio cues
  // and the visual orb never get cut mid-In/mid-Out. Round the configured total up
  // to the next cycle boundary; isComplete fires only at that boundary.
  const completionMs =
    plan.totalMs === null
      ? null
      : Math.ceil(plan.totalMs / plan.cycleMs) * plan.cycleMs

  return {
    phase: isInPhase ? 'in' : 'out',
    phaseLabel: isInPhase ? 'In' : 'Out',
    elapsedMs: safeElapsedMs,
    remainingMs,
    phaseProgress,
    cycleIndex,
    isComplete: completionMs !== null && safeElapsedMs >= completionMs,
  }
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

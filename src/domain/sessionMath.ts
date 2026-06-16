import type { BreathingPlan } from './breathingPlan'
import type { BreathPhase, RoundsOption } from './settings'

export interface SessionFrame {
  readonly phase: BreathPhase
  // Index of the current phase within plan.phases — the cue walk starts from here.
  readonly phaseIndex: number
  readonly phaseProgress: number // [0,1]
  readonly round: number // 1-based current round
  readonly totalRounds: RoundsOption
  readonly elapsedSec: number
  readonly remainingSec: number | null
  readonly isComplete: boolean
}

function remainingSecOf(plan: BreathingPlan, elapsedSec: number): number | null {
  return plan.totalSec === null ? null : Math.max(0, plan.totalSec - elapsedSec)
}

export function getSessionFrame(plan: BreathingPlan, elapsedSec: number): SessionFrame {
  const safeElapsedSec = Math.max(0, elapsedSec)
  const completionSec = getCompletionSec(plan)
  const isComplete = completionSec !== null && safeElapsedSec >= completionSec

  const first = plan.phases[0]
  // Degenerate-plan guard: an empty/zero-length cycle makes the modulo NaN. Valid
  // plans always have ≥ 1 phase and cycleSec > 0 (inhale/exhale base ≥ 1).
  if (plan.cycleSec <= 0 || first === undefined) {
    return {
      phase: first?.phase ?? 'inhale',
      phaseIndex: 0,
      phaseProgress: 0,
      round: 1,
      totalRounds: plan.rounds,
      elapsedSec: safeElapsedSec,
      remainingSec: remainingSecOf(plan, safeElapsedSec),
      isComplete: false,
    }
  }

  const round = Math.floor(safeElapsedSec / plan.cycleSec) + 1
  const cycleElapsedSec = safeElapsedSec % plan.cycleSec

  let acc = 0
  let phaseIndex = 0
  let current = first
  let phaseElapsedSec = cycleElapsedSec
  for (let i = 0; i < plan.phases.length; i++) {
    const p = plan.phases[i]
    if (p === undefined) break
    if (cycleElapsedSec < acc + p.durationSec) {
      phaseIndex = i
      current = p
      phaseElapsedSec = cycleElapsedSec - acc
      break
    }
    acc += p.durationSec
  }

  const phaseProgress = current.durationSec === 0 ? 0 : phaseElapsedSec / current.durationSec

  return {
    phase: current.phase,
    phaseIndex,
    phaseProgress,
    round,
    totalRounds: plan.rounds,
    elapsedSec: safeElapsedSec,
    remainingSec: remainingSecOf(plan, safeElapsedSec),
    isComplete,
  }
}

/**
 * The elapsed-seconds boundary at which a timed session reports complete.
 *
 * In the rounds model totalSec = rounds × cycleSec is already an exact whole
 * number of cycles, so completion lands precisely there (no rounding-up needed,
 * unlike the old time-based model). Exposed so cue scheduling trims the lookahead
 * at the true session end. Null for open-ended and degenerate plans.
 */
export function getCompletionSec(plan: BreathingPlan): number | null {
  if (plan.totalSec === null || plan.cycleSec <= 0) return null
  return plan.totalSec
}

// `formatDuration` consumes seconds-shaped values; param `sec` makes the unit
// explicit at the call site.
export function formatDuration(sec: number): string {
  const totalSeconds = Math.max(0, Math.floor(sec))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes)}:${seconds.toString().padStart(2, '0')}`
}

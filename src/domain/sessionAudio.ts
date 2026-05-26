import type { BreathingPlan } from './breathingPlan'
import type { SessionFrame } from './sessionMath'

export interface BoundaryAudioOffsets {
  readonly boundaryStartMs: number
  readonly phaseDurationSec: number
}

export function computeBoundaryAudioOffsets(
  frame: SessionFrame,
  plan: BreathingPlan,
): BoundaryAudioOffsets {
  if (frame.cycleStartMs !== undefined) {
    const inhaleMs = frame.currentInhaleMs ?? plan.inhaleMs
    const exhaleMs = frame.currentExhaleMs ?? plan.exhaleMs

    return {
      boundaryStartMs: frame.cycleStartMs + (frame.phase === 'in' ? 0 : inhaleMs),
      phaseDurationSec: (frame.phase === 'in' ? inhaleMs : exhaleMs) / 1000,
    }
  }

  return {
    boundaryStartMs: frame.cycleIndex * plan.cycleMs + (frame.phase === 'in' ? 0 : plan.inhaleMs),
    phaseDurationSec: (frame.phase === 'in' ? plan.inhaleMs : plan.exhaleMs) / 1000,
  }
}

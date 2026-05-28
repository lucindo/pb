import type { BreathingPlan } from './breathingPlan'
import type { SessionFrame } from './sessionMath'

export interface BoundaryAudioOffsets {
  // Phase 50-02 (D-02 ms→sec cascade): boundaryStartSec is the session-elapsed
  // seconds at the start of the upcoming phase. The caller in
  // useBreathingSessionController converts this to an audio-clock time by
  // adding the per-session audio anchor — boundaryStartSec is a sessionFrame-
  // shaped quantity, not an audio-clock instant.
  readonly boundaryStartSec: number
  readonly phaseDurationSec: number
}

export function computeBoundaryAudioOffsets(
  frame: SessionFrame,
  plan: BreathingPlan,
): BoundaryAudioOffsets {
  if (frame.cycleStartSec !== undefined) {
    const inhaleSec = frame.currentInhaleSec ?? plan.inhaleSec
    const exhaleSec = frame.currentExhaleSec ?? plan.exhaleSec

    return {
      boundaryStartSec: frame.cycleStartSec + (frame.phase === 'in' ? 0 : inhaleSec),
      phaseDurationSec: frame.phase === 'in' ? inhaleSec : exhaleSec,
    }
  }

  return {
    boundaryStartSec: frame.cycleIndex * plan.cycleSec + (frame.phase === 'in' ? 0 : plan.inhaleSec),
    phaseDurationSec: frame.phase === 'in' ? plan.inhaleSec : plan.exhaleSec,
  }
}

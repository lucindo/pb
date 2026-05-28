import type { BreathingPlan } from './breathingPlan'
import type { SessionFrame } from './sessionMath'
import type { StretchSegment } from './stretchRamp'

export interface BoundaryAudioOffsets {
  // Phase 50-02 (D-02 ms→sec cascade): boundaryStartSec is the session-elapsed
  // seconds at the start of the upcoming phase. The caller in
  // useBreathingSessionController converts this to an audio-clock time by
  // adding the per-session audio anchor — boundaryStartSec is a sessionFrame-
  // shaped quantity, not an audio-clock instant.
  readonly boundaryStartSec: number
  readonly phaseDurationSec: number
}

// ─── walkFutureCues ───────────────────────────────────────────────────────────

export interface FutureCue {
  audioTime: number
  phaseDurationSec: number
  kind: 'in' | 'out'
}

/**
 * Phase 52 D-01/D-11/D-14: walk N future cues forward from the given anchor + position.
 *
 * Returns an array of cue descriptors for dispatch via engine.topUpLookahead.
 * Each entry represents one upcoming phase boundary.
 *
 * Pure function: no React, no I/O, no side effects. Mirrors computeBoundaryAudioOffsets style.
 *
 * D-01 hybrid window: queue any cue whose relSec ≤ windowEndElapsedSec, but always
 * keep at least minCues cues (floor). At low BPM the floor dominates; at high BPM
 * the seconds window dominates.
 *
 * D-11 Stretch: when segments[] is provided, each cue's phaseDurationSec comes from
 * its OWN segment (linear-walk per cue, matching getStretchFrame posture in stretchRamp.ts).
 *
 * D-14 timed-session trim: when targetSec is defined, never emit cues past
 * audioAnchor + targetSec. The trim overrides the floor for timed sessions.
 */
export function walkFutureCues(args: {
  audioAnchor: number
  elapsedSec: number
  fromCycleIndex: number
  fromPhase: 'in' | 'out'
  plan: BreathingPlan
  segments?: StretchSegment[]
  lookaheadWindowSec: number
  minCues: number
  targetSec?: number
}): FutureCue[] {
  const {
    audioAnchor,
    elapsedSec,
    fromCycleIndex,
    fromPhase,
    plan,
    segments,
    lookaheadWindowSec,
    minCues,
    targetSec,
  } = args

  // Defensive ASSERT: degenerate input — avoid infinite loops
  if (plan.cycleSec <= 0) return []
  if (segments !== undefined) {
    // Check that at least one segment has a valid cycleSec
    const allDegenerate = segments.every(s => s.cycleSec <= 0)
    if (allDegenerate) return []
  }

  // Compute window end in elapsed-seconds space
  let windowEndElapsedSec = elapsedSec + lookaheadWindowSec
  // D-14: if targetSec is defined, clamp the window at the session end
  if (targetSec !== undefined) {
    windowEndElapsedSec = Math.min(windowEndElapsedSec, targetSec)
  }

  const result: FutureCue[] = []
  let currentCycleIndex = fromCycleIndex
  let currentPhase: 'in' | 'out' = fromPhase

  // Walk loop: emit one cue per iteration
  for (;;) {
    // Compute the session-elapsed time at the start of this cue (relative to anchor=0)
    let audioTimeRelSec: number
    let phaseDurationSec: number

    if (segments === undefined) {
      // ── HRV branch: uniform cycleSec stride ──
      const cycleStart = currentCycleIndex * plan.cycleSec
      const phaseOffset = currentPhase === 'in' ? 0 : plan.inhaleSec
      audioTimeRelSec = cycleStart + phaseOffset
      phaseDurationSec = currentPhase === 'in' ? plan.inhaleSec : plan.exhaleSec
    } else {
      // ── Stretch branch: per-segment cycleSec from segment table ──
      // Compute audioTimeRelSec from cycleIndex + phase using segment walk
      // (mirrors L221-256 in stretchRamp.ts getStretchFrame)
      // segments is non-empty (guarded by the caller via allDegenerate check above);
      // the last element is always present. Provide a fallback to satisfy TypeScript without
      // a non-null assertion — this branch is unreachable with a valid segments array.
      const lastSeg = segments[segments.length - 1]
      if (lastSeg === undefined) return []
      let activeSeg: StretchSegment = lastSeg
      for (const seg of segments) {
        if (seg.cycleBaseIndex > currentCycleIndex) break
        activeSeg = seg
      }

      // Compute cycle position within the active segment
      const cycleInSegment = currentCycleIndex - activeSeg.cycleBaseIndex
      const cycleStartInSeg = cycleInSegment * activeSeg.cycleSec
      const phaseOffset = currentPhase === 'in' ? 0 : activeSeg.inhaleSec
      audioTimeRelSec = activeSeg.startSec + cycleStartInSeg + phaseOffset
      phaseDurationSec = currentPhase === 'in' ? activeSeg.inhaleSec : activeSeg.exhaleSec
    }

    const audioTime = audioAnchor + audioTimeRelSec

    // D-14 timed-session trim: never emit cues past targetSec — overrides floor
    if (targetSec !== undefined && audioTimeRelSec > targetSec) {
      break
    }

    // D-01 hybrid stop: floor satisfied AND window exhausted → stop
    if (result.length >= minCues && audioTimeRelSec > windowEndElapsedSec) {
      break
    }

    // Emit the cue
    result.push({ audioTime, phaseDurationSec, kind: currentPhase })

    // Advance to the next phase
    if (currentPhase === 'in') {
      currentPhase = 'out'
    } else {
      currentPhase = 'in'
      currentCycleIndex += 1
    }
  }

  return result
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

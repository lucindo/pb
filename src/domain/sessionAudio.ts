import type { BreathingPlan } from './breathingPlan'
import { getCompletionSec, type SessionFrame } from './sessionMath'
import type { BreathPhase } from './settings'

export interface BoundaryAudioOffsets {
  // boundaryStartSec is the session-elapsed seconds at the start of the upcoming
  // phase. The caller converts this to an audio-clock time by adding the
  // per-session audio anchor — boundaryStartSec is a sessionFrame-shaped
  // quantity, not an audio-clock instant.
  readonly boundaryStartSec: number
  readonly phaseDurationSec: number
}

// ─── walkFutureCues ───────────────────────────────────────────────────────────

/**
 * Hard iteration cap for walkFutureCues — a pure defense against degenerate or
 * inconsistent plans (non-positive phase offsets that prevent the normal window
 * exit). No valid Pattern Breathing plan comes near it: the shortest cycle is a
 * few seconds and the lookahead window is 6 s, so a valid walk emits a handful
 * of cues per call.
 */
export const MAX_WALK_ITERATIONS = 10_000 as const

export interface FutureCue {
  audioTime: number
  phaseDurationSec: number
  kind: BreathPhase
}

// Session-elapsed seconds at the start of each phase within one cycle (prefix sum
// of phase durations). offsets[i] is the time from cycle start to phase i's onset.
function phaseStartOffsets(plan: BreathingPlan): number[] {
  const offsets: number[] = []
  let acc = 0
  for (const p of plan.phases) {
    offsets.push(acc)
    acc += p.durationSec
  }
  return offsets
}

/**
 * Walk future cues forward from the given anchor + cycle/phase position.
 *
 * Each entry is one upcoming phase boundary (the start of a non-zero phase).
 * Pure function: no React, no I/O, no side effects.
 *
 * Hybrid window: queue any cue whose relSec ≤ windowEndElapsedSec, but always
 * keep at least minCues cues (floor). Timed-session trim: when targetSec is
 * defined, never emit a cue at or past it.
 */
export function walkFutureCues(args: {
  audioAnchor: number
  elapsedSec: number
  fromCycleIndex: number
  fromPhaseIndex: number
  plan: BreathingPlan
  lookaheadWindowSec: number
  minCues: number
  targetSec?: number | undefined
}): FutureCue[] {
  const {
    audioAnchor,
    elapsedSec,
    fromCycleIndex,
    fromPhaseIndex,
    plan,
    lookaheadWindowSec,
    minCues,
    targetSec,
  } = args

  // Defensive ASSERT: degenerate input — avoid infinite loops.
  const phaseCount = plan.phases.length
  if (plan.cycleSec <= 0 || phaseCount === 0) return []

  const offsets = phaseStartOffsets(plan)

  let windowEndElapsedSec = elapsedSec + lookaheadWindowSec
  if (targetSec !== undefined) {
    windowEndElapsedSec = Math.min(windowEndElapsedSec, targetSec)
  }

  const result: FutureCue[] = []
  let cycleIndex = fromCycleIndex
  let phaseIndex = ((fromPhaseIndex % phaseCount) + phaseCount) % phaseCount

  // MAX_WALK_ITERATIONS hard cap: a degenerate plan cannot hang the rAF tick.
  for (let _i = 0; _i < MAX_WALK_ITERATIONS; _i++) {
    const phase = plan.phases[phaseIndex]
    if (phase === undefined) break // phaseIndex is always in range; satisfies the index guard.
    const audioTimeRelSec = cycleIndex * plan.cycleSec + (offsets[phaseIndex] ?? 0)

    // Timed-session trim: never emit a cue at or past targetSec — overrides floor.
    // EXCLUSIVE boundary: a cue at exactly targetSec is the next cycle's onset (the
    // session occupies [0, targetSec)), where the end chord plays.
    if (targetSec !== undefined && audioTimeRelSec >= targetSec) break

    // Hybrid stop: floor satisfied AND window exhausted → stop.
    if (result.length >= minCues && audioTimeRelSec > windowEndElapsedSec) break

    result.push({ audioTime: audioAnchor + audioTimeRelSec, phaseDurationSec: phase.durationSec, kind: phase.phase })

    phaseIndex += 1
    if (phaseIndex >= phaseCount) {
      phaseIndex = 0
      cycleIndex += 1
    }
  }

  return result
}

/**
 * The lookahead trim boundary — the elapsed-seconds instant past which no cue may
 * be scheduled. It is the session's completion boundary (getCompletionSec), so
 * the final cycle's cues still play while the cue at the boundary (where the end
 * chord fires) is dropped by walkFutureCues' `>=` trim. Open-ended → undefined
 * (no trim).
 */
export function resolveTargetSec(plan: BreathingPlan): number | undefined {
  return getCompletionSec(plan) ?? undefined
}

export function computeBoundaryAudioOffsets(
  frame: SessionFrame,
  plan: BreathingPlan,
): BoundaryAudioOffsets {
  const offsets = phaseStartOffsets(plan)
  const cycleIndex = frame.round - 1
  const phase = plan.phases[frame.phaseIndex]
  return {
    boundaryStartSec: cycleIndex * plan.cycleSec + (offsets[frame.phaseIndex] ?? 0),
    phaseDurationSec: phase?.durationSec ?? 0,
  }
}

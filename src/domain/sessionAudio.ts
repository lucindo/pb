import type { BreathingPlan } from './breathingPlan'
import { getCompletionSec, type SessionFrame } from './sessionMath'

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
 * Hard iteration cap for walkFutureCues.
 *
 * Derived as a safe multiple of the maximum cues a valid lookahead window can
 * emit: LOOKAHEAD_WINDOW_SEC / smallest-plausible-phase-duration + LOOKAHEAD_MIN_CUES.
 * At the minimum BPM=1 with 50:50 ratio, each phase is 30s — the window emits at most
 * 6/30 < 1 cue from the seconds budget, relying on LOOKAHEAD_MIN_CUES=2.
 * At the maximum BPM=7 with 20:80 ratio (shortest inhale), each inhale ≈ 1.7s —
 * the window can emit at most 6/1.7 ≈ 4 cues per window (never close to 10_000).
 * 10_000 is therefore a pure defense against degenerate/inconsistent plans
 * (negative or inconsistent phase offsets that prevent normal exit) and can
 * never be reached by any valid Pattern Breathing plan.
 */
export const MAX_WALK_ITERATIONS = 10_000 as const

export interface FutureCue {
  audioTime: number
  phaseDurationSec: number
  kind: 'in' | 'out'
}

/**
 * Walk N future cues forward from the given anchor + position.
 *
 * Returns an array of cue descriptors for dispatch via engine.topUpLookahead.
 * Each entry represents one upcoming phase boundary.
 *
 * Pure function: no React, no I/O, no side effects.
 *
 * Hybrid window: queue any cue whose relSec ≤ windowEndElapsedSec, but always
 * keep at least minCues cues (floor). At low BPM the floor dominates; at high BPM
 * the seconds window dominates.
 *
 * Timed-session trim: when targetSec is defined, never emit cues past
 * audioAnchor + targetSec. The trim overrides the floor for timed sessions.
 */
export function walkFutureCues(args: {
  audioAnchor: number
  elapsedSec: number
  fromCycleIndex: number
  fromPhase: 'in' | 'out'
  plan: BreathingPlan
  lookaheadWindowSec: number
  minCues: number
  targetSec?: number | undefined
}): FutureCue[] {
  const {
    audioAnchor,
    elapsedSec,
    fromCycleIndex,
    fromPhase,
    plan,
    lookaheadWindowSec,
    minCues,
    targetSec,
  } = args

  // Defensive ASSERT: degenerate input — avoid infinite loops
  if (plan.cycleSec <= 0) return []

  // Compute window end in elapsed-seconds space
  let windowEndElapsedSec = elapsedSec + lookaheadWindowSec
  // If targetSec is defined, clamp the window at the session end
  if (targetSec !== undefined) {
    windowEndElapsedSec = Math.min(windowEndElapsedSec, targetSec)
  }

  const result: FutureCue[] = []
  let currentCycleIndex = fromCycleIndex
  let currentPhase: 'in' | 'out' = fromPhase

  // Walk loop: emit one cue per iteration.
  // MAX_WALK_ITERATIONS hard cap: a degenerate plan (cycleSec>0, inconsistent phase
  // offsets, targetSec===undefined) cannot hang the rAF tick. The cap cannot be reached by
  // any valid Pattern Breathing plan — see MAX_WALK_ITERATIONS comment above.
  for (let _i = 0; _i < MAX_WALK_ITERATIONS; _i++) {
    // Uniform cycleSec stride — session-elapsed time at the start of this cue
    // (relative to anchor=0).
    const cycleStart = currentCycleIndex * plan.cycleSec
    const phaseOffset = currentPhase === 'in' ? 0 : plan.inhaleSec
    const audioTimeRelSec = cycleStart + phaseOffset
    const phaseDurationSec = currentPhase === 'in' ? plan.inhaleSec : plan.exhaleSec

    const audioTime = audioAnchor + audioTimeRelSec

    // Timed-session trim: never emit a cue at or past targetSec — overrides floor.
    // The boundary is EXCLUSIVE: a cue starting exactly at targetSec is the onset of
    // the next cycle (the session occupies [0, targetSec)). For cycle-aligned
    // durations that instant is also where the end chord plays, so emitting it would
    // overlap the breath cue with the session-end sound and start an inhale the
    // screen immediately cuts.
    if (targetSec !== undefined && audioTimeRelSec >= targetSec) {
      break
    }

    // Hybrid stop: floor satisfied AND window exhausted → stop
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

/**
 * The lookahead trim boundary for a session — the elapsed-seconds instant past
 * which no cue may be scheduled. It is the session's TRUE completion boundary
 * (the same end the domain reports complete at), so the held-open final cycle's
 * cues still play while walkFutureCues' `>=` trim drops the cue at the boundary
 * (where the end chord fires).
 *
 * getCompletionSec(plan) — totalSec rounded up to the cycle. Open-ended
 * (totalSec === null) → undefined. Returning `plan.totalSec` instead would
 * silence the rounded-up final cycle. `undefined` means "no trim" (open-ended
 * sessions never complete).
 */
export function resolveTargetSec(plan: BreathingPlan): number | undefined {
  return getCompletionSec(plan) ?? undefined
}

export function computeBoundaryAudioOffsets(
  frame: SessionFrame,
  plan: BreathingPlan,
): BoundaryAudioOffsets {
  return {
    boundaryStartSec: frame.cycleIndex * plan.cycleSec + (frame.phase === 'in' ? 0 : plan.inhaleSec),
    phaseDurationSec: frame.phase === 'in' ? plan.inhaleSec : plan.exhaleSec,
  }
}

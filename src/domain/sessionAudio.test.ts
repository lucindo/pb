import { describe, expect, it } from 'vitest'

import { LOOKAHEAD_MIN_CUES, LOOKAHEAD_WINDOW_SEC } from '../audio/audioEngine'
import type { BreathingPlan } from './breathingPlan'
import { computeBoundaryAudioOffsets, resolveTargetSec, walkFutureCues, MAX_WALK_ITERATIONS } from './sessionAudio'
import type { SessionFrame } from './sessionMath'

// Symmetric inhale/exhale fixture (no holds): cycle 6s.
const plan: BreathingPlan = {
  phases: [
    { phase: 'inhale', durationSec: 3 },
    { phase: 'exhale', durationSec: 3 },
  ],
  cycleSec: 6,
  rounds: 'open-ended',
  totalSec: null,
}

const timed = (totalSec: number): BreathingPlan => ({ ...plan, rounds: totalSec / plan.cycleSec, totalSec })

const baseFrame: SessionFrame = {
  phase: 'inhale',
  phaseIndex: 0,
  phaseProgress: 0,
  round: 4,
  totalRounds: 'open-ended',
  elapsedSec: 0,
  remainingSec: null,
  isComplete: false,
}

describe('walkFutureCues', () => {
  it('emits one cue per phase boundary from the anchor, monotonic and keyed by phase', () => {
    const cues = walkFutureCues({
      audioAnchor: 100,
      elapsedSec: 0,
      fromCycleIndex: 0,
      fromPhaseIndex: 0,
      plan,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
    })
    expect(cues[0]).toEqual({ audioTime: 100, phaseDurationSec: 3, kind: 'inhale' })
    expect(cues[1]).toEqual({ audioTime: 103, phaseDurationSec: 3, kind: 'exhale' })
    expect(cues[2]).toEqual({ audioTime: 106, phaseDurationSec: 3, kind: 'inhale' })
    for (let i = 1; i < cues.length; i++) {
      expect((cues[i]?.audioTime ?? 0)).toBeGreaterThan(cues[i - 1]?.audioTime ?? 0)
    }
  })

  it('walks a four-phase cycle including holds', () => {
    const fourPhase: BreathingPlan = {
      phases: [
        { phase: 'inhale', durationSec: 4 },
        { phase: 'hold-in', durationSec: 7 },
        { phase: 'exhale', durationSec: 8 },
      ],
      cycleSec: 19,
      rounds: 'open-ended',
      totalSec: null,
    }
    const cues = walkFutureCues({
      audioAnchor: 0,
      elapsedSec: 0,
      fromCycleIndex: 0,
      fromPhaseIndex: 0,
      plan: fourPhase,
      lookaheadWindowSec: 20,
      minCues: LOOKAHEAD_MIN_CUES,
    })
    expect(cues.slice(0, 3)).toEqual([
      { audioTime: 0, phaseDurationSec: 4, kind: 'inhale' },
      { audioTime: 4, phaseDurationSec: 7, kind: 'hold-in' },
      { audioTime: 11, phaseDurationSec: 8, kind: 'exhale' },
    ])
  })

  it('honors the minCues floor when the window reaches no boundary (long cycle)', () => {
    const longCycle: BreathingPlan = {
      phases: [
        { phase: 'inhale', durationSec: 24 },
        { phase: 'exhale', durationSec: 36 },
      ],
      cycleSec: 60,
      rounds: 'open-ended',
      totalSec: null,
    }
    const cues = walkFutureCues({
      audioAnchor: 0,
      elapsedSec: 0,
      fromCycleIndex: 0,
      fromPhaseIndex: 0,
      plan: longCycle,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
    })
    expect(cues.length).toBe(LOOKAHEAD_MIN_CUES)
    expect(cues[0]?.kind).toBe('inhale')
    expect(cues[1]?.kind).toBe('exhale')
  })

  // The boundary is EXCLUSIVE: a cue starting exactly at targetSec is the next
  // cycle's onset (where the end chord plays) and must not be emitted; the trim
  // beats the floor → zero cues.
  it('excludes the cue at the session-end boundary and the floor does not re-inflate', () => {
    const cues = walkFutureCues({
      audioAnchor: 0,
      elapsedSec: 300,
      fromCycleIndex: 50, // 50 × 6 = 300 = targetSec
      fromPhaseIndex: 0,
      plan: timed(300),
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
      targetSec: 300,
    })
    expect(cues).toEqual([])
    expect(LOOKAHEAD_MIN_CUES).toBeGreaterThan(1)
  })

  it('keeps the final phase before the boundary audible', () => {
    const cues = walkFutureCues({
      audioAnchor: 0,
      elapsedSec: 297,
      fromCycleIndex: 49,
      fromPhaseIndex: 1, // final exhale starts at 49×6 + 3 = 297
      plan: timed(300),
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
      targetSec: 300,
    })
    expect(cues).toContainEqual({ audioTime: 297, phaseDurationSec: 3, kind: 'exhale' })
    expect(cues.every((c) => c.audioTime < 300)).toBe(true)
  })

  it('returns [] when the start position is already past targetSec', () => {
    const cues = walkFutureCues({
      audioAnchor: 0,
      elapsedSec: 312,
      fromCycleIndex: 52, // 52 × 6 = 312 > 300
      fromPhaseIndex: 0,
      plan: timed(300),
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
      targetSec: 300,
    })
    expect(cues).toEqual([])
  })

  it('terminates at MAX_WALK_ITERATIONS for a degenerate near-zero cycle', () => {
    const degenerate: BreathingPlan = {
      phases: [{ phase: 'inhale', durationSec: 1e-9 }],
      cycleSec: 1e-9,
      rounds: 'open-ended',
      totalSec: null,
    }
    const start = performance.now()
    const cues = walkFutureCues({
      audioAnchor: 0,
      elapsedSec: 0,
      fromCycleIndex: 0,
      fromPhaseIndex: 0,
      plan: degenerate,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
    })
    expect(performance.now() - start).toBeLessThan(500)
    expect(cues.length).toBeLessThanOrEqual(MAX_WALK_ITERATIONS)
  })

  it('returns [] for an empty-phase plan', () => {
    expect(
      walkFutureCues({
        audioAnchor: 0,
        elapsedSec: 0,
        fromCycleIndex: 0,
        fromPhaseIndex: 0,
        plan: { phases: [], cycleSec: 0, rounds: 'open-ended', totalSec: null },
        lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
        minCues: LOOKAHEAD_MIN_CUES,
      }),
    ).toEqual([])
  })
})

describe('resolveTargetSec', () => {
  it('timed: returns the completion boundary (totalSec)', () => {
    expect(resolveTargetSec(timed(300))).toBe(300)
  })

  it('open-ended: returns undefined (no trim)', () => {
    expect(resolveTargetSec(plan)).toBeUndefined()
  })
})

describe('computeBoundaryAudioOffsets', () => {
  it('locates the current phase boundary by round and phase index', () => {
    expect(computeBoundaryAudioOffsets({ ...baseFrame, phaseIndex: 0 }, plan)).toEqual({
      boundaryStartSec: 3 * plan.cycleSec,
      phaseDurationSec: 3,
    })
    expect(computeBoundaryAudioOffsets({ ...baseFrame, phaseIndex: 1 }, plan)).toEqual({
      boundaryStartSec: 3 * plan.cycleSec + 3,
      phaseDurationSec: 3,
    })
  })
})

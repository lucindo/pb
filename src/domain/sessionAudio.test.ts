import { describe, expect, it } from 'vitest'

import type { BreathingPlan } from './breathingPlan'
import { computeBoundaryAudioOffsets } from './sessionAudio'
import type { SessionFrame } from './sessionMath'

// Phase 50-02 (D-02 ms→sec cascade): fixture values are seconds-shaped.
// Prior ms values 10_909 / 4_363 / 6_545 → 10.909 / 4.363 / 6.545 sec.
const plan: BreathingPlan = {
  bpm: 5.5,
  ratio: '40:60',
  cycleSec: 10.909,
  inhaleSec: 4.363,
  exhaleSec: 6.545,
  totalSec: null,
}

const baseFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  elapsedSec: 0,
  remainingSec: null,
  phaseProgress: 0,
  cycleIndex: 3,
  isComplete: false,
}

describe('computeBoundaryAudioOffsets', () => {
  it('uses constant-plan timing for standard In frames', () => {
    const out = computeBoundaryAudioOffsets({ ...baseFrame, phase: 'in' }, plan)

    expect(out.boundaryStartSec).toBe(3 * plan.cycleSec)
    // Phase 50-02: phaseDurationSec is plan.inhaleSec directly (no `/1000`).
    expect(out.phaseDurationSec).toBe(plan.inhaleSec)
  })

  it('uses constant-plan timing for standard Out frames', () => {
    const out = computeBoundaryAudioOffsets({ ...baseFrame, phase: 'out' }, plan)

    expect(out.boundaryStartSec).toBe(3 * plan.cycleSec + plan.inhaleSec)
    expect(out.phaseDurationSec).toBe(plan.exhaleSec)
  })

  it('uses per-cycle timing carried by stretch In frames', () => {
    const stretchFrame: SessionFrame = {
      ...baseFrame,
      phase: 'in',
      cycleIndex: 5,
      cycleStartSec: 55,
      currentCycleSec: 10,
      currentInhaleSec: 4,
      currentExhaleSec: 6,
      currentBpm: 6,
      stage: 'ramp',
    }

    const out = computeBoundaryAudioOffsets(stretchFrame, plan)

    expect(out.boundaryStartSec).toBe(55)
    expect(out.phaseDurationSec).toBe(4)
  })

  it('uses per-cycle timing carried by stretch Out frames', () => {
    const stretchFrame: SessionFrame = {
      ...baseFrame,
      phase: 'out',
      cycleIndex: 5,
      cycleStartSec: 55,
      currentCycleSec: 10,
      currentInhaleSec: 4,
      currentExhaleSec: 6,
      currentBpm: 6,
      stage: 'ramp',
    }

    const out = computeBoundaryAudioOffsets(stretchFrame, plan)

    expect(out.boundaryStartSec).toBe(59)
    expect(out.phaseDurationSec).toBe(6)
  })
})

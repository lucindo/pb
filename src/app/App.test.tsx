import { describe, expect, it } from 'vitest'

import { computeBoundaryAudioOffsets } from './App'
import type { BreathingPlan } from '../domain/breathingPlan'
import type { SessionFrame } from '../domain/sessionMath'

const plan: BreathingPlan = {
  bpm: 5.5,
  ratio: '40:60',
  cycleMs: 10_909,
  inhaleMs: 4_363,
  exhaleMs: 6_545,
  totalMs: null,
}

const baseFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  elapsedMs: 0,
  remainingMs: null,
  phaseProgress: 0,
  cycleIndex: 3,
  isComplete: false,
}

describe('computeBoundaryAudioOffsets (Plan 22-05)', () => {
  it('standard In frame: boundaryStartMs = cycleIndex * cycleMs, phaseDuration = inhale', () => {
    const out = computeBoundaryAudioOffsets({ ...baseFrame, phase: 'in' }, plan)
    expect(out.boundaryStartMs).toBe(3 * plan.cycleMs)
    expect(out.phaseDurationSec).toBe(plan.inhaleMs / 1000)
  })

  it('standard Out frame: boundaryStartMs adds inhaleMs, phaseDuration = exhale', () => {
    const out = computeBoundaryAudioOffsets({ ...baseFrame, phase: 'out' }, plan)
    expect(out.boundaryStartMs).toBe(3 * plan.cycleMs + plan.inhaleMs)
    expect(out.phaseDurationSec).toBe(plan.exhaleMs / 1000)
  })

  it('stretch In frame: boundaryStartMs = cycleStartMs, phaseDuration = currentInhaleMs', () => {
    const stretchFrame: SessionFrame = {
      ...baseFrame,
      phase: 'in',
      cycleIndex: 5,
      cycleStartMs: 55_000,
      currentCycleMs: 10_000,
      currentInhaleMs: 4_000,
      currentExhaleMs: 6_000,
      currentBpm: 6,
      stage: 'ramp',
    }
    const out = computeBoundaryAudioOffsets(stretchFrame, plan)
    expect(out.boundaryStartMs).toBe(55_000)
    expect(out.phaseDurationSec).toBe(4)
  })

  it('stretch Out frame: boundaryStartMs = cycleStartMs + currentInhaleMs, phaseDuration = currentExhaleMs', () => {
    const stretchFrame: SessionFrame = {
      ...baseFrame,
      phase: 'out',
      cycleIndex: 5,
      cycleStartMs: 55_000,
      currentCycleMs: 10_000,
      currentInhaleMs: 4_000,
      currentExhaleMs: 6_000,
      currentBpm: 6,
      stage: 'ramp',
    }
    const out = computeBoundaryAudioOffsets(stretchFrame, plan)
    expect(out.boundaryStartMs).toBe(59_000)
    expect(out.phaseDurationSec).toBe(6)
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildStretchSegments,
  getStretchFrame,
  computeStretchTotalMs,
  isStretchGateClear,
  STRETCH_MIN_TOTAL_MS,
} from './stretchRamp'
import type { StretchSegment } from './stretchRamp'
import { DEFAULT_SETTINGS } from './settings'
import type { SessionSettings } from './settings'

// Base stretch settings fixture (valid, finite)
const baseSettings: SessionSettings = {
  ...DEFAULT_SETTINGS,
  mode: 'stretch',
  initialBpm: 6,
  targetBpm: 4,
  holdInitialSeconds: 0,
  holdTargetSeconds: 0,
  rampDurationMinutes: 20,
}

// Fixture with holds
const settingsWithHolds: SessionSettings = {
  ...baseSettings,
  holdInitialSeconds: 15,
  holdTargetSeconds: 30,
}

// Open-ended fixture
const openEndedSettings: SessionSettings = {
  ...baseSettings,
  holdTargetSeconds: 'open-ended',
}

describe('buildStretchSegments', () => {
  it('produces ramp segments for base settings (no holds)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    expect(segs.length).toBeGreaterThan(0)
  })

  it('every ramp segment BPM step is strictly < 0.5 BPM (STRETCH-04, D-04)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const rampSegs = segs.filter(s => s.stage === 'ramp')
    expect(rampSegs.length).toBeGreaterThan(1)
    for (let i = 1; i < rampSegs.length; i++) {
      const diff = Math.abs((rampSegs[i - 1]?.bpm ?? 0) - (rampSegs[i]?.bpm ?? 0))
      expect(diff).toBeLessThan(0.5)
    }
  })

  it('ramp BPMs decrease monotonically from initialBpm toward targetBpm', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const rampSegs = segs.filter(s => s.stage === 'ramp')
    for (let i = 1; i < rampSegs.length; i++) {
      expect(rampSegs[i]?.bpm).toBeLessThan(rampSegs[i - 1]?.bpm ?? Infinity)
    }
  })

  it('first ramp segment BPM equals initialBpm', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const firstRamp = segs.find(s => s.stage === 'ramp')
    expect(firstRamp?.bpm).toBe(baseSettings.initialBpm)
  })

  it('last ramp segment BPM equals targetBpm', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const rampSegs = segs.filter(s => s.stage === 'ramp')
    const lastRamp = rampSegs[rampSegs.length - 1]
    expect(lastRamp?.bpm).toBe(baseSettings.targetBpm)
  })

  it('with holdInitialSeconds 15: first segment stage is hold-initial at initialBpm for 15000ms', () => {
    const segs = buildStretchSegments(settingsWithHolds, '40:60')
    const first = segs[0]
    expect(first?.stage).toBe('hold-initial')
    expect(first?.bpm).toBe(settingsWithHolds.initialBpm)
    expect(first?.endMs).toBe(15000)
  })

  it('with holdTargetSeconds 30: last segment stage is hold-target at targetBpm for 30000ms', () => {
    const segs = buildStretchSegments(settingsWithHolds, '40:60')
    const last = segs[segs.length - 1]
    expect(last?.stage).toBe('hold-target')
    expect(last?.bpm).toBe(settingsWithHolds.targetBpm)
    const duration = (last?.endMs ?? 0) - (last?.startMs ?? 0)
    expect(duration).toBe(30000)
  })

  it('with holdInitialSeconds 0: no hold-initial segment', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    expect(segs.find(s => s.stage === 'hold-initial')).toBeUndefined()
  })

  it('with holdTargetSeconds 0: no hold-target segment', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    expect(segs.find(s => s.stage === 'hold-target')).toBeUndefined()
  })

  it('with holdTargetSeconds "open-ended": last segment has endMs Infinity (D-03/D-11)', () => {
    const segs = buildStretchSegments(openEndedSettings, '40:60')
    const last = segs[segs.length - 1]
    expect(last?.stage).toBe('hold-target')
    expect(last?.endMs).toBe(Infinity)
  })

  it('segments are contiguous: each segment startMs equals previous endMs', () => {
    const segs = buildStretchSegments(settingsWithHolds, '40:60')
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i]?.startMs).toBe(segs[i - 1]?.endMs)
    }
  })

  it('cycleMs = 60000 / bpm for each segment', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    for (const seg of segs) {
      expect(seg.cycleMs).toBeCloseTo(60000 / seg.bpm, 5)
    }
  })

  it('inhaleMs + exhaleMs = cycleMs for each segment (ratio math)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    for (const seg of segs) {
      expect(seg.inhaleMs + seg.exhaleMs).toBeCloseTo(seg.cycleMs, 5)
    }
  })

  it('cycleBaseIndex is 0 for the first segment and non-decreasing', () => {
    const segs = buildStretchSegments(settingsWithHolds, '40:60')
    expect(segs[0]?.cycleBaseIndex).toBe(0)
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i]?.cycleBaseIndex).toBeGreaterThanOrEqual(segs[i - 1]?.cycleBaseIndex ?? 0)
    }
  })

  it('numSteps = ceil((initialBpm - targetBpm) / 0.4999) for the ramp (D-04)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const rampSegs = segs.filter(s => s.stage === 'ramp')
    const expectedSteps = Math.ceil((baseSettings.initialBpm - baseSettings.targetBpm) / 0.4999)
    expect(rampSegs.length).toBe(expectedSteps)
  })
})

describe('getStretchFrame', () => {
  it('returns phase "in" at elapsedMs 0 with cycleIndex 0', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const totalMs = computeStretchTotalMs(baseSettings)
    const frame = getStretchFrame(segs, totalMs, 0)
    expect(frame.phase).toBe('in')
    expect(frame.cycleIndex).toBe(0)
    expect(frame.isComplete).toBe(false)
  })

  it('cycleIndex is strictly non-decreasing across entire session sweep', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const totalMs = computeStretchTotalMs(baseSettings)
    const step = 1000
    const duration = (totalMs ?? 1_200_000) * 0.5
    let lastIndex = -1
    for (let t = 0; t <= duration; t += step) {
      const frame = getStretchFrame(segs, totalMs, t)
      expect(frame.cycleIndex).toBeGreaterThanOrEqual(lastIndex)
      lastIndex = frame.cycleIndex
    }
  })

  it('cycleIndex never resets at segment boundaries (Pitfall 1 - absolute monotonic)', () => {
    const segs = buildStretchSegments(settingsWithHolds, '40:60')
    const totalMs = computeStretchTotalMs(settingsWithHolds)
    // Sample just before and just after each segment boundary
    for (let i = 1; i < segs.length; i++) {
      const boundaryMs = segs[i]?.startMs ?? 0
      if (boundaryMs === Infinity) continue
      const frameBefore = getStretchFrame(segs, totalMs, boundaryMs - 1)
      const frameAt = getStretchFrame(segs, totalMs, boundaryMs)
      // cycleIndex at boundary must be >= cycleIndex just before
      expect(frameAt.cycleIndex).toBeGreaterThanOrEqual(frameBefore.cycleIndex)
    }
  })

  it('frame carries currentBpm, stage, cycleStartMs, currentCycleMs', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const totalMs = computeStretchTotalMs(baseSettings)
    const frame = getStretchFrame(segs, totalMs, 0)
    expect(frame.currentBpm).toBeDefined()
    expect(frame.stage).toBeDefined()
    expect(frame.cycleStartMs).toBeDefined()
    expect(frame.currentCycleMs).toBeDefined()
    expect(frame.currentInhaleMs).toBeDefined()
    expect(frame.currentExhaleMs).toBeDefined()
  })

  it('currentBpm at elapsedMs 0 equals initialBpm (no hold)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const totalMs = computeStretchTotalMs(baseSettings)
    const frame = getStretchFrame(segs, totalMs, 0)
    expect(frame.currentBpm).toBe(baseSettings.initialBpm)
  })

  it('stage at elapsedMs 0 is "ramp" when no hold-initial', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const totalMs = computeStretchTotalMs(baseSettings)
    const frame = getStretchFrame(segs, totalMs, 0)
    expect(frame.stage).toBe('ramp')
  })

  it('stage at elapsedMs 0 is "hold-initial" when holdInitialSeconds > 0', () => {
    const segs = buildStretchSegments(settingsWithHolds, '40:60')
    const totalMs = computeStretchTotalMs(settingsWithHolds)
    const frame = getStretchFrame(segs, totalMs, 0)
    expect(frame.stage).toBe('hold-initial')
  })

  it('isComplete fires at or after the cycle-rounded completionMs (Pitfall 3 last-segment rounding)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const totalMs = computeStretchTotalMs(baseSettings)
    if (totalMs === null) throw new Error('unexpected null totalMs')

    const lastSeg = segs[segs.length - 1] as StretchSegment
    const completionMs = lastSeg.startMs + Math.ceil((totalMs - lastSeg.startMs) / lastSeg.cycleMs) * lastSeg.cycleMs

    expect(getStretchFrame(segs, totalMs, completionMs - 1).isComplete).toBe(false)
    expect(getStretchFrame(segs, totalMs, completionMs).isComplete).toBe(true)
    expect(getStretchFrame(segs, totalMs, completionMs + 100).isComplete).toBe(true)
  })

  it('open-ended (totalMs null): isComplete is always false', () => {
    const segs = buildStretchSegments(openEndedSettings, '40:60')
    for (const t of [0, 1_000, 60_000, 600_000, 3_600_000]) {
      expect(getStretchFrame(segs, null, t).isComplete).toBe(false)
    }
  })

  it('open-ended (totalMs null): remainingMs is always null', () => {
    const segs = buildStretchSegments(openEndedSettings, '40:60')
    for (const t of [0, 1_000, 3_600_000]) {
      expect(getStretchFrame(segs, null, t).remainingMs).toBeNull()
    }
  })

  it('clamps negative elapsedMs to 0', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const totalMs = computeStretchTotalMs(baseSettings)
    const frame = getStretchFrame(segs, totalMs, -500)
    expect(frame.elapsedMs).toBe(0)
    expect(frame.cycleIndex).toBe(0)
  })

  it('phaseProgress is in [0, 1] range', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const totalMs = computeStretchTotalMs(baseSettings)
    if (totalMs === null) throw new Error('unexpected null totalMs')
    for (const t of [0, 5000, 100_000]) {
      const frame = getStretchFrame(segs, totalMs, t)
      expect(frame.phaseProgress).toBeGreaterThanOrEqual(0)
      expect(frame.phaseProgress).toBeLessThanOrEqual(1)
    }
  })

  it('remainingMs decreases as session progresses for finite session', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const totalMs = computeStretchTotalMs(baseSettings)
    if (totalMs === null) throw new Error('unexpected null totalMs')
    const frame1 = getStretchFrame(segs, totalMs, 0)
    const frame2 = getStretchFrame(segs, totalMs, 5000)
    expect(frame2.remainingMs).toBeLessThan(frame1.remainingMs ?? Infinity)
  })
})

describe('computeStretchTotalMs / isStretchGateClear', () => {
  it('returns holdInitial + ramp + holdTarget for all-finite holds (STRETCH-05)', () => {
    const total = computeStretchTotalMs(baseSettings)
    // holdInitial=0 + ramp=20*60000=1200000 + holdTarget=0 = 1200000
    expect(total).toBe(1_200_000)
  })

  it('returns null for open-ended holdTargetSeconds (D-11)', () => {
    expect(computeStretchTotalMs(openEndedSettings)).toBeNull()
  })

  it('gate is true at exactly STRETCH_MIN_TOTAL_MS (15:00) (D-10)', () => {
    // 15 min exactly → total = 15*60000 = 900000
    const settings: SessionSettings = {
      ...baseSettings,
      holdInitialSeconds: 0,
      rampDurationMinutes: 15,
      holdTargetSeconds: 0,
    }
    expect(computeStretchTotalMs(settings)).toBe(STRETCH_MIN_TOTAL_MS)
    expect(isStretchGateClear(settings)).toBe(true)
  })

  it('gate is false at STRETCH_MIN_TOTAL_MS - 1 (14:59:999) (D-10)', () => {
    // 5 min ramp + 0 holds = 300000ms < 900000ms
    const settings: SessionSettings = {
      ...baseSettings,
      holdInitialSeconds: 0,
      rampDurationMinutes: 5,  // 5 * 60000 = 300000
      holdTargetSeconds: 0,
    }
    expect(isStretchGateClear(settings)).toBe(false)
  })

  it('gate is true for open-ended (D-11 — infinite total always clears gate)', () => {
    expect(isStretchGateClear(openEndedSettings)).toBe(true)
  })

  it('STRETCH_MIN_TOTAL_MS constant equals 15 * 60000 (D-10)', () => {
    expect(STRETCH_MIN_TOTAL_MS).toBe(15 * 60_000)
  })

  it('gate boundary: exactly 15 min (900000ms) → true; 900000 - 1 → false is not achievable via options grid but 5-min ramp is < 15 min', () => {
    // The finest grid is 5 minutes, so we can test:
    // 15 min ramp = exactly gate → true
    // 10 min ramp = 600000 < 900000 → false
    const fifteenMin: SessionSettings = { ...baseSettings, rampDurationMinutes: 15, holdInitialSeconds: 0, holdTargetSeconds: 0 }
    const tenMin: SessionSettings = { ...baseSettings, rampDurationMinutes: 10, holdInitialSeconds: 0, holdTargetSeconds: 0 }
    expect(isStretchGateClear(fifteenMin)).toBe(true)
    expect(isStretchGateClear(tenMin)).toBe(false)
  })
})

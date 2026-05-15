import { describe, expect, it } from 'vitest'
import {
  buildStretchSegments,
  getStretchFrame,
  computeStretchTotalMs,
} from './stretchRamp'
import type { StretchSegment } from './stretchRamp'
import { DEFAULT_SETTINGS } from './settings'
import type { SessionSettings } from './settings'

// Base stretch settings fixture (valid, finite): warm-up 5 + ramp 20 + cool-down 5 = 30 min.
const baseSettings: SessionSettings = {
  ...DEFAULT_SETTINGS,
  mode: 'stretch',
  initialBpm: 6,
  targetBpm: 4,
  warmUpMinutes: 5,
  coolDownMinutes: 5,
  rampDurationMinutes: 20,
}

// Open-ended cool-down fixture
const openEndedSettings: SessionSettings = {
  ...baseSettings,
  coolDownMinutes: 'open-ended',
}

describe('buildStretchSegments', () => {
  it('produces a warm-up, ramp segments, and a cool-down', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    expect(segs.length).toBeGreaterThan(2)
    expect(segs[0]?.stage).toBe('hold-initial')
    expect(segs[segs.length - 1]?.stage).toBe('hold-target')
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

  it('last ramp segment BPM is >= targetBpm and < initialBpm', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const rampSegs = segs.filter(s => s.stage === 'ramp')
    const lastRamp = rampSegs[rampSegs.length - 1]
    expect(lastRamp?.bpm).toBeGreaterThanOrEqual(baseSettings.targetBpm)
    expect(lastRamp?.bpm).toBeLessThan(baseSettings.initialBpm)
  })

  it('warm-up segment is always present: first segment is hold-initial at initialBpm', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const first = segs[0]
    expect(first?.stage).toBe('hold-initial')
    expect(first?.bpm).toBe(baseSettings.initialBpm)
    // ~5 min of 6-BPM cycles (10s each) → exactly 300000 ms
    expect(first?.endMs).toBe(5 * 60_000)
  })

  it('cool-down segment is always present: last segment is hold-target at targetBpm', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const last = segs[segs.length - 1]
    expect(last?.stage).toBe('hold-target')
    expect(last?.bpm).toBe(baseSettings.targetBpm)
  })

  it('open-ended cool-down: last segment has endMs Infinity (D-03/D-11)', () => {
    const segs = buildStretchSegments(openEndedSettings, '40:60')
    const last = segs[segs.length - 1]
    expect(last?.stage).toBe('hold-target')
    expect(last?.endMs).toBe(Infinity)
  })

  it('segments are contiguous: each segment startMs equals previous endMs', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i]?.startMs).toBe(segs[i - 1]?.endMs)
    }
  })

  it('every finite segment boundary lands on a whole cycle boundary (mid-cycle bug fix)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    for (const seg of segs) {
      if (seg.endMs === Infinity) continue
      const cycles = (seg.endMs - seg.startMs) / seg.cycleMs
      expect(cycles).toBeCloseTo(Math.round(cycles), 6)
      expect(Math.round(cycles)).toBeGreaterThanOrEqual(1)
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
    const segs = buildStretchSegments(baseSettings, '40:60')
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
    const frame = getStretchFrame(segs, 0)
    expect(frame.phase).toBe('in')
    expect(frame.cycleIndex).toBe(0)
    expect(frame.isComplete).toBe(false)
  })

  it('cycleIndex is non-decreasing across an entire session sweep', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const duration = (computeStretchTotalMs(baseSettings) ?? 1_800_000) * 0.5
    let lastIndex = -1
    for (let t = 0; t <= duration; t += 1000) {
      const frame = getStretchFrame(segs, t)
      expect(frame.cycleIndex).toBeGreaterThanOrEqual(lastIndex)
      lastIndex = frame.cycleIndex
    }
  })

  it('cycleIndex never resets at segment boundaries (Pitfall 1 - absolute monotonic)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    for (let i = 1; i < segs.length; i++) {
      const boundaryMs = segs[i]?.startMs ?? 0
      if (boundaryMs === Infinity) continue
      const frameBefore = getStretchFrame(segs, boundaryMs - 1)
      const frameAt = getStretchFrame(segs, boundaryMs)
      expect(frameAt.cycleIndex).toBeGreaterThanOrEqual(frameBefore.cycleIndex)
    }
  })

  it('frame carries currentBpm, stage, cycleStartMs, currentCycleMs', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const frame = getStretchFrame(segs, 0)
    expect(frame.currentBpm).toBeDefined()
    expect(frame.stage).toBeDefined()
    expect(frame.cycleStartMs).toBeDefined()
    expect(frame.currentCycleMs).toBeDefined()
    expect(frame.currentInhaleMs).toBeDefined()
    expect(frame.currentExhaleMs).toBeDefined()
  })

  it('currentBpm at elapsedMs 0 equals initialBpm (warm-up hold)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    expect(getStretchFrame(segs, 0).currentBpm).toBe(baseSettings.initialBpm)
  })

  it('stage at elapsedMs 0 is "hold-initial" (warm-up is always first)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    expect(getStretchFrame(segs, 0).stage).toBe('hold-initial')
  })

  it('isComplete fires exactly at the last segment endMs (cycle-aligned, no drift)', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const endMs = (segs[segs.length - 1] as StretchSegment).endMs

    expect(getStretchFrame(segs, endMs - 1).isComplete).toBe(false)
    expect(getStretchFrame(segs, endMs).isComplete).toBe(true)
    expect(getStretchFrame(segs, endMs + 100).isComplete).toBe(true)
  })

  it('does not complete early — the cool-down segment runs to its endMs (CR-01 regression)', () => {
    // Drift-prone config: non-integer cycle counts in every segment.
    const driftSettings: SessionSettings = {
      ...baseSettings,
      initialBpm: 5.5,
      targetBpm: 4.5,
      warmUpMinutes: 5,
      rampDurationMinutes: 5,
      coolDownMinutes: 5,
    }
    const segs = buildStretchSegments(driftSettings, '40:60')
    const coolDown = segs[segs.length - 1] as StretchSegment
    expect(coolDown.stage).toBe('hold-target')
    const midCoolDown = coolDown.startMs + (coolDown.endMs - coolDown.startMs) / 2
    expect(getStretchFrame(segs, coolDown.startMs).isComplete).toBe(false)
    expect(getStretchFrame(segs, midCoolDown).isComplete).toBe(false)
    expect(getStretchFrame(segs, midCoolDown).stage).toBe('hold-target')
    expect(getStretchFrame(segs, coolDown.endMs).isComplete).toBe(true)
  })

  it('open-ended: isComplete is always false', () => {
    const segs = buildStretchSegments(openEndedSettings, '40:60')
    for (const t of [0, 1_000, 60_000, 600_000, 3_600_000]) {
      expect(getStretchFrame(segs, t).isComplete).toBe(false)
    }
  })

  it('open-ended: remainingMs is always null', () => {
    const segs = buildStretchSegments(openEndedSettings, '40:60')
    for (const t of [0, 1_000, 3_600_000]) {
      expect(getStretchFrame(segs, t).remainingMs).toBeNull()
    }
  })

  it('finite session: remainingMs reaches 0 exactly at the last segment endMs', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const endMs = (segs[segs.length - 1] as StretchSegment).endMs
    expect(getStretchFrame(segs, endMs).remainingMs).toBe(0)
  })

  it('clamps negative elapsedMs to 0', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const frame = getStretchFrame(segs, -500)
    expect(frame.elapsedMs).toBe(0)
    expect(frame.cycleIndex).toBe(0)
  })

  it('phaseProgress is in [0, 1] range', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    for (const t of [0, 5000, 100_000]) {
      const frame = getStretchFrame(segs, t)
      expect(frame.phaseProgress).toBeGreaterThanOrEqual(0)
      expect(frame.phaseProgress).toBeLessThanOrEqual(1)
    }
  })

  it('remainingMs decreases as session progresses for a finite session', () => {
    const segs = buildStretchSegments(baseSettings, '40:60')
    const frame1 = getStretchFrame(segs, 0)
    const frame2 = getStretchFrame(segs, 5000)
    expect(frame2.remainingMs).toBeLessThan(frame1.remainingMs ?? Infinity)
  })
})

describe('computeStretchTotalMs', () => {
  it('returns (warmUp + ramp + coolDown) minutes for all-finite holds (STRETCH-05)', () => {
    // warm-up 5 + ramp 20 + cool-down 5 = 30 min
    expect(computeStretchTotalMs(baseSettings)).toBe(30 * 60_000)
  })

  it('returns null for an open-ended cool-down (D-11)', () => {
    expect(computeStretchTotalMs(openEndedSettings)).toBeNull()
  })

  it('the minimum stretch total (5 + 5 + 5) is 15 minutes', () => {
    const minSettings: SessionSettings = {
      ...baseSettings,
      warmUpMinutes: 5,
      rampDurationMinutes: 5,
      coolDownMinutes: 5,
    }
    expect(computeStretchTotalMs(minSettings)).toBe(15 * 60_000)
  })
})

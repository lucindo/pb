import { describe, expect, it } from 'vitest'
import {
  buildStretchSegments,
  getStretchFrame,
  computeStretchTotalMs,
} from './stretchRamp'
import type { StretchSegment } from './stretchRamp'
import { DEFAULT_STRETCH_SETTINGS } from './settings'
import type { StretchSettings } from './settings'

// Base stretch settings fixture (valid, finite): warm-up 5 + ramp 20 + cool-down 5 = 30 min.
const baseSettings: StretchSettings = {
  ratio: '40:60',
  initialBpm: 6,
  targetBpm: 4,
  warmUpMinutes: 5,
  coolDownMinutes: 5,
  rampDurationMinutes: 20,
}

// Open-ended cool-down fixture
const openEndedSettings: StretchSettings = {
  ...baseSettings,
  coolDownMinutes: 'open-ended',
}

describe('buildStretchSegments (single-arg, StretchSettings — D-02)', () => {
  it('produces a warm-up, ramp segments, and a cool-down', () => {
    const segs = buildStretchSegments(baseSettings)
    expect(segs.length).toBeGreaterThan(2)
    expect(segs[0]?.stage).toBe('hold-initial')
    expect(segs[segs.length - 1]?.stage).toBe('hold-target')
  })

  it('every ramp segment BPM step is strictly < 0.5 BPM (STRETCH-04, D-04)', () => {
    const segs = buildStretchSegments(baseSettings)
    const rampSegs = segs.filter(s => s.stage === 'ramp')
    expect(rampSegs.length).toBeGreaterThan(1)
    for (let i = 1; i < rampSegs.length; i++) {
      const diff = Math.abs((rampSegs[i - 1]?.bpm ?? 0) - (rampSegs[i]?.bpm ?? 0))
      expect(diff).toBeLessThan(0.5)
    }
  })

  it('ramp BPMs decrease monotonically from initialBpm toward targetBpm', () => {
    const segs = buildStretchSegments(baseSettings)
    const rampSegs = segs.filter(s => s.stage === 'ramp')
    for (let i = 1; i < rampSegs.length; i++) {
      expect(rampSegs[i]?.bpm).toBeLessThan(rampSegs[i - 1]?.bpm ?? Infinity)
    }
  })

  it('first ramp segment BPM equals initialBpm', () => {
    const segs = buildStretchSegments(baseSettings)
    const firstRamp = segs.find(s => s.stage === 'ramp')
    expect(firstRamp?.bpm).toBe(baseSettings.initialBpm)
  })

  it('last ramp segment BPM is >= targetBpm and < initialBpm', () => {
    const segs = buildStretchSegments(baseSettings)
    const rampSegs = segs.filter(s => s.stage === 'ramp')
    const lastRamp = rampSegs[rampSegs.length - 1]
    expect(lastRamp?.bpm).toBeGreaterThanOrEqual(baseSettings.targetBpm)
    expect(lastRamp?.bpm).toBeLessThan(baseSettings.initialBpm)
  })

  it('warm-up segment is always present: first segment is hold-initial at initialBpm', () => {
    const segs = buildStretchSegments(baseSettings)
    const first = segs[0]
    expect(first?.stage).toBe('hold-initial')
    expect(first?.bpm).toBe(baseSettings.initialBpm)
    // ~5 min of 6-BPM cycles (10s each) → exactly 300000 ms
    expect(first?.endMs).toBe(5 * 60_000)
  })

  it('cool-down segment is always present: last segment is hold-target at targetBpm', () => {
    const segs = buildStretchSegments(baseSettings)
    const last = segs[segs.length - 1]
    expect(last?.stage).toBe('hold-target')
    expect(last?.bpm).toBe(baseSettings.targetBpm)
  })

  it('open-ended cool-down: last segment has endMs Infinity (D-03/D-11)', () => {
    const segs = buildStretchSegments(openEndedSettings)
    const last = segs[segs.length - 1]
    expect(last?.stage).toBe('hold-target')
    expect(last?.endMs).toBe(Infinity)
  })

  it('segments are contiguous: each segment startMs equals previous endMs', () => {
    const segs = buildStretchSegments(baseSettings)
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i]?.startMs).toBe(segs[i - 1]?.endMs)
    }
  })

  it('every finite segment boundary lands on a whole cycle boundary (mid-cycle bug fix)', () => {
    const segs = buildStretchSegments(baseSettings)
    for (const seg of segs) {
      if (seg.endMs === Infinity) continue
      const cycles = (seg.endMs - seg.startMs) / seg.cycleMs
      expect(cycles).toBeCloseTo(Math.round(cycles), 6)
      expect(Math.round(cycles)).toBeGreaterThanOrEqual(1)
    }
  })

  it('cycleMs = 60000 / bpm for each segment', () => {
    const segs = buildStretchSegments(baseSettings)
    for (const seg of segs) {
      expect(seg.cycleMs).toBeCloseTo(60000 / seg.bpm, 5)
    }
  })

  it('inhaleMs + exhaleMs = cycleMs for each segment (ratio math)', () => {
    const segs = buildStretchSegments(baseSettings)
    for (const seg of segs) {
      expect(seg.inhaleMs + seg.exhaleMs).toBeCloseTo(seg.cycleMs, 5)
    }
  })

  it('cycleBaseIndex is 0 for the first segment and non-decreasing', () => {
    const segs = buildStretchSegments(baseSettings)
    expect(segs[0]?.cycleBaseIndex).toBe(0)
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i]?.cycleBaseIndex).toBeGreaterThanOrEqual(segs[i - 1]?.cycleBaseIndex ?? 0)
    }
  })

  it('numSteps = ceil((initialBpm - targetBpm) / 0.4999) for the ramp (D-04)', () => {
    const segs = buildStretchSegments(baseSettings)
    const rampSegs = segs.filter(s => s.stage === 'ramp')
    const expectedSteps = Math.ceil((baseSettings.initialBpm - baseSettings.targetBpm) / 0.4999)
    expect(rampSegs.length).toBe(expectedSteps)
  })

  it('produces the same segment table as the old two-arg call for equivalent inputs', () => {
    // Regression: single-arg should produce same result as old buildStretchSegments(settings, ratio)
    const segs = buildStretchSegments(baseSettings)
    // Verify ratio is read internally from settings.ratio ('40:60')
    // by checking that inhaleMs:exhaleMs ratio matches 40:60
    const firstSeg = segs[0]
    expect(firstSeg).toBeDefined()
    if (firstSeg) {
      const inhaleRatio = firstSeg.inhaleMs / firstSeg.cycleMs
      expect(inhaleRatio).toBeCloseTo(0.4, 5)  // 40:60 → inhale = 40%
    }
  })

  it('DEFAULT_STRETCH_SETTINGS produces a valid segment table', () => {
    const segs = buildStretchSegments(DEFAULT_STRETCH_SETTINGS)
    expect(segs.length).toBeGreaterThan(0)
    expect(segs[0]?.stage).toBe('hold-initial')
  })

  // CR-01 defensive guard: buildStretchSegments must never silently produce an inverted ramp
  it('CR-01: throws RangeError when targetBpm > initialBpm (inverted ramp)', () => {
    expect(() => buildStretchSegments({ ...baseSettings, initialBpm: 4, targetBpm: 5 }))
      .toThrow(RangeError)
    expect(() => buildStretchSegments({ ...baseSettings, initialBpm: 4, targetBpm: 5 }))
      .toThrow('targetBpm must be strictly below initialBpm')
  })

  it('CR-01: throws RangeError when targetBpm === initialBpm (zero-span ramp)', () => {
    expect(() => buildStretchSegments({ ...baseSettings, initialBpm: 4, targetBpm: 4 }))
      .toThrow(RangeError)
    expect(() => buildStretchSegments({ ...baseSettings, initialBpm: 4, targetBpm: 4 }))
      .toThrow('targetBpm must be strictly below initialBpm')
  })

  it('CR-01: a valid down-ramp (targetBpm < initialBpm) still builds a populated segment table', () => {
    // Regression: valid settings must not be affected by the new guard
    const segs = buildStretchSegments(baseSettings)
    expect(segs.length).toBeGreaterThan(2)
    expect(segs.some(s => s.stage === 'ramp')).toBe(true)
  })
})

describe('getStretchFrame', () => {
  it('returns phase "in" at elapsedMs 0 with cycleIndex 0', () => {
    const segs = buildStretchSegments(baseSettings)
    const frame = getStretchFrame(segs, 0)
    expect(frame.phase).toBe('in')
    expect(frame.cycleIndex).toBe(0)
    expect(frame.isComplete).toBe(false)
  })

  it('cycleIndex is non-decreasing across an entire session sweep', () => {
    const segs = buildStretchSegments(baseSettings)
    const duration = (computeStretchTotalMs(baseSettings) ?? 1_800_000) * 0.5
    let lastIndex = -1
    for (let t = 0; t <= duration; t += 1000) {
      const frame = getStretchFrame(segs, t)
      expect(frame.cycleIndex).toBeGreaterThanOrEqual(lastIndex)
      lastIndex = frame.cycleIndex
    }
  })

  it('cycleIndex never resets at segment boundaries (Pitfall 1 - absolute monotonic)', () => {
    const segs = buildStretchSegments(baseSettings)
    for (let i = 1; i < segs.length; i++) {
      const boundaryMs = segs[i]?.startMs ?? 0
      if (boundaryMs === Infinity) continue
      const frameBefore = getStretchFrame(segs, boundaryMs - 1)
      const frameAt = getStretchFrame(segs, boundaryMs)
      expect(frameAt.cycleIndex).toBeGreaterThanOrEqual(frameBefore.cycleIndex)
    }
  })

  it('frame carries currentBpm, stage, cycleStartMs, currentCycleMs', () => {
    const segs = buildStretchSegments(baseSettings)
    const frame = getStretchFrame(segs, 0)
    expect(frame.currentBpm).toBeDefined()
    expect(frame.stage).toBeDefined()
    expect(frame.cycleStartMs).toBeDefined()
    expect(frame.currentCycleMs).toBeDefined()
    expect(frame.currentInhaleMs).toBeDefined()
    expect(frame.currentExhaleMs).toBeDefined()
  })

  it('currentBpm at elapsedMs 0 equals initialBpm (warm-up hold)', () => {
    const segs = buildStretchSegments(baseSettings)
    expect(getStretchFrame(segs, 0).currentBpm).toBe(baseSettings.initialBpm)
  })

  it('stage at elapsedMs 0 is "hold-initial" (warm-up is always first)', () => {
    const segs = buildStretchSegments(baseSettings)
    expect(getStretchFrame(segs, 0).stage).toBe('hold-initial')
  })

  it('isComplete fires exactly at the last segment endMs (cycle-aligned, no drift)', () => {
    const segs = buildStretchSegments(baseSettings)
    const endMs = (segs[segs.length - 1] as StretchSegment).endMs

    expect(getStretchFrame(segs, endMs - 1).isComplete).toBe(false)
    expect(getStretchFrame(segs, endMs).isComplete).toBe(true)
    expect(getStretchFrame(segs, endMs + 100).isComplete).toBe(true)
  })

  it('does not complete early — the cool-down segment runs to its endMs (CR-01 regression)', () => {
    // Drift-prone config: non-integer cycle counts in every segment.
    const driftSettings: StretchSettings = {
      ratio: '40:60',
      initialBpm: 5.5,
      targetBpm: 4.5,
      warmUpMinutes: 5,
      rampDurationMinutes: 5,
      coolDownMinutes: 5,
    }
    const segs = buildStretchSegments(driftSettings)
    const coolDown = segs[segs.length - 1] as StretchSegment
    expect(coolDown.stage).toBe('hold-target')
    const midCoolDown = coolDown.startMs + (coolDown.endMs - coolDown.startMs) / 2
    expect(getStretchFrame(segs, coolDown.startMs).isComplete).toBe(false)
    expect(getStretchFrame(segs, midCoolDown).isComplete).toBe(false)
    expect(getStretchFrame(segs, midCoolDown).stage).toBe('hold-target')
    expect(getStretchFrame(segs, coolDown.endMs).isComplete).toBe(true)
  })

  it('open-ended: isComplete is always false', () => {
    const segs = buildStretchSegments(openEndedSettings)
    for (const t of [0, 1_000, 60_000, 600_000, 3_600_000]) {
      expect(getStretchFrame(segs, t).isComplete).toBe(false)
    }
  })

  it('open-ended: remainingMs is always null', () => {
    const segs = buildStretchSegments(openEndedSettings)
    for (const t of [0, 1_000, 3_600_000]) {
      expect(getStretchFrame(segs, t).remainingMs).toBeNull()
    }
  })

  it('finite session: remainingMs reaches 0 exactly at the last segment endMs', () => {
    const segs = buildStretchSegments(baseSettings)
    const endMs = (segs[segs.length - 1] as StretchSegment).endMs
    expect(getStretchFrame(segs, endMs).remainingMs).toBe(0)
  })

  it('clamps negative elapsedMs to 0', () => {
    const segs = buildStretchSegments(baseSettings)
    const frame = getStretchFrame(segs, -500)
    expect(frame.elapsedMs).toBe(0)
    expect(frame.cycleIndex).toBe(0)
  })

  it('phaseProgress is in [0, 1] range', () => {
    const segs = buildStretchSegments(baseSettings)
    for (const t of [0, 5000, 100_000]) {
      const frame = getStretchFrame(segs, t)
      expect(frame.phaseProgress).toBeGreaterThanOrEqual(0)
      expect(frame.phaseProgress).toBeLessThanOrEqual(1)
    }
  })

  it('remainingMs decreases as session progresses for a finite session', () => {
    const segs = buildStretchSegments(baseSettings)
    const frame1 = getStretchFrame(segs, 0)
    const frame2 = getStretchFrame(segs, 5000)
    expect(frame2.remainingMs).toBeLessThan(frame1.remainingMs ?? Infinity)
  })

  // DS-WR-03 regression tests — GAP 3 fix (plan 34-09)
  // Verifies the clamp guards only the exact endMs landing (phantom-cycle protection),
  // NOT the whole final half-cycle (freeze removed).

  it('GAP-3: phaseProgress is NOT frozen during the final cycle — the orb animates the last exhale', () => {
    // Reproduce the 5-min cool-down freeze: sample the final out-phase (last exhale) and
    // confirm phaseProgress keeps advancing all the way to near 1.0 until isComplete fires.
    // With the broken DS-WR-03 clamp (segmentSpan - cycleMs/2), phaseProgress freezes at
    // ~1/6 for the entire last exhale. After the fix it should reach >= 0.95.
    const segs = buildStretchSegments(baseSettings)
    const coolDownSeg = segs[segs.length - 1] as StretchSegment
    const sessionEndMs = coolDownSeg.endMs
    const cycleMs = coolDownSeg.cycleMs
    const inhaleMs = coolDownSeg.inhaleMs

    // The last out-phase starts at: startOfLastCycle + inhaleMs
    const startOfLastCycle = sessionEndMs - cycleMs
    const outPhaseStartMs = startOfLastCycle + inhaleMs
    const outPhaseEndMs = sessionEndMs - 1 // just before isComplete fires

    // Sample 10 points across the final out-phase
    const outPhaseSamples: number[] = []
    for (let i = 0; i <= 10; i++) {
      outPhaseSamples.push(outPhaseStartMs + (i / 10) * (outPhaseEndMs - outPhaseStartMs))
    }

    const outFrames = outPhaseSamples.map(t => getStretchFrame(segs, t))

    // All frames in the final out-phase must stay in 'out' phase
    for (const f of outFrames) {
      expect(f.phase).toBe('out')
      expect(f.isComplete).toBe(false)
    }

    // phaseProgress must advance from 0 to near 1.0 across the final out-phase.
    // The last sample is at sessionEndMs - 1; exhaleMs = cycleMs - inhaleMs.
    // With the fix: phaseProgress near the end should be well above 0.9.
    // With the broken clamp: phaseProgress is frozen at ~1/6 (=0.167 for 40:60 ratio).
    const lastFrame = outFrames[outFrames.length - 1]!
    expect(lastFrame.phaseProgress).toBeGreaterThan(0.9)
  })

  it('GAP-3: remainingMs decreases monotonically across the final cycle and isComplete stays false until sessionEndMs', () => {
    const segs = buildStretchSegments(baseSettings)
    const coolDownSeg = segs[segs.length - 1] as StretchSegment
    const sessionEndMs = coolDownSeg.endMs
    const cycleMs = coolDownSeg.cycleMs
    const lastCycleStartMs = sessionEndMs - cycleMs

    const samples: number[] = []
    for (let t = lastCycleStartMs; t <= sessionEndMs; t += Math.max(1, Math.floor(cycleMs / 10))) {
      samples.push(t)
    }
    // Ensure sessionEndMs is included
    if (!samples.includes(sessionEndMs)) samples.push(sessionEndMs)
    samples.sort((a, b) => a - b)

    let lastRemaining = Infinity
    for (const t of samples) {
      const f = getStretchFrame(segs, t)
      if (t < sessionEndMs) {
        expect(f.isComplete).toBe(false)
        const rem = f.remainingMs ?? Infinity
        expect(rem).toBeLessThanOrEqual(lastRemaining)
        lastRemaining = rem
      } else {
        // At exactly sessionEndMs
        expect(f.isComplete).toBe(true)
        expect(f.remainingMs).toBe(0)
      }
    }
  })

  it('GAP-3 (phantom-cycle protection preserved): frame at exactly sessionEndMs carries the last real cycle index, not one past it', () => {
    const segs = buildStretchSegments(baseSettings)
    const coolDownSeg = segs[segs.length - 1] as StretchSegment
    const sessionEndMs = coolDownSeg.endMs

    // The frame just before endMs and the frame at endMs must be on the same cycle index.
    const frameBefore = getStretchFrame(segs, sessionEndMs - 1)
    const frameAt = getStretchFrame(segs, sessionEndMs)

    expect(frameAt.isComplete).toBe(true)
    expect(frameAt.cycleIndex).toBe(frameBefore.cycleIndex)
  })

  it('GAP-3 (open-ended unaffected): getStretchFrame advances normally at a large elapsed for an open-ended session', () => {
    const segs = buildStretchSegments(openEndedSettings)
    const largeElapsed = 3_600_000 // 1 hour

    const frame1 = getStretchFrame(segs, largeElapsed)
    const frame2 = getStretchFrame(segs, largeElapsed + 1000)

    // The open-ended path is never clamped — cycleIndex must advance
    expect(frame2.cycleIndex).toBeGreaterThanOrEqual(frame1.cycleIndex)
    // isComplete stays false
    expect(frame1.isComplete).toBe(false)
    expect(frame2.isComplete).toBe(false)
    // phaseProgress stays in [0,1]
    expect(frame1.phaseProgress).toBeGreaterThanOrEqual(0)
    expect(frame1.phaseProgress).toBeLessThanOrEqual(1)
  })
})

describe('computeStretchTotalMs (StretchSettings — D-02)', () => {
  it('equals the snapped segment table final endMs for all-finite holds (STRETCH-05)', () => {
    // The total is derived from the snapped segment table, not a raw minute sum.
    // warm-up 5 + ramp 20 + cool-down 5 = 30 min nominal; actual snapped total differs.
    const segments = buildStretchSegments(baseSettings)
    expect(computeStretchTotalMs(baseSettings)).toBe(segments.at(-1)!.endMs)
  })

  it('returns null for an open-ended cool-down (D-11)', () => {
    expect(computeStretchTotalMs(openEndedSettings)).toBeNull()
  })

  it('equals the snapped segment table final endMs for the minimum 5+5+5 setting', () => {
    // CR-01: non-cycle-aligned BPMs (5.5→4.5) produce segment-table drift;
    // the result must equal the snapped total, not the raw 15 min sum.
    const minSettings: StretchSettings = {
      ratio: '40:60',
      initialBpm: 5.5,
      targetBpm: 4.5,
      warmUpMinutes: 5,
      rampDurationMinutes: 5,
      coolDownMinutes: 5,
    }
    const segments = buildStretchSegments(minSettings)
    expect(computeStretchTotalMs(minSettings)).toBe(segments.at(-1)!.endMs)
  })

  // CR-01 regression: computeStretchTotalMs must derive from the snapped segment
  // table (same source of truth as getStretchFrame's isComplete check), not from
  // the raw minute sum. Non-cycle-aligned BPMs produce drift between the two.
  it('CR-01: equals snapped segment table final endMs for cycle-aligned baseSettings (no regression)', () => {
    const segments = buildStretchSegments(baseSettings)
    const snappedEnd = segments.at(-1)!.endMs
    expect(computeStretchTotalMs(baseSettings)).toBe(snappedEnd)
  })

  it('CR-01: equals snapped segment table final endMs for non-cycle-aligned BPM (drift fixture)', () => {
    // initialBpm: 5.5 → cycleMs ≈ 10909ms; segments do not divide evenly into integer ms.
    // The snapped segment table endMs differs from the raw minute sum.
    const driftSettings: StretchSettings = {
      ratio: '40:60',
      initialBpm: 5.5,
      targetBpm: 4,
      warmUpMinutes: 5,
      rampDurationMinutes: 5,
      coolDownMinutes: 5,
    }
    const segments = buildStretchSegments(driftSettings)
    const snappedEnd = segments.at(-1)!.endMs
    // Compute raw sum using literal values (coolDownMinutes is number | 'open-ended'; use literal 5).
    const rawMinuteSum = (5 + 5 + 5) * 60_000
    // The snapped end equals what computeStretchTotalMs must return (CR-01).
    expect(computeStretchTotalMs(driftSettings)).toBe(snappedEnd)
    // The snapped end must differ from the raw sum (proving the test exercises the drift case).
    expect(snappedEnd).not.toBe(rawMinuteSum)
  })
})

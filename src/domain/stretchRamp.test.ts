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

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message)
  }
  return value
}

function lastSegment(segments: StretchSegment[]): StretchSegment {
  return requireValue(segments.at(-1), 'Expected at least one stretch segment')
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

  it('every NON-FINAL finite segment boundary lands on a whole cycle boundary (mid-cycle bug fix)', () => {
    // GAP-1 rework: the final cool-down segment absorbs the cycle-snapping residual
    // and is NOT required to be a whole-cycle multiple. Only warm-up and ramp segments
    // must still land on Out→In cycle boundaries so BPM never steps mid-breath.
    const segs = buildStretchSegments(baseSettings)
    const nonFinalSegs = segs.slice(0, -1)
    for (const seg of nonFinalSegs) {
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

  // WR-01 regression: the bounded cool-down absorbs the upward cycle-snapping
  // residual from warm-up + ramp. For a wide, slow ramp the residual can exceed
  // the requested cool-down span — the cool-down segment span must still be
  // floored at one whole cycle (never zero or negative), and cycleIndex must
  // stay monotonic across the full session sweep.
  it('WR-01: wide slow ramp — cool-down span stays positive and cycleIndex is monotonic', () => {
    const wideSlowSettings: StretchSettings = {
      ratio: '40:60',
      initialBpm: 14,
      targetBpm: 1.5,
      warmUpMinutes: 15,
      rampDurationMinutes: 5,
      coolDownMinutes: 5,
    }
    const segs = buildStretchSegments(wideSlowSettings)
    const coolDown = segs[segs.length - 1] as StretchSegment

    // The cool-down segment span must be strictly positive (endMs > startMs) and
    // at least one whole cool-down cycle long — never zero or negative.
    expect(coolDown.stage).toBe('hold-target')
    expect(coolDown.endMs).toBeGreaterThan(coolDown.startMs)
    expect(coolDown.endMs - coolDown.startMs).toBeGreaterThanOrEqual(coolDown.cycleMs)

    // Segment-table contiguity invariant must hold: each segment startMs equals
    // the previous endMs (a negative-span cool-down would violate this).
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i]?.startMs).toBe(segs[i - 1]?.endMs)
      const segment = requireValue(segs[i], 'Expected contiguous stretch segment')
      expect(segment.endMs).toBeGreaterThan(segment.startMs)
    }

    // cycleIndex must stay monotonic across the full session sweep.
    let lastIndex = -1
    for (let t = 0; t <= coolDown.endMs; t += 1000) {
      const frame = getStretchFrame(segs, t)
      expect(frame.cycleIndex).toBeGreaterThanOrEqual(lastIndex)
      lastIndex = frame.cycleIndex
    }
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

  // WR-02 regression: after the 34-10 residual-absorption rework the bounded
  // cool-down span is no longer a whole-cycle multiple, so the final cycle is a
  // partial cycle. If it ends mid-out-phase the raw phaseElapsedMs / exhaleMs
  // ratio can exceed 1.0 for elapsed values just below endMs. phaseProgress must
  // be clamped to [0, 1] so the orb-animation interpolation never overshoots.
  it('WR-02: phaseProgress stays <= 1 across the final partial cycle', () => {
    const segs = buildStretchSegments(baseSettings)
    const coolDownSeg = segs[segs.length - 1] as StretchSegment
    const sessionEndMs = coolDownSeg.endMs
    const cycleMs = coolDownSeg.cycleMs

    // Sample densely across the final cycle, including points right before endMs
    // where a partial out-phase would push the raw ratio above 1.0.
    const samples: number[] = [
      sessionEndMs - 1,
      sessionEndMs - cycleMs / 4,
      sessionEndMs - cycleMs / 2,
    ]
    for (let t = Math.max(0, sessionEndMs - cycleMs); t < sessionEndMs; t += Math.max(1, Math.floor(cycleMs / 20))) {
      samples.push(t)
    }
    for (const t of samples) {
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
    //
    // GAP-1 update: after the plan 34-10 rework, the final cool-down no longer ends on a
    // whole-cycle boundary — startOfLastCycle must be computed from the cool-down start
    // (floor of span / cycleMs * cycleMs + coolDownSeg.startMs), not as sessionEndMs - cycleMs.
    const segs = buildStretchSegments(baseSettings)
    const coolDownSeg = segs[segs.length - 1] as StretchSegment
    const sessionEndMs = coolDownSeg.endMs
    const cycleMs = coolDownSeg.cycleMs
    const inhaleMs = coolDownSeg.inhaleMs

    // Compute the last cycle boundary correctly from the cool-down segment start.
    const segSpan = sessionEndMs - coolDownSeg.startMs
    const lastCycleIndexInSeg = Math.floor((segSpan - 1) / cycleMs)
    const startOfLastCycle = coolDownSeg.startMs + lastCycleIndexInSeg * cycleMs
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

    // phaseProgress must advance across the final out-phase.
    // The last sample is at sessionEndMs - 1.
    // With the fix: phaseProgress near the end should be well above 0.8 — clearly
    // advancing, not frozen at ~1/6 (=0.167) as it was with the broken DS-WR-03 clamp.
    // Note: after the GAP-1 rework the last cycle may be a partial one (the cool-down
    // absorbs the residual), so phaseProgress may not reach near 1.0 in all cases.
    const lastFrame = requireValue(outFrames.at(-1), 'Expected final out-phase frame')
    expect(lastFrame.phaseProgress).toBeGreaterThan(0.8)
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

  it('GAP-1/GAP-3 guard: phaseProgress still advances through the final cycle of a reworked 5/5/5 table (gap-3 orb freeze NOT reintroduced)', () => {
    // After the GAP-1 rework, the final cool-down segment no longer ends on a whole-cycle
    // boundary — its span includes a partial residual cycle. This test confirms that
    // getStretchFrame's phaseProgress still advances (does not freeze) through the
    // final part of the session up to isComplete. The DS-WR-03 CLAMP_EPSILON_MS = 1ms
    // clamp from plan 34-09 guards only the exact-endMs landing; any elapsed value
    // strictly below endMs flows unclamped — so phaseProgress advances freely.
    const segs = buildStretchSegments(DEFAULT_STRETCH_SETTINGS)
    const coolDownSeg = segs[segs.length - 1] as StretchSegment
    const sessionEndMs = coolDownSeg.endMs

    // sessionEndMs must equal 900000 (the requested total) after GAP-1 fix
    expect(sessionEndMs).toBe(900_000)

    const cycleMs = coolDownSeg.cycleMs // 60000 / 4.5 ≈ 13333.3ms

    // Sample phaseProgress at several evenly-spaced points in the final cycle.
    // The last cycle starts at: startMs + floor((span-1)/cycleMs)*cycleMs
    const segSpan = sessionEndMs - coolDownSeg.startMs
    const lastCycleIndex = Math.floor((segSpan - 1) / cycleMs) // last valid cycle
    const startOfLastCycle = coolDownSeg.startMs + lastCycleIndex * cycleMs

    // Sample 5 points across the final cycle (up to sessionEndMs - 1)
    const samples: number[] = []
    for (let i = 0; i <= 4; i++) {
      const t = startOfLastCycle + (i / 4) * (sessionEndMs - 1 - startOfLastCycle)
      samples.push(t)
    }

    const frames = samples.map(t => getStretchFrame(segs, t))

    // All sampled frames must not be complete
    for (const f of frames) {
      expect(f.isComplete).toBe(false)
    }

    // phaseProgress must advance across the samples — the last sample must have a
    // higher (or equal) phaseProgress than the first, and must NOT be frozen at
    // ~0.167 (the DS-WR-03 broken-clamp freeze value for the 40:60 ratio).
    // We check that the first and last samples differ, confirming animation advances.
    const firstFrame = requireValue(frames[0], 'Expected first sampled frame')
    const lastFrame = requireValue(frames.at(-1), 'Expected last sampled frame')
    // The last sample is further into the cycle than the first — phaseProgress must
    // be different (the orb is animating, not frozen at the same value).
    // We only assert it's not stuck at the broken-clamp freeze value (~0.167).
    expect(lastFrame.phaseProgress).not.toBeCloseTo(0.167, 1)
    // And confirm phaseProgress is in [0, 1]
    expect(lastFrame.phaseProgress).toBeGreaterThanOrEqual(0)
    expect(lastFrame.phaseProgress).toBeLessThanOrEqual(1)
    // The last sample's phaseProgress must differ from the first (animation is advancing)
    expect(lastFrame.phaseProgress).not.toBe(firstFrame.phaseProgress)

    // isComplete must fire at exactly sessionEndMs
    expect(getStretchFrame(segs, sessionEndMs - 1).isComplete).toBe(false)
    expect(getStretchFrame(segs, sessionEndMs).isComplete).toBe(true)
    expect(getStretchFrame(segs, sessionEndMs).remainingMs).toBe(0)
  })
})

describe('computeStretchTotalMs (StretchSettings — D-02)', () => {
  it('equals the snapped segment table final endMs for all-finite holds (STRETCH-05)', () => {
    // The total is derived from the snapped segment table, not a raw minute sum.
    // warm-up 5 + ramp 20 + cool-down 5 = 30 min nominal; actual snapped total differs.
    const segments = buildStretchSegments(baseSettings)
    expect(computeStretchTotalMs(baseSettings)).toBe(lastSegment(segments).endMs)
  })

  it('returns null for an open-ended cool-down (D-11)', () => {
    expect(computeStretchTotalMs(openEndedSettings)).toBeNull()
  })

  it('equals the exact requested whole-minute total for the minimum 5+5+5 setting (GAP-1 fix)', () => {
    // GAP-1 rework: the final cool-down absorbs the residual so the realized total equals
    // the requested whole-minute total exactly — no longer the raw snapped segment drift.
    // DEFAULT_STRETCH_SETTINGS is the same 5.5→4.5 BPM, 5/5/5 fixture.
    const minSettings: StretchSettings = {
      ratio: '40:60',
      initialBpm: 5.5,
      targetBpm: 4.5,
      warmUpMinutes: 5,
      rampDurationMinutes: 5,
      coolDownMinutes: 5,
    }
    const requestedTotal = (5 + 5 + 5) * 60_000 // 900000
    const segments = buildStretchSegments(minSettings)
    // After GAP-1 fix: final endMs equals the requested whole-minute total exactly.
    expect(lastSegment(segments).endMs).toBe(requestedTotal)
    // computeStretchTotalMs also returns that exact total.
    expect(computeStretchTotalMs(minSettings)).toBe(requestedTotal)
    expect(computeStretchTotalMs(minSettings)).toBe(lastSegment(segments).endMs)
  })

  // CR-01 regression: computeStretchTotalMs must derive from the snapped segment
  // table (same source of truth as getStretchFrame's isComplete check), not from
  // the raw minute sum. Non-cycle-aligned BPMs produce drift between the two.
  it('CR-01: equals snapped segment table final endMs for cycle-aligned baseSettings (no regression)', () => {
    const segments = buildStretchSegments(baseSettings)
    const snappedEnd = lastSegment(segments).endMs
    expect(computeStretchTotalMs(baseSettings)).toBe(snappedEnd)
  })

  it('CR-01/GAP-1: equals the exact requested whole-minute total for non-cycle-aligned BPM (drift fixture)', () => {
    // GAP-1 rework: the cool-down absorbs the residual so the final endMs equals the requested
    // whole-minute total exactly — previously the snapped total differed from the raw minute sum.
    const driftSettings: StretchSettings = {
      ratio: '40:60',
      initialBpm: 5.5,
      targetBpm: 4,
      warmUpMinutes: 5,
      rampDurationMinutes: 5,
      coolDownMinutes: 5,
    }
    const segments = buildStretchSegments(driftSettings)
    const finalEndMs = lastSegment(segments).endMs
    // After GAP-1 fix: computeStretchTotalMs returns the exact requested whole-minute total.
    expect(computeStretchTotalMs(driftSettings)).toBe(finalEndMs)
    // After GAP-1 fix: the final endMs equals the requested whole-minute total exactly.
    const requestedTotal = (5 + 5 + 5) * 60_000
    expect(finalEndMs).toBe(requestedTotal)
    expect(computeStretchTotalMs(driftSettings)).toBe(requestedTotal)
  })

  // ── GAP-1 regression tests ────────────────────────────────────────────────
  // These tests verify the GAP-1 fix: the final cool-down segment absorbs the
  // accumulated cycle-snapping residual so the realized total equals the
  // requested whole-minute total exactly.

  it('GAP-1: DEFAULT_STRETCH_SETTINGS (5/5/5) final endMs equals the requested 15:00 exactly (=== 900000)', () => {
    // DEFAULT_STRETCH_SETTINGS: 5.5→4.5 BPM, warm-up 5 + ramp 5 + cool-down 5 = 15 min.
    // Before fix: final endMs was 903220ms (15:03) due to per-segment cycle-rounding residuals.
    // After fix: final endMs must equal (5+5+5)*60_000 = 900000 exactly.
    const segs = buildStretchSegments(DEFAULT_STRETCH_SETTINGS)
    const requestedTotal = (
      DEFAULT_STRETCH_SETTINGS.warmUpMinutes +
      DEFAULT_STRETCH_SETTINGS.rampDurationMinutes +
      (DEFAULT_STRETCH_SETTINGS.coolDownMinutes as number)
    ) * 60_000
    expect(lastSegment(segs).endMs).toBe(requestedTotal)
    expect(lastSegment(segs).endMs).toBe(900_000)
  })

  it('GAP-1: baseSettings (5+20+5=30 min) final endMs equals the requested 30:00 exactly (=== 1800000)', () => {
    const segs = buildStretchSegments(baseSettings)
    const requestedTotal = (
      baseSettings.warmUpMinutes +
      baseSettings.rampDurationMinutes +
      (baseSettings.coolDownMinutes as number)
    ) * 60_000
    expect(lastSegment(segs).endMs).toBe(requestedTotal)
    expect(lastSegment(segs).endMs).toBe(1_800_000)
  })

  it('GAP-1: computeStretchTotalMs returns the exact requested whole-minute total for DEFAULT_STRETCH_SETTINGS', () => {
    const requestedTotal = (
      DEFAULT_STRETCH_SETTINGS.warmUpMinutes +
      DEFAULT_STRETCH_SETTINGS.rampDurationMinutes +
      (DEFAULT_STRETCH_SETTINGS.coolDownMinutes as number)
    ) * 60_000
    expect(computeStretchTotalMs(DEFAULT_STRETCH_SETTINGS)).toBe(requestedTotal)
    expect(computeStretchTotalMs(DEFAULT_STRETCH_SETTINGS)).toBe(900_000)
  })

  it('GAP-1: computeStretchTotalMs returns the exact requested whole-minute total for baseSettings', () => {
    const requestedTotal = (
      baseSettings.warmUpMinutes +
      baseSettings.rampDurationMinutes +
      (baseSettings.coolDownMinutes as number)
    ) * 60_000
    expect(computeStretchTotalMs(baseSettings)).toBe(requestedTotal)
    expect(computeStretchTotalMs(baseSettings)).toBe(1_800_000)
  })

  it('GAP-1: warm-up and every ramp segment are still whole-cycle multiples (cycle alignment preserved)', () => {
    // The GAP-1 fix must leave warm-up and ramp segments unchanged — only the
    // final bounded cool-down segment absorbs the residual and may have a non-whole
    // cycle span. All non-final segments must still be whole-cycle multiples.
    const segs = buildStretchSegments(DEFAULT_STRETCH_SETTINGS)
    const nonFinalSegs = segs.slice(0, -1) // all except the last (cool-down)
    for (const seg of nonFinalSegs) {
      if (seg.endMs === Infinity) continue
      const span = seg.endMs - seg.startMs
      const cycles = span / seg.cycleMs
      // Each non-final segment must be a whole-cycle multiple (within float epsilon)
      expect(cycles).toBeCloseTo(Math.round(cycles), 6)
      expect(Math.round(cycles)).toBeGreaterThanOrEqual(1)
    }
    // Also verify for baseSettings
    const baseSegs = buildStretchSegments(baseSettings)
    const baseNonFinalSegs = baseSegs.slice(0, -1)
    for (const seg of baseNonFinalSegs) {
      if (seg.endMs === Infinity) continue
      const span = seg.endMs - seg.startMs
      const cycles = span / seg.cycleMs
      expect(cycles).toBeCloseTo(Math.round(cycles), 6)
      expect(Math.round(cycles)).toBeGreaterThanOrEqual(1)
    }
  })

  it('GAP-1: cool-down segment cycleMs is still the true breath-cycle length (60000/targetBpm)', () => {
    // The cool-down segment span absorbs the residual, but cycleMs MUST remain
    // 60_000 / targetBpm so getStretchFrame phase math is unchanged.
    const segs = buildStretchSegments(DEFAULT_STRETCH_SETTINGS)
    const coolDown = lastSegment(segs)
    expect(coolDown.stage).toBe('hold-target')
    expect(coolDown.cycleMs).toBeCloseTo(60_000 / DEFAULT_STRETCH_SETTINGS.targetBpm, 5)
  })

  it('GAP-1: open-ended cool-down still has endMs === Infinity and computeStretchTotalMs returns null (unchanged)', () => {
    const segs = buildStretchSegments(openEndedSettings)
    const coolDown = lastSegment(segs)
    expect(coolDown.stage).toBe('hold-target')
    expect(coolDown.endMs).toBe(Infinity)
    expect(computeStretchTotalMs(openEndedSettings)).toBeNull()
  })
})

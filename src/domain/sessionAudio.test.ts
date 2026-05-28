import { describe, expect, it } from 'vitest'

import { LOOKAHEAD_MIN_CUES, LOOKAHEAD_WINDOW_SEC } from '../audio/audioEngine'
import type { BreathingPlan } from './breathingPlan'
import { computeBoundaryAudioOffsets, walkFutureCues } from './sessionAudio'
import type { SessionFrame } from './sessionMath'
import type { StretchSegment } from './stretchRamp'

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

// ─── Phase 52 D-01/D-11/D-14 walkFutureCues tests ───────────────────────────

// HRV fixture plan: 10 BPM (cycleSec=6, inhale=3, exhale=3)
const hrvPlan: BreathingPlan = {
  bpm: 10,
  ratio: '50:50',
  cycleSec: 6,
  inhaleSec: 3,
  exhaleSec: 3,
  totalSec: null,
}

// Two-segment Stretch fixture for boundary-crossing tests
const stretchSegs: StretchSegment[] = [
  {
    startSec: 0,
    endSec: 30,
    bpm: 10,
    cycleSec: 6,
    inhaleSec: 3,
    exhaleSec: 3,
    stage: 'hold-initial',
    cycleBaseIndex: 0,
  },
  {
    startSec: 30,
    endSec: Infinity,
    bpm: 6,
    cycleSec: 10,
    inhaleSec: 4,
    exhaleSec: 6,
    stage: 'hold-target',
    cycleBaseIndex: 5,
  },
]

describe('Phase 52 D-01/D-11/D-14 walkFutureCues', () => {
  // Test 1: HRV walk basic — at 10 BPM (cycleSec=6), floor=2, window=6s
  it('HRV basic walk returns ≥LOOKAHEAD_MIN_CUES cues starting at anchor+0 for fromPhase=in', () => {
    const anchor = 100
    const cues = walkFutureCues({
      audioAnchor: anchor,
      elapsedSec: 0,
      fromCycleIndex: 0,
      fromPhase: 'in',
      plan: hrvPlan,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
    })

    expect(cues.length).toBeGreaterThanOrEqual(LOOKAHEAD_MIN_CUES)
    // First cue at audioAnchor + 0 (cycleIndex=0, phase=in)
    expect(cues[0]).toEqual({ audioTime: anchor + 0, phaseDurationSec: 3, kind: 'in' })
    // Second cue at audioAnchor + 3 (exhale)
    expect(cues[1]).toEqual({ audioTime: anchor + 3, phaseDurationSec: 3, kind: 'out' })
    // Third cue at audioAnchor + 6 (next cycle inhale) — included since LOOKAHEAD_WINDOW_SEC=6
    if (cues.length >= 3) {
      expect(cues[2]).toEqual({ audioTime: anchor + 6, phaseDurationSec: 3, kind: 'in' })
    }
    // AudioTimes must be monotonically increasing
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i]!.audioTime).toBeGreaterThan(cues[i - 1]!.audioTime)
    }
  })

  // Test 2: HRV low-BPM floor — at 1 BPM (cycleSec=60), window yields 0 cues; floor returns 2
  it('HRV low-BPM floor: 1 BPM returns exactly LOOKAHEAD_MIN_CUES cues', () => {
    const lowBpmPlan: BreathingPlan = {
      bpm: 1,
      ratio: '40:60',
      cycleSec: 60,
      inhaleSec: 24,
      exhaleSec: 36,
      totalSec: null,
    }
    const cues = walkFutureCues({
      audioAnchor: 0,
      elapsedSec: 0,
      fromCycleIndex: 0,
      fromPhase: 'in',
      plan: lowBpmPlan,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
    })
    // D-01/D-03 floor: even though the window (6s) doesn't reach the next cycle (60s),
    // the floor kicks in and returns LOOKAHEAD_MIN_CUES cues
    expect(cues.length).toBe(LOOKAHEAD_MIN_CUES)
    expect(cues[0]!.kind).toBe('in')
    expect(cues[1]!.kind).toBe('out')
  })

  // Test 3: HRV high-BPM window-wins — at 7 BPM (cycleSec≈8.57), no duplicates, monotonic times
  it('HRV high-BPM: no duplicate cues, monotonically increasing audioTimes', () => {
    const highBpmPlan: BreathingPlan = {
      bpm: 7,
      ratio: '40:60',
      cycleSec: 60 / 7,
      inhaleSec: (60 / 7) * 0.4,
      exhaleSec: (60 / 7) * 0.6,
      totalSec: null,
    }
    const cues = walkFutureCues({
      audioAnchor: 50,
      elapsedSec: 0,
      fromCycleIndex: 0,
      fromPhase: 'in',
      plan: highBpmPlan,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
    })
    expect(cues.length).toBeGreaterThanOrEqual(LOOKAHEAD_MIN_CUES)
    // No duplicate audioTimes
    const audioTimes = cues.map(c => c.audioTime)
    const uniqueTimes = new Set(audioTimes)
    expect(uniqueTimes.size).toBe(audioTimes.length)
    // Monotonically increasing
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i]!.audioTime).toBeGreaterThan(cues[i - 1]!.audioTime)
    }
  })

  // Test 4: Stretch walk basic — crosses the segment boundary at 30s (cue ~27s is out in seg0, cue at 30s is in seg1)
  it('Stretch basic walk crosses segment boundary with correct per-segment phaseDuration', () => {
    // anchor=100, fromCycleIndex=4 (cycle 4 starts at 24s in seg0), fromPhase='out'
    // cycle 4 starts at startSec=0 + 4*6 = 24s; out phase starts at 24+3=27s
    const anchor = 100
    const cues = walkFutureCues({
      audioAnchor: anchor,
      elapsedSec: 27,  // currently at cycle 4 exhale
      fromCycleIndex: 4,
      fromPhase: 'out',
      plan: { bpm: 10, ratio: '50:50', cycleSec: 6, inhaleSec: 3, exhaleSec: 3, totalSec: null },
      segments: stretchSegs,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
    })
    expect(cues.length).toBeGreaterThanOrEqual(LOOKAHEAD_MIN_CUES)
    // First cue: audioTime = anchor + 27, phaseDurationSec from seg0 = 3, kind='out'
    expect(cues[0]).toEqual({ audioTime: anchor + 27, phaseDurationSec: 3, kind: 'out' })
    // Second cue: audioTime = anchor + 30, crosses to seg1 (inhaleSec=4), kind='in'
    expect(cues[1]).toEqual({ audioTime: anchor + 30, phaseDurationSec: 4, kind: 'in' })
    if (cues.length >= 3) {
      // Third cue: audioTime = anchor + 34, seg1 exhaleSec=6, kind='out'
      expect(cues[2]).toEqual({ audioTime: anchor + 34, phaseDurationSec: 6, kind: 'out' })
    }
  })

  // Test 5: Stretch open-ended last segment — continues using final segment's cycleSec
  it('Stretch open-ended last segment: walk uses final segment cycleSec for all further cues', () => {
    const anchor = 200
    const cues = walkFutureCues({
      audioAnchor: anchor,
      elapsedSec: 40,  // deep in the open-ended second segment (startSec=30, Infinity)
      fromCycleIndex: 6,
      fromPhase: 'in',
      plan: { bpm: 6, ratio: '40:60', cycleSec: 10, inhaleSec: 4, exhaleSec: 6, totalSec: null },
      segments: stretchSegs,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
    })
    expect(cues.length).toBeGreaterThanOrEqual(LOOKAHEAD_MIN_CUES)
    // All cues should use seg1 phaseDurations (inhale=4, exhale=6) since we're past startSec=30
    for (const cue of cues) {
      if (cue.kind === 'in') expect(cue.phaseDurationSec).toBe(4)
      else expect(cue.phaseDurationSec).toBe(6)
    }
  })

  // Test 6: targetSec trim — timed session, floor does NOT override D-14
  it('targetSec trim: no cue queued past audioAnchor+targetSec even with floor', () => {
    const anchor = 0
    // 5-min session (targetSec=300), current elapsed=298, window would want 6s ahead
    const cues = walkFutureCues({
      audioAnchor: anchor,
      elapsedSec: 298,
      fromCycleIndex: 49,  // approximate cycle at 298s with cycleSec=6
      fromPhase: 'in',
      plan: { ...hrvPlan, totalSec: 300 },
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
      targetSec: 300,
    })
    // Every cue must have audioTime <= audioAnchor + targetSec
    for (const cue of cues) {
      expect(cue.audioTime).toBeLessThanOrEqual(anchor + 300)
    }
    // D-14: floor does NOT override target — may return fewer than LOOKAHEAD_MIN_CUES
    // The cycle at index 49: audioTimeRelSec = 49*6 = 294 (in), 294+3=297 (out)
    // Next cycle at 300 is exactly at targetSec — may or may not be included but must not exceed
    for (const cue of cues) {
      expect(cue.audioTime).toBeLessThanOrEqual(300)
    }
  })

  // Test 7: targetSec=undefined (open-ended) — no end trim
  it('targetSec=undefined (open-ended): emits up to max(floor,window) cues with no trim', () => {
    const cues = walkFutureCues({
      audioAnchor: 0,
      elapsedSec: 0,
      fromCycleIndex: 0,
      fromPhase: 'in',
      plan: hrvPlan,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
      targetSec: undefined,
    })
    // Should return at least LOOKAHEAD_MIN_CUES cues (open-ended, no trim)
    expect(cues.length).toBeGreaterThanOrEqual(LOOKAHEAD_MIN_CUES)
  })

  // Test 8: empty walk — fromCycleIndex already past targetSec returns []
  it('empty walk: returns [] when start position already past targetSec', () => {
    const cues = walkFutureCues({
      audioAnchor: 0,
      elapsedSec: 310,
      fromCycleIndex: 52,  // 52*6=312 > targetSec=300
      fromPhase: 'in',
      plan: { ...hrvPlan, totalSec: 300 },
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
      targetSec: 300,
    })
    expect(cues).toEqual([])
  })

  // Test 9: Stretch cycleBaseIndex invariant — crossing segment boundary preserves monotonic cycleIndex
  it('Stretch cycleBaseIndex invariant: walk across segment boundaries uses correct activeSeg', () => {
    // Segments: seg0 ends at cycle 5 (cycleBaseIndex=0, 5 cycles total: 0-4),
    //           seg1 starts at cycleBaseIndex=5
    // Walking from cycleIndex=4 (last cycle of seg0) phase='in' to seg1
    const anchor = 50
    const cues = walkFutureCues({
      audioAnchor: anchor,
      elapsedSec: 24,  // cycle 4, inhale (4*6=24)
      fromCycleIndex: 4,
      fromPhase: 'in',
      plan: { bpm: 10, ratio: '50:50', cycleSec: 6, inhaleSec: 3, exhaleSec: 3, totalSec: null },
      segments: stretchSegs,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
    })
    // cycle 4 in: audioTimeRelSec=24, seg0 inhaleSec=3
    expect(cues[0]).toEqual({ audioTime: anchor + 24, phaseDurationSec: 3, kind: 'in' })
    // cycle 4 out: audioTimeRelSec=27, seg0 exhaleSec=3
    expect(cues[1]).toEqual({ audioTime: anchor + 27, phaseDurationSec: 3, kind: 'out' })
    // cycle 5 (seg1): audioTimeRelSec=30, seg1 inhaleSec=4
    if (cues.length >= 3) {
      expect(cues[2]).toEqual({ audioTime: anchor + 30, phaseDurationSec: 4, kind: 'in' })
    }
  })

  // Test 10: constant imports — test uses LOOKAHEAD_WINDOW_SEC and LOOKAHEAD_MIN_CUES symbols
  it('constant imports: LOOKAHEAD_WINDOW_SEC and LOOKAHEAD_MIN_CUES are valid numbers', () => {
    // Per project memory "no-design-locking": test imports symbols, not hard-coded values
    expect(typeof LOOKAHEAD_WINDOW_SEC).toBe('number')
    expect(typeof LOOKAHEAD_MIN_CUES).toBe('number')
    expect(LOOKAHEAD_WINDOW_SEC).toBeGreaterThan(0)
    expect(LOOKAHEAD_MIN_CUES).toBeGreaterThan(0)

    // Verify behavior with the imported constants (no hard-coded 6 or 2)
    const cues = walkFutureCues({
      audioAnchor: 0,
      elapsedSec: 0,
      fromCycleIndex: 0,
      fromPhase: 'in',
      plan: hrvPlan,
      lookaheadWindowSec: LOOKAHEAD_WINDOW_SEC,
      minCues: LOOKAHEAD_MIN_CUES,
    })
    expect(cues.length).toBeGreaterThanOrEqual(LOOKAHEAD_MIN_CUES)
  })
})

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

// src/domain/stretchRamp.ts
//
// Pure-domain ramp engine for BPM Stretch sessions (Phase 22).
// No React, no I/O. Mirrors the sessionMath.ts / breathingPlan.ts pure-function style.
//
// Architecture: piecewise-constant segment table built once at session start.
// Each segment holds a fixed BPM for its duration. getStretchFrame looks up the
// active segment by elapsedSec and computes the frame within that segment.
//
// Phase 50-02 (D-02 ms→sec cascade): every time-shaped identifier in this file
// is seconds (number). Numeric literals use 60 for whole-second computations
// (`60 / bpm` for cycle length, `* 60` for minutes-to-seconds).

import type { StretchSettings } from './settings'
import { RATIO_PARTS } from './settings'
import type { BreathPhase, SessionFrame } from './sessionMath'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StretchStage = 'hold-initial' | 'ramp' | 'hold-target'

/**
 * One piecewise-constant BPM step.
 * cycleBaseIndex = cumulative cycles completed in ALL prior segments (Pitfall 1 —
 * ensures absolute monotonic cycleIndex across the full session).
 */
export interface StretchSegment {
  readonly startSec: number
  readonly endSec: number          // Infinity for the open-ended hold-target segment
  readonly bpm: number
  readonly cycleSec: number
  readonly inhaleSec: number
  readonly exhaleSec: number
  readonly stage: StretchStage
  readonly cycleBaseIndex: number  // cumulative cycles from all prior segments
}

/**
 * Extends SessionFrame with stretch-specific live-state fields.
 * These are undefined for standard sessions (SessionFrame already declares them
 * as optional via sessionMath.ts extension).
 */
export interface StretchSessionFrame extends SessionFrame {
  readonly currentBpm: number
  readonly stage: StretchStage
  readonly cycleStartSec: number     // actual session-elapsed sec when this cycle started
  readonly currentCycleSec: number   // this cycle's duration (seconds)
  readonly currentInhaleSec: number  // this cycle's inhale duration (seconds)
  readonly currentExhaleSec: number  // this cycle's exhale duration (seconds)
}

// ─── buildStretchSegments ─────────────────────────────────────────────────────

/**
 * Builds the piecewise-constant segment table for a stretch session.
 * D-02: accepts a single StretchSettings argument; ratio is read from settings.ratio.
 *
 * Step 1: warm-up hold at initialBpm for warmUpMinutes — snapped to whole cycles so
 *         the boundary lands on an Out→In transition (BPM never steps mid-breath).
 * Step 2: ramp — numSteps = ceil((initialBpm - targetBpm) / 0.4999) segments, linear
 *         BPM step i: bpm_i = initialBpm - i * (initialBpm - targetBpm) / numSteps.
 *         Every ramp step is snapped to whole cycles for the same reason.
 * Step 3: cool-down hold at targetBpm for coolDownMinutes.
 *   - 'open-ended': unbounded final segment (endSec = Infinity); residual-absorption
 *     logic does NOT apply; computeStretchTotalSec returns null.
 *   - bounded numeric coolDownMinutes: the final cool-down segment absorbs the
 *     accumulated cycle-snapping residual from Steps 1–2. Rather than snapping to
 *     whole cycles, its span is set to exactly
 *       requestedTotalSec - cursorSec
 *     where requestedTotalSec = (warmUpMinutes + rampDurationMinutes + coolDownMinutes)
 *     * 60 and cursorSec is the end of the last ramp segment. This makes the
 *     realized session total equal the requested whole-minute total exactly — honoring
 *     the user-facing contract (operator decision, plan 34-10, UAT GAP 1).
 *     The cool-down's cycleSec remains 60 / targetBpm (the true breath-cycle length),
 *     so getStretchFrame's Math.floor(elapsedInSec / cycleSec) phase math is entirely
 *     unchanged — only the cool-down SPAN shifts, not the cycle length.
 *
 * cycleBaseIndex on each segment = running sum of segment cycle counts for all prior
 * segments (Pitfall 1 — absolute cycleIndex never resets).
 */
export function buildStretchSegments(settings: StretchSettings): StretchSegment[] {
  const { initialBpm, targetBpm, warmUpMinutes, coolDownMinutes, rampDurationMinutes } = settings
  // DS-WR-02: this is an exported pure function that does not call validateSettings.
  // A 0, negative, or NaN rampDurationMinutes yields a degenerate or NaN/Infinity
  // segment table. Reject it defensively so the engine never silently produces a
  // poisoned table.
  if (!Number.isFinite(rampDurationMinutes) || rampDurationMinutes <= 0) {
    throw new RangeError('rampDurationMinutes must be a positive finite number')
  }
  // CR-01 defensive guard (mirrors the rampDurationMinutes guard above): the BPM
  // relationship must be validated up front so the engine never silently collapses
  // an inverted or zero-span ramp to one segment via the Math.max(1, …) numSteps
  // floor below (defense-in-depth behind coerceStretchSettings). The !(…<…) form
  // also trips for NaN BPMs.
  if (!(targetBpm < initialBpm)) {
    throw new RangeError('targetBpm must be strictly below initialBpm')
  }
  // D-02: ratio is read from settings.ratio internally
  const ratioParts = RATIO_PARTS[settings.ratio]
  const segments: StretchSegment[] = []
  let cursorSec = 0
  let cumulativeCycles = 0

  function makeSegment(
    bpm: number,
    requestedSec: number,
    stage: StretchStage,
    opts?: { snap?: boolean },
  ): StretchSegment {
    const snap = opts?.snap ?? true
    const cycleSec = 60 / bpm
    const inhaleSec = cycleSec * (ratioParts.inhale / 100)
    const exhaleSec = cycleSec * (ratioParts.exhale / 100)
    const isOpenEnded = requestedSec === Infinity
    // Snap the requested duration to a whole number of cycles so the segment
    // boundary lands on an Out→In transition (mid-cycle BPM-step bug fix).
    // When snap is false (bounded cool-down residual absorption), the requested
    // span is used verbatim — but still floored at one whole cycle so the span
    // can never be zero or negative (WR-01: the snapping residual from prior
    // segments can otherwise exceed the requested cool-down span).
    const cycleCount = isOpenEnded ? 0 : Math.max(1, Math.round(requestedSec / cycleSec))
    const durationSec = isOpenEnded
      ? Infinity
      : snap
        ? cycleCount * cycleSec
        : Math.max(cycleSec, requestedSec)
    const startSec = cursorSec
    const endSec = isOpenEnded ? Infinity : cursorSec + durationSec
    const seg: StretchSegment = {
      startSec,
      endSec,
      bpm,
      cycleSec,
      inhaleSec,
      exhaleSec,
      stage,
      cycleBaseIndex: cumulativeCycles,
    }
    if (!isOpenEnded) {
      cumulativeCycles += cycleCount
      cursorSec += durationSec
    }
    return seg
  }

  // Step 1: warm-up hold at initialBpm (always present — minimum 5 min).
  // Snapped to whole cycles so the warm-up boundary lands on an Out→In transition.
  segments.push(makeSegment(initialBpm, warmUpMinutes * 60, 'hold-initial'))

  // Step 2: ramp — each step is strictly < 0.5 BPM by construction (D-04, STRETCH-04).
  // Every ramp step is also snapped to whole cycles for the same Out→In boundary reason.
  // Math.max(1, …) is a defense-in-depth floor for a legitimate near-zero-span ramp
  // (bpmSpan tiny but positive). The BPM relationship is now validated up front by the
  // CR-01 guard above, so this floor is no longer the primary protection against an
  // inverted or zero-span ramp.
  const bpmSpan = initialBpm - targetBpm
  const numSteps = Math.max(1, Math.ceil(bpmSpan / 0.4999))
  const stepRequestedSec = (rampDurationMinutes * 60) / numSteps

  for (let i = 0; i < numSteps; i++) {
    const stepBpm = initialBpm - i * (bpmSpan / numSteps)
    segments.push(makeSegment(stepBpm, stepRequestedSec, 'ramp'))
  }

  // Step 3: cool-down hold at targetBpm.
  if (coolDownMinutes === 'open-ended') {
    // Open-ended: unbounded final segment — no residual absorption needed.
    segments.push(makeSegment(targetBpm, Infinity, 'hold-target'))
  } else {
    // Bounded cool-down: the final segment absorbs the accumulated cycle-snapping
    // residual from Steps 1–2 so the realized total equals the requested whole-minute
    // total exactly (operator decision — honor the exact total, plan 34-10 UAT GAP 1).
    //
    // The cool-down span is set to requestedTotalSec - cursorSec rather than being
    // snapped to a whole number of targetBpm cycles. This is produced through
    // makeSegment with { snap: false } so the segment shape, cycleSec/inhaleSec/
    // exhaleSec ratio math, and cursorSec/cumulativeCycles bookkeeping all stay
    // owned by a single code path (WR-03 — no hand-rolled duplicate of makeSegment).
    //
    // makeSegment's snap:false branch floors the span at one whole cycle
    // (Math.max(cycleSec, requestedSec)) so the cool-down span can never be zero or
    // negative even when the upward snapping residual from prior segments exceeds
    // the requested cool-down span (WR-01). The cycleSec field retains the true
    // breath-cycle length (60 / targetBpm) so getStretchFrame's
    //   Math.floor(elapsedInSec / cycleSec)
    // phase math is completely unchanged — only the span shifts; the cycle length does not.
    //
    // Pitfall-1 invariant: cycleBaseIndex = cumulativeCycles (the running total from
    // all prior segments) keeps the absolute monotonic cycleIndex intact.
    const requestedTotalSec = (warmUpMinutes + rampDurationMinutes + coolDownMinutes) * 60
    segments.push(makeSegment(targetBpm, requestedTotalSec - cursorSec, 'hold-target', { snap: false }))
  }

  return segments
}

// ─── getStretchFrame ──────────────────────────────────────────────────────────

/**
 * Computes the session frame at elapsedSec for a stretch session.
 *
 * Mirrors getSessionFrame in structure but uses the piecewise segment table
 * to handle variable cycle lengths. cycleIndex is absolute (session-global
 * monotonic) — never resets at segment boundaries (Pitfall 1).
 *
 * The session's true end is the last segment's endSec — buildStretchSegments
 * already snapped every segment to a whole cycle boundary, so completion and
 * remaining time are read straight off the table. An open-ended cool-down has
 * endSec = Infinity → remainingSec null, isComplete always false.
 */
export function getStretchFrame(
  segments: StretchSegment[],
  elapsedSec: number,
): StretchSessionFrame {
  const finalSegment = segments.at(-1)
  if (finalSegment === undefined) {
    throw new RangeError('getStretchFrame requires a non-empty segments array')
  }
  const safeElapsedSec = Math.max(0, elapsedSec)

  // Find the active segment (linear walk; open-ended last segment catches all remaining).
  // finalSegment is the fallback when safeElapsedSec lands at or past every segment's endSec.
  let activeSeg: StretchSegment = finalSegment
  for (const seg of segments) {
    if (safeElapsedSec < seg.endSec) {
      activeSeg = seg
      break
    }
  }

  // DS-WR-03 (narrowed): when safeElapsedSec lands exactly on the last bounded
  // segment's endSec, no segment satisfies `safeElapsedSec < seg.endSec` and
  // `activeSeg` falls through to that final segment. An unclamped
  // `elapsedInSec` would then equal the full segment span, making
  // `cycleInSegment` compute exactly `cycleCount` — one past the last valid
  // index — and the completion frame would carry a phantom extra in-phase
  // cycle. The clamp guards ONLY that exact-endSec landing: the ceiling is
  // 0.001 sec inside the segment span (CLAMP_EPSILON_SEC — same physical
  // quantity as the prior 1 ms guard). For any elapsed value strictly below
  // endSec, rawElapsedInSec < segmentSpan, so the clamp has no effect and the
  // frame advances freely through the entire final cycle (including the last
  // exhale). Only when elapsed lands exactly on endSec is rawElapsedInSec
  // nudged 1 ms below the boundary, keeping
  // Math.floor(elapsedInSec / cycleSec) on the last real cycle index.
  // This matches HRV's getSessionFrame: no mid-cycle freeze; animation and
  // countdown complete together. The open-ended segment (endSec === Infinity)
  // is left unclamped — CLAMP_EPSILON_SEC is never relevant there.
  const CLAMP_EPSILON_SEC = 0.001 // 1 ms pull-back guards only the exact endSec landing
  const rawElapsedInSec = safeElapsedSec - activeSeg.startSec
  const elapsedInSec =
    activeSeg.endSec === Infinity
      ? rawElapsedInSec
      : Math.min(rawElapsedInSec, activeSeg.endSec - activeSeg.startSec - CLAMP_EPSILON_SEC)
  const cycleInSegment = Math.floor(elapsedInSec / activeSeg.cycleSec)
  const absoluteCycleIndex = activeSeg.cycleBaseIndex + cycleInSegment
  const cycleStartSec = activeSeg.startSec + cycleInSegment * activeSeg.cycleSec

  // Phase within cycle
  const cycleElapsedSec = elapsedInSec - cycleInSegment * activeSeg.cycleSec
  const isInPhase = cycleElapsedSec < activeSeg.inhaleSec
  const phaseElapsedSec = isInPhase ? cycleElapsedSec : cycleElapsedSec - activeSeg.inhaleSec
  const phaseDurationSec = isInPhase ? activeSeg.inhaleSec : activeSeg.exhaleSec
  // WR-02: after the 34-10 residual-absorption rework the bounded cool-down span
  // is no longer a whole-cycle multiple, so the final cycle in that segment is a
  // partial cycle. If it ends mid-out-phase, phaseElapsedSec can exceed exhaleSec,
  // pushing the raw ratio above 1.0 for elapsed values just below endSec. Clamp to
  // [0, 1] so shape interpolation never receives an
  // out-of-range progress value.
  const rawProgress = phaseDurationSec === 0 ? 0 : phaseElapsedSec / phaseDurationSec
  const phaseProgress = Math.min(1, Math.max(0, rawProgress))
  const phase: BreathPhase = isInPhase ? 'in' : 'out'

  // Remaining and completion derive from the segment table's true end —
  // the last segment's endSec (already cycle-aligned; Infinity → open-ended).
  const sessionEndSec = finalSegment.endSec
  const remainingSec = sessionEndSec === Infinity ? null : Math.max(0, sessionEndSec - safeElapsedSec)
  const isComplete = sessionEndSec !== Infinity && safeElapsedSec >= sessionEndSec

  return {
    phase,
    phaseLabel: isInPhase ? 'In' : 'Out',
    elapsedSec: safeElapsedSec,
    remainingSec,
    phaseProgress,
    cycleIndex: absoluteCycleIndex,
    isComplete,
    // Stretch-specific fields
    currentBpm: activeSeg.bpm,
    stage: activeSeg.stage,
    cycleStartSec,
    currentCycleSec: activeSeg.cycleSec,
    currentInhaleSec: activeSeg.inhaleSec,
    currentExhaleSec: activeSeg.exhaleSec,
  }
}

// ─── computeStretchTotalSec ──────────────────────────────────────────────────

/**
 * Computes the total session duration from the snapped segment table produced
 * by buildStretchSegments. Returns the last segment's endSec — the same source
 * of truth that getStretchFrame's isComplete check uses — so the displayed
 * Duration agrees with the elapsed time at which the session reports complete.
 * Returns null when coolDownMinutes is 'open-ended' (D-11).
 * D-02: accepts StretchSettings (not SessionSettings).
 */
export function computeStretchTotalSec(settings: StretchSettings): number | null {
  if (settings.coolDownMinutes === 'open-ended') return null
  const segments = buildStretchSegments(settings)
  const finalSegment = segments.at(-1)
  if (finalSegment === undefined) {
    throw new Error('buildStretchSegments returned no segments')
  }
  return finalSegment.endSec
}

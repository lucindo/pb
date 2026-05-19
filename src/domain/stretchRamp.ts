// src/domain/stretchRamp.ts
//
// Pure-domain ramp engine for BPM Stretch sessions (Phase 22).
// No React, no I/O. Mirrors the sessionMath.ts / breathingPlan.ts pure-function style.
//
// Architecture: piecewise-constant segment table built once at session start.
// Each segment holds a fixed BPM for its duration. getStretchFrame looks up the
// active segment by elapsedMs and computes the frame within that segment.

import type { StretchSettings } from './settings'
import type { BreathPhase, SessionFrame } from './sessionMath'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StretchStage = 'hold-initial' | 'ramp' | 'hold-target'

/**
 * One piecewise-constant BPM step.
 * cycleBaseIndex = cumulative cycles completed in ALL prior segments (Pitfall 1 —
 * ensures absolute monotonic cycleIndex across the full session).
 */
export interface StretchSegment {
  startMs: number
  endMs: number           // Infinity for the open-ended hold-target segment
  bpm: number
  cycleMs: number
  inhaleMs: number
  exhaleMs: number
  stage: StretchStage
  cycleBaseIndex: number  // cumulative cycles from all prior segments
}

/**
 * Extends SessionFrame with stretch-specific live-state fields.
 * These are undefined for standard sessions (SessionFrame already declares them
 * as optional via sessionMath.ts extension).
 */
export interface StretchSessionFrame extends SessionFrame {
  currentBpm: number
  stage: StretchStage
  cycleStartMs: number      // actual session-elapsed ms when this cycle started
  currentCycleMs: number    // this cycle's duration
  currentInhaleMs: number   // this cycle's inhale duration
  currentExhaleMs: number   // this cycle's exhale duration
}

// ─── Ratio table (mirroring breathingPlan.ts) ──────────────────────────────

import type { RatioLabel } from './settings'

const RATIO_PARTS: Record<RatioLabel, { inhale: number; exhale: number }> = {
  '50:50': { inhale: 50, exhale: 50 },
  '40:60': { inhale: 40, exhale: 60 },
  '30:70': { inhale: 30, exhale: 70 },
  '20:80': { inhale: 20, exhale: 80 },
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
 *   - 'open-ended': unbounded final segment (endMs = Infinity); residual-absorption
 *     logic does NOT apply; computeStretchTotalMs returns null.
 *   - bounded numeric coolDownMinutes: the final cool-down segment absorbs the
 *     accumulated cycle-snapping residual from Steps 1–2. Rather than snapping to
 *     whole cycles, its span is set to exactly
 *       requestedTotalMs - cursorMs
 *     where requestedTotalMs = (warmUpMinutes + rampDurationMinutes + coolDownMinutes)
 *     * 60_000 and cursorMs is the end of the last ramp segment. This makes the
 *     realized session total equal the requested whole-minute total exactly — honoring
 *     the user-facing contract (operator decision, plan 34-10, UAT GAP 1).
 *     The cool-down's cycleMs remains 60_000 / targetBpm (the true breath-cycle length),
 *     so getStretchFrame's Math.floor(elapsedInSegment / cycleMs) phase math is entirely
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
  let cursorMs = 0
  let cumulativeCycles = 0

  function makeSegment(bpm: number, requestedMs: number, stage: StretchStage): StretchSegment {
    const cycleMs = 60_000 / bpm
    const inhaleMs = cycleMs * (ratioParts.inhale / 100)
    const exhaleMs = cycleMs * (ratioParts.exhale / 100)
    const isOpenEnded = requestedMs === Infinity
    // Snap the requested duration to a whole number of cycles so the segment
    // boundary lands on an Out→In transition (mid-cycle BPM-step bug fix).
    const cycleCount = isOpenEnded ? 0 : Math.max(1, Math.round(requestedMs / cycleMs))
    const durationMs = isOpenEnded ? Infinity : cycleCount * cycleMs
    const startMs = cursorMs
    const endMs = isOpenEnded ? Infinity : cursorMs + durationMs
    const seg: StretchSegment = {
      startMs,
      endMs,
      bpm,
      cycleMs,
      inhaleMs,
      exhaleMs,
      stage,
      cycleBaseIndex: cumulativeCycles,
    }
    if (!isOpenEnded) {
      cumulativeCycles += cycleCount
      cursorMs += durationMs
    }
    return seg
  }

  // Step 1: warm-up hold at initialBpm (always present — minimum 5 min).
  // Snapped to whole cycles so the warm-up boundary lands on an Out→In transition.
  segments.push(makeSegment(initialBpm, warmUpMinutes * 60_000, 'hold-initial'))

  // Step 2: ramp — each step is strictly < 0.5 BPM by construction (D-04, STRETCH-04).
  // Every ramp step is also snapped to whole cycles for the same Out→In boundary reason.
  // Math.max(1, …) is a defense-in-depth floor for a legitimate near-zero-span ramp
  // (bpmSpan tiny but positive). The BPM relationship is now validated up front by the
  // CR-01 guard above, so this floor is no longer the primary protection against an
  // inverted or zero-span ramp.
  const bpmSpan = initialBpm - targetBpm
  const numSteps = Math.max(1, Math.ceil(bpmSpan / 0.4999))
  const stepRequestedMs = (rampDurationMinutes * 60_000) / numSteps

  for (let i = 0; i < numSteps; i++) {
    const stepBpm = initialBpm - i * (bpmSpan / numSteps)
    segments.push(makeSegment(stepBpm, stepRequestedMs, 'ramp'))
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
    // The cool-down span is set directly to requestedTotalMs - cursorMs rather than
    // being snapped to a whole number of targetBpm cycles. The cycleMs field retains
    // the true breath-cycle length (60_000 / targetBpm) so that getStretchFrame's
    //   Math.floor(elapsedInSegment / cycleMs)
    // phase math is completely unchanged — only the span shifts; the cycle length does not.
    //
    // Pitfall-1 invariant: cycleBaseIndex = cumulativeCycles (the running total from
    // all prior segments) keeps the absolute monotonic cycleIndex intact.
    const requestedTotalMs = (warmUpMinutes + rampDurationMinutes + coolDownMinutes) * 60_000
    const cycleMs = 60_000 / targetBpm
    const inhaleMs = cycleMs * (ratioParts.inhale / 100)
    const exhaleMs = cycleMs * (ratioParts.exhale / 100)
    const startMs = cursorMs
    const endMs = requestedTotalMs
    segments.push({
      startMs,
      endMs,
      bpm: targetBpm,
      cycleMs,
      inhaleMs,
      exhaleMs,
      stage: 'hold-target',
      cycleBaseIndex: cumulativeCycles,
    })
    // Note: cursorMs and cumulativeCycles are not updated after the final segment
    // (no further segments follow). The cycleBaseIndex is already set from the
    // running cumulativeCycles total.
  }

  return segments
}

// ─── getStretchFrame ──────────────────────────────────────────────────────────

/**
 * Computes the session frame at elapsedMs for a stretch session.
 *
 * Mirrors getSessionFrame in structure but uses the piecewise segment table
 * to handle variable cycle lengths. cycleIndex is absolute (session-global
 * monotonic) — never resets at segment boundaries (Pitfall 1).
 *
 * The session's true end is the last segment's endMs — buildStretchSegments
 * already snapped every segment to a whole cycle boundary, so completion and
 * remaining time are read straight off the table. An open-ended cool-down has
 * endMs = Infinity → remainingMs null, isComplete always false.
 */
export function getStretchFrame(
  segments: StretchSegment[],
  elapsedMs: number,
): StretchSessionFrame {
  const safeElapsedMs = Math.max(0, elapsedMs)

  // Find the active segment (linear walk; open-ended last segment catches all remaining)
  let activeSeg = segments[segments.length - 1] as StretchSegment
  for (const seg of segments) {
    if (safeElapsedMs < seg.endMs) {
      activeSeg = seg
      break
    }
  }

  // DS-WR-03 (narrowed): when safeElapsedMs lands exactly on the last bounded
  // segment's endMs, no segment satisfies `safeElapsedMs < seg.endMs` and
  // `activeSeg` falls through to that final segment. An unclamped
  // `elapsedInSegment` would then equal the full segment span, making
  // `cycleInSegment` compute exactly `cycleCount` — one past the last valid
  // index — and the completion frame would carry a phantom extra in-phase
  // cycle. The clamp guards ONLY that exact-endMs landing: the ceiling is
  // 1 ms inside the segment span (CLAMP_EPSILON_MS). For any elapsed value
  // strictly below endMs, rawElapsedInSegment < segmentSpan, so the clamp
  // has no effect and the frame advances freely through the entire final cycle
  // (including the last exhale). Only when elapsed lands exactly on endMs is
  // rawElapsedInSegment nudged 1 ms below the boundary, keeping
  // Math.floor(elapsedInSegment / cycleMs) on the last real cycle index.
  // This matches HRV's getSessionFrame: no mid-cycle freeze; animation and
  // countdown complete together. The open-ended segment (endMs === Infinity)
  // is left unclamped — CLAMP_EPSILON_MS is never relevant there.
  const CLAMP_EPSILON_MS = 1 // 1 ms pull-back guards only the exact endMs landing
  const rawElapsedInSegment = safeElapsedMs - activeSeg.startMs
  const elapsedInSegment =
    activeSeg.endMs === Infinity
      ? rawElapsedInSegment
      : Math.min(rawElapsedInSegment, activeSeg.endMs - activeSeg.startMs - CLAMP_EPSILON_MS)
  const cycleInSegment = Math.floor(elapsedInSegment / activeSeg.cycleMs)
  const absoluteCycleIndex = activeSeg.cycleBaseIndex + cycleInSegment
  const cycleStartMs = activeSeg.startMs + cycleInSegment * activeSeg.cycleMs

  // Phase within cycle
  const cycleElapsedMs = elapsedInSegment - cycleInSegment * activeSeg.cycleMs
  const isInPhase = cycleElapsedMs < activeSeg.inhaleMs
  const phaseElapsedMs = isInPhase ? cycleElapsedMs : cycleElapsedMs - activeSeg.inhaleMs
  const phaseDurationMs = isInPhase ? activeSeg.inhaleMs : activeSeg.exhaleMs
  const phaseProgress = phaseDurationMs === 0 ? 0 : phaseElapsedMs / phaseDurationMs
  const phase: BreathPhase = isInPhase ? 'in' : 'out'

  // Remaining and completion derive from the segment table's true end —
  // the last segment's endMs (already cycle-aligned; Infinity → open-ended).
  const sessionEndMs = (segments[segments.length - 1] as StretchSegment).endMs
  const remainingMs = sessionEndMs === Infinity ? null : Math.max(0, sessionEndMs - safeElapsedMs)
  const isComplete = sessionEndMs !== Infinity && safeElapsedMs >= sessionEndMs

  return {
    phase,
    phaseLabel: isInPhase ? 'In' : 'Out',
    elapsedMs: safeElapsedMs,
    remainingMs,
    phaseProgress,
    cycleIndex: absoluteCycleIndex,
    isComplete,
    // Stretch-specific fields
    currentBpm: activeSeg.bpm,
    stage: activeSeg.stage,
    cycleStartMs,
    currentCycleMs: activeSeg.cycleMs,
    currentInhaleMs: activeSeg.inhaleMs,
    currentExhaleMs: activeSeg.exhaleMs,
  }
}

// ─── computeStretchTotalMs ───────────────────────────────────────────────────

/**
 * Computes the total session duration from the snapped segment table produced
 * by buildStretchSegments. Returns the last segment's endMs — the same source
 * of truth that getStretchFrame's isComplete check uses — so the displayed
 * Duration agrees with the elapsed time at which the session reports complete.
 * Returns null when coolDownMinutes is 'open-ended' (D-11).
 * D-02: accepts StretchSettings (not SessionSettings).
 */
export function computeStretchTotalMs(settings: StretchSettings): number | null {
  if (settings.coolDownMinutes === 'open-ended') return null
  const segments = buildStretchSegments(settings)
  return segments[segments.length - 1]!.endMs
}

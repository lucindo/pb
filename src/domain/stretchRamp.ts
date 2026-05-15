// src/domain/stretchRamp.ts
//
// Pure-domain ramp engine for BPM Stretch sessions (Phase 22).
// No React, no I/O. Mirrors the sessionMath.ts / breathingPlan.ts pure-function style.
//
// Architecture: piecewise-constant segment table built once at session start.
// Each segment holds a fixed BPM for its duration. getStretchFrame looks up the
// active segment by elapsedMs and computes the frame within that segment.

import type { RatioLabel, SessionSettings } from './settings'
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

const RATIO_PARTS: Record<RatioLabel, { inhale: number; exhale: number }> = {
  '50:50': { inhale: 50, exhale: 50 },
  '40:60': { inhale: 40, exhale: 60 },
  '30:70': { inhale: 30, exhale: 70 },
  '20:80': { inhale: 20, exhale: 80 },
}

// ─── buildStretchSegments ─────────────────────────────────────────────────────

/**
 * Builds the piecewise-constant segment table for a stretch session.
 *
 * Step 1: warm-up hold at initialBpm for warmUpMinutes
 * Step 2: ramp — numSteps = ceil((initialBpm - targetBpm) / 0.4999) segments, linear BPM
 *          step i: bpm_i = initialBpm - i * (initialBpm - targetBpm) / numSteps
 * Step 3: cool-down hold at targetBpm for coolDownMinutes ('open-ended' → endMs = Infinity)
 *
 * Every segment's duration is snapped to a WHOLE number of that segment's cycles, so
 * each segment boundary lands exactly on a cycle boundary (an Out→In transition). This
 * guarantees the BPM only ever steps between cycles — never mid-inhale or mid-exhale.
 *
 * cycleBaseIndex on each segment = running sum of segment cycle counts for all prior
 * segments (Pitfall 1 — absolute cycleIndex never resets).
 */
export function buildStretchSegments(settings: SessionSettings, ratio: RatioLabel): StretchSegment[] {
  const { initialBpm, targetBpm, warmUpMinutes, coolDownMinutes, rampDurationMinutes } = settings
  const ratioParts = RATIO_PARTS[ratio]
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

  // Step 1: warm-up hold at initialBpm (always present — minimum 5 min)
  segments.push(makeSegment(initialBpm, warmUpMinutes * 60_000, 'hold-initial'))

  // Step 2: ramp — each step is strictly < 0.5 BPM by construction (D-04, STRETCH-04).
  // Math.max(1, …) guards a degenerate initialBpm === targetBpm call (validateSettings
  // rejects it upstream, but the engine must not divide by a zero step count).
  const bpmSpan = initialBpm - targetBpm
  const numSteps = Math.max(1, Math.ceil(bpmSpan / 0.4999))
  const stepRequestedMs = (rampDurationMinutes * 60_000) / numSteps

  for (let i = 0; i < numSteps; i++) {
    const stepBpm = initialBpm - i * (bpmSpan / numSteps)
    segments.push(makeSegment(stepBpm, stepRequestedMs, 'ramp'))
  }

  // Step 3: cool-down hold at targetBpm ('open-ended' → unbounded final segment)
  const coolDownMs = coolDownMinutes === 'open-ended' ? Infinity : coolDownMinutes * 60_000
  segments.push(makeSegment(targetBpm, coolDownMs, 'hold-target'))

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

  const elapsedInSegment = safeElapsedMs - activeSeg.startMs
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
 * Computes the total session duration from stretch settings: the sum of
 * warm-up + ramp + cool-down minutes. Returns null when coolDownMinutes is
 * 'open-ended' (D-11).
 */
export function computeStretchTotalMs(settings: SessionSettings): number | null {
  const { warmUpMinutes, rampDurationMinutes, coolDownMinutes } = settings
  if (coolDownMinutes === 'open-ended') return null
  return (warmUpMinutes + rampDurationMinutes + coolDownMinutes) * 60_000
}

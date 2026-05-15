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

// ─── Constants ────────────────────────────────────────────────────────────────

/** D-10: minimum stretch session total before the gate clears (15 minutes). */
export const STRETCH_MIN_TOTAL_MS = 15 * 60_000

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
 * Step 1: optional hold-initial segment at initialBpm (omitted if holdInitialSeconds === 0)
 * Step 2: ramp — numSteps = ceil((initialBpm - targetBpm) / 0.4999) segments, linear BPM
 *          step i: bpm_i = initialBpm - i * (initialBpm - targetBpm) / numSteps
 * Step 3: optional hold-target segment (omitted if holdTargetSeconds === 0; open-ended → endMs = Infinity)
 *
 * cycleBaseIndex on each segment = running sum of floor(segmentDuration / cycleMs) for all prior
 * segments (Pitfall 1 — absolute cycleIndex never resets).
 */
export function buildStretchSegments(settings: SessionSettings, ratio: RatioLabel): StretchSegment[] {
  const { initialBpm, targetBpm, holdInitialSeconds, holdTargetSeconds, rampDurationMinutes } = settings
  const ratioParts = RATIO_PARTS[ratio]
  const segments: StretchSegment[] = []
  let cursorMs = 0
  let cumulativeCycles = 0

  function makeSegment(bpm: number, durationMs: number, stage: StretchStage): StretchSegment {
    const cycleMs = 60_000 / bpm
    const inhaleMs = cycleMs * (ratioParts.inhale / 100)
    const exhaleMs = cycleMs * (ratioParts.exhale / 100)
    const startMs = cursorMs
    const endMs = durationMs === Infinity ? Infinity : cursorMs + durationMs
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
    if (durationMs !== Infinity) {
      cumulativeCycles += Math.floor(durationMs / cycleMs)
      cursorMs += durationMs
    }
    return seg
  }

  // Step 1: hold-initial (skip if 0)
  if (holdInitialSeconds > 0) {
    segments.push(makeSegment(initialBpm, holdInitialSeconds * 1_000, 'hold-initial'))
  }

  // Step 2: ramp
  // Each step is strictly < 0.5 BPM by construction (D-04, STRETCH-04)
  const bpmSpan = initialBpm - targetBpm
  const numSteps = Math.ceil(bpmSpan / 0.4999)
  const stepDurationMs = (rampDurationMinutes * 60_000) / numSteps

  for (let i = 0; i < numSteps; i++) {
    const stepBpm = initialBpm - i * (bpmSpan / numSteps)
    segments.push(makeSegment(stepBpm, stepDurationMs, 'ramp'))
  }

  // Step 3: hold-target (skip if 0)
  if (holdTargetSeconds !== 0) {
    const isOpenEnded = holdTargetSeconds === 'open-ended'
    const durationMs = isOpenEnded ? Infinity : holdTargetSeconds * 1_000
    segments.push(makeSegment(targetBpm, durationMs, 'hold-target'))
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
 * completionMs uses the LAST segment's cycleMs for rounding (Pitfall 3).
 * For open-ended sessions (totalMs === null), isComplete is always false.
 */
export function getStretchFrame(
  segments: StretchSegment[],
  totalMs: number | null,
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

  // Remaining and completion (Pitfall 3: use last segment's cycleMs for rounding)
  const remainingMs = totalMs === null ? null : Math.max(0, totalMs - safeElapsedMs)

  let completionMs: number | null = null
  if (totalMs !== null) {
    const lastSeg = segments[segments.length - 1] as StretchSegment
    // Round totalMs up to the next cycle boundary of the last segment
    completionMs = lastSeg.startMs + Math.ceil((totalMs - lastSeg.startMs) / lastSeg.cycleMs) * lastSeg.cycleMs
  }

  const isComplete = completionMs !== null && safeElapsedMs >= completionMs

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
 * Computes the total session duration from stretch settings.
 * Returns null when holdTargetSeconds is 'open-ended' (D-11).
 */
export function computeStretchTotalMs(settings: SessionSettings): number | null {
  const { holdInitialSeconds, rampDurationMinutes, holdTargetSeconds } = settings
  if (holdTargetSeconds === 'open-ended') return null
  return holdInitialSeconds * 1_000 + rampDurationMinutes * 60_000 + holdTargetSeconds * 1_000
}

// ─── isStretchGateClear ───────────────────────────────────────────────────────

/**
 * Returns true when the computed stretch total >= STRETCH_MIN_TOTAL_MS (15 min),
 * or when holdTargetSeconds is 'open-ended' (infinite → always clears gate).
 * D-09/D-10/D-11.
 */
export function isStretchGateClear(settings: SessionSettings): boolean {
  const total = computeStretchTotalMs(settings)
  return total === null || total >= STRETCH_MIN_TOTAL_MS
}

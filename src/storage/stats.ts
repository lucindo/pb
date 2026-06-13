// src/storage/stats.ts
//
// Persisted-stats shape (PersistedStats / ZERO_STATS) and per-field, non-throwing
// coercion (coerceStats). Recording + reset live in the per-practice slices in
// practices.ts; this module holds only the shape and validation they share.

import { asRecord } from './storage'

export const COUNT_THRESHOLD_MS = 30_000  // count threshold: 30 s or completion

export interface PersistedStats {
  totalSessions: number
  totalElapsedSeconds: number
  lastSessionAtMs: number | null
  lastSessionDurationSeconds: number | null
  // Optional — only Navi Kriya sessions write this field; resonant always writes
  // undefined. Omitting it from ZERO_STATS is intentional — the optional field
  // may be absent and coerceStats returns undefined (not 0) so an existing
  // resonant stats record stays byte-shaped as before (backward-compatible).
  roundsCompleted?: number | undefined
}

// Exported so reset flows can update React state optimistically (without
// re-reading from disk) when the user confirms reset. If the disk write silently
// fails (quota / Safari ITP / private mode), the RAM state must STILL reflect
// the user's intent — otherwise the footer keeps showing the old stats and the
// user thinks the button is broken.
export const ZERO_STATS: PersistedStats = {
  totalSessions: 0,
  totalElapsedSeconds: 0,
  lastSessionAtMs: null,
  lastSessionDurationSeconds: null,
}

// lastSessionAtMs uses the looser finite-non-negative-number check (no
// Number.isInteger) so a fractional now() injection survives a coerceStats
// round trip. Tests may use performance.now() (sub-ms floats) — the integer-only
// check would silently coerce fractional timestamps to null, breaking the
// record -> coerce round-trip invariant.
//
// totalSessions and totalElapsedSeconds keep the integer check — those fields
// are genuinely integer-only (count + floor(ms/1000) seconds).
function isFiniteNonNegativeNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}

function isFiniteNonNegativeInt(v: unknown): v is number {
  return isFiniteNonNegativeNumber(v) && Number.isInteger(v)
}

function isFiniteNonNegativeNumberOrNull(v: unknown): v is number | null {
  return v === null || isFiniteNonNegativeNumber(v)
}

// lastSessionDurationSeconds is produced by the SAME Math.floor(ms/1000)
// integer expression as totalElapsedSeconds, so it must use the same integer
// predicate — otherwise an asymmetry lets one field survive a fractional value
// while the other coerces to 0 (partial data loss). Only the genuine timestamp
// lastSessionAtMs keeps the float-tolerant check.
function isFiniteNonNegativeIntOrNull(v: unknown): v is number | null {
  return v === null || isFiniteNonNegativeInt(v)
}

export function coerceStats(raw: unknown): PersistedStats {
  const r = asRecord(raw)
  return {
    totalSessions:              isFiniteNonNegativeInt(r.totalSessions)                 ? r.totalSessions             : 0,
    totalElapsedSeconds:        isFiniteNonNegativeInt(r.totalElapsedSeconds)           ? r.totalElapsedSeconds       : 0,
    lastSessionAtMs:            isFiniteNonNegativeNumberOrNull(r.lastSessionAtMs)      ? r.lastSessionAtMs           : null,
    lastSessionDurationSeconds: isFiniteNonNegativeIntOrNull(r.lastSessionDurationSeconds) ? r.lastSessionDurationSeconds : null,
    // validate roundsCompleted — a corrupted value coerces to undefined (not 0)
    // so the field stays absent for resonant records and only appears for NK
    // records that actually wrote it. Per-field non-throwing coercion (ASVS V5).
    //
    // roundsCompleted is preserved for ANY input that has a valid value, including
    // a resonant or stretch slot that "shouldn't" have it. recordResonantSession /
    // recordStretchSession never spread ...stats, so resonant and stretch slots
    // never carry this field on disk in practice. A hand-edited fixture or a future
    // caller that bypasses the write helpers could surface this field on a non-NK
    // slot; consumers MUST NOT rely on it being absent for resonant/stretch.
    roundsCompleted:            isFiniteNonNegativeInt(r.roundsCompleted) ? r.roundsCompleted : undefined,
  }
}

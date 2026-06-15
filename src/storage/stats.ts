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
  }
}

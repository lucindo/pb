// src/storage/stats.ts
//
// Persisted-stats shape (PersistedStats / ZERO_STATS), per-field non-throwing
// coercion (coerceStats), and the session record/reset writes against the flat
// envelope `stats` field.

import { asRecord, readEnvelope, writeEnvelope, type StorageDeps } from './storage'

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

export function loadStats(deps: StorageDeps = {}): PersistedStats {
  return coerceStats(readEnvelope(deps).stats)
}

// Records a completed/early-ended session into the envelope's stats and returns
// the IN-MEMORY projection. writeEnvelope is fire-and-forget (quota / ITP /
// private mode / future-version short-circuit all silently swallow the write);
// callers treat the return as RAM-authoritative — UI updates immediately.
export function recordPatternBreathingSession(
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  const env = readEnvelope(deps)
  const stats = coerceStats(env.stats)
  // Reject NaN/Infinity/negative elapsedMs up front so a bad frame cannot
  // poison totalElapsedSeconds.
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return stats
  }
  // Count if elapsed >= 30s OR isComplete (completion bypasses threshold).
  if (!isComplete && elapsedMs < COUNT_THRESHOLD_MS) {
    return stats
  }
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const now = deps.now ?? Date.now
  const next: PersistedStats = {
    totalSessions: stats.totalSessions + 1,
    totalElapsedSeconds: stats.totalElapsedSeconds + elapsedSeconds,
    lastSessionAtMs: now(),
    lastSessionDurationSeconds: elapsedSeconds,
  }
  writeEnvelope({ ...env, stats: next }, deps)
  return next
}

// Wipes stats back to zero. Fire-and-forget write — callers treat their
// optimistic ZERO update as RAM-authoritative.
export function resetStats(deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, stats: { ...ZERO_STATS } }, deps)
}

// src/storage/stats.ts
//
// Stats aggregator:
//   - count when elapsed >= 30s OR isComplete
//   - aggregate actual elapsed in seconds
//   - reset wipes ONLY stats (settings + mute survive)
//   - now() injected for deterministic testing

import { asRecord, readEnvelope, writeEnvelope, type StorageDeps } from './storage'

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
  roundsCompleted?: number
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

function isFiniteNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && Number.isInteger(v)
}

// lastSessionAtMs uses the looser finite-non-negative-number check (no
// Number.isInteger) so a fractional now() injection survives the round trip.
// Tests may use performance.now() (sub-ms floats) — the integer-only check
// would silently coerce fractional timestamps to null on the next loadStats(),
// breaking the recordSession -> loadStats round-trip invariant.
//
// totalSessions and totalElapsedSeconds keep the integer check — those fields
// are genuinely integer-only (count + floor(ms/1000) seconds).
function isFiniteNonNegativeNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
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

export function loadStats(deps: StorageDeps = {}): PersistedStats {
  return coerceStats(readEnvelope(deps).stats)
}

/**
 * Records a session and returns the IN-MEMORY projection of stats.
 *
 * The returned value is what stats SHOULD BE after the write, not proof that
 * the write succeeded. writeEnvelope is fire-and-forget (quota / ITP / private
 * mode / future-version short-circuit all silently swallow the write). Callers
 * treat the return as RAM-authoritative — UI updates immediately, and a
 * subsequent loadStats may return a different value if the disk write failed.
 *
 * If a caller needs to know whether disk reflects RAM, it must re-read via
 * loadStats and compare; that pattern is not currently required anywhere in
 * the app.
 */
export function recordSession(
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  // Single envelope read: collapsing two reads (one from loadStats, one before
  // write) into one closes the in-tab cross-tab race window where a second tab
  // could write between them. Cross-tab concurrent ends still lose one increment
  // — the storage-event listener in App.tsx handles UI consistency for that case.
  const env = readEnvelope(deps)
  const stats = coerceStats(env.stats)
  // Reject NaN/Infinity/negative elapsedMs up front. `elapsedMs <
  // COUNT_THRESHOLD_MS` is `false` for NaN/Infinity, so a bad frame would
  // otherwise fall through, count, and poison totalElapsedSeconds —
  // which the next loadStats() silently coerces to 0, losing the entire
  // cumulative total. Return stats unchanged on a bad reading.
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

export function resetStats(deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  // Wipe ONLY the stats subtree. Settings + mute survive.
  writeEnvelope({ ...env, stats: { ...ZERO_STATS } }, deps)
}

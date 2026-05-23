// src/storage/stats.ts
//
// Phase 4 D-01/D-02/D-11/D-18: stats aggregator.
//   - D-01: count when elapsed >= 30s OR isComplete
//   - D-02: aggregate actual elapsed in seconds
//   - D-11: reset wipes ONLY stats (settings + mute survive)
//   - D-18: now() injected for deterministic testing

import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'

export const COUNT_THRESHOLD_MS = 30_000  // D-01

export interface PersistedStats {
  totalSessions: number
  totalElapsedSeconds: number
  lastSessionAtMs: number | null
  lastSessionDurationSeconds: number | null
  // NK-08: optional — only Navi Kriya sessions write this field; resonant always
  // writes undefined. Omitting it from ZERO_STATS is intentional — the optional
  // field may be absent and coerceStats returns undefined (not 0) so an existing
  // resonant stats record stays byte-shaped as before (backward-compatible).
  roundsCompleted?: number
}

// WR-08: exported so reset flows can update React state optimistically
// (without re-reading from disk) when the user confirms reset. If the disk
// write silently fails (D-16 quota / Safari ITP / private mode), the RAM state
// must STILL reflect the user's intent — otherwise the footer keeps showing
// the old stats and the user thinks the button is broken. Mirrors Phase 3
// D-10's posture (visuals continue when audio fails).
export const ZERO_STATS: PersistedStats = {
  totalSessions: 0,
  totalElapsedSeconds: 0,
  lastSessionAtMs: null,
  lastSessionDurationSeconds: null,
}

function isFiniteNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && Number.isInteger(v)
}

// WR-06: lastSessionAtMs and lastSessionDurationSeconds use the looser
// finite-non-negative-number check (no Number.isInteger) so a fractional now()
// injection survives the round trip. D-18 invites tests to control the clock,
// and a future test author could naturally use performance.now() (which returns
// sub-ms floats on most browsers) — the previous integer-only check would have
// silently coerced fractional timestamps to null on the next loadStats(),
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

// DS-WR-05: lastSessionDurationSeconds is produced by the SAME
// Math.floor(ms/1000) integer expression as totalElapsedSeconds, so it must use
// the same integer predicate — otherwise an asymmetry lets one field survive a
// fractional value while the other coerces to 0 (partial data loss). Only the
// genuine timestamp lastSessionAtMs keeps the float-tolerant check.
function isFiniteNonNegativeIntOrNull(v: unknown): v is number | null {
  return v === null || isFiniteNonNegativeInt(v)
}

export function coerceStats(raw: unknown): PersistedStats {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    totalSessions:              isFiniteNonNegativeInt(r.totalSessions)                 ? r.totalSessions             : 0,
    totalElapsedSeconds:        isFiniteNonNegativeInt(r.totalElapsedSeconds)           ? r.totalElapsedSeconds       : 0,
    lastSessionAtMs:            isFiniteNonNegativeNumberOrNull(r.lastSessionAtMs)      ? r.lastSessionAtMs           : null,
    lastSessionDurationSeconds: isFiniteNonNegativeIntOrNull(r.lastSessionDurationSeconds) ? r.lastSessionDurationSeconds : null,
    // T-31-06: validate roundsCompleted — a corrupted value coerces to undefined
    // (not 0) so the field stays absent for resonant records and only appears for
    // NK records that actually wrote it. Per-field non-throwing coercion (ASVS V5).
    roundsCompleted:            isFiniteNonNegativeInt(r.roundsCompleted) ? r.roundsCompleted : undefined,
  }
}

export function loadStats(deps: StorageDeps = {}): PersistedStats {
  return coerceStats(readEnvelope(deps).stats)
}

export function recordSession(
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  // WR-07: single envelope read. Previously recordSession called loadStats
  // (which calls readEnvelope) AND then readEnvelope again before write,
  // opening a cross-tab race window: a second tab could write between the
  // two reads, and we'd compute next.totalSessions from stale stats while
  // merging with fresh settings/mute. Collapsing to one read closes that
  // window for in-tab correctness.
  // Cross-tab concurrent ends lose one increment — documented v1.x work;
  // UI consistency restored via the STORAGE-03 storage-event listener in App.tsx.
  const env = readEnvelope(deps)
  const stats = coerceStats(env.stats)
  // DS-WR-06: reject NaN/Infinity/negative elapsedMs up front. `elapsedMs <
  // COUNT_THRESHOLD_MS` is `false` for NaN/Infinity, so a bad frame would
  // otherwise fall through, count, and poison totalElapsedSeconds with
  // NaN/Infinity — which the next loadStats() silently coerces to 0, losing the
  // entire cumulative total. Return stats unchanged on a bad reading.
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return stats
  }
  // D-01: count if elapsed >= 30s OR isComplete (completion bypasses threshold)
  if (!isComplete && elapsedMs < COUNT_THRESHOLD_MS) {
    return stats
  }
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const now = deps.now ?? Date.now
  const next: PersistedStats = {
    totalSessions: stats.totalSessions + 1,
    totalElapsedSeconds: stats.totalElapsedSeconds + elapsedSeconds,  // D-02
    lastSessionAtMs: now(),                                           // D-18
    lastSessionDurationSeconds: elapsedSeconds,
  }
  writeEnvelope({ ...env, stats: next }, deps)
  return next
}

export function resetStats(deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  // D-11: wipe ONLY stats subtree. Settings + mute survive.
  writeEnvelope({ ...env, stats: { ...ZERO_STATS } }, deps)
}

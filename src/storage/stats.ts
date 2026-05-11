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
}

// WR-08: exported so App.tsx confirmReset can update React state optimistically
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

export function coerceStats(raw: unknown): PersistedStats {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    totalSessions:              isFiniteNonNegativeInt(r.totalSessions)                 ? r.totalSessions             : 0,
    totalElapsedSeconds:        isFiniteNonNegativeInt(r.totalElapsedSeconds)           ? r.totalElapsedSeconds       : 0,
    lastSessionAtMs:            isFiniteNonNegativeNumberOrNull(r.lastSessionAtMs)      ? r.lastSessionAtMs           : null,
    lastSessionDurationSeconds: isFiniteNonNegativeNumberOrNull(r.lastSessionDurationSeconds) ? r.lastSessionDurationSeconds : null,
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

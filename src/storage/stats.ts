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

const ZERO_STATS: PersistedStats = {
  totalSessions: 0,
  totalElapsedSeconds: 0,
  lastSessionAtMs: null,
  lastSessionDurationSeconds: null,
}

function isFiniteNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && Number.isInteger(v)
}

function isFiniteNonNegativeIntOrNull(v: unknown): v is number | null {
  return v === null || isFiniteNonNegativeInt(v)
}

export function coerceStats(raw: unknown): PersistedStats {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    totalSessions:              isFiniteNonNegativeInt(r.totalSessions)             ? r.totalSessions             : 0,
    totalElapsedSeconds:        isFiniteNonNegativeInt(r.totalElapsedSeconds)       ? r.totalElapsedSeconds       : 0,
    lastSessionAtMs:            isFiniteNonNegativeIntOrNull(r.lastSessionAtMs)     ? r.lastSessionAtMs           : null,
    lastSessionDurationSeconds: isFiniteNonNegativeIntOrNull(r.lastSessionDurationSeconds) ? r.lastSessionDurationSeconds : null,
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
  // D-01: count if elapsed >= 30s OR isComplete (completion bypasses threshold)
  const stats = loadStats(deps)
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
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, stats: next }, deps)
  return next
}

export function resetStats(deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  // D-11: wipe ONLY stats subtree. Settings + mute survive.
  writeEnvelope({ ...env, stats: { ...ZERO_STATS } }, deps)
}

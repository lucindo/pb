// src/storage/practices.ts
//
// Per-practice persistence layer. The v2 envelope holds a `practices` map —
// { resonant } — carrying its settings + stats slice.
//
// Coercers are NON-THROWING and prototype-pollution-safe, mirroring
// prefs.ts / settings.ts: a single drifted field never discards the rest of the
// envelope. `raw` is never spread into a prototype-accessible object — only named
// keys are read from a guarded Record (ASVS V5).

import { coerceSettings } from './settings'
import { coerceStats, COUNT_THRESHOLD_MS, ZERO_STATS, type PersistedStats } from './stats'
import { asRecord, readEnvelope, writeEnvelope, type StorageDeps } from './storage'
import type { SessionSettings } from '../domain/settings'

export type PracticeId = 'resonant'

export interface PracticeSlice<S> {
  settings: S
  stats: PersistedStats
}

export interface PracticeMap {
  resonant: PracticeSlice<SessionSettings>
}

// Per-practice slice coercer: settings goes through coerceSettings, stats always
// through coerceStats. A drifted/missing slice yields defaults.
function coercePracticeSlice<S>(
  raw: unknown,
  coerceSlotSettings: (v: unknown) => S,
): PracticeSlice<S> {
  const r = asRecord(raw)
  return {
    settings: coerceSlotSettings(r.settings),
    stats: coerceStats(r.stats),
  }
}

export function coercePractices(raw: unknown): PracticeMap {
  const r = asRecord(raw)
  return {
    resonant: coercePracticeSlice(r.resonant, coerceSettings),
  }
}

// Cross-practice preservation helper: returns the raw on-disk practices map
// (NOT coerced) so a save*/record* that mutates a slice can spread any other
// on-disk keys back unchanged. The on-disk envelope is "self-healing on read"
// via coercePractices at load time, so a drifted sibling key remains a load-time
// concern, not a write-time one.
function rawPracticesMap(raw: unknown): Record<string, unknown> {
  return asRecord(raw)
}

export function loadPractices(deps: StorageDeps = {}): PracticeMap {
  return coercePractices(readEnvelope(deps).practices)
}

// Writes a single practice slice's settings. Spreads the RAW on-disk practices
// map so any other on-disk keys (and forward-compatible unknown sub-keys) survive
// untouched — only the target slice is rewritten.
function writeSliceSettings(key: PracticeId, settings: unknown, deps: StorageDeps): void {
  const env = readEnvelope(deps)
  const rawPractices = rawPracticesMap(env.practices)
  const rawSlice = asRecord(rawPractices[key])
  writeEnvelope(
    { ...env, practices: { ...rawPractices, [key]: { ...rawSlice, settings } } },
    deps,
  )
}

export function saveResonantSettings(settings: SessionSettings, deps: StorageDeps = {}): void {
  writeSliceSettings('resonant', settings, deps)
}

// Records a completed/early-ended session into the practice slice's stats and
// returns the IN-MEMORY projection. writeEnvelope is fire-and-forget (quota /
// ITP / private mode / future-version short-circuit all silently swallow the
// write); callers treat the return as RAM-authoritative — UI updates immediately.
function recordPracticeSession(
  key: PracticeId,
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps,
): PersistedStats {
  const env = readEnvelope(deps)
  // Read the target slice's stats through the coercer (the arithmetic below needs
  // a guaranteed-numeric stats object).
  const rawPractices = rawPracticesMap(env.practices)
  const rawSlice = asRecord(rawPractices[key])
  const stats = coerceStats(rawSlice.stats)
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
  writeEnvelope(
    { ...env, practices: { ...rawPractices, [key]: { ...rawSlice, stats: next } } },
    deps,
  )
  return next
}

// Wipes the practice slice's stats back to zero; the slice's settings and any
// forward-compatible unknown sub-keys survive. Fire-and-forget write — callers
// treat their optimistic ZERO update as RAM-authoritative.
export function resetPracticeStats(key: PracticeId, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const rawPractices = rawPracticesMap(env.practices)
  const rawSlice = asRecord(rawPractices[key])
  writeEnvelope(
    { ...env, practices: { ...rawPractices, [key]: { ...rawSlice, stats: { ...ZERO_STATS } } } },
    deps,
  )
}

export function recordResonantSession(
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  return recordPracticeSession('resonant', elapsedMs, isComplete, deps)
}

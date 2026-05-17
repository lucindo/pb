// src/storage/practices.ts
//
// Phase 30 PRACTICE-02: the per-practice persistence layer. A v2 envelope holds a
// `practices` map — { resonant, naviKriya } — each carrying its own settings +
// stats slice, plus a top-level `activePractice` id.
//
// Coercers are NON-THROWING and prototype-pollution-safe (T-30-05), mirroring
// prefs.ts / settings.ts: a single drifted field never discards the rest of the
// envelope. `raw` is never spread into a prototype-accessible object — only named
// keys are read from a guarded Record (ASVS V5).

import { coerceSettings } from './settings'
import { coerceStats, ZERO_STATS, COUNT_THRESHOLD_MS, type PersistedStats } from './stats'
import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'
import type { SessionSettings } from '../domain/settings'
import {
  DEFAULT_NK_SETTINGS,
  isValidOmLength,
  isValidRounds,
  type NaviKriyaSettings,
} from '../domain/naviKriyaSettings'

export type PracticeId = 'resonant' | 'naviKriya'

export interface PracticeSlice<S> {
  settings: S
  stats: PersistedStats
}

export interface PracticeMap {
  resonant: PracticeSlice<SessionSettings>
  naviKriya: PracticeSlice<NaviKriyaSettings>
}

// Prototype-pollution-safe object guard (T-30-05): only treat `raw` as a record
// when it is a plain non-array object; otherwise hand back an empty record so
// every named-key read falls through to a default.
function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
}

export function coerceActivePractice(raw: unknown): PracticeId {
  // Only the two known ids survive; anything else (garbage string, null, number)
  // falls back to 'resonant' — the default practice.
  return raw === 'resonant' || raw === 'naviKriya' ? raw : 'resonant'
}

export function coerceNaviKriyaSettings(raw: unknown): NaviKriyaSettings {
  const r = asRecord(raw)
  // frontCount (Pitfall 5 / T-30-06): a tampered non-multiple-of-4 value is
  // rounded DOWN to the nearest multiple of 4 rather than discarded, so
  // backCount = frontCount / 4 is never fractional in Phase 31 arithmetic.
  // A non-finite / non-positive value (or one that rounds to 0) falls back to
  // the default.
  let frontCount = DEFAULT_NK_SETTINGS.frontCount
  const fc = r.frontCount
  if (typeof fc === 'number' && Number.isFinite(fc) && fc > 0) {
    const rounded = Math.floor(fc / 4) * 4
    if (rounded > 0) frontCount = rounded
  }
  return {
    frontCount,
    omLength: isValidOmLength(r.omLength) ? r.omLength : DEFAULT_NK_SETTINGS.omLength,
    rounds:   isValidRounds(r.rounds)     ? r.rounds   : DEFAULT_NK_SETTINGS.rounds,
    perOmCue: typeof r.perOmCue === 'boolean' ? r.perOmCue : DEFAULT_NK_SETTINGS.perOmCue,
  }
}

// Per-practice slice coercer: settings goes through the practice-specific
// coercer (coerceSettings for resonant, coerceNaviKriyaSettings for naviKriya),
// stats always through coerceStats. A drifted/missing slice yields defaults.
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
    resonant:  coercePracticeSlice(r.resonant,  coerceSettings),
    naviKriya: coercePracticeSlice(r.naviKriya, coerceNaviKriyaSettings),
  }
}

export function loadPractices(deps: StorageDeps = {}): PracticeMap {
  return coercePractices(readEnvelope(deps).practices)
}

export function loadActivePractice(deps: StorageDeps = {}): PracticeId {
  return coerceActivePractice(readEnvelope(deps).activePractice)
}

export function saveActivePractice(id: PracticeId, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, activePractice: id }, deps)
}

export function saveResonantSettings(settings: SessionSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope(
    { ...env, practices: { ...practices, resonant: { ...practices.resonant, settings } } },
    deps,
  )
}

export function saveNaviKriyaSettings(settings: NaviKriyaSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope(
    { ...env, practices: { ...practices, naviKriya: { ...practices.naviKriya, settings } } },
    deps,
  )
}

// Pitfall 3: the resonant analogue of stats.ts recordSession. Identical
// COUNT_THRESHOLD_MS / Number.isFinite guard logic, but reads from and writes to
// practices.resonant.stats instead of the flat env.stats — so a completed
// session is attributed to the correct practice subtree (T-30-08).
export function recordResonantSession(
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  const stats = practices.resonant.stats
  // DS-WR-06 parity: reject NaN/Infinity/negative elapsedMs up front so a bad
  // frame cannot poison totalElapsedSeconds.
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return stats
  }
  // D-01 parity: count if elapsed >= 30s OR isComplete (completion bypasses threshold).
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
    { ...env, practices: { ...practices, resonant: { ...practices.resonant, stats: next } } },
    deps,
  )
  return next
}

// NK-08: Navi Kriya analogue of recordResonantSession. Mirrors the same
// COUNT_THRESHOLD_MS / Number.isFinite guard logic but reads from and writes to
// practices.naviKriya.stats ONLY — the resonant slice is passed through untouched
// (T-31-07 isolation guarantee).
//
// D-13: when isComplete is false (early end) the roundsCompleted argument carries
// only the fully-completed rounds and elapsedMs the partial elapsed time — both are
// recorded the same way, so an early-ended session still adds its completed rounds
// and minutes to the NK history.
export function recordNaviKriyaSession(
  elapsedMs: number,
  roundsCompleted: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  const stats = practices.naviKriya.stats
  // T-31-08: reject NaN/Infinity/negative elapsedMs so a bad frame cannot
  // poison totalElapsedSeconds (DS-WR-06 parity).
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return stats
  }
  // D-01 parity: count if elapsed >= 30s OR isComplete (completion bypasses threshold).
  if (!isComplete && elapsedMs < COUNT_THRESHOLD_MS) {
    return stats
  }
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const now = deps.now ?? Date.now
  const next: PersistedStats = {
    ...stats,
    totalSessions: stats.totalSessions + 1,
    totalElapsedSeconds: stats.totalElapsedSeconds + elapsedSeconds,
    lastSessionAtMs: now(),
    lastSessionDurationSeconds: elapsedSeconds,
    // NK-08: accumulate rounds across sessions. Spread stats above keeps any
    // pre-existing fields; this line explicitly updates roundsCompleted.
    roundsCompleted: (stats.roundsCompleted ?? 0) + roundsCompleted,
  }
  // T-31-07: write ONLY the naviKriya slice — resonant is passed through unchanged.
  writeEnvelope(
    { ...env, practices: { ...practices, naviKriya: { ...practices.naviKriya, stats: next } } },
    deps,
  )
  return next
}

// Pitfall 4: practice-scoped reset. Writes ZERO_STATS into the named practice's
// stats slice ONLY — the other practice's slice (settings and stats) is left
// untouched.
export function resetPracticeStats(practice: PracticeId, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope(
    {
      ...env,
      practices: {
        ...practices,
        [practice]: { ...practices[practice], stats: { ...ZERO_STATS } },
      },
    },
    deps,
  )
}

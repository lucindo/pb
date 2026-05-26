// src/storage/practices.ts
//
// Phase 30 PRACTICE-02: the per-practice persistence layer. A v2 envelope holds a
// `practices` map — { resonant, naviKriya } — each carrying its own settings +
// stats slice, plus a top-level `activePractice` id.
//
// Phase 34 STRETCH-03/04/05: the stretch practice becomes a first-class slice.
// PracticeId gains 'stretch'; PracticeMap gains a stretch slot; coerceStretchSettings,
// saveStretchSettings, and recordStretchSession are added, modeled exactly on their
// resonant counterparts.
//
// Coercers are NON-THROWING and prototype-pollution-safe (T-30-05), mirroring
// prefs.ts / settings.ts: a single drifted field never discards the rest of the
// envelope. `raw` is never spread into a prototype-accessible object — only named
// keys are read from a guarded Record (ASVS V5).

import { coerceSettings } from './settings'
import { coerceStats, COUNT_THRESHOLD_MS, type PersistedStats } from './stats'
import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'
import type { SessionSettings } from '../domain/settings'
import {
  DEFAULT_STRETCH_SETTINGS,
  STRETCH_INITIAL_BPM_OPTIONS,
  isValidRatio,
  isValidBpm,
  isValidWarmUp,
  isValidCoolDown,
  isValidRampDuration,
  type StretchSettings,
} from '../domain/settings'
import {
  DEFAULT_NK_SETTINGS,
  NK_FRONT_COUNT_OPTIONS,
  isValidOmLength,
  isValidRounds,
  type NaviKriyaSettings,
} from '../domain/naviKriyaSettings'

export type PracticeId = 'resonant' | 'stretch' | 'naviKriya'

export interface PracticeSlice<S> {
  settings: S
  stats: PersistedStats
}

export interface PracticeMap {
  resonant: PracticeSlice<SessionSettings>
  stretch: PracticeSlice<StretchSettings>
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
  // Only the three known ids survive; anything else (garbage string, null, number)
  // falls back to 'resonant' — the default practice.
  return raw === 'resonant' || raw === 'stretch' || raw === 'naviKriya' ? raw : 'resonant'
}

// snapToNearestOption: returns the NK_FRONT_COUNT_OPTIONS entry nearest to
// `value`. Ties (equidistant between two adjacent options) round UP to the
// higher option. Values below the minimum option snap up to the minimum.
function snapToNearestOption(value: number): number {
  const firstOption = NK_FRONT_COUNT_OPTIONS[0]
  if (firstOption === undefined) {
    return DEFAULT_NK_SETTINGS.frontCount
  }
  let best = firstOption
  let bestDist = Math.abs(value - best)
  for (const option of NK_FRONT_COUNT_OPTIONS) {
    const dist = option - value  // signed: negative means option < value
    const absDist = Math.abs(dist)
    // Prefer the higher option on a tie (dist >= 0 means option >= value).
    if (absDist < bestDist || (absDist === bestDist && dist >= 0)) {
      best = option
      bestDist = absDist
    }
  }
  return best
}

export function coerceNaviKriyaSettings(raw: unknown): NaviKriyaSettings {
  const r = asRecord(raw)
  // frontCount (Pitfall 5 / T-30-06): a tampered non-multiple-of-4 value is
  // rounded DOWN to the nearest multiple of 4 rather than discarded, so
  // backCount = frontCount / 4 is never fractional in Phase 31 arithmetic.
  // A non-finite / non-positive value (or one that rounds to 0) falls back to
  // the default.
  // Then snap to the nearest NK_FRONT_COUNT_OPTIONS entry so the SettingsStepper
  // always has a valid selectedIndex. Ties round UP. Values below the minimum
  // snap up to the minimum (100). Without this snap, a returning user with a
  // stale persisted frontCount not in the new options would see index -1 in the
  // stepper, disabling both +/- buttons (AH-WR-02 / 260519-91w operator decision).
  let frontCount = DEFAULT_NK_SETTINGS.frontCount
  const fc = r.frontCount
  if (typeof fc === 'number' && Number.isFinite(fc) && fc > 0) {
    const rounded = Math.floor(fc / 4) * 4
    if (rounded > 0) frontCount = snapToNearestOption(rounded)
  }
  return {
    frontCount,
    omLength: isValidOmLength(r.omLength) ? r.omLength : DEFAULT_NK_SETTINGS.omLength,
    rounds:   isValidRounds(r.rounds)     ? r.rounds   : DEFAULT_NK_SETTINGS.rounds,
    perOmCue: typeof r.perOmCue === 'boolean' ? r.perOmCue : DEFAULT_NK_SETTINGS.perOmCue,
  }
}

// Phase 34 T-34-02: coerceStretchSettings modeled exactly on coerceNaviKriyaSettings.
// Uses asRecord guard for prototype-pollution safety; per-field non-throwing fallback
// means one drifted field never discards the rest.
//
// CR-01 fix: enforces the cross-field invariant targetBpm < initialBpm (parity with
// validateStretchSettings). A persisted slice that violates it falls back to
// DEFAULT_STRETCH_SETTINGS for BOTH BPM fields so the ramp engine never receives an
// inverted or zero-span ramp. initialBpm is restricted to STRETCH_INITIAL_BPM_OPTIONS
// (>= 1.5) so a coerced initialBpm can never collapse the targetBpm picker
// to an empty target-BPM option list (WR-01).
export function coerceStretchSettings(raw: unknown): StretchSettings {
  const r = asRecord(raw)
  // Compute BPM fields into mutable locals first so the cross-field check can
  // reset both atomically when the invariant is violated.
  // initialBpm: valid only when isValidBpm AND in STRETCH_INITIAL_BPM_OPTIONS (>= 1.5).
  const rawInitialBpm = r.initialBpm
  const rawTargetBpm = r.targetBpm
  let initialBpm: number =
    isValidBpm(rawInitialBpm) && STRETCH_INITIAL_BPM_OPTIONS.includes(rawInitialBpm)
      ? rawInitialBpm
      : DEFAULT_STRETCH_SETTINGS.initialBpm
  let targetBpm: number = isValidBpm(rawTargetBpm)
    ? rawTargetBpm
    : DEFAULT_STRETCH_SETTINGS.targetBpm
  // Cross-field invariant: the ramp must always go strictly downward (targetBpm < initialBpm).
  // Reset BOTH fields together so the returned pair is always a valid down-ramp.
  if (targetBpm >= initialBpm) {
    initialBpm = DEFAULT_STRETCH_SETTINGS.initialBpm
    targetBpm  = DEFAULT_STRETCH_SETTINGS.targetBpm
  }
  return {
    ratio:               isValidRatio(r.ratio)                       ? r.ratio               : DEFAULT_STRETCH_SETTINGS.ratio,
    initialBpm,
    targetBpm,
    warmUpMinutes:       isValidWarmUp(r.warmUpMinutes)              ? r.warmUpMinutes       : DEFAULT_STRETCH_SETTINGS.warmUpMinutes,
    rampDurationMinutes: isValidRampDuration(r.rampDurationMinutes)  ? r.rampDurationMinutes : DEFAULT_STRETCH_SETTINGS.rampDurationMinutes,
    coolDownMinutes:     isValidCoolDown(r.coolDownMinutes)          ? r.coolDownMinutes     : DEFAULT_STRETCH_SETTINGS.coolDownMinutes,
  }
}

// Per-practice slice coercer: settings goes through the practice-specific
// coercer (coerceSettings for resonant, coerceStretchSettings for stretch,
// coerceNaviKriyaSettings for naviKriya), stats always through coerceStats.
// A drifted/missing slice yields defaults.
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
    stretch:   coercePracticeSlice(r.stretch,   coerceStretchSettings),   // Phase 34 STRETCH-03
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
  // Defensive: coerce at the write boundary so a type-unsafe caller (a cast
  // from unknown, a `// @ts-expect-error` test fixture, a hand-rolled storage
  // event handler) cannot land an arbitrary string on disk. coerceActivePractice
  // is a no-op for type-correct callers and a corruption guard otherwise.
  writeEnvelope({ ...env, activePractice: coerceActivePractice(id) }, deps)
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

// Phase 34 STRETCH-04: modeled exactly on saveResonantSettings (lines above).
// Spreads ...practices then overrides only the stretch slice — other slices untouched.
export function saveStretchSettings(settings: StretchSettings, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  writeEnvelope(
    { ...env, practices: { ...practices, stretch: { ...practices.stretch, settings } } },
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

// Phase 34 STRETCH-05: modeled exactly on recordResonantSession above.
// Reads from / writes to practices.stretch.stats ONLY — resonant and naviKriya
// slices are passed through untouched (T-34-02 isolation guarantee).
// No `roundsCompleted` arg — Stretch does not count rounds (unlike NaviKriya).
export function recordStretchSession(
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  const stats = practices.stretch.stats
  // DS-WR-06 parity: reject NaN/Infinity/negative elapsedMs up front.
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
    { ...env, practices: { ...practices, stretch: { ...practices.stretch, stats: next } } },
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

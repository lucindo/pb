// src/storage/prefs.ts
//
// Phase 14 D-10/D-17: per-field coerce-and-fallback for user prefs.
// Coercers are NON-THROWING (mirrors coerceSettings in src/storage/settings.ts).
// Per-field policy: a single drifted dimension does NOT discard the other three.

import {
  DEFAULT_THEME,
  DEFAULT_TIMBRE,
  DEFAULT_CUE,
  DEFAULT_LOCALE,
  isValidTheme,
  isValidTimbre,
  isValidCue,
  isValidLocale,
  type ThemeId,
  type TimbreId,
  type CueStyleId,
  type LocaleId,
} from '../domain/settings'

import { readEnvelope, writeEnvelope, type StorageDeps } from './storage'

export interface UserPrefs {
  theme: ThemeId
  timbre: TimbreId
  cue: CueStyleId
  locale: LocaleId
}

export const DEFAULT_PREFS: UserPrefs = {
  theme: DEFAULT_THEME,
  timbre: DEFAULT_TIMBRE,
  cue: DEFAULT_CUE,
  locale: DEFAULT_LOCALE,
}

export function coerceTheme(raw: unknown): ThemeId {
  return isValidTheme(raw) ? raw : DEFAULT_THEME
}

export function coerceTimbre(raw: unknown): TimbreId {
  // AUDIO-02 legacy-value migration: 'chime' was the fourth timbre slot before Phase 35
  // renamed it to 'flute'. Explicit remap preserves the user's fourth-slot preference.
  // No STATE_VERSION bump needed — coercers are non-throwing per-field; 'chime' is a
  // stale value, not a structural envelope change.
  if (raw === 'chime') return 'flute'
  return isValidTimbre(raw) ? raw : DEFAULT_TIMBRE
}

export function coerceCue(raw: unknown): CueStyleId {
  return isValidCue(raw) ? raw : DEFAULT_CUE
}

export function coerceLocale(raw: unknown): LocaleId {
  return isValidLocale(raw) ? raw : DEFAULT_LOCALE
}

export function coercePrefs(raw: unknown): UserPrefs {
  // Prototype-pollution mitigation (T-14-01 / T-25-01 / D-12): we only read four known keys
  // from `r`; `raw` is never spread into a prototype-accessible object.
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    theme:   coerceTheme(r.theme),
    timbre:  coerceTimbre(r.timbre),
    cue:     coerceCue(r.cue),
    locale:  coerceLocale(r.locale),
  }
}

export function loadPrefs(deps: StorageDeps = {}): UserPrefs {
  return coercePrefs(readEnvelope(deps).prefs)
}

export function savePrefs(prefs: UserPrefs, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, prefs }, deps)
}

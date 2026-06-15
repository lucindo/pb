// src/storage/prefs.ts
//
// Per-field coerce-and-fallback for user prefs. Coercers are NON-THROWING
// (mirrors coerceSettings in src/storage/settings.ts). Per-field policy: a
// single drifted dimension does NOT discard the other three.
//
// Legacy migration policy (per AUDIO-02 precedent):
//   - DELETED enum value -> explicit remap in the coercer's legacy table
//     (e.g. LEGACY_TIMBRE_REMAP below: chime -> flute). The remap is
//     load-bearing forever for v1.x envelopes.
//   - RENAMED default only (enum value still valid) -> no migration; an
//     existing user's explicit choice is preserved. The default change only
//     affects users who have not yet made an explicit choice.
//   - STRUCTURAL field move (rename, nest, split) -> STATE_VERSION bump +
//     migrateEnvelope ladder step in storage.ts.

import {
  DEFAULT_THEME,
  DEFAULT_TIMBRE,
  DEFAULT_CUE,
  DEFAULT_LOCALE,
  DEFAULT_BYPASS_SILENT_MODE,
  isValidTheme,
  isValidTimbre,
  isValidCue,
  isValidLocale,
  type ThemeId,
  type TimbreId,
  type CueStyleId,
  type LocaleId,
} from '../domain/settings'

import { asRecord, readEnvelope, writeEnvelope, type StorageDeps } from './storage'

export interface UserPrefs {
  theme: ThemeId
  timbre: TimbreId
  cue: CueStyleId
  locale: LocaleId
  bypassSilentMode: boolean  // default true preserves the no-silent-mode bypass users rely on
}

export const DEFAULT_PREFS: UserPrefs = {
  theme: DEFAULT_THEME,
  timbre: DEFAULT_TIMBRE,
  cue: DEFAULT_CUE,
  locale: DEFAULT_LOCALE,
  bypassSilentMode: DEFAULT_BYPASS_SILENT_MODE, // true — see UserPrefs.bypassSilentMode
}

// Boolean-ish string parser for hand-edited / legacy envelopes. Persisted JSON
// re-hydrates real booleans (the fast path in coerceBypassSilentMode); this only
// handles the case where the on-disk value is a string. Returns null for
// anything unrecognized so the caller falls through to its default.
const TRUE_STRINGS = new Set(['', '1', 'on', 't', 'true', 'y', 'yes', 'enable', 'enabled'])
const FALSE_STRINGS = new Set(['0', 'off', 'f', 'false', 'n', 'no', 'disable', 'disabled'])

function parseBooleanString(raw: string): boolean | null {
  const normalized = raw.trim().toLowerCase()
  if (TRUE_STRINGS.has(normalized)) return true
  if (FALSE_STRINGS.has(normalized)) return false
  return null
}

export function coerceTheme(raw: unknown): ThemeId {
  return isValidTheme(raw) ? raw : DEFAULT_THEME
}

// Legacy-value migration table: deleted enum values that must remap to a current
// TimbreId on read. The remap is load-bearing for every returning user whose
// on-disk envelope still carries a deleted value — see the policy comment at the
// top of this file for the deletion/rename distinction.
//
// Contract: this table MUST NOT be deleted (and entries MUST NOT be removed)
// without a STATE_VERSION bump + an explicit migrateEnvelope ladder step that
// rewrites the deleted values on every existing envelope. The remap is treated
// as transient (re-run on every read) because coercers are non-throwing per
// field, but it is structurally a permanent contract for the lifetime of v1.x
// data. Tests in prefs.test.ts exercise each entry; do not silently shrink it.
//
// Entries:
//   - 'chime' → 'flute' (fourth timbre slot was renamed)
export const LEGACY_TIMBRE_REMAP: Readonly<Record<string, TimbreId>> = Object.freeze({
  chime: 'flute',
})

export function coerceTimbre(raw: unknown): TimbreId {
  if (typeof raw === 'string') {
    const remapped = LEGACY_TIMBRE_REMAP[raw]
    if (remapped !== undefined) return remapped
  }
  return isValidTimbre(raw) ? raw : DEFAULT_TIMBRE
}

export function coerceCue(raw: unknown): CueStyleId {
  return isValidCue(raw) ? raw : DEFAULT_CUE
}

export function coerceLocale(raw: unknown): LocaleId {
  return isValidLocale(raw) ? raw : DEFAULT_LOCALE
}

// Boolean coercer: persisted JSON re-hydrates true/false as actual booleans
// (fast path), then falls through to parseBooleanString for legacy/hand-edited
// string envelopes. Default is true — preserves the no-silent-mode bypass users
// rely on.
export function coerceBypassSilentMode(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    const parsed = parseBooleanString(raw)
    if (parsed !== null) return parsed
  }
  return DEFAULT_BYPASS_SILENT_MODE
}

export function coercePrefs(raw: unknown): UserPrefs {
  // Prototype-pollution mitigation: we only read the known keys from the
  // guarded record; `raw` is never spread into a prototype-accessible object.
  const r = asRecord(raw)
  return {
    theme:            coerceTheme(r.theme),
    timbre:           coerceTimbre(r.timbre),
    cue:              coerceCue(r.cue),
    locale:           coerceLocale(r.locale),
    bypassSilentMode: coerceBypassSilentMode(r.bypassSilentMode),
  }
}

export function loadPrefs(deps: StorageDeps = {}): UserPrefs {
  return coercePrefs(readEnvelope(deps).prefs)
}

export function savePrefs(prefs: UserPrefs, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, prefs }, deps)
}

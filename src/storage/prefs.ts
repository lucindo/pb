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

import {
  BREATHING_SHAPE_FLAG,
  RING_CUE_FLAG,
  ORB_IDLE_FLAG,
  SWITCHER_ICON_FLAG,
  parseQueryBoolean,
  type BreathingShapeVariant,
  type RingCueStyle,
  type OrbIdleBehavior,
} from '../featureFlags'

export interface UserPrefs {
  theme: ThemeId
  timbre: TimbreId
  cue: CueStyleId
  locale: LocaleId
  breathingShape: BreathingShapeVariant
  ringCue: RingCueStyle
  orbIdle: OrbIdleBehavior
  switcherIcon: boolean
}

export const DEFAULT_PREFS: UserPrefs = {
  theme: DEFAULT_THEME,
  timbre: DEFAULT_TIMBRE,
  cue: DEFAULT_CUE,
  locale: DEFAULT_LOCALE,
  breathingShape: BREATHING_SHAPE_FLAG.defaultValue,
  ringCue: RING_CUE_FLAG.defaultValue,
  orbIdle: ORB_IDLE_FLAG.defaultValue,
  switcherIcon: SWITCHER_ICON_FLAG.defaultValue,
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

// Phase 47 D-03 — parser reused from featureFlags.ts so the alias table stays in one place.
export function coerceBreathingShape(raw: unknown): BreathingShapeVariant {
  if (typeof raw !== 'string') return BREATHING_SHAPE_FLAG.defaultValue
  return BREATHING_SHAPE_FLAG.parse(raw) ?? BREATHING_SHAPE_FLAG.defaultValue
}

// Phase 47 D-03 — parser reused from featureFlags.ts so the alias table stays in one place.
export function coerceRingCue(raw: unknown): RingCueStyle {
  if (typeof raw !== 'string') return RING_CUE_FLAG.defaultValue
  return RING_CUE_FLAG.parse(raw) ?? RING_CUE_FLAG.defaultValue
}

// Phase 47 D-03 — parser reused from featureFlags.ts so the alias table stays in one place.
export function coerceOrbIdle(raw: unknown): OrbIdleBehavior {
  if (typeof raw !== 'string') return ORB_IDLE_FLAG.defaultValue
  return ORB_IDLE_FLAG.parse(raw) ?? ORB_IDLE_FLAG.defaultValue
}

// Phase 47 D-03 — parser reused from featureFlags.ts so the alias table stays in one place.
// Boolean coercer: persisted JSON re-hydrates true/false as actual booleans (fast path),
// then falls through to parseQueryBoolean for legacy/hand-edited string envelopes.
export function coerceSwitcherIcon(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'string') {
    const parsed = parseQueryBoolean(raw)
    if (parsed !== null) return parsed
  }
  return SWITCHER_ICON_FLAG.defaultValue
}

export function coercePrefs(raw: unknown): UserPrefs {
  // Prototype-pollution mitigation (T-14-01 / T-25-01 / D-12): we only read eight known keys
  // from `r`; `raw` is never spread into a prototype-accessible object.
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    theme:          coerceTheme(r.theme),
    timbre:         coerceTimbre(r.timbre),
    cue:            coerceCue(r.cue),
    locale:         coerceLocale(r.locale),
    breathingShape: coerceBreathingShape(r.breathingShape),
    ringCue:        coerceRingCue(r.ringCue),
    orbIdle:        coerceOrbIdle(r.orbIdle),
    switcherIcon:   coerceSwitcherIcon(r.switcherIcon),
  }
}

export function loadPrefs(deps: StorageDeps = {}): UserPrefs {
  return coercePrefs(readEnvelope(deps).prefs)
}

export function savePrefs(prefs: UserPrefs, deps: StorageDeps = {}): void {
  const env = readEnvelope(deps)
  writeEnvelope({ ...env, prefs }, deps)
}

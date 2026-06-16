// --- Pattern Breathing model (D6/D7) -----------------------------------------

// The four ordered phases of a breathing cycle. Holds may be omitted from a plan
// when their base duration is 0 (FR-4), but the type still names all four.
export type BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out'

export type RoundsOption = number | 'open-ended'

// Four base phase durations in whole seconds (holds may be 0), a scalar applied
// to all four, and the cycle-repeat count. Effective seconds = field × multiplier.
export interface PatternSettings {
  inhale: number
  holdIn: number
  exhale: number
  holdOut: number
  multiplier: number
  rounds: RoundsOption
}

// Field bounds (FR-8..FR-11) — single source of truth for the coercer and the
// UI clamps. Inhale/exhale require ≥ 1; holds allow 0 (a 0 phase is omitted).
export const PATTERN_BOUNDS = {
  inhale: { min: 1, max: 60 },
  holdIn: { min: 0, max: 300 },
  exhale: { min: 1, max: 60 },
  holdOut: { min: 0, max: 300 },
  multiplier: { min: 1, max: 15 },
  rounds: { min: 1, max: 99 },
} as const

// Box-4 (1·1·1·1 ×4), 10 rounds — first-run default and coercer fallback (D7).
export const DEFAULT_PATTERN_SETTINGS: PatternSettings = {
  inhale: 1,
  holdIn: 1,
  exhale: 1,
  holdOut: 1,
  multiplier: 4,
  rounds: 10,
}

function coerceInt(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fallback
}

function coerceRounds(v: unknown): RoundsOption {
  if (v === 'open-ended') return 'open-ended'
  return coerceInt(v, PATTERN_BOUNDS.rounds.min, PATTERN_BOUNDS.rounds.max, DEFAULT_PATTERN_SETTINGS.rounds as number)
}

// Per-field coercion (FR-12): substitutes the default for any out-of-range or
// wrong-type field and never throws. Accepts unknown so it guards the storage
// boundary directly (legacy envelopes coerce to all-defaults).
export function validatePatternSettings(input: unknown): PatternSettings {
  const s = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  return {
    inhale: coerceInt(s.inhale, PATTERN_BOUNDS.inhale.min, PATTERN_BOUNDS.inhale.max, DEFAULT_PATTERN_SETTINGS.inhale),
    holdIn: coerceInt(s.holdIn, PATTERN_BOUNDS.holdIn.min, PATTERN_BOUNDS.holdIn.max, DEFAULT_PATTERN_SETTINGS.holdIn),
    exhale: coerceInt(s.exhale, PATTERN_BOUNDS.exhale.min, PATTERN_BOUNDS.exhale.max, DEFAULT_PATTERN_SETTINGS.exhale),
    holdOut: coerceInt(s.holdOut, PATTERN_BOUNDS.holdOut.min, PATTERN_BOUNDS.holdOut.max, DEFAULT_PATTERN_SETTINGS.holdOut),
    multiplier: coerceInt(s.multiplier, PATTERN_BOUNDS.multiplier.min, PATTERN_BOUNDS.multiplier.max, DEFAULT_PATTERN_SETTINGS.multiplier),
    rounds: coerceRounds(s.rounds),
  }
}

// --- Customization enums ------------------------------------------------------
// Predicates are stable; consumers add UI/CSS/audio wiring without editing the
// domain types.

export type ThemeId = 'light' | 'dark' | 'system'

export const THEME_OPTIONS = ['light', 'dark', 'system'] as const satisfies readonly ThemeId[]

export function isValidTheme(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_THEME: ThemeId = 'system'

export type TimbreId = 'bowl' | 'bell' | 'sine' | 'flute'

export const TIMBRE_OPTIONS = ['bowl', 'bell', 'sine', 'flute'] as const satisfies readonly TimbreId[]

export function isValidTimbre(v: unknown): v is TimbreId {
  return typeof v === 'string' && (TIMBRE_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_TIMBRE: TimbreId = 'sine'

export type LocaleId = 'en' | 'pt-BR'

export const LOCALE_OPTIONS = ['en', 'pt-BR'] as const satisfies readonly LocaleId[]

export function isValidLocale(v: unknown): v is LocaleId {
  return typeof v === 'string' && (LOCALE_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_LOCALE: LocaleId = 'en'

// Audio setting: bypass the OS silent switch so cue tones play. Default true
// preserves the no-silent-mode bypass returning users rely on.
export const DEFAULT_BYPASS_SILENT_MODE = true

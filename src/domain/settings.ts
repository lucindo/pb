export type RatioLabel = '50:50' | '40:60' | '30:70' | '20:80'
export type DurationOption = number | 'open-ended'

// SessionSettings is standard-only — 3 fields (bpm, ratio, durationMinutes).
export interface SessionSettings {
  bpm: number
  ratio: RatioLabel
  durationMinutes: DurationOption
}

export const BPM_OPTIONS = [
  1,
  1.5,
  2,
  2.5,
  3,
  3.5,
  4,
  4.5,
  5,
  5.5,
  6,
  6.5,
  7,
] as const satisfies readonly number[]

export const RATIO_OPTIONS = ['50:50', '40:60', '30:70', '20:80'] as const satisfies readonly RatioLabel[]

// Inhale/exhale split (percent of cycle) for each ratio. Single source of truth —
// consumed by createBreathingPlan.
export const RATIO_PARTS: Record<RatioLabel, { readonly inhale: number; readonly exhale: number }> = {
  '50:50': { inhale: 50, exhale: 50 },
  '40:60': { inhale: 40, exhale: 60 },
  '30:70': { inhale: 30, exhale: 70 },
  '20:80': { inhale: 20, exhale: 80 },
}

export const DURATION_OPTIONS = [
  5,
  10,
  15,
  20,
  25,
  30,
  35,
  40,
  45,
  50,
  55,
  60,
  'open-ended',
] as const satisfies readonly DurationOption[]

export const DEFAULT_SETTINGS: SessionSettings = {
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}

export function getNextDurationOption(duration: DurationOption): DurationOption | undefined {
  const currentIndex = (DURATION_OPTIONS as readonly DurationOption[]).indexOf(duration)
  return currentIndex === -1
    ? undefined
    : (DURATION_OPTIONS as readonly DurationOption[])[currentIndex + 1]
}

// Customization enum surfaces — predicates are stable; consumers add UI/CSS/audio
// wiring without editing the domain types.

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

export function isValidBpm(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && (BPM_OPTIONS as readonly number[]).includes(v)
}

export function isValidRatio(v: unknown): v is RatioLabel {
  return typeof v === 'string' && (RATIO_OPTIONS as readonly string[]).includes(v)
}

export function isValidDuration(v: unknown): v is DurationOption {
  if (v === 'open-ended') return true
  return typeof v === 'number'
    && Number.isFinite(v)
    && (DURATION_OPTIONS as readonly DurationOption[]).includes(v)
}

// validateSettings is standard-only — 3 fields, no mode check.
export function validateSettings(settings: SessionSettings): SessionSettings {
  if (!isValidBpm(settings.bpm)) {
    throw new RangeError(`Unsupported BPM: ${String(settings.bpm)}`)
  }

  if (!isValidRatio(settings.ratio)) {
    // Reason: the user-defined predicate `isValidRatio: (v: unknown): v is RatioLabel`
    // narrows `settings.ratio: RatioLabel` to `never` in the false branch. `${settings.ratio}`
    // is preserved verbatim so the runtime string remains correct.
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new RangeError(`Unsupported ratio: ${settings.ratio}`)
  }

  if (!isValidDuration(settings.durationMinutes)) {
    throw new RangeError(`Unsupported duration: ${String(settings.durationMinutes)}`)
  }

  return { ...settings }
}

// --- Pattern Breathing model (D6/D7) -----------------------------------------
// Replaces the resonance bpm/ratio/durationMinutes model. Coexists with the
// SessionSettings symbols above only during the Step-3 migration; those are
// removed once every consumer is on PatternSettings.

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
// wrong-type field and never throws — unlike the resonance validateSettings.
// Accepts unknown so it guards the storage boundary directly (legacy envelopes
// coerce to all-defaults).
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

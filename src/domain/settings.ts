export type RatioLabel = '50:50' | '40:60' | '30:70' | '20:80'
export type DurationOption = number | 'open-ended'

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

// Phase 14 D-01: v1.1 customization enum surfaces — predicates are FINAL;
// downstream phases (16/17/18/19) only add UI/CSS/audio wiring and do NOT re-edit.

export type ThemeId = 'light' | 'dark' | 'system' | 'moss' | 'slate' | 'dusk'

export const THEME_OPTIONS = ['light', 'dark', 'system', 'moss', 'slate', 'dusk'] as const satisfies readonly ThemeId[]

export function isValidTheme(v: unknown): v is ThemeId {
  return typeof v === 'string' && (THEME_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_THEME: ThemeId = 'system'

export type TimbreId = 'bowl' | 'bell' | 'sine' | 'chime'

export const TIMBRE_OPTIONS = ['bowl', 'bell', 'sine', 'chime'] as const satisfies readonly TimbreId[]

export function isValidTimbre(v: unknown): v is TimbreId {
  return typeof v === 'string' && (TIMBRE_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_TIMBRE: TimbreId = 'bowl'

export type VisualVariantId = 'orb' | 'square' | 'diamond'

export const VARIANT_OPTIONS = ['orb', 'square', 'diamond'] as const satisfies readonly VisualVariantId[]

export function isValidVariant(v: unknown): v is VisualVariantId {
  return typeof v === 'string' && (VARIANT_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_VARIANT: VisualVariantId = 'orb'

export type LocaleId = 'en' | 'pt-BR'

export const LOCALE_OPTIONS = ['en', 'pt-BR'] as const satisfies readonly LocaleId[]

export function isValidLocale(v: unknown): v is LocaleId {
  return typeof v === 'string' && (LOCALE_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_LOCALE: LocaleId = 'en'

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

export function validateSettings(settings: SessionSettings): SessionSettings {
  if (!isValidBpm(settings.bpm)) {
    throw new RangeError(`Unsupported BPM: ${String(settings.bpm)}`)
  }

  if (!isValidRatio(settings.ratio)) {
    // Reason: the user-defined predicate `isValidRatio: (v: unknown): v is RatioLabel`
    // narrows `settings.ratio: RatioLabel` to `never` in the false branch. `${settings.ratio}`
    // is preserved verbatim (D-09 byte-identical message format) so the runtime string
    // ("Unsupported ratio: 99:1" for an upstream-cast offending value) remains correct.
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new RangeError(`Unsupported ratio: ${settings.ratio}`)
  }

  if (!isValidDuration(settings.durationMinutes)) {
    throw new RangeError(`Unsupported duration: ${String(settings.durationMinutes)}`)
  }

  return { ...settings }
}

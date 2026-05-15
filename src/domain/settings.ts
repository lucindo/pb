export type RatioLabel = '50:50' | '40:60' | '30:70' | '20:80'
export type DurationOption = number | 'open-ended'

export type SessionMode = 'standard' | 'stretch'

export const MODE_OPTIONS = ['standard', 'stretch'] as const satisfies readonly SessionMode[]

export type HoldSecondsOption = 0 | 15 | 30 | 45 | 60

export const HOLD_SECONDS_OPTIONS = [0, 15, 30, 45, 60] as const satisfies readonly HoldSecondsOption[]

export type HoldTargetOption = HoldSecondsOption | 'open-ended'

export const HOLD_TARGET_OPTIONS = [0, 15, 30, 45, 60, 'open-ended'] as const satisfies readonly HoldTargetOption[]

export const RAMP_DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const satisfies readonly number[]

export interface SessionSettings {
  bpm: number
  ratio: RatioLabel
  durationMinutes: DurationOption
  mode: SessionMode
  initialBpm: number
  targetBpm: number
  holdInitialSeconds: HoldSecondsOption
  holdTargetSeconds: HoldTargetOption
  rampDurationMinutes: number
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

// STRETCH_INITIAL_BPM_OPTIONS: BPM_OPTIONS filtered to >= 1.5 so targetBpm always has
// at least one valid option below initialBpm (Pitfall 4 — prevents empty targetBpm picker)
export const STRETCH_INITIAL_BPM_OPTIONS: readonly number[] = (BPM_OPTIONS as readonly number[]).filter(
  (v) => v >= 1.5,
)

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
  mode: 'standard',
  initialBpm: 5.5,
  targetBpm: 4.5,
  holdInitialSeconds: 0,
  holdTargetSeconds: 0,
  rampDurationMinutes: 20,
}

// DEFAULT_STRETCH_SETTINGS: the per-field stretch defaults referenced by storage coercer (Plan 02).
// Fields yield holdInitial(0) + ramp(20min) + holdTarget(0) = 20-minute total → gate clear (Pitfall 5).
export const DEFAULT_STRETCH_SETTINGS = {
  initialBpm: 5.5,
  targetBpm: 4.5,
  holdInitialSeconds: 0 as HoldSecondsOption,
  holdTargetSeconds: 0 as HoldTargetOption,
  rampDurationMinutes: 20,
} as const

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

export function isValidMode(v: unknown): v is SessionMode {
  return typeof v === 'string' && (MODE_OPTIONS as readonly string[]).includes(v)
}

export function isValidHoldSeconds(v: unknown): v is HoldSecondsOption {
  return typeof v === 'number'
    && Number.isFinite(v)
    && (HOLD_SECONDS_OPTIONS as readonly number[]).includes(v)
}

export function isValidHoldTarget(v: unknown): v is HoldTargetOption {
  if (v === 'open-ended') return true
  return typeof v === 'number'
    && Number.isFinite(v)
    && (HOLD_SECONDS_OPTIONS as readonly number[]).includes(v)
}

export function isValidRampDuration(v: unknown): v is number {
  return typeof v === 'number'
    && Number.isFinite(v)
    && (RAMP_DURATION_OPTIONS as readonly number[]).includes(v)
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

  if (!isValidMode(settings.mode)) {
    throw new RangeError(`Unsupported mode: ${String(settings.mode)}`)
  }

  // Stretch-mode only validation: standard sessions skip these checks entirely
  // so existing Standard sessions are unaffected (Phase 22 D-01 down-only constraint).
  if (settings.mode === 'stretch') {
    if (!isValidBpm(settings.initialBpm)) {
      throw new RangeError(`Unsupported initialBpm: ${String(settings.initialBpm)}`)
    }

    if (!isValidBpm(settings.targetBpm) || settings.targetBpm >= settings.initialBpm) {
      throw new RangeError(`Unsupported targetBpm: ${String(settings.targetBpm)}`)
    }

    if (!isValidHoldSeconds(settings.holdInitialSeconds)) {
      throw new RangeError(`Unsupported holdInitialSeconds: ${String(settings.holdInitialSeconds)}`)
    }

    if (!isValidHoldTarget(settings.holdTargetSeconds)) {
      throw new RangeError(`Unsupported holdTargetSeconds: ${String(settings.holdTargetSeconds)}`)
    }

    if (!isValidRampDuration(settings.rampDurationMinutes)) {
      throw new RangeError(`Unsupported rampDurationMinutes: ${String(settings.rampDurationMinutes)}`)
    }
  }

  return { ...settings }
}

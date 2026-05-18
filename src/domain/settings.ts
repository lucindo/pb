export type RatioLabel = '50:50' | '40:60' | '30:70' | '20:80'
export type DurationOption = number | 'open-ended'

// Stretch stage durations are minute-based: Warm-up (initial-BPM hold), Ramp
// (the BPM walk-down), and Cool-down (target-BPM hold). The structural minimum
// total is 5 + 5 + 5 = 15 min, so no separate "session long enough" gate is needed.
export type WarmUpMinutes = 5 | 10 | 15

export const WARMUP_MINUTES_OPTIONS = [5, 10, 15] as const satisfies readonly WarmUpMinutes[]

export type CoolDownMinutes = 5 | 10 | 15 | 20 | 'open-ended'

export const COOLDOWN_OPTIONS = [5, 10, 15, 20, 'open-ended'] as const satisfies readonly CoolDownMinutes[]

export const RAMP_DURATION_OPTIONS = [5, 10, 15, 20] as const satisfies readonly number[]

// D-01/D-02: SessionSettings is standard-only — trim to 3 fields.
// mode, initialBpm, targetBpm, warmUpMinutes, coolDownMinutes, rampDurationMinutes removed.
export interface SessionSettings {
  bpm: number
  ratio: RatioLabel
  durationMinutes: DurationOption
}

// D-02: StretchSettings is a standalone type — ratio + the five ramp fields.
// durationMinutes is NOT stored here (it is computed from the ramp table).
export interface StretchSettings {
  ratio: RatioLabel
  initialBpm: number
  targetBpm: number
  warmUpMinutes: WarmUpMinutes
  rampDurationMinutes: number
  coolDownMinutes: CoolDownMinutes
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
  // TEMPORARY (testing aid): 1-minute option for quick session-end testing.
  // Remove before release.
  1,
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

// DEFAULT_STRETCH_SETTINGS: the per-field stretch defaults referenced by the
// storage coercer. Warm-up 5 + Ramp 5 + Cool-down 5 = 15-minute computed total.
// ratio: '40:60' added per D-02 — ratio is consumed by buildStretchSegments internally.
export const DEFAULT_STRETCH_SETTINGS: StretchSettings = {
  ratio: '40:60',
  initialBpm: 5.5,
  targetBpm: 4.5,
  warmUpMinutes: 5,
  coolDownMinutes: 5,
  rampDurationMinutes: 5,
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

export type CueStyleId = 'labels' | 'arrow' | 'nose'

export const CUE_OPTIONS = ['labels', 'arrow', 'nose'] as const satisfies readonly CueStyleId[]

export function isValidCue(v: unknown): v is CueStyleId {
  return typeof v === 'string' && (CUE_OPTIONS as readonly string[]).includes(v)
}

export const DEFAULT_CUE: CueStyleId = 'labels'  // FIXED per CONTEXT D-01 / success criterion 5

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

export function isValidWarmUp(v: unknown): v is WarmUpMinutes {
  return typeof v === 'number'
    && Number.isFinite(v)
    && (WARMUP_MINUTES_OPTIONS as readonly number[]).includes(v)
}

export function isValidCoolDown(v: unknown): v is CoolDownMinutes {
  if (v === 'open-ended') return true
  return typeof v === 'number'
    && Number.isFinite(v)
    && (COOLDOWN_OPTIONS as readonly unknown[]).includes(v)
}

export function isValidRampDuration(v: unknown): v is number {
  return typeof v === 'number'
    && Number.isFinite(v)
    && (RAMP_DURATION_OPTIONS as readonly number[]).includes(v)
}

// D-01/D-02: validateSettings is standard-only — 3 fields, no mode check.
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

// D-01/D-02: validateStretchSettings carries the former stretch-branch checks
// from validateSettings. Receives a StretchSettings (not SessionSettings).
export function validateStretchSettings(settings: StretchSettings): StretchSettings {
  if (!isValidRatio(settings.ratio)) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new RangeError(`Unsupported ratio: ${settings.ratio}`)
  }

  if (!isValidBpm(settings.initialBpm)) {
    throw new RangeError(`Unsupported initialBpm: ${String(settings.initialBpm)}`)
  }

  if (!isValidBpm(settings.targetBpm) || settings.targetBpm >= settings.initialBpm) {
    throw new RangeError(`Unsupported targetBpm: ${String(settings.targetBpm)}`)
  }

  if (!isValidWarmUp(settings.warmUpMinutes)) {
    throw new RangeError(`Unsupported warmUpMinutes: ${String(settings.warmUpMinutes)}`)
  }

  if (!isValidCoolDown(settings.coolDownMinutes)) {
    throw new RangeError(`Unsupported coolDownMinutes: ${String(settings.coolDownMinutes)}`)
  }

  if (!isValidRampDuration(settings.rampDurationMinutes)) {
    throw new RangeError(`Unsupported rampDurationMinutes: ${String(settings.rampDurationMinutes)}`)
  }

  return { ...settings }
}

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

export function validateSettings(settings: SessionSettings): SessionSettings {
  if (!(BPM_OPTIONS as readonly number[]).includes(settings.bpm)) {
    throw new RangeError(`Unsupported BPM: ${String(settings.bpm)}`)
  }

  if (!RATIO_OPTIONS.includes(settings.ratio)) {
    throw new RangeError(`Unsupported ratio: ${settings.ratio}`)
  }

  if (!(DURATION_OPTIONS as readonly DurationOption[]).includes(settings.durationMinutes)) {
    throw new RangeError(`Unsupported duration: ${String(settings.durationMinutes)}`)
  }

  return { ...settings }
}

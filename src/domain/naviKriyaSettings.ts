export type OmLength = 'fast' | 'medium' | 'slow'

export const OM_LENGTH_OPTIONS = ['fast', 'medium', 'slow'] as const satisfies readonly OmLength[]

export interface NaviKriyaSettings {
  frontCount: number   // base front OM count; backCount = frontCount / 4; must be multiple of 4
  omLength: OmLength
  rounds: number       // integer >= 1; default 3
  perOmCue: boolean    // audible per-OM tick; default true
}

export const DEFAULT_NK_SETTINGS: NaviKriyaSettings = {
  frontCount: 100,
  omLength: 'medium',
  rounds: 3,
  perOmCue: true,
}

// isValidFrontCount: checks typeof number, Number.isFinite, Number.isInteger, v > 0,
// AND v % 4 === 0 — the multiple-of-4 check is the critical Pitfall 5 guard so
// backCount = frontCount / 4 is never fractional.
export function isValidFrontCount(v: unknown): v is number {
  return typeof v === 'number'
    && Number.isFinite(v)
    && Number.isInteger(v)
    && v > 0
    && v % 4 === 0
}

export function isValidOmLength(v: unknown): v is OmLength {
  return typeof v === 'string' && (OM_LENGTH_OPTIONS as readonly string[]).includes(v)
}

// isValidRounds: checks typeof number, Number.isFinite, Number.isInteger, v >= 1
export function isValidRounds(v: unknown): v is number {
  return typeof v === 'number'
    && Number.isFinite(v)
    && Number.isInteger(v)
    && v >= 1
}

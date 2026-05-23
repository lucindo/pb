import type { NaviKriyaSettings, OmLength } from './naviKriyaSettings'

export const NK_OM_SECONDS: Record<OmLength, number> = {
  fast: 1.75,
  medium: 2.16,
  slow: 3.0,
}

export const NK_LEAD_MS = 5000
export const NK_LAST_OM_HOLD_MULTIPLIER = 1.5

export type NaviKriyaPhase = 'front' | 'back'

export function getNaviKriyaBackCount(frontCount: number): number {
  return frontCount / 4
}

export function getNaviKriyaPhaseTarget(
  settings: NaviKriyaSettings,
  phase: NaviKriyaPhase,
): number {
  return phase === 'front'
    ? settings.frontCount
    : getNaviKriyaBackCount(settings.frontCount)
}

export function estimateNaviKriyaDurationMs(settings: NaviKriyaSettings): number {
  const backCount = getNaviKriyaBackCount(settings.frontCount)
  const omMs = NK_OM_SECONDS[settings.omLength] * 1000
  const heldOmCount = 2 * (NK_LAST_OM_HOLD_MULTIPLIER - 1)

  return (
    settings.rounds * (settings.frontCount + backCount + heldOmCount) * omMs
    + settings.rounds * 2 * NK_LEAD_MS
  )
}

export function estimateNaviKriyaDurationMinutes(settings: NaviKriyaSettings): number {
  return Math.round(estimateNaviKriyaDurationMs(settings) / 60_000)
}

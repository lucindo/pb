// src/hooks/useOrbIdleChoice.ts — Phase 47 Plan 04 (D-09): paste-and-rename of useTimbreChoice for the orbIdle field. Dispatches hrv:prefs-changed with detail.key === 'orbIdle' per D-10.

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { OrbIdleBehavior } from '../featureFlags'

export function useOrbIdleChoice(): { orbIdle: OrbIdleBehavior; setOrbIdle: (next: OrbIdleBehavior) => void } {
  const [orbIdle, setOrbIdleState] = useState<OrbIdleBehavior>(() => loadPrefs().orbIdle)

  const setOrbIdle = useCallback((next: OrbIdleBehavior): void => {
    const current = loadPrefs()
    savePrefs({ ...current, orbIdle: next })
    setOrbIdleState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'orbIdle', value: next } }),
    )
  }, [])

  return { orbIdle, setOrbIdle }
}

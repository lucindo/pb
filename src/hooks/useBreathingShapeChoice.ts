// src/hooks/useBreathingShapeChoice.ts — Picker-side hook for the breathingShape prefs field.
// Dispatches hrv:prefs-changed with detail.key === 'breathingShape'.

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { BreathingShapeVariant } from '../featureFlags'

export function useBreathingShapeChoice(): { breathingShape: BreathingShapeVariant; setBreathingShape: (next: BreathingShapeVariant) => void } {
  const [breathingShape, setBreathingShapeState] = useState<BreathingShapeVariant>(() => loadPrefs().breathingShape)

  const setBreathingShape = useCallback((next: BreathingShapeVariant): void => {
    const current = loadPrefs()
    savePrefs({ ...current, breathingShape: next })
    setBreathingShapeState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'breathingShape', value: next } }),
    )
  }, [])

  return { breathingShape, setBreathingShape }
}

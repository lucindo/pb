// src/hooks/useRingCueChoice.ts — Picker-side hook for the ringCue prefs field.
// Dispatches hrv:prefs-changed with detail.key === 'ringCue'.

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { RingCueStyle } from '../featureFlags'

export function useRingCueChoice(): { ringCue: RingCueStyle; setRingCue: (next: RingCueStyle) => void } {
  const [ringCue, setRingCueState] = useState<RingCueStyle>(() => loadPrefs().ringCue)

  const setRingCue = useCallback((next: RingCueStyle): void => {
    const current = loadPrefs()
    savePrefs({ ...current, ringCue: next })
    setRingCueState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'ringCue', value: next } }),
    )
  }, [])

  return { ringCue, setRingCue }
}

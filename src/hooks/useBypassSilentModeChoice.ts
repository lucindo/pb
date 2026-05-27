// src/hooks/useBypassSilentModeChoice.ts — Phase 49.1 Plan 01 D-08: paste-and-rename of
// useSwitcherIconChoice for the bypassSilentMode field (boolean type — same shape).
// Dispatches hrv:prefs-changed with detail.key === 'bypassSilentMode' per D-08.

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'

export function useBypassSilentModeChoice(): { bypassSilentMode: boolean; setBypassSilentMode: (next: boolean) => void } {
  const [bypassSilentMode, setBypassSilentModeState] = useState<boolean>(() => loadPrefs().bypassSilentMode)

  const setBypassSilentMode = useCallback((next: boolean): void => {
    const current = loadPrefs()
    savePrefs({ ...current, bypassSilentMode: next })
    setBypassSilentModeState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'bypassSilentMode', value: next } }),
    )
  }, [])

  return { bypassSilentMode, setBypassSilentMode }
}

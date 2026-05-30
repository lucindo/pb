// src/hooks/useBypassSilentModeChoice.ts — Picker-side hook for the bypassSilentMode prefs
// field (boolean). Dispatches hrv:prefs-changed with detail.key === 'bypassSilentMode'.

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

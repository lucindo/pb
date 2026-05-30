// src/hooks/useSwitcherIconChoice.ts — Picker-side hook for the switcherIcon prefs field
// (boolean). Dispatches hrv:prefs-changed with detail.key === 'switcherIcon'.

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'

export function useSwitcherIconChoice(): { switcherIcon: boolean; setSwitcherIcon: (next: boolean) => void } {
  const [switcherIcon, setSwitcherIconState] = useState<boolean>(() => loadPrefs().switcherIcon)

  const setSwitcherIcon = useCallback((next: boolean): void => {
    const current = loadPrefs()
    savePrefs({ ...current, switcherIcon: next })
    setSwitcherIconState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'switcherIcon', value: next } }),
    )
  }, [])

  return { switcherIcon, setSwitcherIcon }
}

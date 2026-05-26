// src/hooks/useSwitcherIconChoice.ts — Phase 47 Plan 04 (D-09): paste-and-rename of useTimbreChoice for the switcherIcon field (boolean type — no type import needed). Dispatches hrv:prefs-changed with detail.key === 'switcherIcon' per D-10.

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

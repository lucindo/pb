// src/hooks/useVisualCue.ts
//
// Phase 25 Plan 02: App-side orchestrator hook for the cue dimension.
// Mirror of useVisualVariant minus any OS-driven effects (cue is render-local, not OS-driven).
//
// Seeds state from loadPrefs().cue. Subscribes to cross-tab 'storage' events (A-04)
// and same-tab 'hrv:prefs-changed' CustomEvents filtered on detail.key === 'cue' || undefined
// (D-22: same event name shared with Phase 16/17/18/19; broadcast-all branch preserved for forward-compat).

import { useEffect, useState } from 'react'

import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { CueStyleId } from '../domain/settings'

export function useVisualCue(): { cue: CueStyleId; setCue: (next: CueStyleId) => void } {
  const [cue, setCue] = useState<CueStyleId>(() => loadPrefs().cue)

  // Cross-tab 'storage' listener — A-04. Empty deps: setCue + loadPrefs + STATE_KEY are stable.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setCue(loadPrefs().cue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Same-tab 'hrv:prefs-changed' CustomEvent listener — A-03 / D-22.
  // Native 'storage' event does NOT fire in writing tab (Pitfall 4); this is the sole same-tab sync primitive.
  useEffect(() => {
    const onPrefsChanged = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return
      const detail = e.detail as { key?: string } | null
      if (!detail || detail.key === 'cue' || detail.key === undefined) {
        setCue(loadPrefs().cue)
      }
    }
    window.addEventListener('hrv:prefs-changed', onPrefsChanged)
    return () => {
      window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
    }
  }, [])

  return { cue, setCue }
}

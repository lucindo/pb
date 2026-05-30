// src/hooks/useVisualCue.ts
//
// App-side orchestrator hook for the cue dimension.
// Mirror of useVisualVariant minus any OS-driven effects (cue is render-local, not OS-driven).
//
// Seeds state from loadPrefs().cue. Subscribes to cross-tab 'storage' events and
// same-tab 'hrv:prefs-changed' CustomEvents filtered on detail.key === 'cue' || undefined
// (same event name shared with theme/timbre/locale hooks; broadcast-all preserved for forward-compat).

import { useEffect, useState } from 'react'

import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { CueStyleId } from '../domain/settings'

export function useVisualCue(): { cue: CueStyleId } {
  // setCue is intentionally NOT returned — it is the raw useState setter, used
  // only by the sync effects below. The hook surface exposes a read-only `cue`,
  // matching useVisualVariant. Writes go through useCueChoice (savePrefs + event).
  const [cue, setCue] = useState<CueStyleId>(() => loadPrefs().cue)

  // Cross-tab 'storage' listener (empty deps). setCue + loadPrefs + STATE_KEY are stable.
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

  // Same-tab 'hrv:prefs-changed' CustomEvent listener.
  // Native 'storage' event does NOT fire in writing tab; this is the sole same-tab sync primitive.
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

  return { cue }
}

// src/hooks/useVisualVariant.ts
//
// Phase 17 Plan 04: App-side orchestrator hook for the variant dimension.
// Mirror of useTheme minus Effects 1+2 (D-16: variant is render-local, not OS-driven).
//
// Seeds state from loadPrefs().variant. Subscribes to cross-tab 'storage' events (A-04)
// and same-tab 'hrv:prefs-changed' CustomEvents filtered on detail.key === 'variant' || undefined
// (D-22: same event name shared with Phase 16/18/19; broadcast-all branch preserved for forward-compat).

import { useEffect, useState } from 'react'

import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { VisualVariantId } from '../domain/settings'

export function useVisualVariant(): { variant: VisualVariantId; setVariant: (next: VisualVariantId) => void } {
  const [variant, setVariant] = useState<VisualVariantId>(() => loadPrefs().variant)

  // Cross-tab 'storage' listener — A-04. Empty deps: setVariant + loadPrefs + STATE_KEY are stable.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setVariant(loadPrefs().variant)
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
      if (!detail || detail.key === 'variant' || detail.key === undefined) {
        setVariant(loadPrefs().variant)
      }
    }
    window.addEventListener('hrv:prefs-changed', onPrefsChanged)
    return () => {
      window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
    }
  }, [])

  return { variant, setVariant }
}

// src/hooks/useBypassSilentMode.ts
//
// App-side orchestrator hook for the bypass-silent-mode setting.
// Mirror of useVisualCue — a read-only pref whose value is consumed by the
// audio path (threaded into createAudioEngine at engine-construction time).
//
// Seeds state from loadPrefs().bypassSilentMode. Subscribes to cross-tab
// 'storage' events and same-tab 'hrv:prefs-changed' CustomEvents filtered on
// detail.key === 'bypassSilentMode' || undefined (same event name shared with
// the theme/cue/locale hooks; broadcast-all preserved for forward-compat).
//
// Writes go through usePreferenceChoice('bypassSilentMode') on the Advanced page.

import { useEffect, useState } from 'react'

import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'

export function useBypassSilentMode(): { bypassSilentMode: boolean } {
  const [bypassSilentMode, setBypassSilentMode] = useState<boolean>(
    () => loadPrefs().bypassSilentMode,
  )

  // Cross-tab 'storage' listener (empty deps). setBypassSilentMode + loadPrefs + STATE_KEY are stable.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setBypassSilentMode(loadPrefs().bypassSilentMode)
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
      const detail: unknown = e.detail
      const key =
        typeof detail === 'object' && detail !== null
          ? (detail as { key?: unknown }).key
          : undefined
      if (key === undefined || key === 'bypassSilentMode') {
        setBypassSilentMode(loadPrefs().bypassSilentMode)
      }
    }
    window.addEventListener('hrv:prefs-changed', onPrefsChanged)
    return () => {
      window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
    }
  }, [])

  return { bypassSilentMode }
}

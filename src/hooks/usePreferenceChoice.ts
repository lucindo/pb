// Generic picker-side hook for a single UserPrefs field. Replaces the per-field
// clones (theme / bypassSilentMode), which differed only by key + type.
//
// Role: provides the picker's optimistic-UI local state plus a setter that writes
// the merged envelope to disk and dispatches 'hrv:prefs-changed'. App-side
// listeners (useTheme, useVisualCue, useBypassSilentMode) filter on detail.key.
//
// Why the custom event: the browser 'storage' event does NOT fire in the writing
// tab, so this is the sole same-tab sync primitive back to the App-side hooks.
//
// Why local state mirror: optimistic UI — the option button reflects the choice
// instantly without waiting for the event round-trip.

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs, type UserPrefs } from '../storage/prefs'

export function usePreferenceChoice<K extends keyof UserPrefs>(
  key: K,
): readonly [UserPrefs[K], (next: UserPrefs[K]) => void] {
  const [value, setValue] = useState<UserPrefs[K]>(() => loadPrefs()[key])

  const set = useCallback((next: UserPrefs[K]): void => {
    // Fresh read of the current envelope (never a stale mount-time closure) so
    // the other prefs fields survive the merge. loadPrefs() returns a fresh
    // object, so assigning into it before savePrefs is safe.
    const updated = loadPrefs()
    updated[key] = next
    savePrefs(updated)
    setValue(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key, value: next } }),
    )
  }, [key])

  return [value, set]
}

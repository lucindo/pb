// src/hooks/useThemeChoice.ts
//
// Picker-side companion hook to useTheme.
//
// Role: called from ThemePicker.tsx to provide the picker's local state and the
// setTheme setter that writes to disk + signals useTheme to re-read.
//
// Why it dispatches 'hrv:prefs-changed':
//   The browser 'storage' event does NOT fire in the writing tab. This custom
//   event is the sole same-tab sync primitive back to App-side useTheme. useTheme
//   listens for it and re-reads loadPrefs().theme to update dataset.theme.
//
// Why the detail shape is { key, value } not { theme }:
//   Forward-compat — the same event name dispatches a different key per dimension;
//   useTheme filters on detail.key === 'theme'.
//
// Why the local state mirror is kept:
//   Optimistic-UI for the picker — the option button shows the new selection
//   instantly without waiting for the custom-event round-trip through App.

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { ThemeId } from '../domain/settings'

export function useThemeChoice(): { theme: ThemeId; setTheme: (next: ThemeId) => void } {
  const [theme, setThemeState] = useState<ThemeId>(() => loadPrefs().theme)

  // useCallback with empty deps for stable identity. Callers (ThemePicker) won't
  // churn re-renders when the hook re-renders for other reasons.
  const setTheme = useCallback((next: ThemeId): void => {
    // 1. Fresh read of current envelope (do NOT use stale `theme` closure from mount).
    const current = loadPrefs()
    // 2. Write merged envelope — preserves timbre/variant/locale per-field isolation.
    savePrefs({ ...current, theme: next })
    // 3. Update local React state for optimistic-UI (picker reflects change immediately).
    setThemeState(next)
    // 4. Dispatch custom event so useTheme (in App) re-reads loadPrefs() and updates <html data-theme>.
    //    Fresh CustomEvent per dispatch — event objects are stateful.
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: next } }),
    )
  }, [])

  return { theme, setTheme }
}

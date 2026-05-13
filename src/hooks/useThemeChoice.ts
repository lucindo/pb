// src/hooks/useThemeChoice.ts
//
// Phase 16 Plan 02: Picker-side companion hook to useTheme (A-02).
//
// Role: called from ThemePicker.tsx (plan 04) to provide the picker's local state
// and the setTheme setter that writes to disk + signals useTheme to re-read.
//
// Why it dispatches 'hrv:prefs-changed':
//   The browser 'storage' event does NOT fire in the writing tab (MDN-documented Pitfall 4).
//   This custom event is the sole same-tab sync primitive back to App-side useTheme.
//   useTheme listens for it and re-reads loadPrefs().theme to update document.documentElement.dataset.theme.
//
// Why the detail shape is { key, value } not { theme }:
//   Forward-compat with Phase 17/18/19 (variant/timbre/locale) — the same event name dispatches
//   a different key per dimension; useTheme filters on detail.key === 'theme'.
//   (RESEARCH Open Question #3 recommendation.)
//
// Why the local state mirror is kept:
//   Optimistic-UI for the picker — the option button shows the new selection instantly
//   without waiting for the custom-event round-trip through App (A-02 requirement).

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { ThemeId } from '../domain/settings'

export function useThemeChoice(): { theme: ThemeId; setTheme: (next: ThemeId) => void } {
  const [theme, setThemeState] = useState<ThemeId>(() => loadPrefs().theme)

  // useCallback with empty deps for stable identity — mirrors App.tsx:218-224 persistedSetSettings pattern.
  // Callers (ThemePicker) won't churn re-renders when the hook re-renders for other reasons.
  const setTheme = useCallback((next: ThemeId): void => {
    // 1. Fresh read of current envelope (do NOT use stale `theme` closure from mount).
    const current = loadPrefs()
    // 2. Write merged envelope — preserves timbre/variant/locale per Phase 14 D-17 per-field isolation.
    savePrefs({ ...current, theme: next })
    // 3. Update local React state for optimistic-UI (picker reflects change immediately).
    setThemeState(next)
    // 4. Dispatch custom event so useTheme (in App) re-reads loadPrefs() and updates <html data-theme>.
    //    Fresh CustomEvent per dispatch — event objects are stateful (currentTarget, timeStamp, etc.).
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: next } }),
    )
  }, [])

  return { theme, setTheme }
}

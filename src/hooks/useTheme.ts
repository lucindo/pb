// src/hooks/useTheme.ts
//
// App-side orchestrator hook that wires user theme choices to
// document.documentElement.dataset.theme.
//
// Architecture:
//   - Seeds React state from loadPrefs().theme at mount (coerce guarantees a valid ThemeId).
//   - Apply effect (dep [theme]): writes data-theme directly for named themes; defers to
//     the gated mql effect for 'system' (avoids double-write).
//   - Gated mql effect (dep [theme]): attaches the matchMedia listener ONLY when
//     state === 'system'. Re-seeds immediately on mount to close the stale-initial-state window.
//   - Cross-tab 'storage' listener (empty deps): re-reads loadPrefs().theme on STATE_KEY writes.
//   - Same-tab 'hrv:prefs-changed' listener (empty deps): re-reads loadPrefs().theme when
//     key === 'theme'. Closes the gap the native 'storage' event leaves open (fires only in
//     other tabs).
//
// useTheme does NOT call savePrefs — the picker-side usePreferenceChoice('theme') owns that path.

import { useEffect, useState } from 'react'

import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { ThemeId } from '../domain/settings'

const MQL_QUERY = '(prefers-color-scheme: dark)'

export function useTheme(): { theme: ThemeId; setTheme: (next: ThemeId) => void } {
  const [theme, setTheme] = useState<ThemeId>(() => loadPrefs().theme)

  // Effect 1: Apply effect — write data-theme for named themes (dep [theme]).
  // When theme === 'system', return early; the gated mql effect below owns the write.
  useEffect(() => {
    if (theme === 'system') return
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Effect 2: Gated mql effect — attach matchMedia listener only when state === 'system'.
  // dep [theme] so React tears down the listener when the user switches from 'system' to a named theme.
  useEffect(() => {
    // Only attach the mql listener when we are in system mode.
    if (theme !== 'system') return
    // Reason: defensive guard for environments where matchMedia may be absent (e.g., jsdom without polyfill); typed as always-defined by DOM lib but absent in some test hosts.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) return
    const mql = window.matchMedia(MQL_QUERY)
    // Re-seed from the live MediaQueryList on mount to close the stale-initial-state window.
    // Writing to documentElement.dataset.theme is NOT a setState call — it's a direct DOM write.
    document.documentElement.dataset.theme = mql.matches ? 'dark' : 'light'
    const onChange = (event: MediaQueryListEvent): void => {
      document.documentElement.dataset.theme = event.matches ? 'dark' : 'light'
    }
    mql.addEventListener('change', onChange)
    return () => {
      mql.removeEventListener('change', onChange)
    }
  }, [theme])

  // Effect 3: Cross-tab 'storage' listener (empty deps).
  // Empty deps are correct: setTheme (from useState) is stable; loadPrefs and STATE_KEY are module-level.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setTheme(loadPrefs().theme)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Effect 4: Same-tab 'hrv:prefs-changed' CustomEvent listener (empty deps).
  // The native 'storage' event does NOT fire in the writing tab, so this custom event is the
  // sole same-tab sync primitive from usePreferenceChoice('theme') back to App-side useTheme.
  // Forward-compat: a payload without 'key' (undefined/null) is treated as "re-read all prefs"
  // (other hooks dispatch different keys for variant/timbre/locale on the same event name).
  useEffect(() => {
    const onPrefsChanged = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return
      const detail: unknown = e.detail
      const key =
        typeof detail === 'object' && detail !== null
          ? (detail as { key?: unknown }).key
          : undefined
      if (key === undefined || key === 'theme') {
        setTheme(loadPrefs().theme)
      }
    }
    window.addEventListener('hrv:prefs-changed', onPrefsChanged)
    return () => {
      window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
    }
  }, [])

  return { theme, setTheme }
}

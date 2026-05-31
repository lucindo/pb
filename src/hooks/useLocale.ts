// src/hooks/useLocale.ts
//
// App-side orchestrator hook for the locale dimension.
//
// 3-effect structure:
//   Effect 1 (apply lang, dep [locale]): writes lang attribute on every locale change.
//     No FOUC inline script needed (unlike data-theme) — the attribute is set
//     synchronously on first React render.
//   Effect 2 (cross-tab storage, empty deps): 'storage' events re-read loadPrefs().locale.
//   Effect 3 (same-tab prefs-changed, empty deps): 'hrv:prefs-changed' CustomEvents
//     filtered on locale key or undefined re-read loadPrefs().locale.
//
// No gated mql effect (locale has no system-mode counterpart — always explicit).
// useLocale does NOT call savePrefs — picker-side useLocaleChoice owns the write path.

import { useEffect, useState } from 'react'

import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { LocaleId } from '../domain/settings'
import { UI_STRINGS, type UiStrings } from '../content/strings'

export function useLocale(): { locale: LocaleId; uiStrings: UiStrings } {
  const [locale, setLocale] = useState<LocaleId>(() => loadPrefs().locale)

  // Effect 1: Apply effect — write lang attribute on every locale change.
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  // Effect 2: Cross-tab 'storage' listener (empty deps).
  // setLocale is stable; loadPrefs and STATE_KEY are module-level constants.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setLocale(loadPrefs().locale)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Effect 3: Same-tab 'hrv:prefs-changed' CustomEvent listener (empty deps).
  // The native 'storage' event does NOT fire in the writing tab; this custom event is the
  // sole same-tab sync primitive from useLocaleChoice back to App-side useLocale.
  // Forward-compat: a payload without 'key' (undefined) is treated as "re-read all prefs"
  // (shared event name with other hooks dispatching different keys).
  useEffect(() => {
    const onPrefsChanged = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return
      const detail: unknown = e.detail
      const key =
        typeof detail === 'object' && detail !== null
          ? (detail as { key?: unknown }).key
          : undefined
      if (key === undefined || key === 'locale') {
        setLocale(loadPrefs().locale)
      }
    }
    window.addEventListener('hrv:prefs-changed', onPrefsChanged)
    return () => {
      window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
    }
  }, [])

  return { locale, uiStrings: UI_STRINGS[locale] }
}

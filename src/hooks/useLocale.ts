// src/hooks/useLocale.ts
//
// Phase 19 I18N-01..I18N-07: App-side orchestrator hook for the locale dimension.
// Structural mirror of useVisualVariant.ts (2 listener effects, no system-mode branch)
// plus Effect 1 that sets the lang attribute on locale change (D-07: no FOUC inline
// script in index.html required, unlike data-theme which has an index.html inline script).
//
// 3-effect structure:
//   Effect 1 (apply lang, dep [locale]): writes lang attribute on every locale change.
//   Effect 2 (cross-tab storage, empty deps): 'storage' events re-read loadPrefs().locale (A-04).
//   Effect 3 (same-tab prefs-changed, empty deps): 'hrv:prefs-changed' CustomEvents filtered
//     filtered on locale key or undefined re-read loadPrefs().locale (D-21 contract reuse).
//
// Note: the gated mql effect from useTheme.ts has NO analog here — locale has no system-mode
// counterpart (D-07: locale is always explicit, never derived from OS preference).
//
// Note: useLocale does NOT call savePrefs (D-05 separation — picker-side useLocaleChoice owns
// the write path; this hook is a read-only orchestrator for App.tsx state).

import { useEffect, useState } from 'react'

import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { LocaleId } from '../domain/settings'
import { UI_STRINGS, type UiStrings } from '../content/strings'

export function useLocale(): { locale: LocaleId; uiStrings: UiStrings } {
  const [locale, setLocale] = useState<LocaleId>(() => loadPrefs().locale)

  // Effect 1: Apply effect — write lang attribute on every locale change (D-07; no FOUC
  // script in index.html needed — the attribute is set synchronously on first React render).
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  // Effect 2: Cross-tab 'storage' listener — A-04 mirror.
  // Empty deps are correct: setLocale (from useState) is stable; loadPrefs and STATE_KEY
  // are module-level constants.
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

  // Effect 3: Same-tab 'hrv:prefs-changed' CustomEvent listener — D-21 contract reuse.
  // The native 'storage' event does NOT fire in the writing tab (Pitfall 4); this custom
  // event is the sole same-tab sync primitive from useLocaleChoice back to App-side useLocale.
  // Forward-compat: a payload without 'key' (undefined) is treated as "re-read all prefs"
  // (shared event name with Phase 16/17/18 hooks dispatching different keys).
  useEffect(() => {
    const onPrefsChanged = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return
      const detail = e.detail as { key?: string } | null
      if (!detail || detail.key === 'locale' || detail.key === undefined) {
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

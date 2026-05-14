// src/hooks/useLocaleChoice.ts
//
// Phase 19: Picker-side companion hook for LanguagePicker.tsx (D-08 + D-21 — no App-side
// orchestrator hook needed; the CustomEvent dispatch is kept for forward-compat
// with the same-tab sibling-picker sync surface).
//
// Role: called from LanguagePicker.tsx (Plan 03) to provide the picker's local state
// and the setLocale setter that writes to disk + dispatches a same-tab sync event.
//
// Why it dispatches 'hrv:prefs-changed':
//   The browser 'storage' event does NOT fire in the writing tab (MDN-documented Pitfall 4).
//   This custom event is the same-tab sync primitive so sibling pickers / future App-side
//   consumers can opt-in by filtering on detail.key === 'locale' (D-21 contract reuse).
//
// Why the detail shape is { key, value } not { locale }:
//   Forward-compat with Phase 16/17/18/19 (theme/variant/timbre/locale) — the same event name
//   dispatches a different key per dimension; consumers filter on detail.key.
//   D-22 (Phase 17): one event name ('hrv:prefs-changed'), filtered consumers per dimension.
//
// Why the local state mirror is kept:
//   Optimistic-UI for the picker — the option button shows the new selection instantly
//   without waiting for any custom-event round-trip.

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { LocaleId } from '../domain/settings'

export function useLocaleChoice(): { locale: LocaleId; setLocale: (next: LocaleId) => void } {
  const [locale, setLocaleState] = useState<LocaleId>(() => loadPrefs().locale)

  // useCallback with empty deps for stable identity — mirrors useVariantChoice.ts line 32.
  // Callers (LanguagePicker) won't churn re-renders when the hook re-renders for other reasons.
  const setLocale = useCallback((next: LocaleId): void => {
    // 1. Fresh read of current envelope (do NOT use stale `locale` closure from mount).
    const current = loadPrefs()
    // 2. Write merged envelope — preserves theme/variant/timbre per Phase 14 D-17 per-field isolation.
    savePrefs({ ...current, locale: next })
    // 3. Update local React state for optimistic-UI (picker reflects change immediately).
    setLocaleState(next)
    // 4. Dispatch custom event so sibling pickers/hooks filter on detail.key === 'locale'.
    //    Fresh CustomEvent per dispatch — event objects are stateful (currentTarget, timeStamp, etc.).
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'locale', value: next } }),
    )
  }, [])

  return { locale, setLocale }
}

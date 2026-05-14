// src/hooks/useVariantChoice.ts
//
// Phase 17 Plan 04: Picker-side companion hook to useVisualVariant (A-02).
//
// Role: called from VariantPicker.tsx (plan 05) to provide the picker's local state
// and the setVariant setter that writes to disk + signals useVisualVariant to re-read.
//
// Why it dispatches 'hrv:prefs-changed':
//   The browser 'storage' event does NOT fire in the writing tab (MDN-documented Pitfall 4).
//   This custom event is the sole same-tab sync primitive back to App-side useVisualVariant.
//   useVisualVariant listens for it and re-reads loadPrefs().variant to update local state.
//
// Why the detail shape is { key, value } not { variant }:
//   Forward-compat with Phase 17/18/19 (variant/timbre/locale) — the same event name dispatches
//   a different key per dimension; useVisualVariant filters on detail.key === 'variant'.
//   D-22: one event name ('hrv:prefs-changed'), three filtered consumers — Phase 16/17/18/19.
//
// Why the local state mirror is kept:
//   Optimistic-UI for the picker — the option button shows the new selection instantly
//   without waiting for the custom-event round-trip through App (A-02 requirement).

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { VisualVariantId } from '../domain/settings'

export function useVariantChoice(): { variant: VisualVariantId; setVariant: (next: VisualVariantId) => void } {
  const [variant, setVariantState] = useState<VisualVariantId>(() => loadPrefs().variant)

  // useCallback with empty deps for stable identity — mirrors App.tsx:218-224 persistedSetSettings pattern.
  // Callers (VariantPicker) won't churn re-renders when the hook re-renders for other reasons.
  const setVariant = useCallback((next: VisualVariantId): void => {
    // 1. Fresh read of current envelope (do NOT use stale `variant` closure from mount).
    const current = loadPrefs()
    // 2. Write merged envelope — preserves theme/timbre/locale per Phase 14 D-17 per-field isolation.
    savePrefs({ ...current, variant: next })
    // 3. Update local React state for optimistic-UI (picker reflects change immediately).
    setVariantState(next)
    // 4. Dispatch custom event so useVisualVariant (in App) re-reads loadPrefs() and updates local state.
    //    Fresh CustomEvent per dispatch — event objects are stateful (currentTarget, timeStamp, etc.).
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: next } }),
    )
  }, [])

  return { variant, setVariant }
}

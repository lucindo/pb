// src/hooks/useTimbreChoice.ts
//
// Picker-side companion hook for TimbrePicker.tsx. No App-side orchestrator hook
// needed; the CustomEvent dispatch is kept for forward-compat with the same-tab
// sibling-picker sync surface.
//
// Role: called from TimbrePicker.tsx to provide the picker's local state and the
// setTimbre setter that writes to disk + dispatches a same-tab sync event.
//
// Why it dispatches 'hrv:prefs-changed':
//   The browser 'storage' event does NOT fire in the writing tab. This custom
//   event is the same-tab sync primitive so sibling pickers / future App-side
//   consumers can opt-in by filtering on detail.key === 'timbre'.
//
// Why the detail shape is { key, value } not { timbre }:
//   Forward-compat — the same event name dispatches a different key per dimension;
//   consumers filter on detail.key. One event name, filtered consumers per dimension.
//
// Why the local state mirror is kept:
//   Optimistic-UI for the picker — the option button shows the new selection
//   instantly without waiting for any custom-event round-trip.

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { TimbreId } from '../domain/settings'

export function useTimbreChoice(): { timbre: TimbreId; setTimbre: (next: TimbreId) => void } {
  const [timbre, setTimbreState] = useState<TimbreId>(() => loadPrefs().timbre)

  // useCallback with empty deps for stable identity. Callers (TimbrePicker) won't
  // churn re-renders when the hook re-renders for other reasons.
  const setTimbre = useCallback((next: TimbreId): void => {
    // 1. Fresh read of current envelope (do NOT use stale `timbre` closure from mount).
    const current = loadPrefs()
    // 2. Write merged envelope — preserves theme/variant/locale per-field isolation.
    savePrefs({ ...current, timbre: next })
    // 3. Update local React state for optimistic-UI (picker reflects change immediately).
    setTimbreState(next)
    // 4. Dispatch custom event so sibling pickers/hooks filter on detail.key === 'timbre'.
    //    Fresh CustomEvent per dispatch — event objects are stateful.
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'timbre', value: next } }),
    )
  }, [])

  return { timbre, setTimbre }
}

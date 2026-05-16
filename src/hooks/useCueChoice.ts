// src/hooks/useCueChoice.ts
//
// Phase 25 Plan 02: Picker-side companion hook to useVisualCue (A-02).
//
// Role: called from CuePicker.tsx (plan 04) to provide the picker's local state
// and the setCue setter that writes to disk + signals useVisualCue to re-read.
//
// Why it dispatches 'hrv:prefs-changed':
//   The browser 'storage' event does NOT fire in the writing tab (MDN-documented Pitfall 4).
//   This custom event is the sole same-tab sync primitive back to App-side useVisualCue.
//   useVisualCue listens for it and re-reads loadPrefs().cue to update local state.
//
// Why the detail shape is { key, value } not { cue }:
//   Forward-compat with Phase 16/17/18/19 (theme/variant/timbre/locale) — the same event name
//   dispatches a different key per dimension; useVisualCue filters on detail.key === 'cue'.
//   D-22: one event name ('hrv:prefs-changed'), key-filtered consumers — Phase 16/17/18/19/25.
//
// Why the local state mirror is kept:
//   Optimistic-UI for the picker — the option button shows the new selection instantly
//   without waiting for the custom-event round-trip through App (A-02 requirement).

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { CueStyleId } from '../domain/settings'

export function useCueChoice(): { cue: CueStyleId; setCue: (next: CueStyleId) => void } {
  const [cue, setCueState] = useState<CueStyleId>(() => loadPrefs().cue)

  // useCallback with empty deps for stable identity — mirrors App.tsx:218-224 persistedSetSettings pattern.
  // Callers (CuePicker) won't churn re-renders when the hook re-renders for other reasons.
  const setCue = useCallback((next: CueStyleId): void => {
    // 1. Fresh read of current envelope (do NOT use stale `cue` closure from mount).
    const current = loadPrefs()
    // 2. Write merged envelope — preserves theme/timbre/variant/locale per Phase 14 D-17 per-field isolation.
    savePrefs({ ...current, cue: next })
    // 3. Update local React state for optimistic-UI (picker reflects change immediately).
    setCueState(next)
    // 4. Dispatch custom event so useVisualCue (in App) re-reads loadPrefs() and updates local state.
    //    Fresh CustomEvent per dispatch — event objects are stateful (currentTarget, timeStamp, etc.).
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'cue', value: next } }),
    )
  }, [])

  return { cue, setCue }
}

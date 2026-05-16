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
// AC-WR-03: single source of truth.
//   `cue` is no longer a separate useState mirror — it is read straight from
//   useVisualCue, the same hook App reads. useVisualCue already subscribes to
//   both the cross-tab 'storage' event and the same-tab 'hrv:prefs-changed'
//   CustomEvent, so the picker reflects ANY write to prefs.cue (including a
//   direct savePrefs from elsewhere) and can never desync from the running app.
//   setCue's own dispatch below reaches useVisualCue's same-tab listener, which
//   still gives optimistic-UI: the picker updates on the very next render after
//   the event, without an App round-trip. useCueChoice now owns only the writer.

import { useCallback } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import { useVisualCue } from './useVisualCue'
import type { CueStyleId } from '../domain/settings'

export function useCueChoice(): { cue: CueStyleId; setCue: (next: CueStyleId) => void } {
  // Single source of truth — same hook App reads (AC-WR-03).
  const { cue } = useVisualCue()

  // useCallback with empty deps for stable identity — mirrors App.tsx:218-224 persistedSetSettings pattern.
  // Callers (CuePicker) won't churn re-renders when the hook re-renders for other reasons.
  const setCue = useCallback((next: CueStyleId): void => {
    // 1. Fresh read of current envelope (do NOT use stale `cue` closure from mount).
    const current = loadPrefs()
    // 2. Write merged envelope — preserves theme/timbre/variant/locale per Phase 14 D-17 per-field isolation.
    savePrefs({ ...current, cue: next })
    // 3. Dispatch custom event so useVisualCue re-reads loadPrefs() and updates state.
    //    This is now the SOLE state-update path — the picker's `cue` comes from
    //    useVisualCue, so this dispatch also drives the picker's optimistic-UI.
    //    Fresh CustomEvent per dispatch — event objects are stateful (currentTarget, timeStamp, etc.).
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'cue', value: next } }),
    )
  }, [])

  return { cue, setCue }
}

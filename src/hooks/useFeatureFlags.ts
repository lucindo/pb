// src/hooks/useFeatureFlags.ts
//
// Phase 47 Plan 03 + Phase 49.1 Plan 01: App-side orchestrator hook with persisted-prefs snapshot.
//
// Architecture (mirrors useTheme.ts):
//   - popstate subscription via useSyncExternalStore — URL navigation triggers a
//     re-read of `search` (preserved byte-identical from Plan 01).
//   - useState<UserPrefs> seeded from loadPrefs() at mount (PREFS-01 first-paint).
//   - Cross-tab 'storage' listener (empty deps) — re-reads loadPrefs() on
//     STATE_KEY writes (Phase 8 D-04a contract; event payload discarded).
//   - Same-tab 'hrv:prefs-changed' listener (empty deps) — re-reads loadPrefs()
//     when detail.key is one of breathingShape/ringCue/orbIdle/switcherIcon/bypassSilentMode or
//     undefined (D-11 5-key filter + forward-compat undefined branch; Phase 47 + Phase 49.1 5-key set).
//   - Per-field 5-way merge via readFeatureFlags(search, slim-projection) —
//     query > persisted > default (Plan 01 D-05/D-06/D-07 resolver).
//
// D-08 invariant: this hook is the only non-test caller of readFeatureFlags.
// Hook return type stays FeatureFlags — no breaking change for useAppViewModel
// or PracticeScreen.

import { useEffect, useState, useSyncExternalStore } from 'react'

import { readFeatureFlags, type FeatureFlags } from '../featureFlags'
import { loadPrefs, type UserPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'

function subscribeToLocationSearch(onStoreChange: () => void): () => void {
  window.addEventListener('popstate', onStoreChange)
  return () => {
    window.removeEventListener('popstate', onStoreChange)
  }
}

function getLocationSearchSnapshot(): string {
  return window.location.search
}

function getServerLocationSearchSnapshot(): string {
  return ''
}

export function useFeatureFlags(): FeatureFlags {
  const search = useSyncExternalStore(
    subscribeToLocationSearch,
    getLocationSearchSnapshot,
    getServerLocationSearchSnapshot,
  )

  // Persisted snapshot from disk. Seeded at mount; refreshed on 'storage'
  // (cross-tab) and 'hrv:prefs-changed' (same-tab) events. popstate is handled
  // by useSyncExternalStore above.
  const [persisted, setPersisted] = useState<UserPrefs>(() => loadPrefs())

  // Cross-tab 'storage' listener — re-read persisted snapshot on STATE_KEY
  // writes (Phase 8 D-04a). Event payload is discarded (signal only) — disk is
  // the source of truth; loadPrefs() goes through coercePrefs for the
  // prototype-pollution mitigation T-14-01 / T-25-01.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setPersisted(loadPrefs())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Same-tab 'hrv:prefs-changed' listener — filter on Phase 47 + Phase 49.1 5-key set plus
  // undefined forward-compat per D-11. Unrelated keys (theme / timbre / cue /
  // locale) are ignored to avoid spurious re-renders when those pickers fire.
  useEffect(() => {
    const onPrefsChanged = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return
      const detail = e.detail as { key?: string } | null
      if (
        !detail ||
        detail.key === undefined ||
        detail.key === 'breathingShape' ||
        detail.key === 'ringCue' ||
        detail.key === 'orbIdle' ||
        detail.key === 'switcherIcon' ||
        detail.key === 'bypassSilentMode' // Phase 49.1 D-08: 5th key
      ) {
        setPersisted(loadPrefs())
      }
    }
    window.addEventListener('hrv:prefs-changed', onPrefsChanged)
    return () => {
      window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
    }
  }, [])

  // Per-field 5-way merge: query > persisted > default. The slim projection
  // strips UserPrefs (9 fields) to the 5 FeatureFlags fields — matches the
  // FeatureFlags interface field order exactly. D-09: inline projection
  // chosen over Pick-typed pass-through for clarity at the single call site.
  return readFeatureFlags(search, {
    switcherIcon:     persisted.switcherIcon,
    breathingShape:   persisted.breathingShape,
    orbIdle:          persisted.orbIdle,
    ringCue:          persisted.ringCue,
    bypassSilentMode: persisted.bypassSilentMode, // Phase 49.1 D-05/D-06
  })
}

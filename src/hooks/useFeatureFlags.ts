import { useSyncExternalStore } from 'react'

import { readFeatureFlags, type FeatureFlags } from '../featureFlags'

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

// Phase 47 Plan 01 transitional bridge — readFeatureFlags now takes a second
// `persisted` argument (D-05/D-06/D-07). Plan 03 wires this to loadPrefs() so
// persisted user preferences participate in the resolver. Until then we pass a
// literal equal to the v2.0 production defaults, which preserves byte-identical
// runtime behaviour vs. the prior 1-arg form (D-06 default-wins half).
const PRODUCTION_DEFAULTS: FeatureFlags = {
  switcherIcon: false,
  breathingShape: 'orb-halo',
  orbIdle: 'ambient',
  ringCue: 'progress-arc',
}

export function useFeatureFlags(): FeatureFlags {
  const search = useSyncExternalStore(
    subscribeToLocationSearch,
    getLocationSearchSnapshot,
    getServerLocationSearchSnapshot,
  )

  return readFeatureFlags(search, PRODUCTION_DEFAULTS)
}

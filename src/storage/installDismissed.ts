// src/storage/installDismissed.ts
//
// Dismissal persistence for the phone install banner. Raw boolean key, no
// Envelope wrapper, no per-field coercion (no FOUC dependency, no cross-tab
// sync, no schema). Write failures and read failures are both silent.
// StorageDeps is opt-in (defaults to window.localStorage) for parity with the
// rest of the storage layer.

import type { StorageDeps } from './storage'

const INSTALL_DISMISSED_KEY = 'hrv:install-dismissed'

/**
 * Returns true only when the user has explicitly dismissed the install banner.
 * Any value other than the exact string 'true' (including a missing key,
 * a tampered value, or a throw from Safari ITP) resolves to false.
 */
export function loadInstallDismissed(deps: StorageDeps = {}): boolean {
  const storage = deps.storage ?? window.localStorage
  try {
    return storage.getItem(INSTALL_DISMISSED_KEY) === 'true'
  } catch {
    // Read failures silent
    return false
  }
}

/**
 * Persists the user's dismissal of the install banner.
 * Write failures are swallowed silently — worst case the banner re-appears
 * on the next page load (low-impact, no PII).
 */
export function saveInstallDismissed(deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    storage.setItem(INSTALL_DISMISSED_KEY, 'true')
  } catch {
    // Write failures silent
  }
}

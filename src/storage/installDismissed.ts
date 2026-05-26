// src/storage/installDismissed.ts
//
// Phase 28 INSTALL-04: dismissal persistence for the phone install banner.
// Pattern 4 from RESEARCH.md — raw boolean key, no Envelope wrapper, no
// per-field coercion (no FOUC dependency, no cross-tab sync, no schema).
// D-16: write failures silent. D-17: read failures silent.
//
// StorageDeps is opt-in (defaults to window.localStorage) for parity with
// every other module in the storage layer. The original RESEARCH decision
// to keep this module standalone was about avoiding the Envelope wrapper
// and the version/coercion machinery — not about refusing the dependency-
// injection seam itself. Accepting `deps.storage` costs nothing at the
// default call site (existing callers need no change) and lets tests and
// future "swap the backend" work happen through the same idiom used
// elsewhere.

import type { StorageDeps } from './storage'

const INSTALL_DISMISSED_KEY = 'hrv:install-dismissed'

/**
 * Returns true only when the user has explicitly dismissed the install banner.
 * Any value other than the exact string 'true' (including a missing key,
 * a tampered value, or a throw from Safari ITP) resolves to false — T-28-01.
 */
export function loadInstallDismissed(deps: StorageDeps = {}): boolean {
  const storage = deps.storage ?? window.localStorage
  try {
    return storage.getItem(INSTALL_DISMISSED_KEY) === 'true'
  } catch {
    // D-17: read failures silent
    return false
  }
}

/**
 * Persists the user's dismissal of the install banner.
 * Write failures are swallowed silently — worst case the banner re-appears
 * on the next page load (D-16, T-28-02: low-impact, no PII).
 */
export function saveInstallDismissed(deps: StorageDeps = {}): void {
  const storage = deps.storage ?? window.localStorage
  try {
    storage.setItem(INSTALL_DISMISSED_KEY, 'true')
  } catch {
    // D-16: write failures silent
  }
}

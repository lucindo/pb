// src/storage/installDismissed.ts
//
// Phase 28 INSTALL-04: dismissal persistence for the phone install banner.
// Pattern 4 from RESEARCH.md — raw boolean key, no Envelope wrapper, no StorageDeps
// injection (no FOUC dependency, no cross-tab sync, no per-field coercion needed).
// D-16: write failures silent. D-17: read failures silent.

const INSTALL_DISMISSED_KEY = 'hrv:install-dismissed'

/**
 * Returns true only when the user has explicitly dismissed the install banner.
 * Any value other than the exact string 'true' (including a missing key,
 * a tampered value, or a throw from Safari ITP) resolves to false — T-28-01.
 */
export function loadInstallDismissed(): boolean {
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true'
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
export function saveInstallDismissed(): void {
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
  } catch {
    // D-16: write failures silent
  }
}

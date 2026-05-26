// TypeScript TS 6.0.3 lib.dom.d.ts does not include BeforeInstallPromptEvent.
// Declared locally per the project's non-standard-API typing convention (see useWakeLock.ts).
// The 'appinstalled' event is also absent from WindowEventMap in TS 6.0.3 — cast required
// when calling window.addEventListener('appinstalled', ...).
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}

import { useCallback, useEffect, useState } from 'react'
import { saveInstallDismissed } from '../storage/installDismissed'

export interface UseBeforeInstallPrompt {
  /**
   * The deferred install prompt, or null if the browser has not yet fired
   * `beforeinstallprompt`. Starts as null (D-08: no banner should appear until
   * the event fires — guarantees the install button is always functional).
   */
  deferredPrompt: BeforeInstallPromptEvent | null
  /**
   * Triggers the native Android install prompt. Must be called directly from a
   * user-gesture handler (e.g., onClick) to preserve the gesture chain required
   * by Chrome (Pitfall 2 — calling from a useEffect or setTimeout silently fails).
   */
  triggerInstall(this: void): Promise<void>
}

/**
 * Captures the Android `beforeinstallprompt` window event and exposes a
 * `triggerInstall` function to replay it from a user gesture.
 *
 * D-07: The listener is registered at mount so the event is captured immediately
 * on page load. `deferredPrompt` starts as null and is only populated when the
 * browser fires the event, satisfying D-08 (no banner with a dead install button).
 *
 * The `appinstalled` event also calls `saveInstallDismissed` to handle the path
 * where the user installs via the browser's own UI (not the banner button) — this
 * ensures the banner never re-appears even when `triggerInstall` was not called.
 */
export function useBeforeInstallPrompt(): UseBeforeInstallPrompt {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // D-07: register at mount — captures beforeinstallprompt immediately on page load
    const onBeforeInstall = (e: Event): void => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const onInstalled = (): void => {
      setDeferredPrompt(null)
      // Handle the case where the user installed via browser's own UI (not via the banner button).
      // Must still persist dismissal so the banner never re-appears on next visit (RESEARCH.md Anti-Pattern).
      saveInstallDismissed()
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    // appinstalled is absent from WindowEventMap in TS 6.0.3 — cast required (Pitfall 7)
    window.addEventListener('appinstalled' as keyof WindowEventMap, onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled' as keyof WindowEventMap, onInstalled)
    }
  }, [])

  const triggerInstall = useCallback(async (): Promise<void> => {
    // D-08: no-op until the browser fires beforeinstallprompt (no banner with dead button)
    if (deferredPrompt === null) return
    try {
      const { outcome } = await deferredPrompt.prompt()
      // prompt() is one-shot — null it immediately after use so it cannot be called twice
      setDeferredPrompt(null)
      if (outcome === 'accepted') {
        // Persist dismissal: user accepted the install, banner should never re-appear
        saveInstallDismissed()
      }
    } catch {
      // Reason: spec-allowed rejection paths (InvalidStateError if already shown,
      // AbortError if UA dismisses via non-outcome path). The prompt is one-shot
      // either way — clear the stale ref so a retry click does not re-reject.
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  return { deferredPrompt, triggerInstall }
}

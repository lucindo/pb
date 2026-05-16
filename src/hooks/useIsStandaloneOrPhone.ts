import { useEffect, useState } from 'react'

// navigator.standalone is an Apple-specific property not present in TS 6.0.3 lib.dom.d.ts.
// Declared locally per the project's non-standard-API typing convention (see useWakeLock.ts).
interface SafariNavigator extends Navigator {
  standalone?: boolean
}

const STANDALONE_QUERY = '(display-mode: standalone)'
const PHONE_QUERY = '(pointer: coarse)'

// CR-01: explicit iOS platform detection. The presence of `navigator.standalone`
// is NOT a reliable iOS signal — it is undefined on iPadOS 13+ desktop-mode
// Safari, and any future browser exposing a `standalone` property would be
// misclassified. Detect the platform from the user-agent instead: iPhone/iPod/iPad
// directly, plus iPadOS 13+ which reports as "Macintosh" with multi-touch support.
function detectIsIOS(): boolean {
  const ua = navigator.userAgent
  return (
    /iP(hone|od|ad)/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  )
}

export interface UseIsStandaloneOrPhone {
  isStandalone: boolean
  isPhone: boolean
  isIOS: boolean
}

/**
 * Detects whether the app is running in standalone (installed PWA) mode and
 * whether the device is a phone-class browser.
 *
 * `isStandalone` is true when the app is running in standalone display mode
 * (via the `display-mode: standalone` media query) OR when iOS's
 * `navigator.standalone` property is true — covering iOS home-screen PWAs on
 * older iOS where `display-mode: standalone` is unreliable (< iOS 16.4).
 *
 * `isPhone` uses the `pointer: coarse` media query, which is the mechanism
 * that prevents the install banner from appearing on desktop browsers (SC5 /
 * RESEARCH.md Open Question 1). Desktop browsers with a mouse report
 * `pointer: fine`, so they will never satisfy `isPhone: true`.
 *
 * Both values subscribe to MediaQueryList `change` events for live updates.
 */
export function useIsStandaloneOrPhone(): UseIsStandaloneOrPhone {
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    // Reason: defensive guard for environments where matchMedia may be absent (e.g., jsdom without polyfill); typed as always-defined by DOM lib but absent in some test hosts.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) {
      return false
    }
    return (
      window.matchMedia(STANDALONE_QUERY).matches ||
      (navigator as SafariNavigator).standalone === true
    )
  })

  const [isPhone, setIsPhone] = useState<boolean>(() => {
    // Reason: defensive guard for environments where matchMedia may be absent (e.g., jsdom without polyfill); typed as always-defined by DOM lib but absent in some test hosts.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) {
      return false
    }
    return window.matchMedia(PHONE_QUERY).matches
  })

  useEffect(() => {
    // Reason: defensive guard for environments where matchMedia may be absent (e.g., jsdom without polyfill); typed as always-defined by DOM lib but absent in some test hosts.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) {
      return
    }
    const mqlStandalone = window.matchMedia(STANDALONE_QUERY)
    const mqlPhone = window.matchMedia(PHONE_QUERY)

    // IN-02: re-seed from live MediaQueryList on mount to close the stale-initial-state window;
    // subsequent updates come from the change listeners (MDN canonical pattern).
    // Reason: re-seed from live MediaQueryList on mount to close the stale-initial-state window.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(
      mqlStandalone.matches || (navigator as SafariNavigator).standalone === true,
    )
    // Reason: re-seed from live MediaQueryList on mount to close the stale-initial-state window.
    setIsPhone(mqlPhone.matches)

    const onStandaloneChange = (event: MediaQueryListEvent): void => {
      setIsStandalone(
        event.matches || (navigator as SafariNavigator).standalone === true,
      )
    }
    const onPhoneChange = (event: MediaQueryListEvent): void => {
      setIsPhone(event.matches)
    }

    mqlStandalone.addEventListener('change', onStandaloneChange)
    mqlPhone.addEventListener('change', onPhoneChange)

    return () => {
      mqlStandalone.removeEventListener('change', onStandaloneChange)
      mqlPhone.removeEventListener('change', onPhoneChange)
    }
  }, [])

  // CR-01/WR-01: iOS is a fixed platform fact for the page lifetime — compute
  // once in lazy state initializer so it is not recomputed on every render.
  const [isIOS] = useState<boolean>(detectIsIOS)

  return { isStandalone, isPhone, isIOS }
}

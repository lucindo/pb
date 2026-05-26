// src/hooks/useFavicon.ts
//
// Phase 21 Plan 02: App-side orchestrator hook for the favicon dimension (D-04, D-05).
// Analogs: useVisualVariant.ts (skeleton — cross-tab storage + same-tab hrv:prefs-changed listeners)
//          useTheme.ts (Effect 2 — gated matchMedia 'system' resolution, S-04 gate).
//
// Architecture:
//   - Keeps useState<ThemeId> purely to drive the S-04 matchMedia gate dependency (recommended
//     by PATTERNS.md — matches useTheme exactly so the matchMedia listener is correctly attached
//     and torn down when switching between 'system' and named themes).
//   - Effect A (dep [theme]): calls applyFavicon on mount and on theme state change.
//   - Effect B (dep [theme], gated): D-05 — attaches matchMedia listener ONLY when theme === 'system';
//     re-seeds from live MediaQueryList on mount (IN-02); attaches 'change' listener for live updates.
//   - Effect C (empty deps): D-04 cross-tab 'storage' listener — setTheme re-fires Effects A+B.
//   - Effect D (empty deps): D-04 same-tab 'hrv:prefs-changed' listener filtered on detail.key === 'theme'.
//
// useFavicon returns void — App.tsx calls it bare (no destructure), mirroring useTheme() call shape.
// It does NOT call savePrefs — picker-side useThemeChoice owns that path (A-01/A-02).

import { useEffect, useState } from 'react'

import { loadPrefs } from '../storage/prefs'
import { STATE_KEY } from '../storage'
import type { ThemeId } from '../domain/settings'
import { buildFaviconDataUri, FAVICON_COLORS } from '../styles/faviconPalette'

// D-05: Module constant copied from useTheme.ts:24 — same matchMedia query for system resolution.
const MQL_QUERY = '(prefers-color-scheme: dark)'

/**
 * Replaces the <link rel="icon"> element with a fresh one pointing to the given data-URI.
 * Chrome does not reliably re-render the tab favicon when the href of an existing <link> is
 * mutated in place. The canonical fix is to remove the old element and append a new one.
 * - null-guarded: if no <link rel="icon"> exists and document.head is present, we still append.
 * - jsdom test host: document.head always exists; the beforeEach injects the link element.
 */
function replaceFaviconLink(dataUri: string): void {
  const oldLink = document.querySelector('link[rel="icon"]')
  const newLink = document.createElement('link')
  newLink.rel = 'icon'
  newLink.type = 'image/svg+xml'
  newLink.setAttribute('href', dataUri)
  if (oldLink) {
    oldLink.remove()
  }
  document.head.appendChild(newLink)
}

/**
 * D-04/D-05: Resolves the given ThemeId to a favicon data-URI and replaces the <link rel="icon">.
 * - Named palettes: directly build the data-URI from FAVICON_COLORS.
 * - 'system': resolve via window.matchMedia then build the URI for the resolved 'light' or 'dark'.
 * - Uses replaceFaviconLink so Chrome re-renders the tab icon reliably on theme switch.
 */
function applyFavicon(theme: ThemeId): void {
  let resolved: Exclude<ThemeId, 'system'>
  if (theme === 'system') {
    // D-05: no separate system favicon — resolve to light/dark via matchMedia.
    // Reason: defensive guard for environments where matchMedia may be absent (e.g., jsdom without polyfill).
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) {
      resolved = 'light'
    } else {
      resolved = window.matchMedia(MQL_QUERY).matches ? 'dark' : 'light'
    }
  } else {
    // After the 'system' branch above, theme is narrowed to Exclude<ThemeId, 'system'>.
    // TypeScript cannot narrow through the conditional branch into resolved's type here,
    // so we reassign directly (theme is already the correct subtype at this point in control flow).
    resolved = theme
  }

  // Verify the resolved theme is in FAVICON_COLORS before building the URI.
  // This is always true by type (Exclude<ThemeId,'system'>), but guard defensively.
  if (!(resolved in FAVICON_COLORS)) return

  const dataUri = buildFaviconDataUri(resolved)
  replaceFaviconLink(dataUri)
}

export function useFavicon(): void {
  const [theme, setTheme] = useState<ThemeId>(() => loadPrefs().theme)

  // Effect A: Apply favicon on mount and when theme state changes (dep [theme]).
  // Reason: in 'system' mode Effect B owns the apply (it re-seeds from the
  // live MediaQueryList), so skipping here avoids a double DOM swap and the
  // brief favicon flicker that follows from removing the <link> twice.
  useEffect(() => {
    if (theme === 'system') return
    applyFavicon(theme)
  }, [theme])

  // Effect B: Gated matchMedia listener — D-05 system resolution (dep [theme], S-04 gate).
  // Attaches ONLY when theme === 'system'; torn down when user switches to a named theme.
  // Re-seeds from live MediaQueryList on mount (IN-02 — closes stale-initial-state window).
  useEffect(() => {
    // S-04 gate: only attach the mql listener in system mode.
    if (theme !== 'system') return
    // Reason: defensive guard for environments where matchMedia may be absent (e.g., jsdom without polyfill).
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.matchMedia) return
    const mql = window.matchMedia(MQL_QUERY)
    // IN-02: re-seed from the live MediaQueryList on mount.
    applyFavicon('system')
    const onChange = (event: MediaQueryListEvent): void => {
      const resolved = event.matches ? 'dark' : 'light'
      replaceFaviconLink(buildFaviconDataUri(resolved))
    }
    mql.addEventListener('change', onChange)
    return () => {
      mql.removeEventListener('change', onChange)
    }
  }, [theme])

  // Effect C: Cross-tab 'storage' listener — D-04 (empty deps).
  // setTheme re-fires Effects A+B and re-applies the favicon.
  // Empty deps are correct: setTheme is stable; loadPrefs and STATE_KEY are module-level.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === STATE_KEY) {
        setTheme(loadPrefs().theme)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Effect D: Same-tab 'hrv:prefs-changed' CustomEvent listener — D-04 (empty deps).
  // The native 'storage' event does NOT fire in the writing tab (Pitfall 4).
  // The favicon rides the existing 'theme' key dispatched by useThemeChoice.ts:42 (FAVI-02).
  // No new 'favicon' event key is introduced here.
  // Forward-compat: undefined/null detail (broadcast-all) treated as re-read all prefs.
  useEffect(() => {
    const onPrefsChanged = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return
      const detail = e.detail as { key?: string } | null
      if (!detail || detail.key === 'theme' || detail.key === undefined) {
        setTheme(loadPrefs().theme)
      }
    }
    window.addEventListener('hrv:prefs-changed', onPrefsChanged)
    return () => {
      window.removeEventListener('hrv:prefs-changed', onPrefsChanged)
    }
  }, [])
}

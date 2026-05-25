// src/hooks/useFavicon.test.ts
//
// Mirrors useTheme.test.ts structure (seedPrefs, makeMqlMock, 8 test cases).
// Analog: src/hooks/useTheme.test.ts (exact match — renderHook on an event-driven
// orchestrator hook with localStorage + matchMedia + custom-event coverage).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useFavicon } from './useFavicon'
import { STATE_KEY } from '../storage'
import { FAVICON_COLORS } from '../styles/faviconPalette'

// Helper: seed the localStorage with a full envelope containing the given theme.
// Mirrors useTheme.test.ts:10-18 seedPrefs helper verbatim.
function seedPrefs(theme: string): void {
  window.localStorage.setItem(
    STATE_KEY,
    JSON.stringify({
      version: 1,
      prefs: { theme, timbre: 'bowl', locale: 'en' },
    }),
  )
}

// Build a full matchMedia mock (eight-field shape including legacy addListener/removeListener).
// Copied verbatim from useTheme.test.ts:23-40.
function makeMqlMock(
  matches: boolean,
  opts: {
    addEventListener?: (type: string, listener: (event: MediaQueryListEvent) => void) => void
    removeEventListener?: (type: string, listener: (event: MediaQueryListEvent) => void) => void
  } = {},
): MediaQueryList {
  return {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: opts.addEventListener ?? (() => {}),
    removeEventListener: opts.removeEventListener ?? (() => {}),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList
}

// Helper to get the current favicon href from the injected <link> element.
function getFaviconHref(): string | null {
  return document.querySelector('link[rel="icon"]')?.getAttribute('href') ?? null
}

beforeEach(() => {
  window.localStorage.clear()
  // Inject a <link rel="icon"> into jsdom document (jsdom doesn't load index.html).
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/svg+xml'
  link.setAttribute('href', '%BASE_URL%favicon.svg')
  document.head.appendChild(link)
})

afterEach(() => {
  window.localStorage.clear()
  // Remove the injected <link rel="icon"> element.
  const link = document.querySelector('link[rel="icon"]')
  if (link) link.remove()
  vi.restoreAllMocks()
})

describe('useFavicon', () => {
  it('seeds favicon from loadPrefs().theme at mount (named theme: dark)', () => {
    seedPrefs('dark')
    renderHook(() => { useFavicon() })
    const href = getFaviconHref()
    // Match against the URL-encoded rrggbb body of the current dark palette hex
    // (FAVICON_COLORS is the source of truth — no hardcoded hex in this assertion).
    expect(href).toContain(FAVICON_COLORS.dark.replace('#', '%23').slice(1))
  })

  it('seeds favicon from loadPrefs().theme at mount (named theme: light)', () => {
    seedPrefs('light')
    renderHook(() => { useFavicon() })
    const href = getFaviconHref()
    expect(href).toContain(FAVICON_COLORS.light.replace('#', '%23').slice(1))
  })

  it('resolves system theme via matchMedia.matches=true → dark favicon', () => {
    seedPrefs('system')
    vi.spyOn(window, 'matchMedia').mockReturnValue(makeMqlMock(true))
    renderHook(() => { useFavicon() })
    const href = getFaviconHref()
    // system + matches=true → resolved to 'dark'
    expect(href).toContain(FAVICON_COLORS.dark.replace('#', '%23').slice(1))
  })

  it('resolves system theme via matchMedia.matches=false → light favicon', () => {
    seedPrefs('system')
    vi.spyOn(window, 'matchMedia').mockReturnValue(makeMqlMock(false))
    renderHook(() => { useFavicon() })
    const href = getFaviconHref()
    // system + matches=false → resolved to 'light'
    expect(href).toContain(FAVICON_COLORS.light.replace('#', '%23').slice(1))
  })

  it('updates favicon live when matchMedia change event fires in system mode', () => {
    seedPrefs('system')
    let captured: ((event: MediaQueryListEvent) => void) | null = null
    vi.spyOn(window, 'matchMedia').mockReturnValue(
      makeMqlMock(false, {
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void): void => {
          captured = listener
        },
      }),
    )
    renderHook(() => { useFavicon() })
    // starts as light (matches=false)
    expect(getFaviconHref()).toContain(FAVICON_COLORS.light.replace('#', '%23').slice(1))

    act(() => {
      captured?.({ matches: true } as MediaQueryListEvent)
    })
    // after change event fires with matches=true → switches to dark
    expect(getFaviconHref()).toContain(FAVICON_COLORS.dark.replace('#', '%23').slice(1))
  })

  it('updates favicon via cross-tab storage event with key === STATE_KEY', async () => {
    seedPrefs('dark')
    renderHook(() => { useFavicon() })
    expect(getFaviconHref()).toContain(FAVICON_COLORS.dark.replace('#', '%23').slice(1))

    // Write the new envelope BEFORE dispatching (Pitfall 6: handler reads disk synchronously)
    const newEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'light', timbre: 'bowl', locale: 'en' },
    })
    window.localStorage.setItem(STATE_KEY, newEnvelope)

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STATE_KEY,
          newValue: newEnvelope,
          oldValue: null,
        }),
      )
    })

    expect(getFaviconHref()).toContain(FAVICON_COLORS.light.replace('#', '%23').slice(1))
  })

  it('ignores cross-tab storage event with unrelated key', async () => {
    seedPrefs('dark')
    renderHook(() => { useFavicon() })
    const hrefBefore = getFaviconHref()

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'some-other-key',
          newValue: 'irrelevant',
          oldValue: null,
        }),
      )
    })

    // href should not have changed
    expect(getFaviconHref()).toBe(hrefBefore)
    expect(getFaviconHref()).toContain(FAVICON_COLORS.dark.replace('#', '%23').slice(1))
  })

  it('updates favicon via same-tab hrv:prefs-changed CustomEvent with key="theme"', async () => {
    seedPrefs('dark')
    renderHook(() => { useFavicon() })
    expect(getFaviconHref()).toContain(FAVICON_COLORS.dark.replace('#', '%23').slice(1))

    // Seed the new theme on disk before dispatching
    seedPrefs('light')

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: 'light' } }),
      )
    })

    expect(getFaviconHref()).toContain(FAVICON_COLORS.light.replace('#', '%23').slice(1))
  })

  it('ignores same-tab hrv:prefs-changed CustomEvent with key="variant"', async () => {
    seedPrefs('dark')
    renderHook(() => { useFavicon() })
    const hrefBefore = getFaviconHref()

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: 'square' } }),
      )
    })

    expect(getFaviconHref()).toBe(hrefBefore)
    expect(getFaviconHref()).toContain(FAVICON_COLORS.dark.replace('#', '%23').slice(1))
  })

  it('does not throw when document has no <link rel="icon"> element', () => {
    // Remove the injected link element for this test
    const link = document.querySelector('link[rel="icon"]')
    if (link) link.remove()

    seedPrefs('dark')
    expect(() => {
      renderHook(() => { useFavicon() })
    }).not.toThrow()
  })
})

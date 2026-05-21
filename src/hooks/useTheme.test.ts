import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useTheme } from './useTheme'
import { STATE_KEY } from '../storage'

// Helper: seed the localStorage with a full envelope containing the given theme.
// The exact envelope shape mirrors the structure used by loadPrefs/coercePrefs
// (Phase 14 D-17 per-field coerce guarantees a valid ThemeId on the way out).
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
// The `as unknown as MediaQueryList` cast at the return is required because the stub only implements
// the fields used by useTheme; the full MediaQueryList interface has additional properties.
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

beforeEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
})

afterEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  vi.restoreAllMocks()
})

describe('useTheme', () => {
  it('seeds state from loadPrefs().theme at mount (named theme: dark)', () => {
    seedPrefs('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('resolves system theme via matchMedia.matches=true → data-theme="dark"', () => {
    seedPrefs('system')
    vi.spyOn(window, 'matchMedia').mockReturnValue(makeMqlMock(true))
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('resolves system theme via matchMedia.matches=false → data-theme="light"', () => {
    seedPrefs('system')
    vi.spyOn(window, 'matchMedia').mockReturnValue(makeMqlMock(false))
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('updates data-theme live when matchMedia change event fires (system mode)', () => {
    seedPrefs('system')
    let captured: ((event: MediaQueryListEvent) => void) | null = null
    vi.spyOn(window, 'matchMedia').mockReturnValue(
      makeMqlMock(false, {
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void): void => {
          captured = listener
        },
      }),
    )
    renderHook(() => useTheme())
    expect(document.documentElement.dataset.theme).toBe('light')

    act(() => {
      captured?.({ matches: true } as MediaQueryListEvent)
    })
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('does NOT attach matchMedia listener when initial theme is a named theme', () => {
    seedPrefs('dark')
    const addSpy = vi.fn()
    vi.spyOn(window, 'matchMedia').mockReturnValue(
      makeMqlMock(false, { addEventListener: addSpy }),
    )
    renderHook(() => useTheme())
    // The mql listener should never be attached for a named theme (S-04 gate)
    expect(addSpy).not.toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('cleans up matchMedia listener on unmount when theme is system', () => {
    seedPrefs('system')
    const removeSpy = vi.fn()
    vi.spyOn(window, 'matchMedia').mockReturnValue(
      makeMqlMock(false, { removeEventListener: removeSpy }),
    )
    const { unmount } = renderHook(() => useTheme())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('updates state via cross-tab storage event with key === STATE_KEY', async () => {
    seedPrefs('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')

    // Write the new envelope BEFORE dispatching (Pitfall 6: handler reads disk synchronously)
    const newEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'moss', timbre: 'bowl', locale: 'en' },
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

    expect(result.current.theme).toBe('moss')
    expect(document.documentElement.dataset.theme).toBe('moss')
  })

  it('ignores cross-tab storage event with unrelated key', async () => {
    seedPrefs('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')

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

    expect(result.current.theme).toBe('dark')
  })

  it('updates state via same-tab hrv:prefs-changed CustomEvent with key="theme"', async () => {
    seedPrefs('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')

    // Seed the new theme on disk before dispatching (same pattern as storage event)
    seedPrefs('dusk')

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: 'dusk' } }),
      )
    })

    expect(result.current.theme).toBe('dusk')
    expect(document.documentElement.dataset.theme).toBe('dusk')
  })

  it('ignores same-tab hrv:prefs-changed CustomEvent with key="variant"', async () => {
    seedPrefs('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: 'square' } }),
      )
    })

    expect(result.current.theme).toBe('dark')
  })
})

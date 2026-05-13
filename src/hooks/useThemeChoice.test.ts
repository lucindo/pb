import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useThemeChoice } from './useThemeChoice'
import { STATE_KEY } from '../storage'
import type { UserPrefs } from '../storage/prefs'

// Helper: seed localStorage with a full UserPrefs envelope.
// Uses the direct envelope shape understood by loadPrefs/coercePrefs.
function seedPrefs(prefs: UserPrefs): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, prefs }))
}

const DEFAULT_FULL_PREFS: UserPrefs = {
  theme: 'system',
  timbre: 'bowl',
  variant: 'orb',
  locale: 'en',
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('useThemeChoice', () => {
  it('initial state matches loadPrefs().theme when localStorage is pre-seeded', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, theme: 'moss' })
    const { result } = renderHook(() => useThemeChoice())
    expect(result.current.theme).toBe('moss')
  })

  it('setTheme("dusk") updates local state optimistically', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, theme: 'moss' })
    const { result } = renderHook(() => useThemeChoice())

    act(() => {
      result.current.setTheme('dusk')
    })

    expect(result.current.theme).toBe('dusk')
  })

  it('setTheme("dusk") writes the new theme to disk via savePrefs', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, theme: 'moss' })
    const { result } = renderHook(() => useThemeChoice())

    act(() => {
      result.current.setTheme('dusk')
    })

    // Verify via direct disk read (matches prefs.test.ts seeding pattern)
    // Reason: STATE_KEY is always present after setTheme; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.theme).toBe('dusk')
  })

  it('setTheme("slate") preserves other prefs fields — envelope merge contract', () => {
    seedPrefs({ theme: 'moss', timbre: 'bell', variant: 'square', locale: 'pt-BR' })
    const { result } = renderHook(() => useThemeChoice())

    act(() => {
      result.current.setTheme('slate')
    })

    // Verify all other fields are preserved (the {...loadPrefs(), theme: next} merge)
    // Reason: STATE_KEY is always present after setTheme; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.theme).toBe('slate')
    expect(raw.prefs.timbre).toBe('bell')
    expect(raw.prefs.variant).toBe('square')
    expect(raw.prefs.locale).toBe('pt-BR')
  })

  it('setTheme("dark") dispatches hrv:prefs-changed CustomEvent with correct detail shape', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, theme: 'moss' })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)

    const { result } = renderHook(() => useThemeChoice())

    act(() => {
      result.current.setTheme('dark')
    })

    window.removeEventListener('hrv:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // Reason: we asserted toHaveBeenCalledTimes(1) above; the array access is safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: string }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('theme')
    expect(event.detail.value).toBe('dark')
  })

  it('setTheme identity is stable across re-renders (useCallback empty deps contract)', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, theme: 'moss' })
    const { result, rerender } = renderHook(() => useThemeChoice())

    const initialSetter = result.current.setTheme
    rerender()

    expect(result.current.setTheme).toBe(initialSetter)
  })
})

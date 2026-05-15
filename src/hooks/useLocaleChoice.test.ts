import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useLocaleChoice } from './useLocaleChoice'
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
  cue: 'labels',
  locale: 'en',
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('useLocaleChoice', () => {
  it('initial state matches loadPrefs().locale when localStorage is pre-seeded', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, locale: 'pt-BR' })
    const { result } = renderHook(() => useLocaleChoice())
    expect(result.current.locale).toBe('pt-BR')
  })

  it('setLocale("pt-BR") updates local state optimistically', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, locale: 'en' })
    const { result } = renderHook(() => useLocaleChoice())

    act(() => {
      result.current.setLocale('pt-BR')
    })

    expect(result.current.locale).toBe('pt-BR')
  })

  it('setLocale("pt-BR") writes the new locale to disk via savePrefs', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, locale: 'en' })
    const { result } = renderHook(() => useLocaleChoice())

    act(() => {
      result.current.setLocale('pt-BR')
    })

    // Verify via direct disk read (matches prefs.test.ts seeding pattern)
    // Reason: STATE_KEY is always present after setLocale; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.locale).toBe('pt-BR')
  })

  it('setLocale("pt-BR") preserves other prefs fields — envelope merge contract', () => {
    seedPrefs({ theme: 'dark', timbre: 'bell', variant: 'square', cue: 'labels', locale: 'en' })
    const { result } = renderHook(() => useLocaleChoice())

    act(() => {
      result.current.setLocale('pt-BR')
    })

    // Verify all other fields are preserved (the {...loadPrefs(), locale: next} merge)
    // Reason: STATE_KEY is always present after setLocale; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.locale).toBe('pt-BR')
    expect(raw.prefs.theme).toBe('dark')
    expect(raw.prefs.timbre).toBe('bell')
    expect(raw.prefs.variant).toBe('square')
  })

  it('setLocale("pt-BR") dispatches hrv:prefs-changed CustomEvent with correct detail shape', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, locale: 'en' })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)

    const { result } = renderHook(() => useLocaleChoice())

    act(() => {
      result.current.setLocale('pt-BR')
    })

    window.removeEventListener('hrv:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // Reason: we asserted toHaveBeenCalledTimes(1) above; the array access is safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: string }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('locale')
    expect(event.detail.value).toBe('pt-BR')
  })

  it('setLocale identity is stable across re-renders (useCallback empty deps contract)', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, locale: 'en' })
    const { result, rerender } = renderHook(() => useLocaleChoice())

    const initialSetter = result.current.setLocale
    rerender()

    expect(result.current.setLocale).toBe(initialSetter)
  })
})

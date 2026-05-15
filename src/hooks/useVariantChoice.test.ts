import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useVariantChoice } from './useVariantChoice'
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

describe('useVariantChoice', () => {
  it('initial state matches loadPrefs().variant when localStorage is pre-seeded', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, variant: 'square' })
    const { result } = renderHook(() => useVariantChoice())
    expect(result.current.variant).toBe('square')
  })

  it('setVariant("square") updates local state optimistically', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, variant: 'orb' })
    const { result } = renderHook(() => useVariantChoice())

    act(() => {
      result.current.setVariant('square')
    })

    expect(result.current.variant).toBe('square')
  })

  it('setVariant("diamond") writes the new variant to disk via savePrefs', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, variant: 'orb' })
    const { result } = renderHook(() => useVariantChoice())

    act(() => {
      result.current.setVariant('diamond')
    })

    // Verify via direct disk read (matches prefs.test.ts seeding pattern)
    // Reason: STATE_KEY is always present after setVariant; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.variant).toBe('diamond')
  })

  it('setVariant("square") preserves other prefs fields — envelope merge contract', () => {
    seedPrefs({ theme: 'dark', timbre: 'bell', variant: 'orb', cue: 'labels', locale: 'pt-BR' })
    const { result } = renderHook(() => useVariantChoice())

    act(() => {
      result.current.setVariant('square')
    })

    // Verify all other fields are preserved (the {...loadPrefs(), variant: next} merge)
    // Reason: STATE_KEY is always present after setVariant; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.variant).toBe('square')
    expect(raw.prefs.theme).toBe('dark')
    expect(raw.prefs.timbre).toBe('bell')
    expect(raw.prefs.locale).toBe('pt-BR')
  })

  it('setVariant("square") dispatches hrv:prefs-changed CustomEvent with correct detail shape', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, variant: 'orb' })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)

    const { result } = renderHook(() => useVariantChoice())

    act(() => {
      result.current.setVariant('square')
    })

    window.removeEventListener('hrv:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // Reason: we asserted toHaveBeenCalledTimes(1) above; the array access is safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: string }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('variant')
    expect(event.detail.value).toBe('square')
  })

  it('setVariant identity is stable across re-renders (useCallback empty deps contract)', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, variant: 'orb' })
    const { result, rerender } = renderHook(() => useVariantChoice())

    const initialSetter = result.current.setVariant
    rerender()

    expect(result.current.setVariant).toBe(initialSetter)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useTimbreChoice } from './useTimbreChoice'
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

describe('useTimbreChoice', () => {
  it('initial state matches loadPrefs().timbre when localStorage is pre-seeded', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, timbre: 'bell' })
    const { result } = renderHook(() => useTimbreChoice())
    expect(result.current.timbre).toBe('bell')
  })

  it('setTimbre("bell") updates local state optimistically', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, timbre: 'bowl' })
    const { result } = renderHook(() => useTimbreChoice())

    act(() => {
      result.current.setTimbre('bell')
    })

    expect(result.current.timbre).toBe('bell')
  })

  it('setTimbre("sine") writes the new timbre to disk via savePrefs', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, timbre: 'bowl' })
    const { result } = renderHook(() => useTimbreChoice())

    act(() => {
      result.current.setTimbre('sine')
    })

    // Verify via direct disk read (matches prefs.test.ts seeding pattern)
    // Reason: STATE_KEY is always present after setTimbre; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.timbre).toBe('sine')
  })

  it('setTimbre("bell") preserves other prefs fields — envelope merge contract', () => {
    seedPrefs({ theme: 'dark', timbre: 'bowl', cue: 'labels', locale: 'pt-BR' })
    const { result } = renderHook(() => useTimbreChoice())

    act(() => {
      result.current.setTimbre('bell')
    })

    // Verify all other fields are preserved (the {...loadPrefs(), timbre: next} merge)
    // Reason: STATE_KEY is always present after setTimbre; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.timbre).toBe('bell')
    expect(raw.prefs.theme).toBe('dark')
    expect(raw.prefs.locale).toBe('pt-BR')
  })

  it('setTimbre("bell") dispatches hrv:prefs-changed CustomEvent with correct detail shape', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, timbre: 'bowl' })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)

    const { result } = renderHook(() => useTimbreChoice())

    act(() => {
      result.current.setTimbre('bell')
    })

    window.removeEventListener('hrv:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // Reason: we asserted toHaveBeenCalledTimes(1) above; the array access is safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: string }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('timbre')
    expect(event.detail.value).toBe('bell')
  })

  it('setTimbre identity is stable across re-renders (useCallback empty deps contract)', () => {
    seedPrefs({ ...DEFAULT_FULL_PREFS, timbre: 'bowl' })
    const { result, rerender } = renderHook(() => useTimbreChoice())

    const initialSetter = result.current.setTimbre
    rerender()

    expect(result.current.setTimbre).toBe(initialSetter)
  })
})

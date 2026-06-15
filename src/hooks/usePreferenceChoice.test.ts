import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { usePreferenceChoice } from './usePreferenceChoice'
import { STATE_KEY } from '../storage'
import { DEFAULT_PREFS, type UserPrefs } from '../storage/prefs'

function seedPrefs(prefs: UserPrefs): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, prefs }))
}

function readPrefs(): UserPrefs {
  // STATE_KEY is always present after a set; non-null asserted by storage contract.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return (JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { prefs: UserPrefs }).prefs
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('usePreferenceChoice', () => {
  it('initial state matches loadPrefs()[key]', () => {
    seedPrefs({ ...DEFAULT_PREFS, timbre: 'bell' })
    const { result } = renderHook(() => usePreferenceChoice('timbre'))
    expect(result.current[0]).toBe('bell')
  })

  it('updates local state optimistically and writes to disk', () => {
    seedPrefs({ ...DEFAULT_PREFS, timbre: 'bell' })
    const { result } = renderHook(() => usePreferenceChoice('timbre'))

    act(() => {
      result.current[1]('flute')
    })

    expect(result.current[0]).toBe('flute')
    expect(readPrefs().timbre).toBe('flute')
  })

  it('works for boolean-typed fields (type-erased generic, not just enum strings)', () => {
    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: false })
    const { result } = renderHook(() => usePreferenceChoice('bypassSilentMode'))

    act(() => {
      result.current[1](true)
    })

    expect(result.current[0]).toBe(true)
    expect(readPrefs().bypassSilentMode).toBe(true)
  })

  it('preserves all other prefs fields — envelope merge contract (4-field UserPrefs)', () => {
    seedPrefs({
      theme: 'dark',
      timbre: 'bell',
      locale: 'pt-BR',
      bypassSilentMode: true,
    })
    const { result } = renderHook(() => usePreferenceChoice('timbre'))

    act(() => {
      result.current[1]('flute')
    })

    const prefs = readPrefs()
    expect(prefs.timbre).toBe('flute')
    expect(prefs.theme).toBe('dark')
    expect(prefs.locale).toBe('pt-BR')
    expect(prefs.bypassSilentMode).toBe(true)
  })

  it('dispatches pattern-breathing:prefs-changed with detail { key, value }', () => {
    seedPrefs({ ...DEFAULT_PREFS, theme: 'light' })
    const spy = vi.fn()
    window.addEventListener('pattern-breathing:prefs-changed', spy)

    const { result } = renderHook(() => usePreferenceChoice('theme'))
    act(() => {
      result.current[1]('dark')
    })

    window.removeEventListener('pattern-breathing:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: unknown }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('theme')
    expect(event.detail.value).toBe('dark')
  })

  it('setter identity is stable across re-renders', () => {
    seedPrefs({ ...DEFAULT_PREFS, timbre: 'bell' })
    const { result, rerender } = renderHook(() => usePreferenceChoice('timbre'))

    const initialSetter = result.current[1]
    rerender()

    expect(result.current[1]).toBe(initialSetter)
  })
})

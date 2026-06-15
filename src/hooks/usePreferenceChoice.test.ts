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
    seedPrefs({ ...DEFAULT_PREFS, orbIdle: 'ambient' })
    const { result } = renderHook(() => usePreferenceChoice('orbIdle'))
    expect(result.current[0]).toBe('ambient')
  })

  it('updates local state optimistically and writes to disk', () => {
    seedPrefs({ ...DEFAULT_PREFS, orbIdle: 'ambient' })
    const { result } = renderHook(() => usePreferenceChoice('orbIdle'))

    act(() => {
      result.current[1]('still')
    })

    expect(result.current[0]).toBe('still')
    expect(readPrefs().orbIdle).toBe('still')
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

  it('preserves all other prefs fields — envelope merge contract (6-field UserPrefs)', () => {
    seedPrefs({
      theme: 'dark',
      timbre: 'bell',
      cue: 'arrow',
      locale: 'pt-BR',
      orbIdle: 'ambient',
      bypassSilentMode: true,
    })
    const { result } = renderHook(() => usePreferenceChoice('orbIdle'))

    act(() => {
      result.current[1]('still')
    })

    const prefs = readPrefs()
    expect(prefs.orbIdle).toBe('still')
    expect(prefs.theme).toBe('dark')
    expect(prefs.timbre).toBe('bell')
    expect(prefs.cue).toBe('arrow')
    expect(prefs.locale).toBe('pt-BR')
    expect(prefs.bypassSilentMode).toBe(true)
  })

  it('dispatches hrv:prefs-changed with detail { key, value }', () => {
    seedPrefs({ ...DEFAULT_PREFS, theme: 'light' })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)

    const { result } = renderHook(() => usePreferenceChoice('theme'))
    act(() => {
      result.current[1]('dark')
    })

    window.removeEventListener('hrv:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: unknown }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('theme')
    expect(event.detail.value).toBe('dark')
  })

  it('setter identity is stable across re-renders', () => {
    seedPrefs({ ...DEFAULT_PREFS, orbIdle: 'ambient' })
    const { result, rerender } = renderHook(() => usePreferenceChoice('orbIdle'))

    const initialSetter = result.current[1]
    rerender()

    expect(result.current[1]).toBe(initialSetter)
  })
})

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
    seedPrefs({ ...DEFAULT_PREFS, cue: 'arrow' })
    const { result } = renderHook(() => usePreferenceChoice('cue'))
    expect(result.current[0]).toBe('arrow')
  })

  it('updates local state optimistically and writes to disk', () => {
    seedPrefs({ ...DEFAULT_PREFS, cue: 'arrow' })
    const { result } = renderHook(() => usePreferenceChoice('cue'))

    act(() => {
      result.current[1]('nose')
    })

    expect(result.current[0]).toBe('nose')
    expect(readPrefs().cue).toBe('nose')
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

  it('preserves all other prefs fields — envelope merge contract (5-field UserPrefs)', () => {
    seedPrefs({
      theme: 'dark',
      timbre: 'bell',
      cue: 'arrow',
      locale: 'pt-BR',
      bypassSilentMode: true,
    })
    const { result } = renderHook(() => usePreferenceChoice('cue'))

    act(() => {
      result.current[1]('nose')
    })

    const prefs = readPrefs()
    expect(prefs.cue).toBe('nose')
    expect(prefs.theme).toBe('dark')
    expect(prefs.timbre).toBe('bell')
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
    seedPrefs({ ...DEFAULT_PREFS, cue: 'arrow' })
    const { result, rerender } = renderHook(() => usePreferenceChoice('cue'))

    const initialSetter = result.current[1]
    rerender()

    expect(result.current[1]).toBe(initialSetter)
  })
})

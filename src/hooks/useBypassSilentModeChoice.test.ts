// src/hooks/useBypassSilentModeChoice.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useBypassSilentModeChoice } from './useBypassSilentModeChoice'
import { STATE_KEY } from '../storage'
import { DEFAULT_PREFS, type UserPrefs } from '../storage/prefs'

// Helper: seed localStorage with a full UserPrefs envelope.
// Mirrors useSwitcherIconChoice.test.ts seedPrefs pattern.
function seedPrefs(prefs: UserPrefs): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, prefs }))
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('useBypassSilentModeChoice', () => {
  it('initial state defaults to true when the field is absent from disk (D-05 default-on-empty)', () => {
    // intentionally do NOT call seedPrefs — let DEFAULT_PREFS.bypassSilentMode (true) win
    const { result } = renderHook(() => useBypassSilentModeChoice())
    expect(result.current.bypassSilentMode).toBe(true)
  })

  it('initial state matches loadPrefs().bypassSilentMode when localStorage is pre-seeded with false', () => {
    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: false })
    const { result } = renderHook(() => useBypassSilentModeChoice())
    expect(result.current.bypassSilentMode).toBe(false)
  })

  it('setBypassSilentMode updates local state optimistically', () => {
    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: true })
    const { result } = renderHook(() => useBypassSilentModeChoice())

    act(() => {
      result.current.setBypassSilentMode(false)
    })

    expect(result.current.bypassSilentMode).toBe(false)
  })

  it('setBypassSilentMode writes the new value to disk via savePrefs', () => {
    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: true })
    const { result } = renderHook(() => useBypassSilentModeChoice())

    act(() => {
      result.current.setBypassSilentMode(false)
    })

    // Reason: STATE_KEY is always present after setBypassSilentMode; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.bypassSilentMode).toBe(false)
  })

  it('setBypassSilentMode preserves all other 8 prefs fields — 9-field envelope merge contract', () => {
    seedPrefs({
      theme: 'dark',
      timbre: 'bell',
      cue: 'arrow',
      locale: 'pt-BR',
      breathingShape: 'spiritual-eye',
      ringCue: 'outer-inner',
      orbIdle: 'still',
      switcherIcon: true,
      bypassSilentMode: true,
    })
    const { result } = renderHook(() => useBypassSilentModeChoice())

    act(() => {
      result.current.setBypassSilentMode(false)
    })

    // Reason: STATE_KEY is always present after setBypassSilentMode; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.bypassSilentMode).toBe(false)
    expect(raw.prefs.theme).toBe('dark')
    expect(raw.prefs.timbre).toBe('bell')
    expect(raw.prefs.cue).toBe('arrow')
    expect(raw.prefs.locale).toBe('pt-BR')
    expect(raw.prefs.breathingShape).toBe('spiritual-eye')
    expect(raw.prefs.ringCue).toBe('outer-inner')
    expect(raw.prefs.orbIdle).toBe('still')
    expect(raw.prefs.switcherIcon).toBe(true)
  })

  it('setBypassSilentMode dispatches hrv:prefs-changed CustomEvent with correct detail shape (D-08)', () => {
    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: true })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)

    const { result } = renderHook(() => useBypassSilentModeChoice())

    act(() => {
      result.current.setBypassSilentMode(false)
    })

    window.removeEventListener('hrv:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // Reason: we asserted toHaveBeenCalledTimes(1) above; the array access is safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: boolean }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('bypassSilentMode')
    expect(event.detail.value).toBe(false)
  })

  it('setBypassSilentMode identity is stable across re-renders (useCallback empty deps contract)', () => {
    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: true })
    const { result, rerender } = renderHook(() => useBypassSilentModeChoice())

    const initialSetter = result.current.setBypassSilentMode
    rerender()

    expect(result.current.setBypassSilentMode).toBe(initialSetter)
  })
})

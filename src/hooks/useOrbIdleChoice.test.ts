import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useOrbIdleChoice } from './useOrbIdleChoice'
import { STATE_KEY } from '../storage'
import { DEFAULT_PREFS, type UserPrefs } from '../storage/prefs'

// Helper: seed localStorage with a full UserPrefs envelope.
// Mirrors useTimbreChoice.test.ts seedPrefs pattern.
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

describe('useOrbIdleChoice', () => {
  it('initial state matches loadPrefs().orbIdle when localStorage is pre-seeded', () => {
    seedPrefs({ ...DEFAULT_PREFS, orbIdle: 'ambient' })
    const { result } = renderHook(() => useOrbIdleChoice())
    expect(result.current.orbIdle).toBe('ambient')
  })

  it('setOrbIdle updates local state optimistically', () => {
    seedPrefs({ ...DEFAULT_PREFS, orbIdle: 'ambient' })
    const { result } = renderHook(() => useOrbIdleChoice())

    act(() => {
      result.current.setOrbIdle('still')
    })

    expect(result.current.orbIdle).toBe('still')
  })

  it('setOrbIdle writes the new value to disk via savePrefs', () => {
    seedPrefs({ ...DEFAULT_PREFS, orbIdle: 'ambient' })
    const { result } = renderHook(() => useOrbIdleChoice())

    act(() => {
      result.current.setOrbIdle('still')
    })

    // Reason: STATE_KEY is always present after setOrbIdle; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.orbIdle).toBe('still')
  })

  it('setOrbIdle preserves all other 7 prefs fields — envelope merge contract (8-field UserPrefs)', () => {
    seedPrefs({
      theme: 'dark',
      timbre: 'bell',
      cue: 'arrow',
      locale: 'pt-BR',
      breathingShape: 'spiritual-eye',
      ringCue: 'outer-inner',
      orbIdle: 'ambient',
      switcherIcon: true,
    })
    const { result } = renderHook(() => useOrbIdleChoice())

    act(() => {
      result.current.setOrbIdle('still')
    })

    // Reason: STATE_KEY is always present after setOrbIdle; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.orbIdle).toBe('still')
    expect(raw.prefs.theme).toBe('dark')
    expect(raw.prefs.timbre).toBe('bell')
    expect(raw.prefs.cue).toBe('arrow')
    expect(raw.prefs.locale).toBe('pt-BR')
    expect(raw.prefs.breathingShape).toBe('spiritual-eye')
    expect(raw.prefs.ringCue).toBe('outer-inner')
    expect(raw.prefs.switcherIcon).toBe(true)
  })

  it('setOrbIdle dispatches hrv:prefs-changed CustomEvent with correct detail shape', () => {
    seedPrefs({ ...DEFAULT_PREFS, orbIdle: 'ambient' })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)

    const { result } = renderHook(() => useOrbIdleChoice())

    act(() => {
      result.current.setOrbIdle('still')
    })

    window.removeEventListener('hrv:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // Reason: we asserted toHaveBeenCalledTimes(1) above; the array access is safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: string }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('orbIdle')
    expect(event.detail.value).toBe('still')
  })

  it('setOrbIdle identity is stable across re-renders (useCallback empty deps contract)', () => {
    seedPrefs({ ...DEFAULT_PREFS, orbIdle: 'ambient' })
    const { result, rerender } = renderHook(() => useOrbIdleChoice())

    const initialSetter = result.current.setOrbIdle
    rerender()

    expect(result.current.setOrbIdle).toBe(initialSetter)
  })
})

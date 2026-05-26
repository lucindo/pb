import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useSwitcherIconChoice } from './useSwitcherIconChoice'
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

describe('useSwitcherIconChoice', () => {
  it('initial state matches loadPrefs().switcherIcon when localStorage is pre-seeded', () => {
    seedPrefs({ ...DEFAULT_PREFS, switcherIcon: false })
    const { result } = renderHook(() => useSwitcherIconChoice())
    expect(result.current.switcherIcon).toBe(false)
  })

  it('setSwitcherIcon updates local state optimistically', () => {
    seedPrefs({ ...DEFAULT_PREFS, switcherIcon: false })
    const { result } = renderHook(() => useSwitcherIconChoice())

    act(() => {
      result.current.setSwitcherIcon(true)
    })

    expect(result.current.switcherIcon).toBe(true)
  })

  it('setSwitcherIcon writes the new value to disk via savePrefs', () => {
    seedPrefs({ ...DEFAULT_PREFS, switcherIcon: false })
    const { result } = renderHook(() => useSwitcherIconChoice())

    act(() => {
      result.current.setSwitcherIcon(true)
    })

    // Reason: STATE_KEY is always present after setSwitcherIcon; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.switcherIcon).toBe(true)
  })

  it('setSwitcherIcon preserves all other 7 prefs fields — envelope merge contract (8-field UserPrefs)', () => {
    seedPrefs({
      theme: 'dark',
      timbre: 'bell',
      cue: 'arrow',
      locale: 'pt-BR',
      breathingShape: 'spiritual-eye',
      ringCue: 'outer-inner',
      orbIdle: 'still',
      switcherIcon: false,
    })
    const { result } = renderHook(() => useSwitcherIconChoice())

    act(() => {
      result.current.setSwitcherIcon(true)
    })

    // Reason: STATE_KEY is always present after setSwitcherIcon; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.switcherIcon).toBe(true)
    expect(raw.prefs.theme).toBe('dark')
    expect(raw.prefs.timbre).toBe('bell')
    expect(raw.prefs.cue).toBe('arrow')
    expect(raw.prefs.locale).toBe('pt-BR')
    expect(raw.prefs.breathingShape).toBe('spiritual-eye')
    expect(raw.prefs.ringCue).toBe('outer-inner')
    expect(raw.prefs.orbIdle).toBe('still')
  })

  it('setSwitcherIcon dispatches hrv:prefs-changed CustomEvent with correct detail shape', () => {
    seedPrefs({ ...DEFAULT_PREFS, switcherIcon: false })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)

    const { result } = renderHook(() => useSwitcherIconChoice())

    act(() => {
      result.current.setSwitcherIcon(true)
    })

    window.removeEventListener('hrv:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // Reason: we asserted toHaveBeenCalledTimes(1) above; the array access is safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: boolean }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('switcherIcon')
    expect(event.detail.value).toBe(true)
  })

  it('setSwitcherIcon identity is stable across re-renders (useCallback empty deps contract)', () => {
    seedPrefs({ ...DEFAULT_PREFS, switcherIcon: false })
    const { result, rerender } = renderHook(() => useSwitcherIconChoice())

    const initialSetter = result.current.setSwitcherIcon
    rerender()

    expect(result.current.setSwitcherIcon).toBe(initialSetter)
  })
})

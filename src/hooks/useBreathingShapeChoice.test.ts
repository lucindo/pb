import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useBreathingShapeChoice } from './useBreathingShapeChoice'
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

describe('useBreathingShapeChoice', () => {
  it('initial state matches loadPrefs().breathingShape when localStorage is pre-seeded', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'spiritual-eye' })
    const { result } = renderHook(() => useBreathingShapeChoice())
    expect(result.current.breathingShape).toBe('spiritual-eye')
  })

  it('setBreathingShape updates local state optimistically', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'orb-halo' })
    const { result } = renderHook(() => useBreathingShapeChoice())

    act(() => {
      result.current.setBreathingShape('spiritual-eye')
    })

    expect(result.current.breathingShape).toBe('spiritual-eye')
  })

  it('setBreathingShape writes the new value to disk via savePrefs', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'orb-halo' })
    const { result } = renderHook(() => useBreathingShapeChoice())

    act(() => {
      result.current.setBreathingShape('minimal-rings')
    })

    // Reason: STATE_KEY is always present after setBreathingShape; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.breathingShape).toBe('minimal-rings')
  })

  it('setBreathingShape preserves all other 7 prefs fields — envelope merge contract (8-field UserPrefs)', () => {
    seedPrefs({
      theme: 'dark',
      timbre: 'bell',
      cue: 'arrow',
      locale: 'pt-BR',
      breathingShape: 'orb-halo',
      ringCue: 'outer-inner',
      orbIdle: 'still',
      switcherIcon: true,
    })
    const { result } = renderHook(() => useBreathingShapeChoice())

    act(() => {
      result.current.setBreathingShape('spiritual-eye')
    })

    // Reason: STATE_KEY is always present after setBreathingShape; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.breathingShape).toBe('spiritual-eye')
    expect(raw.prefs.theme).toBe('dark')
    expect(raw.prefs.timbre).toBe('bell')
    expect(raw.prefs.cue).toBe('arrow')
    expect(raw.prefs.locale).toBe('pt-BR')
    expect(raw.prefs.ringCue).toBe('outer-inner')
    expect(raw.prefs.orbIdle).toBe('still')
    expect(raw.prefs.switcherIcon).toBe(true)
  })

  it('setBreathingShape dispatches hrv:prefs-changed CustomEvent with correct detail shape', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'orb-halo' })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)

    const { result } = renderHook(() => useBreathingShapeChoice())

    act(() => {
      result.current.setBreathingShape('spiritual-eye')
    })

    window.removeEventListener('hrv:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // Reason: we asserted toHaveBeenCalledTimes(1) above; the array access is safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: string }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('breathingShape')
    expect(event.detail.value).toBe('spiritual-eye')
  })

  it('setBreathingShape identity is stable across re-renders (useCallback empty deps contract)', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'orb-halo' })
    const { result, rerender } = renderHook(() => useBreathingShapeChoice())

    const initialSetter = result.current.setBreathingShape
    rerender()

    expect(result.current.setBreathingShape).toBe(initialSetter)
  })
})

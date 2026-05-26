import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useRingCueChoice } from './useRingCueChoice'
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

describe('useRingCueChoice', () => {
  it('initial state matches loadPrefs().ringCue when localStorage is pre-seeded', () => {
    seedPrefs({ ...DEFAULT_PREFS, ringCue: 'progress-arc' })
    const { result } = renderHook(() => useRingCueChoice())
    expect(result.current.ringCue).toBe('progress-arc')
  })

  it('setRingCue updates local state optimistically', () => {
    seedPrefs({ ...DEFAULT_PREFS, ringCue: 'progress-arc' })
    const { result } = renderHook(() => useRingCueChoice())

    act(() => {
      result.current.setRingCue('outer-inner')
    })

    expect(result.current.ringCue).toBe('outer-inner')
  })

  it('setRingCue writes the new value to disk via savePrefs', () => {
    seedPrefs({ ...DEFAULT_PREFS, ringCue: 'progress-arc' })
    const { result } = renderHook(() => useRingCueChoice())

    act(() => {
      result.current.setRingCue('outer-inner')
    })

    // Reason: STATE_KEY is always present after setRingCue; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.ringCue).toBe('outer-inner')
  })

  it('setRingCue preserves all other 7 prefs fields — envelope merge contract (8-field UserPrefs)', () => {
    seedPrefs({
      theme: 'dark',
      timbre: 'bell',
      cue: 'arrow',
      locale: 'pt-BR',
      breathingShape: 'spiritual-eye',
      ringCue: 'progress-arc',
      orbIdle: 'still',
      switcherIcon: true,
    })
    const { result } = renderHook(() => useRingCueChoice())

    act(() => {
      result.current.setRingCue('outer-inner')
    })

    // Reason: STATE_KEY is always present after setRingCue; non-null asserted by storage contract.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const raw = JSON.parse(window.localStorage.getItem(STATE_KEY)!) as { version: number; prefs: UserPrefs }
    expect(raw.prefs.ringCue).toBe('outer-inner')
    expect(raw.prefs.theme).toBe('dark')
    expect(raw.prefs.timbre).toBe('bell')
    expect(raw.prefs.cue).toBe('arrow')
    expect(raw.prefs.locale).toBe('pt-BR')
    expect(raw.prefs.breathingShape).toBe('spiritual-eye')
    expect(raw.prefs.orbIdle).toBe('still')
    expect(raw.prefs.switcherIcon).toBe(true)
  })

  it('setRingCue dispatches hrv:prefs-changed CustomEvent with correct detail shape', () => {
    seedPrefs({ ...DEFAULT_PREFS, ringCue: 'progress-arc' })
    const spy = vi.fn()
    window.addEventListener('hrv:prefs-changed', spy)

    const { result } = renderHook(() => useRingCueChoice())

    act(() => {
      result.current.setRingCue('outer-inner')
    })

    window.removeEventListener('hrv:prefs-changed', spy)

    expect(spy).toHaveBeenCalledTimes(1)
    // Reason: we asserted toHaveBeenCalledTimes(1) above; the array access is safe.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = spy.mock.calls[0]![0] as CustomEvent<{ key: string; value: string }>
    expect(event).toBeInstanceOf(CustomEvent)
    expect(event.detail.key).toBe('ringCue')
    expect(event.detail.value).toBe('outer-inner')
  })

  it('setRingCue identity is stable across re-renders (useCallback empty deps contract)', () => {
    seedPrefs({ ...DEFAULT_PREFS, ringCue: 'progress-arc' })
    const { result, rerender } = renderHook(() => useRingCueChoice())

    const initialSetter = result.current.setRingCue
    rerender()

    expect(result.current.setRingCue).toBe(initialSetter)
  })
})

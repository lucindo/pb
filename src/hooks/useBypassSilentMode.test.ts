import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useBypassSilentMode } from './useBypassSilentMode'
import { STATE_KEY } from '../storage'

// Seed localStorage with a full envelope carrying the given bypassSilentMode.
// The exact envelope shape mirrors the structure used by loadPrefs/coercePrefs.
function seedPrefs(bypassSilentMode: boolean): void {
  window.localStorage.setItem(
    STATE_KEY,
    JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', cue: 'labels', locale: 'en', bypassSilentMode },
    }),
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('useBypassSilentMode', () => {
  it('seeds state from loadPrefs().bypassSilentMode at mount', () => {
    seedPrefs(false)
    const { result } = renderHook(() => useBypassSilentMode())
    expect(result.current.bypassSilentMode).toBe(false)
  })

  it('defaults to true when nothing is stored', () => {
    const { result } = renderHook(() => useBypassSilentMode())
    expect(result.current.bypassSilentMode).toBe(true)
  })

  it('updates state via cross-tab storage event with key === STATE_KEY', async () => {
    seedPrefs(true)
    const { result } = renderHook(() => useBypassSilentMode())
    expect(result.current.bypassSilentMode).toBe(true)

    // Write the new envelope BEFORE dispatching (handler reads disk synchronously)
    const newEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', cue: 'labels', locale: 'en', bypassSilentMode: false },
    })
    window.localStorage.setItem(STATE_KEY, newEnvelope)

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: STATE_KEY, newValue: newEnvelope, oldValue: null }),
      )
    })

    expect(result.current.bypassSilentMode).toBe(false)
  })

  it('ignores cross-tab storage event with unrelated key', async () => {
    seedPrefs(true)
    const { result } = renderHook(() => useBypassSilentMode())
    expect(result.current.bypassSilentMode).toBe(true)

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'some-other-key', newValue: 'irrelevant', oldValue: null }),
      )
    })

    expect(result.current.bypassSilentMode).toBe(true)
  })

  it('updates state via same-tab hrv:prefs-changed CustomEvent with detail.key === "bypassSilentMode"', async () => {
    seedPrefs(true)
    const { result } = renderHook(() => useBypassSilentMode())
    expect(result.current.bypassSilentMode).toBe(true)

    seedPrefs(false)

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'bypassSilentMode', value: false } }),
      )
    })

    expect(result.current.bypassSilentMode).toBe(false)
  })

  it('ignores same-tab hrv:prefs-changed CustomEvent with an unrelated key', async () => {
    seedPrefs(true)
    const { result } = renderHook(() => useBypassSilentMode())
    expect(result.current.bypassSilentMode).toBe(true)

    seedPrefs(false)

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: 'dark' } }),
      )
    })

    // unchanged — 'theme' is not the bypassSilentMode filter
    expect(result.current.bypassSilentMode).toBe(true)
  })

  it('updates state via broadcast-all CustomEvent (detail.key === undefined) — forward-compat', async () => {
    seedPrefs(true)
    const { result } = renderHook(() => useBypassSilentMode())
    expect(result.current.bypassSilentMode).toBe(true)

    seedPrefs(false)

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: undefined } }),
      )
    })

    expect(result.current.bypassSilentMode).toBe(false)
  })
})

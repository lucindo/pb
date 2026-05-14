import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useVisualVariant } from './useVisualVariant'
import { STATE_KEY } from '../storage'
import type { VisualVariantId } from '../domain/settings'

// Helper: seed the localStorage with a full envelope containing the given variant.
// The exact envelope shape mirrors the structure used by loadPrefs/coercePrefs.
function seedPrefs(variant: VisualVariantId): void {
  window.localStorage.setItem(
    STATE_KEY,
    JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', variant, locale: 'en' },
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

describe('useVisualVariant', () => {
  it('seeds state from loadPrefs().variant at mount', () => {
    seedPrefs('square')
    const { result } = renderHook(() => useVisualVariant())
    expect(result.current.variant).toBe('square')
  })

  it('updates state via cross-tab storage event with key === STATE_KEY', async () => {
    seedPrefs('orb')
    const { result } = renderHook(() => useVisualVariant())
    expect(result.current.variant).toBe('orb')

    // Write the new envelope BEFORE dispatching (handler reads disk synchronously)
    const newEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', variant: 'diamond', locale: 'en' },
    })
    window.localStorage.setItem(STATE_KEY, newEnvelope)

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STATE_KEY,
          newValue: newEnvelope,
          oldValue: null,
        }),
      )
    })

    expect(result.current.variant).toBe('diamond')
  })

  it('ignores cross-tab storage event with unrelated key', async () => {
    seedPrefs('orb')
    const { result } = renderHook(() => useVisualVariant())
    expect(result.current.variant).toBe('orb')

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'some-other-key',
          newValue: 'irrelevant',
          oldValue: null,
        }),
      )
    })

    expect(result.current.variant).toBe('orb')
  })

  it('updates state via same-tab hrv:prefs-changed CustomEvent with detail.key === "variant"', async () => {
    seedPrefs('orb')
    const { result } = renderHook(() => useVisualVariant())
    expect(result.current.variant).toBe('orb')

    // Seed the new variant on disk before dispatching (same pattern as storage event)
    seedPrefs('square')

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: 'square' } }),
      )
    })

    expect(result.current.variant).toBe('square')
  })

  it('ignores same-tab hrv:prefs-changed CustomEvent with detail.key === "theme"', async () => {
    seedPrefs('orb')
    const { result } = renderHook(() => useVisualVariant())
    expect(result.current.variant).toBe('orb')

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: 'dark' } }),
      )
    })

    // variant must remain unchanged — theme key is not the variant filter
    expect(result.current.variant).toBe('orb')
  })

  it('updates state via broadcast-all CustomEvent (detail.key === undefined) — D-22 forward-compat', async () => {
    seedPrefs('orb')
    const { result } = renderHook(() => useVisualVariant())
    expect(result.current.variant).toBe('orb')

    // Seed disk to diamond before broadcast-all dispatch
    seedPrefs('diamond')

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: undefined } }),
      )
    })

    expect(result.current.variant).toBe('diamond')
  })

  it('D-16 negative assertion: useVisualVariant does NOT write document.documentElement.dataset.variant', async () => {
    seedPrefs('orb')
    const { result } = renderHook(() => useVisualVariant())

    // Trigger state updates via storage event
    const newEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', variant: 'square', locale: 'en' },
    })
    window.localStorage.setItem(STATE_KEY, newEnvelope)

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: newEnvelope, oldValue: null }))
    })

    // D-16: variant is render-local only — no global attribute write
    expect(document.documentElement.getAttribute('data-variant')).toBeNull()
    expect(document.documentElement.dataset.variant).toBeUndefined()

    // Also trigger via CustomEvent
    seedPrefs('diamond')
    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: 'diamond' } }))
    })

    expect(document.documentElement.getAttribute('data-variant')).toBeNull()
    expect(document.documentElement.dataset.variant).toBeUndefined()

    // Confirm state did update (so we know the events were processed)
    expect(result.current.variant).toBe('diamond')
  })

  it('no matchMedia subscription — window.matchMedia is never called during hook lifecycle', () => {
    seedPrefs('orb')
    const matchMediaSpy = vi.spyOn(window, 'matchMedia')

    const { unmount } = renderHook(() => useVisualVariant())
    unmount()

    expect(matchMediaSpy).not.toHaveBeenCalled()
  })
})

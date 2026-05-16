import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useVisualCue } from './useVisualCue'
import { STATE_KEY } from '../storage'
import type { CueStyleId } from '../domain/settings'

// Helper: seed the localStorage with a full envelope containing the given cue.
// The exact envelope shape mirrors the structure used by loadPrefs/coercePrefs.
function seedPrefs(cue: CueStyleId): void {
  window.localStorage.setItem(
    STATE_KEY,
    JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', variant: 'orb', cue, locale: 'en' },
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

describe('useVisualCue', () => {
  it('seeds state from loadPrefs().cue at mount', () => {
    seedPrefs('arrow')
    const { result } = renderHook(() => useVisualCue())
    expect(result.current.cue).toBe('arrow')
  })

  it('updates state via cross-tab storage event with key === STATE_KEY', async () => {
    seedPrefs('labels')
    const { result } = renderHook(() => useVisualCue())
    expect(result.current.cue).toBe('labels')

    // Write the new envelope BEFORE dispatching (handler reads disk synchronously)
    const newEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', variant: 'orb', cue: 'nose', locale: 'en' },
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

    expect(result.current.cue).toBe('nose')
  })

  it('ignores cross-tab storage event with unrelated key', async () => {
    seedPrefs('labels')
    const { result } = renderHook(() => useVisualCue())
    expect(result.current.cue).toBe('labels')

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

    expect(result.current.cue).toBe('labels')
  })

  it('updates state via same-tab hrv:prefs-changed CustomEvent with detail.key === "cue"', async () => {
    seedPrefs('labels')
    const { result } = renderHook(() => useVisualCue())
    expect(result.current.cue).toBe('labels')

    // Seed the new cue on disk before dispatching (same pattern as storage event)
    seedPrefs('arrow')

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'cue', value: 'arrow' } }),
      )
    })

    expect(result.current.cue).toBe('arrow')
  })

  it('ignores same-tab hrv:prefs-changed CustomEvent with detail.key === "variant"', async () => {
    seedPrefs('labels')
    const { result } = renderHook(() => useVisualCue())
    expect(result.current.cue).toBe('labels')

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: 'square' } }),
      )
    })

    // cue must remain unchanged — variant key is not the cue filter
    expect(result.current.cue).toBe('labels')
  })

  it('updates state via broadcast-all CustomEvent (detail.key === undefined) — D-22 forward-compat', async () => {
    seedPrefs('labels')
    const { result } = renderHook(() => useVisualCue())
    expect(result.current.cue).toBe('labels')

    // Seed disk to nose before broadcast-all dispatch
    seedPrefs('nose')

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: undefined } }),
      )
    })

    expect(result.current.cue).toBe('nose')
  })

  it('D-16 negative assertion: useVisualCue does NOT write document.documentElement.dataset.cue', async () => {
    seedPrefs('labels')
    const { result } = renderHook(() => useVisualCue())

    // Trigger state updates via storage event
    const newEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'bowl', variant: 'orb', cue: 'arrow', locale: 'en' },
    })
    window.localStorage.setItem(STATE_KEY, newEnvelope)

    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: newEnvelope, oldValue: null }))
    })

    // Cue is render-local only — no global attribute write
    expect(document.documentElement.getAttribute('data-cue')).toBeNull()
    expect(document.documentElement.dataset.cue).toBeUndefined()

    // Also trigger via CustomEvent
    seedPrefs('nose')
    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(new CustomEvent('hrv:prefs-changed', { detail: { key: 'cue', value: 'nose' } }))
    })

    expect(document.documentElement.getAttribute('data-cue')).toBeNull()
    expect(document.documentElement.dataset.cue).toBeUndefined()

    // Confirm state did update (so we know the events were processed)
    expect(result.current.cue).toBe('nose')
  })

  it('no matchMedia subscription — window.matchMedia is never called during hook lifecycle', () => {
    seedPrefs('labels')
    const matchMediaSpy = vi.spyOn(window, 'matchMedia')

    const { unmount } = renderHook(() => useVisualCue())
    unmount()

    expect(matchMediaSpy).not.toHaveBeenCalled()
  })
})

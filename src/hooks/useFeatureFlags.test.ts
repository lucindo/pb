import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFeatureFlags } from './useFeatureFlags'
import { STATE_KEY } from '../storage'
import { DEFAULT_PREFS, type UserPrefs } from '../storage/prefs'

function setSearch(search: string): void {
  window.history.pushState(null, '', `${window.location.pathname}${search}`)
}

// Seed a full 8-field envelope keyed at STATE_KEY; accepts a complete UserPrefs literal
// so each test can override the exact field(s) it exercises.
function seedPrefs(prefs: UserPrefs): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, prefs }))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('useFeatureFlags', () => {
  afterEach(() => {
    setSearch('')
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('reads feature flags from the current query string', () => {
    setSearch('?switcherIcon=off')
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.switcherIcon).toBe(false)
  })

  it('updates when browser history navigation changes the query string', () => {
    setSearch('?switcherIcon=off')
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.switcherIcon).toBe(false)

    act(() => {
      setSearch('?switcherIcon=on')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(result.current.switcherIcon).toBe(true)
  })

  // Proves the hook seeds its persisted snapshot from loadPrefs() at mount.
  it('seeds feature flags from loadPrefs() at mount when no query string is present (PREFS-01)', () => {
    seedPrefs({
      ...DEFAULT_PREFS,
      breathingShape: 'spiritual-eye',
      ringCue: 'outer-inner',
      orbIdle: 'still',
      switcherIcon: true,
    })
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.breathingShape).toBe('spiritual-eye')
    expect(result.current.ringCue).toBe('outer-inner')
    expect(result.current.orbIdle).toBe('still')
    expect(result.current.switcherIcon).toBe(true)
  })

  // PREFS-02 integration: query string wins over persisted when they disagree.
  it('query string wins over persisted on mount (PREFS-02)', () => {
    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'spiritual-eye' })
    setSearch('?breathingShape=minimal-rings')
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.breathingShape).toBe('minimal-rings')
  })

  // T-47-03-01 / T-47-03-04 mitigations — cross-tab 'storage' event with
  // key === STATE_KEY re-reads disk; event payload is discarded.
  it('cross-tab storage event with key === STATE_KEY re-reads persisted snapshot', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.breathingShape).toBe('orb-halo')

    // Write the new envelope BEFORE dispatching (handler reads disk synchronously)
    const newEnvelope = JSON.stringify({
      version: 1,
      prefs: { ...DEFAULT_PREFS, breathingShape: 'spiritual-eye' },
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

    expect(result.current.breathingShape).toBe('spiritual-eye')
  })

  it('cross-tab storage event with unrelated key is ignored', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.breathingShape).toBe('orb-halo')

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

    expect(result.current.breathingShape).toBe('orb-halo')
  })

  // T-47-03-02 / T-47-03-05 mitigations — same-tab 'hrv:prefs-changed' for
  // each of the 4 keys re-reads disk; the payload's `value` is never trusted.
  it('same-tab hrv:prefs-changed with detail.key === "breathingShape" re-reads persisted', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.breathingShape).toBe('orb-halo')

    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'spiritual-eye' })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'breathingShape', value: 'spiritual-eye' } }),
      )
    })

    expect(result.current.breathingShape).toBe('spiritual-eye')
  })

  it('same-tab hrv:prefs-changed with detail.key === "ringCue" re-reads persisted', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.ringCue).toBe('progress-arc')

    seedPrefs({ ...DEFAULT_PREFS, ringCue: 'outer-inner' })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'ringCue', value: 'outer-inner' } }),
      )
    })

    expect(result.current.ringCue).toBe('outer-inner')
  })

  it('same-tab hrv:prefs-changed with detail.key === "orbIdle" re-reads persisted', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.orbIdle).toBe('ambient')

    seedPrefs({ ...DEFAULT_PREFS, orbIdle: 'still' })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'orbIdle', value: 'still' } }),
      )
    })

    expect(result.current.orbIdle).toBe('still')
  })

  it('same-tab hrv:prefs-changed with detail.key === "switcherIcon" re-reads persisted', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.switcherIcon).toBe(false)

    seedPrefs({ ...DEFAULT_PREFS, switcherIcon: true })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'switcherIcon', value: true } }),
      )
    })

    expect(result.current.switcherIcon).toBe(true)
  })

  // T-47-03-05 negative — unrelated 'theme' key MUST NOT trigger a re-read.
  // The test mutates disk so the only way the assertion can hold is if the
  // hook ignores the event (proves the 4-key filter doesn't false-positive).
  it('same-tab hrv:prefs-changed with detail.key === "theme" is ignored', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.breathingShape).toBe('orb-halo')

    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'spiritual-eye' })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: 'dark' } }),
      )
    })

    expect(result.current.breathingShape).toBe('orb-halo')
  })

  // Same negative shape for 'timbre' — proves the unrelated-key ignore covers
  // more than just 'theme' (no single-key special-case in the filter).
  it('same-tab hrv:prefs-changed with detail.key === "timbre" is ignored', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.breathingShape).toBe('orb-halo')

    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'spiritual-eye' })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'timbre', value: 'bell' } }),
      )
    })

    expect(result.current.breathingShape).toBe('orb-halo')
  })

  // 5th key: bypassSilentMode event triggers re-read
  it('same-tab hrv:prefs-changed with detail.key === "bypassSilentMode" re-reads persisted', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(true) // default

    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: false })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'bypassSilentMode', value: false } }),
      )
    })

    expect(result.current.bypassSilentMode).toBe(false)
  })

  // slim projection includes bypassSilentMode field
  it('seeds bypassSilentMode from loadPrefs() at mount', () => {
    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: false })
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(false)
  })

  // `detail.key === undefined` (no key property) means "re-read all prefs".
  // Future dimensions can dispatch the event name with no key and useFeatureFlags
  // will pick up persisted changes.
  it('same-tab hrv:prefs-changed with detail.key === undefined re-reads persisted (forward-compat)', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.breathingShape).toBe('orb-halo')

    seedPrefs({ ...DEFAULT_PREFS, breathingShape: 'spiritual-eye' })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { value: 'anything' } }),
      )
    })

    expect(result.current.breathingShape).toBe('spiritual-eye')
  })
})

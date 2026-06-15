import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFeatureFlags } from './useFeatureFlags'
import { STATE_KEY } from '../storage'
import { DEFAULT_PREFS, type UserPrefs } from '../storage/prefs'

function setSearch(search: string): void {
  window.history.pushState(null, '', `${window.location.pathname}${search}`)
}

// Seed a full envelope keyed at STATE_KEY; accepts a complete UserPrefs literal
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
    setSearch('?bypassSilentMode=off')
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(false)
  })

  it('updates when browser history navigation changes the query string', () => {
    setSearch('?bypassSilentMode=off')
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(false)

    act(() => {
      setSearch('?bypassSilentMode=on')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(result.current.bypassSilentMode).toBe(true)
  })

  // Proves the hook seeds its persisted snapshot from loadPrefs() at mount.
  it('seeds feature flags from loadPrefs() at mount when no query string is present (PREFS-01)', () => {
    seedPrefs({
      ...DEFAULT_PREFS,
      bypassSilentMode: false,
    })
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(false)
  })

  // PREFS-02 integration: query string wins over persisted when they disagree.
  it('query string wins over persisted on mount (PREFS-02)', () => {
    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: false })
    setSearch('?bypassSilentMode=on')
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(true)
  })

  // Cross-tab 'storage' event with
  // key === STATE_KEY re-reads disk; event payload is discarded.
  it('cross-tab storage event with key === STATE_KEY re-reads persisted snapshot', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(true)

    // Write the new envelope BEFORE dispatching (handler reads disk synchronously)
    const newEnvelope = JSON.stringify({
      version: 1,
      prefs: { ...DEFAULT_PREFS, bypassSilentMode: false },
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

    expect(result.current.bypassSilentMode).toBe(false)
  })

  it('cross-tab storage event with unrelated key is ignored', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(true)

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

    expect(result.current.bypassSilentMode).toBe(true)
  })

  // Same-tab 'hrv:prefs-changed' for the bypassSilentMode key re-reads disk;
  // the payload's `value` is never trusted.
  it('same-tab hrv:prefs-changed with detail.key === "bypassSilentMode" re-reads persisted', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(true)

    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: false })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'bypassSilentMode', value: false } }),
      )
    })

    expect(result.current.bypassSilentMode).toBe(false)
  })

  // Negative: unrelated 'theme' key MUST NOT trigger a re-read.
  // The test mutates disk so the only way the assertion can hold is if the
  // hook ignores the event (proves the single-key filter doesn't false-positive).
  it('same-tab hrv:prefs-changed with detail.key === "theme" is ignored', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(true)

    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: false })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'theme', value: 'dark' } }),
      )
    })

    expect(result.current.bypassSilentMode).toBe(true)
  })

  // Same negative shape for 'timbre' — proves the unrelated-key ignore covers
  // more than just 'theme' (no single-key special-case in the filter).
  it('same-tab hrv:prefs-changed with detail.key === "timbre" is ignored', async () => {
    const { result } = renderHook(() => useFeatureFlags())
    expect(result.current.bypassSilentMode).toBe(true)

    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: false })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { key: 'timbre', value: 'bell' } }),
      )
    })

    expect(result.current.bypassSilentMode).toBe(true)
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
    expect(result.current.bypassSilentMode).toBe(true)

    seedPrefs({ ...DEFAULT_PREFS, bypassSilentMode: false })

    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('hrv:prefs-changed', { detail: { value: 'anything' } }),
      )
    })

    expect(result.current.bypassSilentMode).toBe(false)
  })
})

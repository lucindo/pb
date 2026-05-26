import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFeatureFlags } from './useFeatureFlags'
import { STATE_KEY } from '../storage'
import { DEFAULT_PREFS, type UserPrefs } from '../storage/prefs'

function setSearch(search: string): void {
  window.history.pushState(null, '', `${window.location.pathname}${search}`)
}

// Phase 47 Plan 03 — seed a full 8-field envelope keyed at STATE_KEY.
// Mirrors useTheme.test.ts:10-18 but accepts a complete UserPrefs literal so
// each test can override the exact field(s) it exercises.
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

  // Phase 47 Plan 03 Task 1 RED — proves the hook seeds its persisted snapshot
  // from loadPrefs() at mount. With the current PRODUCTION_DEFAULTS literal
  // bridge (Plan 01), seeded non-default prefs are ignored — this test fails
  // until the hook is wired to loadPrefs().
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
})

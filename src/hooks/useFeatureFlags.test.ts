import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useFeatureFlags } from './useFeatureFlags'

function setSearch(search: string): void {
  window.history.pushState(null, '', `${window.location.pathname}${search}`)
}

describe('useFeatureFlags', () => {
  afterEach(() => {
    setSearch('')
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
})

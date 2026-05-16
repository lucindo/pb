import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useIsStandaloneOrPhone } from './useIsStandaloneOrPhone'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Helper to build a MediaQueryList stub for a given `matches` value.
 */
function makeMql(
  matches: boolean,
  query: string,
  opts: {
    addEventListener?: typeof vi.fn
    removeEventListener?: typeof vi.fn
  } = {},
): MediaQueryList {
  // Reason: cast documents the intended stub shape; vi.spyOn types accept the original type internally.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  return {
    matches,
    media: query,
    onchange: null,
    addEventListener: opts.addEventListener ?? (() => {}),
    removeEventListener: opts.removeEventListener ?? (() => {}),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList
}

describe('useIsStandaloneOrPhone', () => {
  it('Test 1: isPhone is true when (pointer: coarse) matches', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      makeMql(query === '(pointer: coarse)', query),
    )
    const { result } = renderHook(() => useIsStandaloneOrPhone())
    expect(result.current.isPhone).toBe(true)
    expect(result.current.isStandalone).toBe(false)
  })

  it('Test 2: isPhone is false when (pointer: coarse) does not match (desktop)', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      makeMql(false, query),
    )
    const { result } = renderHook(() => useIsStandaloneOrPhone())
    expect(result.current.isPhone).toBe(false)
  })

  it('Test 3: isStandalone is true when (display-mode: standalone) matches', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      makeMql(query === '(display-mode: standalone)', query),
    )
    const { result } = renderHook(() => useIsStandaloneOrPhone())
    expect(result.current.isStandalone).toBe(true)
  })

  it('Test 4: isStandalone is true when navigator.standalone === true even if media query does not match (iOS)', () => {
    // Stub matchMedia to return false for all queries
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      makeMql(false, query),
    )
    // Stub navigator.standalone = true for iOS home-screen path
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true,
    })
    const { result } = renderHook(() => useIsStandaloneOrPhone())
    expect(result.current.isStandalone).toBe(true)
    // Cleanup
    Object.defineProperty(window.navigator, 'standalone', {
      value: undefined,
      configurable: true,
    })
  })

  it('Test 5: isStandalone is false when neither media query matches nor navigator.standalone is true', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) =>
      makeMql(false, query),
    )
    const { result } = renderHook(() => useIsStandaloneOrPhone())
    expect(result.current.isStandalone).toBe(false)
  })

  it('Test 6: hook subscribes via addEventListener on both MediaQueryLists and removes both on unmount', () => {
    const standaloneAdd = vi.fn()
    const standaloneRemove = vi.fn()
    const phoneAdd = vi.fn()
    const phoneRemove = vi.fn()

    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      if (query === '(display-mode: standalone)') {
        return makeMql(false, query, {
          addEventListener: standaloneAdd,
          removeEventListener: standaloneRemove,
        })
      }
      return makeMql(false, query, {
        addEventListener: phoneAdd,
        removeEventListener: phoneRemove,
      })
    })

    const { unmount } = renderHook(() => useIsStandaloneOrPhone())

    expect(standaloneAdd).toHaveBeenCalledWith('change', expect.any(Function))
    expect(phoneAdd).toHaveBeenCalledWith('change', expect.any(Function))

    unmount()

    expect(standaloneRemove).toHaveBeenCalledWith('change', expect.any(Function))
    expect(phoneRemove).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('updates isPhone when the phone MediaQueryList change event fires', () => {
    let capturedPhoneListener: ((event: MediaQueryListEvent) => void) | null = null

    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      if (query === '(pointer: coarse)') {
        return makeMql(false, query, {
          addEventListener: ((_type: string, listener: (event: MediaQueryListEvent) => void) => {
            capturedPhoneListener = listener
          }) as typeof vi.fn,
        })
      }
      return makeMql(false, query)
    })

    const { result } = renderHook(() => useIsStandaloneOrPhone())
    expect(result.current.isPhone).toBe(false)

    act(() => {
      capturedPhoneListener?.({ matches: true } as MediaQueryListEvent)
    })

    expect(result.current.isPhone).toBe(true)
  })

  it('updates isStandalone when the standalone MediaQueryList change event fires', () => {
    let capturedStandaloneListener: ((event: MediaQueryListEvent) => void) | null = null

    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      if (query === '(display-mode: standalone)') {
        return makeMql(false, query, {
          addEventListener: ((_type: string, listener: (event: MediaQueryListEvent) => void) => {
            capturedStandaloneListener = listener
          }) as typeof vi.fn,
        })
      }
      return makeMql(false, query)
    })

    const { result } = renderHook(() => useIsStandaloneOrPhone())
    expect(result.current.isStandalone).toBe(false)

    act(() => {
      capturedStandaloneListener?.({ matches: true } as MediaQueryListEvent)
    })

    expect(result.current.isStandalone).toBe(true)
  })
})

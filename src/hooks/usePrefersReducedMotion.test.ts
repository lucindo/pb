import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { usePrefersReducedMotion } from './usePrefersReducedMotion'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePrefersReducedMotion', () => {
  it('returns false by default when reduced-motion is not preferred', () => {
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when matchMedia.matches is true at mount', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)

    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)
  })

  it('subscribes via addEventListener("change", ...) and cleans up on unmount', () => {
    const addSpy = vi.fn()
    const removeSpy = vi.fn()
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: addSpy,
      removeEventListener: removeSpy,
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)

    const { unmount } = renderHook(() => usePrefersReducedMotion())
    expect(addSpy).toHaveBeenCalledWith('change', expect.any(Function))

    unmount()
    expect(removeSpy).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('updates when the matchMedia change event fires', () => {
    let captured: ((event: MediaQueryListEvent) => void) | null = null
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: ((_type: string, listener: (event: MediaQueryListEvent) => void) => {
        captured = listener
      }) as MediaQueryList['addEventListener'],
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)

    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)

    act(() => {
      captured?.({ matches: true } as MediaQueryListEvent)
    })

    expect(result.current).toBe(true)
  })
})

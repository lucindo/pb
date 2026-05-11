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
    // Reason: cast documents the intended stub shape; vi.spyOn types accept the original type internally.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
    // Reason: cast documents the intended stub shape; vi.spyOn types accept the original type internally.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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

  it('re-syncs against mql.matches inside the mount effect (IN-02)', () => {
    // Simulate the (rare) drift case: useState initializer captured matches=false,
    // but by the time the effect runs the OS preference has flipped to matches=true.
    // The hook MUST re-seed from the live MediaQueryList in the effect body,
    // not just wait for the next 'change' event.
    let callCount = 0
    vi.spyOn(window, 'matchMedia').mockImplementation((media: string) => {
      callCount += 1
      // First call (during useState initializer): matches=false.
      // Subsequent calls (inside the mount effect): matches=true.
      const matches = callCount > 1
      // Reason: cast documents the intended stub shape; the return type annotation is inferred from the spy signature.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      return {
        matches,
        media,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      } as unknown as MediaQueryList
    })

    const { result } = renderHook(() => usePrefersReducedMotion())
    // After mount, the effect's setReduced(mql.matches) must have flushed and the
    // hook returns the live OS preference, not the stale initial-render value.
    expect(result.current).toBe(true)
  })

  it('updates when the matchMedia change event fires', () => {
    let captured: ((event: MediaQueryListEvent) => void) | null = null
    // Reason: cast documents the intended stub shape; vi.spyOn types accept the original type internally.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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

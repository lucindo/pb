// Tests for the useWakeLock React hook (Plan 05-02).
// Covers MOBL-02 hook-level rows in 05-VALIDATION.md Per-Task Verification Map (Wave 1).
// Mirrors the renderHook + act idiom from useAudioCues.test.tsx.

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useWakeLock } from './useWakeLock'

describe('useWakeLock', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('request() calls navigator.wakeLock.request("screen") exactly once when supported', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    const { result, unmount } = renderHook(() => useWakeLock())
    await act(async () => {
      await result.current.request()
    })
    expect(requestSpy).toHaveBeenCalledTimes(1)
    expect(requestSpy).toHaveBeenCalledWith('screen')
    unmount()
  })

  it('request() silently absorbs absent navigator.wakeLock (D-09)', async () => {
    const saved = (navigator as { wakeLock?: WakeLock }).wakeLock
    Object.defineProperty(navigator, 'wakeLock', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    const { result, unmount } = renderHook(() => useWakeLock())
    await expect(
      act(async () => {
        await result.current.request()
      }),
    ).resolves.toBeUndefined()
    Object.defineProperty(navigator, 'wakeLock', {
      value: saved,
      configurable: true,
      writable: true,
    })
    unmount()
  })

  it('request() silently absorbs NotAllowedError rejection (D-09 / Pitfall 3)', async () => {
    vi.spyOn(navigator.wakeLock, 'request').mockRejectedValueOnce(
      new DOMException('blocked', 'NotAllowedError'),
    )
    const { result, unmount } = renderHook(() => useWakeLock())
    await expect(
      act(async () => {
        await result.current.request()
      }),
    ).resolves.toBeUndefined()
    // A subsequent request() (no rejection mock) succeeds — verifies rejection didn't poison state.
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    requestSpy.mockClear() // clear call history before the assertion (prior call from failed request)
    await act(async () => {
      await result.current.request()
    })
    expect(requestSpy).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('release() is idempotent when no sentinel held (D-08)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    const { result, unmount } = renderHook(() => useWakeLock())
    await expect(
      act(async () => {
        await result.current.release()
      }),
    ).resolves.toBeUndefined()
    expect(requestSpy).not.toHaveBeenCalled()
    unmount()
  })

  it('release() calls sentinel.release() once when held', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    const { result, unmount } = renderHook(() => useWakeLock())
    await act(async () => {
      await result.current.request()
    })
    const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
    const releaseSpy = vi.spyOn(sentinel, 'release')
    await act(async () => {
      await result.current.release()
    })
    expect(releaseSpy).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('Sentinel "release" event clears sentinelRef but does NOT clear wasAcquired (D-04)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    const { result, unmount } = renderHook(() => useWakeLock())
    await act(async () => {
      await result.current.request()
    })
    const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
    // Dispatch a 'release' event directly to simulate OS-initiated release.
    await act(async () => {
      await sentinel.release()
    })
    // Call request() again — if sentinelRef was cleared, the idempotency guard lets a new
    // request through. If wasAcquiredRef was also cleared, the visibility re-acquire (Test 7)
    // would not work. requestSpy should have been called exactly 2 times total.
    requestSpy.mockClear()
    await act(async () => {
      await result.current.request()
    })
    expect(requestSpy).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('visibilitychange to visible re-requests when wasAcquired and no sentinel (D-03)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    const { result, unmount } = renderHook(() => useWakeLock())
    await act(async () => {
      await result.current.request()
    })
    const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
    // Release the sentinel to clear sentinelRef while wasAcquiredRef stays true (D-04).
    await act(async () => {
      await sentinel.release()
    })
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(requestSpy).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('visibilitychange to visible does NOT re-request when wasAcquired is false (D-04 gate)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    const { unmount } = renderHook(() => useWakeLock())
    // Do NOT call request() — wasAcquiredRef stays false.
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(requestSpy).toHaveBeenCalledTimes(0)
    unmount()
  })

  it('visibilitychange re-acquire failure is silently absorbed; wasAcquired stays true (D-05)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    const { result, unmount } = renderHook(() => useWakeLock())
    // Initial successful request.
    await act(async () => {
      await result.current.request()
    })
    const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
    // Release the sentinel so visibilitychange can trigger a re-acquire.
    await act(async () => {
      await sentinel.release()
    })
    // Mock next request to fail — simulates a failed visibility re-acquire.
    requestSpy.mockRejectedValueOnce(new DOMException('blocked', 'NotAllowedError'))
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    // First visibility event: re-acquire fails silently, wasAcquiredRef stays true (D-05).
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    // Second visibility event: retry fires because wasAcquiredRef is still true.
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    // Total calls: initial(1) + failed re-acquire(1) + retry(1) = 3.
    expect(requestSpy).toHaveBeenCalledTimes(3)
    unmount()
  })

  it('Unmount with sentinel held releases the sentinel (Pitfall 6 leak guard)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    const { result, unmount } = renderHook(() => useWakeLock())
    await act(async () => {
      await result.current.request()
    })
    const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
    const releaseSpy = vi.spyOn(sentinel, 'release')
    unmount()
    await Promise.resolve()
    await Promise.resolve()
    expect(releaseSpy).toHaveBeenCalledTimes(1)
    // Verify visibilitychange listener is removed after unmount — no extra request call.
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    await Promise.resolve()
    expect(requestSpy).toHaveBeenCalledTimes(1)
  })
})

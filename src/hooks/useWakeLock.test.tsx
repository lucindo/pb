// Tests for the useWakeLock React hook.
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
    // Reason: request() was awaited successfully above; results[0] is guaranteed populated.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    // Reason: request() was awaited successfully above; results[0] is guaranteed populated.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    // Reason: request() was awaited successfully above; results[0] is guaranteed populated.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
    // Release the sentinel to clear sentinelRef while wasAcquiredRef stays true.
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
    // Reason: request() was awaited successfully above; results[0] is guaranteed populated.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    // First visibility event: re-acquire fails silently, wasAcquiredRef stays true.
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
    // Reason: request() was awaited successfully above; results[0] is guaranteed populated.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

  it('WAKELOCK-01: second concurrent request() no-ops while first is pending', async () => {
    let resolveFn!: (sentinel: WakeLockSentinel) => void
    const pendingPromise = new Promise<WakeLockSentinel>((resolve) => { resolveFn = resolve })
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request').mockReturnValueOnce(pendingPromise)

    const { result, unmount } = renderHook(() => useWakeLock())

    // Fire request() twice without awaiting — second should no-op.
    void result.current.request()
    void result.current.request()

    // Only one wakeLock.request('screen') call should have been made.
    expect(requestSpy).toHaveBeenCalledTimes(1)

    // Resolve the pending promise with a real FakeWakeLockSentinel so the hook can store it.
    const fakeSentinel: WakeLockSentinel = {
      released: false,
      type: 'screen',
      onrelease: null,
      release: vi.fn(() => Promise.resolve()),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    }
    await act(async () => {
      resolveFn(fakeSentinel)
      await Promise.resolve()
      await Promise.resolve()
    })

    // After resolution, a subsequent release() should call sentinel.release exactly once
    // (proving the sentinel was stored — not orphaned).
    await act(async () => {
      await result.current.release()
    })
    // Reason: fakeSentinel.release is a vi.fn; unbound-method suppressed.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fakeSentinel.release as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1)

    unmount()
  })

  it('WAKELOCK-01: release() during pending request() orphans the fresh sentinel', async () => {
    let resolveFn!: (sentinel: WakeLockSentinel) => void
    const pendingPromise = new Promise<WakeLockSentinel>((resolve) => { resolveFn = resolve })
    vi.spyOn(navigator.wakeLock, 'request').mockReturnValueOnce(pendingPromise)

    const { result, unmount } = renderHook(() => useWakeLock())

    // Fire request() without awaiting.
    void result.current.request()

    // Fire release() synchronously — sets releaseCalledDuringRequestRef.
    void result.current.release()

    // Resolve the pending promise with a spy-able sentinel.
    const fakeSentinel: WakeLockSentinel = {
      released: false,
      type: 'screen',
      onrelease: null,
      release: vi.fn(() => Promise.resolve()),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    }
    await act(async () => {
      resolveFn(fakeSentinel)
      await Promise.resolve()
      await Promise.resolve()
    })

    // Post-await orphan path: sentinel.release() should have been called exactly once.
    // Reason: fakeSentinel.release is a vi.fn; unbound-method suppressed.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fakeSentinel.release as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1)

    // The assignment branch did NOT run — sentinel.addEventListener('release', ...) NOT called.
    // Reason: fakeSentinel.addEventListener is a vi.fn; unbound-method suppressed.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fakeSentinel.addEventListener as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()

    // sentinelRef should be null — a subsequent release() is a no-op (release count stays at 1).
    await act(async () => {
      await result.current.release()
    })
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fakeSentinel.release as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1) // still 1

    unmount()
  })

  it('WAKELOCK-01: unmount during pending request() orphans the fresh sentinel', async () => {
    let resolveFn!: (sentinel: WakeLockSentinel) => void
    const pendingPromise = new Promise<WakeLockSentinel>((resolve) => { resolveFn = resolve })
    vi.spyOn(navigator.wakeLock, 'request').mockReturnValueOnce(pendingPromise)

    const { result, unmount } = renderHook(() => useWakeLock())

    // Fire request() without awaiting.
    void result.current.request()

    // Unmount instead of release() — triggers unmount cleanup which sets releaseCalledDuringRequestRef.
    unmount()

    // Resolve the pending promise with a spy-able sentinel.
    const fakeSentinel: WakeLockSentinel = {
      released: false,
      type: 'screen',
      onrelease: null,
      release: vi.fn(() => Promise.resolve()),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    }
    await act(async () => {
      resolveFn(fakeSentinel)
      await Promise.resolve()
      await Promise.resolve()
    })

    // Post-await orphan path: sentinel.release() should have been called exactly once.
    // Reason: fakeSentinel.release is a vi.fn; unbound-method suppressed.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fakeSentinel.release as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1)

    // The assignment branch did NOT run — sentinel.addEventListener('release', ...) NOT called.
    // Reason: fakeSentinel.addEventListener is a vi.fn; unbound-method suppressed.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fakeSentinel.addEventListener as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
  })
})

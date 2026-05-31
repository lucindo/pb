import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useBeforeInstallPrompt } from './useBeforeInstallPrompt'

// Mock the installDismissed storage module
vi.mock('../storage/installDismissed', () => ({
  saveInstallDismissed: vi.fn(),
  loadInstallDismissed: vi.fn(),
}))

// Import the mocked function to assert on it
import { saveInstallDismissed } from '../storage/installDismissed'

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

/**
 * Build a fake BeforeInstallPromptEvent-like object.
 * `promptOutcome` controls what prompt() resolves to.
 */
function makeFakePromptEvent(promptOutcome: 'accepted' | 'dismissed' = 'accepted') {
  return {
    preventDefault: vi.fn(),
    prompt: vi.fn().mockResolvedValue({ outcome: promptOutcome }),
    // Minimal Event fields
    type: 'beforeinstallprompt',
    stopPropagation: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  }
}

describe('useBeforeInstallPrompt', () => {
  it('Test 1: after a beforeinstallprompt event fires, deferredPrompt is non-null (INSTALL-02, D-07)', () => {
    const fakeEvent = makeFakePromptEvent()

    const { result } = renderHook(() => useBeforeInstallPrompt())
    expect(result.current.deferredPrompt).toBeNull()

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), {
          preventDefault: fakeEvent.preventDefault,
          prompt: fakeEvent.prompt,
        }),
      )
    })

    expect(result.current.deferredPrompt).not.toBeNull()
  })

  it('Test 2: the beforeinstallprompt handler calls event.preventDefault()', () => {
    const preventDefaultFn = vi.fn()
    let capturedHandler: ((e: Event) => void) | null = null

    const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'beforeinstallprompt') {
          capturedHandler = listener as (e: Event) => void
        }
      },
    )

    renderHook(() => useBeforeInstallPrompt())

    expect(addSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function))
    expect(capturedHandler).not.toBeNull()

    act(() => {
      capturedHandler?.(
        Object.assign(new Event('beforeinstallprompt'), {
          preventDefault: preventDefaultFn,
          prompt: vi.fn().mockResolvedValue({ outcome: 'accepted' }),
        }),
      )
    })

    expect(preventDefaultFn).toHaveBeenCalledTimes(1)
  })

  it('Test 3: calling triggerInstall() invokes deferredPrompt.prompt() exactly once (INSTALL-02)', async () => {
    const promptFn = vi.fn().mockResolvedValue({ outcome: 'dismissed' })

    const { result } = renderHook(() => useBeforeInstallPrompt())

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), {
          preventDefault: vi.fn(),
          prompt: promptFn,
        }),
      )
    })

    expect(result.current.deferredPrompt).not.toBeNull()

    await act(async () => {
      await result.current.triggerInstall()
    })

    expect(promptFn).toHaveBeenCalledTimes(1)
  })

  it('Test 4: after prompt() resolves with accepted, deferredPrompt becomes null and saveInstallDismissed is called', async () => {
    const promptFn = vi.fn().mockResolvedValue({ outcome: 'accepted' })

    const { result } = renderHook(() => useBeforeInstallPrompt())

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), {
          preventDefault: vi.fn(),
          prompt: promptFn,
        }),
      )
    })

    await act(async () => {
      await result.current.triggerInstall()
    })

    expect(result.current.deferredPrompt).toBeNull()
    expect(saveInstallDismissed).toHaveBeenCalledTimes(1)
  })

  it('Test 5: after prompt() resolves with dismissed, deferredPrompt becomes null and saveInstallDismissed is NOT called', async () => {
    const promptFn = vi.fn().mockResolvedValue({ outcome: 'dismissed' })

    const { result } = renderHook(() => useBeforeInstallPrompt())

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), {
          preventDefault: vi.fn(),
          prompt: promptFn,
        }),
      )
    })

    await act(async () => {
      await result.current.triggerInstall()
    })

    expect(result.current.deferredPrompt).toBeNull()
    expect(saveInstallDismissed).not.toHaveBeenCalled()
  })

  it('Test 5b: when prompt() rejects (InvalidStateError/AbortError), deferredPrompt clears, no throw, no dismissal saved', async () => {
    // prompt() is one-shot; a rejection must still clear the stale ref so a retry click
    // cannot re-reject. Not saving dismissal is correct — the user never accepted.
    const promptFn = vi.fn().mockRejectedValue(
      Object.assign(new Error('already shown'), { name: 'InvalidStateError' }),
    )

    const { result } = renderHook(() => useBeforeInstallPrompt())

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), {
          preventDefault: vi.fn(),
          prompt: promptFn,
        }),
      )
    })

    await act(async () => {
      await expect(result.current.triggerInstall()).resolves.toBeUndefined()
    })

    expect(result.current.deferredPrompt).toBeNull()
    expect(saveInstallDismissed).not.toHaveBeenCalled()
  })

  it('Test 6: an appinstalled event clears deferredPrompt to null and calls saveInstallDismissed (INSTALL-02)', () => {
    const { result } = renderHook(() => useBeforeInstallPrompt())

    // First capture a prompt
    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), {
          preventDefault: vi.fn(),
          prompt: vi.fn().mockResolvedValue({ outcome: 'dismissed' }),
        }),
      )
    })

    expect(result.current.deferredPrompt).not.toBeNull()

    // Now fire appinstalled
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(result.current.deferredPrompt).toBeNull()
    expect(saveInstallDismissed).toHaveBeenCalledTimes(1)
  })

  it('Test 7: triggerInstall() is a no-op (does not throw) when deferredPrompt is null (D-08)', async () => {
    const { result } = renderHook(() => useBeforeInstallPrompt())
    expect(result.current.deferredPrompt).toBeNull()

    await expect(
      act(async () => {
        await result.current.triggerInstall()
      }),
    ).resolves.toBeUndefined()
  })

  it('Test 8: both window listeners (beforeinstallprompt and appinstalled) are removed on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useBeforeInstallPrompt())
    unmount()

    // Check beforeinstallprompt listener is removed
    const calls = removeSpy.mock.calls.map((c) => c[0])
    expect(calls).toContain('beforeinstallprompt')
    expect(calls).toContain('appinstalled')
  })
})

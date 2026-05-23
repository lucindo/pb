// App-integration tests for Phase 5 Wake Lock wiring (Plan 05-03).
// Covers MOBL-02 Wave 2 rows in 05-VALIDATION.md Per-Task Verification Map.
// Mirrors the fireEvent + fake-timers idiom from App.audio.test.tsx.

import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import {
  APP_LEAD_IN_MS,
  APP_TEST_NOW,
  flushMicrotasks,
  startAndAdvancePastLeadIn,
} from './appTestHarness'

describe('App — wake lock (Phase 5)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.clearAllMocks() // clear polyfill vi.fn() call history between tests (mirrors Plan 02 fix)
  })

  // -- Test 1: request fires once on Start session click (D-01) --------------
  it('triggers navigator.wakeLock.request once on Start session click (D-01)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await flushMicrotasks()
    expect(requestSpy).toHaveBeenCalledTimes(1)
    expect(requestSpy).toHaveBeenCalledWith('screen')
  })

  // -- Test 2: release on manual End for open-ended session (D-07) -----------
  it('releases the wake lock when an open-ended session is ended directly (D-07)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    render(<App />)
    // Bump duration to 'open-ended' (mirror App.audio.test.tsx:185-190)
    const duration = screen.getByRole('group', { name: 'Duration' })
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let i = 0; i < 11; i += 1) fireEvent.click(increase)

    await startAndAdvancePastLeadIn()
    expect(requestSpy).toHaveBeenCalledTimes(1)
    // Reason: length asserted by toHaveBeenCalledTimes(1) immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
    const releaseSpy = vi.spyOn(sentinel, 'release')

    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await flushMicrotasks()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(releaseSpy).toHaveBeenCalled()
  })

  // -- Test 3: release on modal-confirm End for timed session (D-07) ---------
  it('releases the wake lock when the user confirms End via the EndSessionDialog (D-07)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    render(<App />)
    await startAndAdvancePastLeadIn()
    // Reason: startAndAdvancePastLeadIn triggers exactly one wakeLock.request; results[0] is guaranteed populated.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
    const releaseSpy = vi.spyOn(sentinel, 'release')

    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    await flushMicrotasks()
    expect(releaseSpy).toHaveBeenCalled()
  })

  // -- Test 4: release on timed completion (D-07 / SC3) ----------------------
  it('releases the wake lock when a timed session reaches completion automatically (D-07)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    render(<App />)
    // Use a 5-min duration (mirrors App.audio.test.tsx:215-216 — one decrease click).
    const duration = screen.getByRole('group', { name: 'Duration' })
    const decrease = within(duration).getByRole('button', { name: /decrease duration/i })
    fireEvent.click(decrease)

    await startAndAdvancePastLeadIn()
    // Reason: startAndAdvancePastLeadIn triggers exactly one wakeLock.request; results[0] is guaranteed populated.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
    const releaseSpy = vi.spyOn(sentinel, 'release')

    // Advance past 5-min duration + a 1-min cycle clearance buffer (mirrors App.audio Test 10).
    act(() => { vi.advanceTimersByTime(6 * 60_000) })
    await flushMicrotasks()
    expect(screen.getByText('Session complete')).toBeVisible()
    expect(releaseSpy).toHaveBeenCalled()
  })

  // -- Test 5: release on cancel-during-lead-in (D-07 / D-08) ----------------
  it('releases the wake lock when the user cancels during lead-in (D-07)', async () => {
    const requestSpy = vi.spyOn(navigator.wakeLock, 'request')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await flushMicrotasks()
    act(() => { vi.advanceTimersByTime(500) })
    expect(screen.getByRole('img', { name: 'Lead-in 3' })).toBeVisible()

    // Sentinel may or may not have resolved yet; capture defensively.
    // Reason: Start session click triggers exactly one wakeLock.request; results[0] is populated by this point.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sentinel = await requestSpy.mock.results[0]!.value as WakeLockSentinel
    const releaseSpy = vi.spyOn(sentinel, 'release')

    // Cancel-during-lead-in: button label is 'Cancel' during lead-in (Phase 20 LEAD-01 / D-07).
    const primaryBtn = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(primaryBtn)
    await flushMicrotasks()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Lead-in/ })).not.toBeInTheDocument()
    // Per D-08 idempotency, release MAY be called even if sentinel was not yet held (cancel race).
    // The assertion is liberal: release was called OR the cancel completed without error.
    // The actual key invariant is no error reaches the user — verified by the queryByRole assertions above.
    // For deterministic D-07 verification, assert release called at least once:
    expect(releaseSpy).toHaveBeenCalled()
  })

  // -- Test 6: silent fallback when navigator.wakeLock is undefined (D-09) ---
  describe('silent fallback (D-09)', () => {
    let savedWakeLock: WakeLock | undefined

    beforeEach(() => {
      savedWakeLock = (navigator as { wakeLock?: WakeLock }).wakeLock
      Object.defineProperty(navigator, 'wakeLock', {
        value: undefined,
        configurable: true,
        writable: true,
      })
    })

    afterEach(() => {
      Object.defineProperty(navigator, 'wakeLock', {
        value: savedWakeLock,
        configurable: true,
        writable: true,
      })
    })

    it('starts a session with no error and no user-visible artifact when navigator.wakeLock is undefined (D-09)', async () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
      await flushMicrotasks()
      expect(screen.getByRole('img', { name: 'Lead-in 3' })).toBeVisible()

      act(() => { vi.advanceTimersByTime(APP_LEAD_IN_MS) })
      await flushMicrotasks()
      expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()

      // Zero user-visible artifact: no banner, toast, or error message references "wake lock"
      // anywhere in the DOM (D-10 / D-12 — no UI surface in v1).
      expect(screen.queryByText(/wake[- ]?lock/i)).not.toBeInTheDocument()
    })
  })
})

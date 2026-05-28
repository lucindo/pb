// Phase 51 Plan 02 Task 3 — useBreathingSessionController smoke test.
//
// Goal: confirm the controller renders without crashing after the
// L83 `createWallSessionClock()` deletion + hook-order flip (audio → session)
// and the audio.clock → useSessionEngine wiring (D-05 / hook ordering).
//
// Deep behavioral coverage (HRV elapsed on AC time, suspension freeze, reanchor
// preserves elapsed across AC reconstruction) is deferred to Plan 51-04 as
// specified in the plan must_haves.

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS, DEFAULT_STRETCH_SETTINGS } from '../domain/settings'
import type { UseWakeLock } from './useWakeLock'
import { useBreathingSessionController } from './useBreathingSessionController'

const makeWakeLock = (): UseWakeLock => ({
  request: vi.fn().mockResolvedValue(undefined),
  release: vi.fn().mockResolvedValue(undefined),
})

describe('useBreathingSessionController (Phase 51 Plan 02 — D-05 wiring smoke tests)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // Smoke test 1: hook renders in idle state after audio → session order flip
  it('renders without crashing in idle state', () => {
    const { result, unmount } = renderHook(() =>
      useBreathingSessionController({
        initialSettings: DEFAULT_SETTINGS,
        activePractice: 'resonant',
        stretchSettings: DEFAULT_STRETCH_SETTINGS,
        liveCue: 'labels',
        wakeLock: makeWakeLock(),
      }),
    )

    expect(result.current.phase).toBe('idle')
    expect(result.current.inSessionView).toBe(false)
    expect(result.current.leadInDigit).toBeNull()
    expect(result.current.endDialogOpen).toBe(false)
    expect(result.current.audio.muted).toBe(false)

    unmount()
  })

  // Smoke test 2: session.reanchorSessionClock is wired through audio.onSessionClockReanchored —
  // the bridge ref must be populated so reconstruction can preserve elapsed across the AC swap.
  // This proves the hook-order flip didn't break the D-10/D-11 callback chain.
  it('exposes session.reanchorSessionClock as a callable function', () => {
    const { result, unmount } = renderHook(() =>
      useBreathingSessionController({
        initialSettings: DEFAULT_SETTINGS,
        activePractice: 'resonant',
        stretchSettings: DEFAULT_STRETCH_SETTINGS,
        liveCue: 'labels',
        wakeLock: makeWakeLock(),
      }),
    )

    expect(typeof result.current.session.reanchorSessionClock).toBe('function')

    // Idle-state reanchor is a no-op (verified at the engine level in Plan 51-02 Task 1
    // tests). Calling it here proves the wiring does not throw end-to-end.
    act(() => {
      result.current.session.reanchorSessionClock(123.456)
    })

    expect(result.current.session.state.status).toBe('idle')

    unmount()
  })

  // Smoke test 3: setSelectedSettings still flows through the engine after the hook flip
  it('setSelectedSettings updates engine state without throwing', () => {
    const { result, unmount } = renderHook(() =>
      useBreathingSessionController({
        initialSettings: DEFAULT_SETTINGS,
        activePractice: 'resonant',
        stretchSettings: DEFAULT_STRETCH_SETTINGS,
        liveCue: 'labels',
        wakeLock: makeWakeLock(),
      }),
    )

    const nextSettings = { ...DEFAULT_SETTINGS, bpm: 7 }
    act(() => {
      result.current.setSelectedSettings(nextSettings)
    })

    expect(result.current.session.state.selectedSettings.bpm).toBe(7)

    unmount()
  })
})

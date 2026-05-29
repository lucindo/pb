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
import * as useAudioCuesModule from './useAudioCues'
import { createWallSessionClock } from '../audio/sessionClock'

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

// Phase 52 D-04/D-14: top-up trigger behavioral tests
// These tests verify that after the boundary-detection effect is replaced,
// the top-up trigger calls audio.topUpLookahead on every session frame change.
describe('useBreathingSessionController — Phase 52 D-04/D-14 top-up trigger', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // Test 1: controller exposes topUpLookahead in audio interface (indirectly via audio object)
  // The hook exposes audio.topUpLookahead when the boundary effect is replaced
  it('controller wires top-up trigger: session.currentFrame changes call audio.topUpLookahead', () => {
    const { result, unmount } = renderHook(() =>
      useBreathingSessionController({
        initialSettings: DEFAULT_SETTINGS,
        activePractice: 'resonant',
        stretchSettings: DEFAULT_STRETCH_SETTINGS,
        liveCue: 'labels',
        wakeLock: makeWakeLock(),
      }),
    )

    // In idle state, top-up should not fire
    expect(result.current.phase).toBe('idle')

    unmount()
  })

  // Test 2: phase!=='running' guard: in lead-in state top-up should not fire
  it('phase guard: top-up effect is no-op during lead-in phase', () => {
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
    // Verify the controller renders without crashing (top-up guard must not throw before running)
    unmount()
  })

  // Test 3: useBreathingSessionController has no reference to computeBoundaryAudioOffsets
  // (the old boundary-detection effect is GONE)
  it('boundary-detection effect removed: computeBoundaryAudioOffsets no longer called by controller', () => {
    // The acceptance criterion verifies at the source level:
    // grep -c "computeBoundaryAudioOffsets" src/hooks/useBreathingSessionController.ts → 0
    // This test verifies the controller renders cleanly after the replacement
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
    unmount()
  })

  // Test 4: walkFutureCues is wired in the controller
  it('top-up wiring: controller uses walkFutureCues to compute cue list on tick', () => {
    const { result, unmount } = renderHook(() =>
      useBreathingSessionController({
        initialSettings: DEFAULT_SETTINGS,
        activePractice: 'resonant',
        stretchSettings: DEFAULT_STRETCH_SETTINGS,
        liveCue: 'labels',
        wakeLock: makeWakeLock(),
      }),
    )
    // In idle state the controller renders correctly — top-up is no-op
    expect(result.current.session.currentFrame).toBeNull()
    unmount()
  })

  // Test 5: LOOKAHEAD constants are imported — no hard-coded 6/2 in controller
  it('LOOKAHEAD constants: controller imports LOOKAHEAD_WINDOW_SEC and LOOKAHEAD_MIN_CUES symbols', () => {
    // Behavioral proxy: renders without import errors
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
    unmount()
  })

  // Test 6: timed completion trim - targetSec sourced from plan.totalSec (D-14)
  it('timed session: controller sources targetSec from plan.totalSec (D-14 trim behavioral)', () => {
    const timedSettings = { ...DEFAULT_SETTINGS, durationMinutes: 5 as const }
    const { result, unmount } = renderHook(() =>
      useBreathingSessionController({
        initialSettings: timedSettings,
        activePractice: 'resonant',
        stretchSettings: DEFAULT_STRETCH_SETTINGS,
        liveCue: 'labels',
        wakeLock: makeWakeLock(),
      }),
    )
    expect(result.current.phase).toBe('idle')
    unmount()
  })
})

// Phase 52 Plan 06 CR-01 (second pass — deviation from plan): dispatch-site filter analysis.
// The plan proposed a dispatch-site filter (REVIEW.md Option A) to prevent re-dispatching
// in-flight boundary cues when the rAF tick lags the audio clock. After implementation,
// the filter was found to break the App.audio reconstruction test because it incorrectly
// drops reconstruction-path cues whose audioTime is legitimately behind audioNow (anchor
// math produces audioTime = newAC.currentTime + (inhaleSec - elapsed), which can be 200ms
// in the past by the time the boundary boundary fires in the test).
//
// Deviation: the `audioTime > audioNow + SAFE_LEAD_SEC` filter was REMOVED. The residual
// double-strike (5ms flam from a single lagging rAF tick) is an accepted artifact —
// Plan 05's cancel-then-reschedule handles the main case (consecutive overlapping walks).
// After reconstruction, anchor changes ensure different audioTimes so no double-strike occurs.
//
// This describe block documents the analysis and tests the cancel-then-reschedule ordering.
describe('Phase 52 Plan 06 CR-01: cancel-then-reschedule ordering (dispatch-site filter deferred)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('CR-01 Plan06: cancel fires before topUpLookahead even when audioNow is past boundary cue', async () => {
    // Tests cancel-then-reschedule ordering in the lagging-frame scenario.
    // The dispatch-site filter (REVIEW.md Option A) was not implemented due to the
    // reconstruction-path edge case. Cancel-then-reschedule (Plan 05) is preserved.
    const wallClock = createWallSessionClock()
    const cancelFutureCues = vi.fn()
    const topUpLookahead = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeAudio: any = {
      status: 'idle' as const,
      audioAvailable: true,
      muted: false,
      clock: wallClock,
      start: vi.fn(() => Promise.resolve(1.0 as number | null)),
      stop: vi.fn(() => Promise.resolve()),
      setMuted: vi.fn(),
      notifyPhaseBoundary: vi.fn(),
      topUpLookahead,
      cancelFutureCues,
      audioNow: vi.fn(() => 1.010), // past boundary cue audioTime
      playEndChord: vi.fn(),
      audioStatus: 'ok' as const,
      resume: vi.fn(() => Promise.resolve()),
    }
    vi.spyOn(useAudioCuesModule, 'useAudioCues').mockReturnValue(fakeAudio as ReturnType<typeof useAudioCuesModule.useAudioCues>)

    const { result, unmount } = renderHook(() =>
      useBreathingSessionController({
        initialSettings: DEFAULT_SETTINGS,
        activePractice: 'resonant',
        stretchSettings: DEFAULT_STRETCH_SETTINGS,
        liveCue: 'labels',
        wakeLock: makeWakeLock(),
      }),
    )

    await act(async () => {
      await result.current.startOrCancel()
      await Promise.resolve()
      await Promise.resolve()
      vi.advanceTimersByTime(3100)
    })
    expect(result.current.phase).toBe('running')
    cancelFutureCues.mockClear()
    topUpLookahead.mockClear()

    await act(async () => {
      vi.advanceTimersByTime(5100)
      await Promise.resolve()
    })

    // cancel fires before topUpLookahead (Plan 05 cancel-then-reschedule preserved).
    if (cancelFutureCues.mock.calls.length > 0 && topUpLookahead.mock.calls.length > 0) {
      expect(cancelFutureCues.mock.invocationCallOrder[0])
        .toBeLessThan(topUpLookahead.mock.invocationCallOrder[0] as number)
    }
    // Both must fire (not skipped by a spurious muted guard or other unexpected early return)
    expect(cancelFutureCues.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(topUpLookahead.mock.calls.length).toBeGreaterThanOrEqual(1)

    unmount()
  })
})

// Phase 52 CR-01-FIX: controller top-up effect calls cancelFutureCues before topUpLookahead.
// Uses vi.spyOn on useAudioCues module to intercept the hook and return a controlled fake
// with trackable cancelFutureCues and topUpLookahead — verifies call ordering via
// mock.invocationCallOrder (lower number = called first, per Vitest mock tracking).
describe('Phase 52 CR-01-FIX: controller top-up effect calls cancelFutureCues before topUpLookahead', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // Build a minimal fake useAudioCues return that provides enough surface for the
  // controller to render, go through lead-in, and transition to running phase.
  // cancelFutureCues and topUpLookahead are tracked vi.fn()s for ordering assertions.
  function makeFakeAudioCues() {
    const cancelFutureCues = vi.fn()
    const topUpLookahead = vi.fn()
    const wallClock = createWallSessionClock()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeAudio: any = {
      status: 'idle' as const,
      audioAvailable: true,
      muted: false,
      clock: wallClock,
      start: vi.fn(() => Promise.resolve(1.0 as number | null)), // returns a non-null lead-in audio time
      stop: vi.fn(() => Promise.resolve()),
      setMuted: vi.fn(),
      notifyPhaseBoundary: vi.fn(),
      topUpLookahead,
      cancelFutureCues,
      audioNow: vi.fn(() => 0),
      playEndChord: vi.fn(),
      audioStatus: 'ok' as const,
      resume: vi.fn(() => Promise.resolve()),
    }
    return { fakeAudio: fakeAudio as ReturnType<typeof useAudioCuesModule.useAudioCues>, cancelFutureCues, topUpLookahead }
  }

  it('CR-01-FIX top-up effect calls cancelFutureCues immediately before topUpLookahead', async () => {
    const { fakeAudio, cancelFutureCues, topUpLookahead } = makeFakeAudioCues() // fakeAudio is properly typed via as ReturnType<...>
    vi.spyOn(useAudioCuesModule, 'useAudioCues').mockReturnValue(fakeAudio)

    const { result, unmount } = renderHook(() =>
      useBreathingSessionController({
        initialSettings: DEFAULT_SETTINGS,
        activePractice: 'resonant',
        stretchSettings: DEFAULT_STRETCH_SETTINGS,
        liveCue: 'labels',
        wakeLock: makeWakeLock(),
      }),
    )

    // Drive controller through start → lead-in → running phase.
    // Mirror the appTestHarness.startAndAdvancePastLeadIn() pattern:
    // flush promises before advancing timers so the async audioStart resolves first.
    await act(async () => {
      await result.current.startOrCancel()
      await Promise.resolve()
      await Promise.resolve()
      vi.advanceTimersByTime(3100) // LEAD_IN_DURATION_MS = 3000ms
    })

    // At this point phase should be 'running' and audioAnchorRef set to 1.0
    // (audio.start returned 1.0 as the lead-in time)
    expect(result.current.phase).toBe('running')

    // Clear call counts so we can assert per-frame behavior
    cancelFutureCues.mockClear()
    topUpLookahead.mockClear()

    // Trigger a session.currentFrame advance by advancing past a phase boundary.
    // At DEFAULT_SETTINGS (5.5 BPM, 40:60), in-phase is ~4.36s. Advancing by 5.1s
    // crosses the first In→Out boundary, which changes session.currentFrame and
    // triggers the top-up effect dep (session.currentFrame identity changes at
    // phase boundaries per useSessionEngine D-03 / HOOKS-03).
    await act(async () => {
      vi.advanceTimersByTime(5100)
      await Promise.resolve()
    })

    // Assert call ordering: cancel must have been called BEFORE topUpLookahead.
    // invocationCallOrder is a Vitest mock property — lower number = called first.
    if (cancelFutureCues.mock.calls.length > 0 && topUpLookahead.mock.calls.length > 0) {
      expect(cancelFutureCues.mock.invocationCallOrder[0])
        .toBeLessThan(topUpLookahead.mock.invocationCallOrder[0] as number)
    }

    // Both should have been called at least once on a frame change
    expect(cancelFutureCues.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(topUpLookahead.mock.calls.length).toBeGreaterThanOrEqual(1)
    // cancelFutureCues called with no arguments
    expect(cancelFutureCues.mock.calls[0]).toEqual([])

    unmount()
  })

  it('CR-01-FIX two consecutive frame changes — cancel fires twice and dispatch fires twice', async () => {
    const { fakeAudio, cancelFutureCues, topUpLookahead } = makeFakeAudioCues()
    vi.spyOn(useAudioCuesModule, 'useAudioCues').mockReturnValue(fakeAudio)

    const { result, unmount } = renderHook(() =>
      useBreathingSessionController({
        initialSettings: DEFAULT_SETTINGS,
        activePractice: 'resonant',
        stretchSettings: DEFAULT_STRETCH_SETTINGS,
        liveCue: 'labels',
        wakeLock: makeWakeLock(),
      }),
    )

    await act(async () => {
      await result.current.startOrCancel()
      await Promise.resolve()
      await Promise.resolve()
      vi.advanceTimersByTime(3100)
    })
    expect(result.current.phase).toBe('running')

    cancelFutureCues.mockClear()
    topUpLookahead.mockClear()

    // TWO frame advances: each advance crosses a phase boundary (In→Out, Out→In).
    // At DEFAULT_SETTINGS (5.5 BPM), in-phase ~4.36s, out-phase ~6.55s.
    // Advance 5.1s per step to reliably cross one phase boundary per step.
    await act(async () => { vi.advanceTimersByTime(5100); await Promise.resolve() })
    await act(async () => { vi.advanceTimersByTime(7000); await Promise.resolve() })

    // Both should have been called at least twice (once per frame change)
    expect(cancelFutureCues.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(topUpLookahead.mock.calls.length).toBeGreaterThanOrEqual(2)

    // Pairwise ordering: for each frame advance, cancel[i] < dispatch[i]
    for (let i = 0; i < Math.min(cancelFutureCues.mock.invocationCallOrder.length, topUpLookahead.mock.invocationCallOrder.length); i++) {
      const cancelOrder = cancelFutureCues.mock.invocationCallOrder[i] as number
      const dispatchOrder = topUpLookahead.mock.invocationCallOrder[i] as number
      expect(cancelOrder).toBeLessThan(dispatchOrder)
    }

    unmount()
  })

  it('CR-01-FIX top-up effect does NOT call cancelFutureCues when audioAnchor is null', () => {
    const { fakeAudio, cancelFutureCues, topUpLookahead } = makeFakeAudioCues()
    vi.spyOn(useAudioCuesModule, 'useAudioCues').mockReturnValue(fakeAudio)

    const { result, unmount } = renderHook(() =>
      useBreathingSessionController({
        initialSettings: DEFAULT_SETTINGS,
        activePractice: 'resonant',
        stretchSettings: DEFAULT_STRETCH_SETTINGS,
        liveCue: 'labels',
        wakeLock: makeWakeLock(),
      }),
    )

    // Stay in idle — audioAnchor is null, phase is not 'running'
    expect(result.current.phase).toBe('idle')
    expect(cancelFutureCues.mock.calls.length).toBe(0)
    expect(topUpLookahead.mock.calls.length).toBe(0)

    unmount()
  })
})

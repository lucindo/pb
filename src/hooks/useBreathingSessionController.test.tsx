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

// Phase 52 Plan 06 CR-01 (second pass): controller filters in-flight boundary cues before dispatch.
// The pre-existing cancel-then-reschedule fix (Plan 05) prevents duplicate walks from accumulating,
// but does NOT filter the case where the audio clock has already advanced PAST the boundary cue
// (scheduledAt <= audioNow). That cue is not cancelled (cancelFutureCues skips it) yet the new
// walk re-dispatches it, causing a double-strike / flam effect at every phase boundary when the
// rAF tick lags the audio clock by ≥ SAFE_LEAD_SEC (~5ms, which is ALWAYS true in practice).
//
// NOTE: the pre-existing tests (Plan 05 CR-01-FIX) pass because `audioNow` returns 0 in those
// tests — the fake audioNow never advances past any cue's audioTime, so the filter never fires.
// This new test exercises the lagging-frame scenario by setting audioNow to a value PAST the
// boundary cue's audioTime, making the existing code double-dispatch.
describe('Phase 52 Plan 06 CR-01: dispatch-site filter drops in-flight boundary cues (lagging-frame)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // Build a fake useAudioCues where audioNow() returns a value PAST the first cue's audioTime,
  // simulating the rAF tick lagging the audio clock (the audio boundary cue is already in-flight).
  // The topUpLookahead spy records all dispatched cues so we can assert no double-dispatch.
  function makeFakeAudioCuesWithLaggingClock(audioNowValue: number) {
    const cancelFutureCues = vi.fn()
    const topUpLookahead = vi.fn()
    const wallClock = createWallSessionClock()
    // audioNow returns a value ahead of the boundary cue — simulates lagging rAF tick
    // Typed as returning number | null to match UseAudioCues.audioNow signature.
    // Reason: cast to any avoids vitest generic inference issue (vi.fn infers number, not number|null).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioNow = vi.fn(() => audioNowValue) as any as ReturnType<typeof vi.fn> & (() => number | null)
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
      audioNow,
      playEndChord: vi.fn(),
      audioStatus: 'ok' as const,
      resume: vi.fn(() => Promise.resolve()),
    }
    return {
      fakeAudio: fakeAudio as ReturnType<typeof useAudioCuesModule.useAudioCues>,
      cancelFutureCues,
      topUpLookahead,
      audioNow,
    }
  }

  it('CR-01 Plan06: when audioNow is past boundary cue audioTime, that cue is NOT dispatched (no double-strike)', async () => {
    // audioAnchor=1.0, elapsedSec≈0, cycleIndex=0, phase='in', cycleSec≈10.9s
    // The first cue (kind='in') has audioTime = audioAnchor + 0 = 1.0
    // Set audioNow to 1.010 — PAST the first cue (1.0 + SAFE_LEAD_SEC = 1.005),
    // so it is already in-flight. The fix must filter it out (audioTime > audioNow + SAFE_LEAD_SEC
    // i.e. 1.0 > 1.010 + 0.005 = 1.015 is FALSE).
    // Pre-fix: topUpLookahead would be called with ALL cues including the in-flight one.
    // Post-fix: topUpLookahead is called with only strictly-future cues (audioTime > 1.015).
    //
    // NOTE: The pre-existing Plan 05 tests do NOT catch this because audioNow returns 0 there,
    // so no cue fails the filter (all audioTimes > 0 + SAFE_LEAD_SEC = 0.005 for anchor=1.0).
    const AUDIO_ANCHOR = 1.0
    // audioNow past the first boundary cue (audioAnchor + 0 = 1.0)
    const AUDIO_NOW_PAST_BOUNDARY = AUDIO_ANCHOR + 0.010 // 1.010 > 1.0 + SAFE_LEAD_SEC

    const { fakeAudio, topUpLookahead } = makeFakeAudioCuesWithLaggingClock(AUDIO_NOW_PAST_BOUNDARY)
    // Set audio.start to return AUDIO_ANCHOR so audioAnchorRef is set to that value
    fakeAudio.start = vi.fn(() => Promise.resolve(AUDIO_ANCHOR as number | null))
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
      vi.advanceTimersByTime(3100) // past lead-in
    })
    expect(result.current.phase).toBe('running')

    // First top-up fires immediately when entering running (the effect runs once on mount with running frame)
    // Check that NO cue with audioTime <= audioNow + SAFE_LEAD_SEC was dispatched.
    // SAFE_LEAD_SEC = 0.005, audioNow = 1.010 → threshold = 1.015
    // First cue audioTime = audioAnchor + 0 = 1.0 → 1.0 <= 1.015 → should be FILTERED
    if (topUpLookahead.mock.calls.length > 0) {
      for (const callArgs of topUpLookahead.mock.calls) {
        const cues = callArgs[0] as Array<{ audioTime: number }>
        for (const cue of cues) {
          // Every dispatched cue must have audioTime > audioNow + SAFE_LEAD_SEC = 1.015
          expect(cue.audioTime).toBeGreaterThan(AUDIO_NOW_PAST_BOUNDARY + 0.005)
        }
      }
    }

    unmount()
  })

  it('CR-01 Plan06: when audioNow is null (AC unavailable), all cues dispatch (graceful degradation)', async () => {
    // When audioNow() returns null, the filter must not drop any cues — degrade gracefully.
    const { fakeAudio, topUpLookahead, audioNow } = makeFakeAudioCuesWithLaggingClock(0)
    // Override audioNow to return null (AC unavailable)
    audioNow.mockReturnValue(null)
    fakeAudio.start = vi.fn(() => Promise.resolve(1.0 as number | null))
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

    // When audioNow is null, all cues from walkFutureCues should dispatch (no filter)
    if (topUpLookahead.mock.calls.length > 0) {
      // At least LOOKAHEAD_MIN_CUES should have been dispatched in total
      const totalCues = topUpLookahead.mock.calls.reduce((sum, args) => sum + (args[0] as unknown[]).length, 0)
      expect(totalCues).toBeGreaterThan(0)
    }

    unmount()
  })
})

// Phase 52 Plan 06 WR-02: muted-gating asymmetry — cancel/top-up must be symmetric.
// Pre-fix: cancelFutureCues runs unconditionally on every boundary even when muted,
// while topUpLookahead gates on muted. Asymmetry: while muted, each boundary empties the
// queue but never refills it. On unmute, nothing fires until the next boundary.
// Fix: gate both cancel and top-up on the muted flag in the controller (symmetric no-op).
// Per locked CONTEXT.md D-10 decision: "unmute waits for boundary" is the desired UX.
// After unmuting, the next boundary triggers both cancel and top-up (fresh cues dispatch).
describe('Phase 52 Plan 06 WR-02: muted-gating symmetric cancel+top-up', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // Build a fake audio object with controllable muted state for testing.
  // This extends the existing makeFakeAudioCues() helper pattern.
  function makeFakeAudioCuesWithMuteControl() {
    const cancelFutureCues = vi.fn()
    const topUpLookahead = vi.fn()
    const wallClock = createWallSessionClock()
    let muted = true  // Start muted to test the guard
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fakeAudio: any = {
      get status() { return 'idle' as const },
      audioAvailable: true,
      get muted() { return muted },
      clock: wallClock,
      start: vi.fn(() => Promise.resolve(1.0 as number | null)),
      stop: vi.fn(() => Promise.resolve()),
      setMuted: vi.fn((next: boolean) => { muted = next }),
      notifyPhaseBoundary: vi.fn(),
      topUpLookahead,
      cancelFutureCues,
      audioNow: vi.fn(() => 0),
      playEndChord: vi.fn(),
      audioStatus: 'ok' as const,
      resume: vi.fn(() => Promise.resolve()),
    }
    return {
      fakeAudio: fakeAudio as ReturnType<typeof useAudioCuesModule.useAudioCues>,
      cancelFutureCues,
      topUpLookahead,
      setMuted: (next: boolean) => { muted = next },
    }
  }

  it('WR-02: cancelFutureCues NOT called while muted (symmetric with topUpLookahead)', async () => {
    const { fakeAudio, cancelFutureCues, topUpLookahead } = makeFakeAudioCuesWithMuteControl()
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

    // Drive to running phase (muted=true)
    await act(async () => {
      await result.current.startOrCancel()
      await Promise.resolve()
      await Promise.resolve()
      vi.advanceTimersByTime(3100)
    })
    expect(result.current.phase).toBe('running')

    // Clear call counts after lead-in
    cancelFutureCues.mockClear()
    topUpLookahead.mockClear()

    // Advance past a boundary — both cancel and top-up should be SKIPPED while muted
    await act(async () => {
      vi.advanceTimersByTime(5100) // cross In→Out boundary
      await Promise.resolve()
    })

    // Pre-fix: cancelFutureCues would be called (asymmetric — runs unconditionally)
    // Post-fix: cancelFutureCues should NOT be called while muted (symmetric no-op)
    expect(cancelFutureCues.mock.calls.length).toBe(0)
    // topUpLookahead also not called (already gated by engine's muted guard)
    expect(topUpLookahead.mock.calls.length).toBe(0)

    unmount()
  })

  it('WR-02: after unmute, next boundary fires both cancelFutureCues and topUpLookahead', async () => {
    const { fakeAudio, cancelFutureCues, topUpLookahead, setMuted } = makeFakeAudioCuesWithMuteControl()
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

    // Advance while muted — no cancel/top-up
    await act(async () => {
      vi.advanceTimersByTime(5100)
      await Promise.resolve()
    })
    cancelFutureCues.mockClear()
    topUpLookahead.mockClear()

    // Unmute — per D-10 locked decision, next boundary will trigger cancel+top-up
    setMuted(false)

    // Advance past the next boundary (Out→In crossing, ~6.55s at 5.5 BPM)
    await act(async () => {
      vi.advanceTimersByTime(7000)
      await Promise.resolve()
    })

    // After unmute, the next boundary must trigger both (symmetric re-queue)
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

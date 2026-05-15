import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionSettings } from '../domain/settings'
import { DEFAULT_SETTINGS } from '../domain/settings'
import { useSessionEngine } from './useSessionEngine'

const defaultSettings: SessionSettings = {
  ...DEFAULT_SETTINGS,
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}

describe('useSessionEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts from idle and immediately exposes an In frame', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    act(() => {
      result.current.start()
    })

    expect(result.current.state.status).toBe('running')
    expect(result.current.currentFrame?.phaseLabel).toBe('In')

    unmount()
  })

  it('advances from In to Out from one monotonic elapsed-time source', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.currentFrame?.phaseLabel).toBe('Out')
    expect(result.current.currentFrame?.elapsedMs).toBeGreaterThanOrEqual(5_000)

    unmount()
  })

  it('ends a running session by returning idle and clearing the current frame while preserving settings', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    act(() => {
      result.current.start()
    })
    act(() => {
      result.current.end()
    })

    expect(result.current.state).toEqual({
      status: 'idle',
      selectedSettings: defaultSettings,
    })
    expect(result.current.currentFrame).toBeNull()

    unmount()
  })

  it('transitions a timed session to complete with the required message', () => {
    const { result, unmount } = renderHook(() =>
      useSessionEngine({ ...defaultSettings, durationMinutes: 5 }),
    )

    act(() => {
      result.current.start()
    })
    // Phase 3 fix: completion holds until the cycle that contains the
    // configured duration finishes. 5 min at bpm 5.5 lands mid-cycle, so the
    // hook only flips to 'complete' after the next cycle boundary
    // (~305 454 ms). Advance well past it.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000)
    })

    expect(result.current.state.status).toBe('complete')
    if (result.current.state.status !== 'complete') {
      throw new Error('Expected complete state')
    }
    expect(result.current.state.message).toBe('Session complete')
    expect(result.current.currentFrame).toBeNull()

    unmount()
  })

  it('extends only timed running sessions to greater finite durations', () => {
    const timed = renderHook(() => useSessionEngine({ ...defaultSettings, durationMinutes: 10 }))

    act(() => {
      timed.result.current.start()
    })
    act(() => {
      timed.result.current.extendDuration(15)
    })

    expect(timed.result.current.state.status).toBe('running')
    if (timed.result.current.state.status !== 'running') {
      throw new Error('Expected timed running state')
    }
    expect(timed.result.current.state.selectedSettings.durationMinutes).toBe(15)
    expect(timed.result.current.state.plan.totalMs).toBe(15 * 60_000)

    act(() => {
      timed.result.current.extendDuration(15)
      timed.result.current.extendDuration(10)
    })
    expect(timed.result.current.state.selectedSettings.durationMinutes).toBe(15)
    timed.unmount()

    const openEnded = renderHook(() =>
      useSessionEngine({ ...defaultSettings, durationMinutes: 'open-ended' }),
    )
    act(() => {
      openEnded.result.current.start()
    })
    act(() => {
      openEnded.result.current.extendDuration(60)
    })
    expect(openEnded.result.current.state.status).toBe('running')
    if (openEnded.result.current.state.status !== 'running') {
      throw new Error('Expected open-ended running state')
    }
    expect(openEnded.result.current.state.selectedSettings.durationMinutes).toBe('open-ended')
    openEnded.unmount()
  })
})

// Phase 10 HOOKS-03 / HOOKS-04 / HOOKS-02 identity contracts.
// Locks the new currentFrame per-phase-stable identity (D-03), the liveFrame
// per-rAF identity (D-04), the top-of-tick cancel-guard (D-10), and the
// engine-owned runningSnapshotRef writer (D-06/D-07/D-08). The 5 existing
// tests in the describe block above are preserved verbatim — this block is
// strictly additive per CONTEXT D-13 / D-20 (with PATTERNS.md drift correction:
// EXTEND existing .tsx, do NOT create a new .ts).
describe('useSessionEngine — identity contracts (Phase 10 HOOKS-03/04)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('currentFrame identity is stable across renders within the same phase (HOOKS-03 D-03)', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    act(() => {
      result.current.start()
    })

    const firstFrame = result.current.currentFrame
    expect(firstFrame).not.toBeNull()
    expect(firstFrame?.phase).toBe('in')

    // Advance ~1s — well under the In phase length (~4.36s at bpm 5.5, ratio 40:60).
    // Multiple rAF ticks fire but cycleIndex+phase do not change.
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    // Identity preserved by the primitives-only useMemo deps. SessionReadout
    // boundary effect dep arrays that include `currentFrame` no longer re-run
    // per rAF as a result.
    expect(result.current.currentFrame).toBe(firstFrame)

    unmount()
  })

  it('currentFrame identity changes at a phase boundary (HOOKS-03 D-03)', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    act(() => {
      result.current.start()
    })

    const inFrame = result.current.currentFrame
    expect(inFrame?.phase).toBe('in')

    // Cross into the Out phase. Inhale duration ≈ 4363ms at bpm 5.5 ratio 40:60.
    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    const outFrame = result.current.currentFrame
    expect(outFrame?.phase).toBe('out')
    // Identity changed because `phase` changed; the useMemo recomputed.
    expect(outFrame).not.toBe(inFrame)

    unmount()
  })

  it('liveFrame identity changes per rAF while currentFrame stays stable (HOOKS-03 D-04)', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    act(() => {
      result.current.start()
    })

    const live1 = result.current.liveFrame
    const stable1 = result.current.currentFrame
    expect(live1).not.toBeNull()
    expect(stable1).not.toBeNull()

    // Advance well inside the In phase so cycleIndex + phase do not change.
    act(() => {
      vi.advanceTimersByTime(100)
    })

    const live2 = result.current.liveFrame
    const stable2 = result.current.currentFrame
    // liveFrame is a per-render-cycle direct read — identity churns by design.
    expect(live2).not.toBe(live1)
    // currentFrame stays the same `===` reference across renders within a phase.
    expect(stable2).toBe(stable1)

    unmount()
  })

  it('liveFrame.phaseProgress advances within a phase (HOOKS-03 D-04)', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    act(() => {
      result.current.start()
    })

    const p1 = result.current.liveFrame?.phaseProgress ?? -1
    expect(p1).toBeGreaterThanOrEqual(0)

    // Advance ~1s within the In phase (~4.36s long). phaseProgress monotonically
    // increases across rAF ticks; the live frame reflects the per-frame value.
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    const p2 = result.current.liveFrame?.phaseProgress ?? -1
    expect(p2).toBeGreaterThan(p1)

    unmount()
  })

  it('rAF cancel-guard: tick after teardown is a no-op (HOOKS-04 D-10)', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    // WR-01 (Plan 10-02): turn the implicit negative-by-absence assertion
    // into an explicit positive one. Vitest does NOT fail tests on uncaught
    // console.error by default. Note: React 18 silently no-ops setState-on-
    // unmounted (the React 17 "Can't perform a React state update on an
    // unmounted component" warning was removed) — so a regression that
    // removed BOTH the top-of-tick cancel-guard AND the cleanup's
    // cancelAnimationFrame would still not necessarily emit a console.error.
    // The spy + positive assertion here remains valuable as defense-in-depth:
    // it locks the LOCAL invariant "no unexpected console.error is emitted
    // from this hook's rAF lifecycle" so any React (or future linting layer)
    // warning that DOES surface — e.g. an `act()` complaint about state
    // updates outside an act block, or a future re-introduction of the
    // unmounted warning — becomes a test failure instead of silent
    // tolerance. The mockImplementation(() => {}) swallows the output so a
    // real regression's warning does not pollute test runner output; the
    // spy still records calls so the assertion can read them.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    const frameBeforeUnmount = result.current.currentFrame
    // Sanity: at least one rAF tick ran successfully before teardown.
    expect(frameBeforeUnmount).not.toBeNull()

    unmount()

    // After unmount, the effect cleanup ran (cancelled=true; cancelAnimationFrame
    // fired). A subsequent advanceTimersByTime that surfaces any in-flight rAF
    // callback must short-circuit at the top-of-tick `if (cancelled) return`
    // guard — no setState observed, no React "setState on unmounted component"
    // console.error emitted. The positive assertion below locks the
    // negative-by-absence into a directly testable invariant. The substring
    // match 'unmounted' is robust to React minor-version wording variants.
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('unmounted'),
    )

    // Explicit restore — this file's afterEach does not call
    // vi.restoreAllMocks(), so the spy would otherwise persist into
    // subsequent tests in the same describe block.
    consoleErrorSpy.mockRestore()
  })

  it('runningSnapshotRef.current is populated while running and persists across the transition out (HOOKS-02 D-06/D-07/D-08)', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings))

    // Idle baseline — the hook hasn't written to the ref yet.
    expect(result.current.runningSnapshotRef.current).toBeNull()

    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    const snap = result.current.runningSnapshotRef.current
    expect(snap).not.toBeNull()
    // The key derives from startedAtMs per D-07.
    expect(snap?.key).toBe(String(snap?.startedAtMs))
    // lastElapsedMs reflects the rAF tick value (allow some jitter — fake
    // timers advance setState across multiple rAF callbacks so the snapshot
    // captures the latest known elapsed inside the setState updater per D-08;
    // ≥ 900 keeps the assertion robust against the ~16ms per-frame quantum).
    expect(snap?.lastElapsedMs).toBeGreaterThanOrEqual(900)
    const snapKey = snap?.key

    // End the session — the hook does NOT null the ref on transition out
    // (hook effects fire BEFORE consumer effects; nulling here would clobber
    // the value before App's leave-running cleanup reads it). The snapshot
    // persists unchanged across the transition.
    act(() => {
      result.current.end()
    })

    const snapAfterEnd = result.current.runningSnapshotRef.current
    expect(snapAfterEnd).not.toBeNull()
    expect(snapAfterEnd?.key).toBe(snapKey)

    // Re-starting the session overwrites the ref on the first rAF tick.
    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    const snapAfterRestart = result.current.runningSnapshotRef.current
    expect(snapAfterRestart).not.toBeNull()
    // New session = new startedAtMs = new key. The stale snapshot from the
    // first session has been overwritten.
    expect(snapAfterRestart?.key).not.toBe(snapKey)

    unmount()
  })
})


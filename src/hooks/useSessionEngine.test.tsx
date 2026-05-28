import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createWallSessionClock } from '../audio/sessionClock'
import type { SessionSettings } from '../domain/settings'
import { DEFAULT_SETTINGS, DEFAULT_STRETCH_SETTINGS } from '../domain/settings'
import { useSessionEngine } from './useSessionEngine'

const defaultSettings: SessionSettings = {
  ...DEFAULT_SETTINGS,
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}

// Phase 50-02 (D-09): useSessionEngine accepts a SessionClock as its 3rd arg.
// Tests use createWallSessionClock() which reads `performance.now() / 1000` —
// under vi.useFakeTimers() this advances with vi.advanceTimersByTime, so
// `clock.now()` matches the fake-timer clock divided by 1000. Per-render
// captured into a closure-stable instance so dep arrays containing `clock`
// do not churn across renders.
const fakeClock = createWallSessionClock()

describe('useSessionEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts from idle and immediately exposes an In frame', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

    act(() => {
      result.current.start()
    })

    expect(result.current.state.status).toBe('running')
    expect(result.current.currentFrame?.phaseLabel).toBe('In')

    unmount()
  })

  it('advances from In to Out from one monotonic elapsed-time source', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.currentFrame?.phaseLabel).toBe('Out')
    // Phase 50-02 (D-02 ms→sec cascade): elapsedSec is seconds-shaped.
    // 5_000 ms advanced via fake timers → ~5 sec elapsed (the wall clock
    // returns performance.now() / 1000).
    expect(result.current.currentFrame?.elapsedSec).toBeGreaterThanOrEqual(5)

    unmount()
  })

  it('ends a running session by returning idle and clearing the current frame while preserving settings', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

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
      useSessionEngine({ ...defaultSettings, durationMinutes: 5 }, null, fakeClock),
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
    const timed = renderHook(() => useSessionEngine({ ...defaultSettings, durationMinutes: 10 }, null, fakeClock))

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
    // Phase 50-02: BreathingPlan.totalSec is seconds-shaped.
    expect(timed.result.current.state.plan.totalSec).toBe(15 * 60)

    act(() => {
      timed.result.current.extendDuration(15)
      timed.result.current.extendDuration(10)
    })
    expect(timed.result.current.state.selectedSettings.durationMinutes).toBe(15)
    timed.unmount()

    const openEnded = renderHook(() =>
      useSessionEngine({ ...defaultSettings, durationMinutes: 'open-ended' }, null, fakeClock),
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
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

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
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

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
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

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
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

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
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

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
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

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
    // The key derives from startedAtSec per D-07 (Phase 50-02 ms→sec cascade).
    expect(snap?.key).toBe(String(snap?.startedAtSec))
    // lastElapsedSec reflects the rAF tick value (allow some jitter — fake
    // timers advance setState across multiple rAF callbacks so the snapshot
    // captures the latest known elapsed inside the setState updater per D-08;
    // ≥ 0.9 sec keeps the assertion robust against the ~16ms per-frame quantum).
    expect(snap?.lastElapsedSec).toBeGreaterThanOrEqual(0.9)
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
    // New session = new startedAtSec = new key. The stale snapshot from the
    // first session has been overwritten.
    expect(snapAfterRestart?.key).not.toBe(snapKey)

    unmount()
  })
})

// WR-03 regression (Plan 34-06): a stretch session round-trip must not clobber
// the engine's resonant selectedSettings. After start() + end() with stretch
// settings wired, idle state.selectedSettings must equal the initialSettings
// the engine was initialized with — not the stretch-derived synthetic lead-in.
describe('useSessionEngine — WR-03 stretch round-trip selectedSettings preservation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('idle selectedSettings equals the resonant initialSettings after a stretch session start→end round-trip', () => {
    const resonantSettings: SessionSettings = {
      ...defaultSettings,
      bpm: 5.5,
      ratio: '40:60',
      durationMinutes: 20,
    }

    const { result, unmount } = renderHook(() =>
      useSessionEngine(resonantSettings, DEFAULT_STRETCH_SETTINGS, fakeClock),
    )

    // Confirm idle state starts with resonant settings
    expect(result.current.state.status).toBe('idle')
    if (result.current.state.status !== 'idle') throw new Error('Expected idle')
    expect(result.current.state.selectedSettings).toEqual(resonantSettings)

    // Start stretch session
    act(() => {
      result.current.start()
    })

    expect(result.current.state.status).toBe('running')

    // End stretch session
    act(() => {
      result.current.end()
    })

    // After end, idle selectedSettings must equal the resonant settings (WR-03).
    // Before the fix, endSession returned the synthetic lead-in settings (bpm: initialBpm, durationMinutes: 'open-ended').
    expect(result.current.state.status).toBe('idle')
    expect(result.current.state.selectedSettings).toEqual(resonantSettings)

    unmount()
  })
})

// Phase 51 Plan 02: reanchorSessionClock rewrites startedAtSec to preserve
// elapsed across an AudioContext reconstruction (D-10 invariant).
describe('useSessionEngine — reanchorSessionClock (Phase 51 D-10/D-11)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reanchorSessionClock rewrites startedAtSec = newClockNow - lastFrame.elapsedSec when running (D-10)', () => {
    // Use a wall clock starting at t=100s by setting fake system time.
    // performance.now() / 1000 is the wall clock source via createWallSessionClock.
    // We need startedAtSec = clock.now() at start. To control this, we advance
    // fake timers so performance.now() is predictable.
    // Start at t=0 (performance.now()=0 via fake timers reset at beforeEach).
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

    act(() => {
      result.current.start()
    })

    // Advance 30s so elapsedSec ≈ 30.
    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    expect(result.current.state.status).toBe('running')
    if (result.current.state.status !== 'running') throw new Error('Expected running')

    const elapsedSecBeforeReanchor = result.current.state.lastFrame.elapsedSec
    expect(elapsedSecBeforeReanchor).toBeGreaterThanOrEqual(29.9) // ~30s

    // Simulate the new AC's currentTime ≈ 0.5 (post-reconstruction).
    const newClockNow = 0.5
    act(() => {
      result.current.reanchorSessionClock(newClockNow)
    })

    expect(result.current.state.status).toBe('running')
    // Reason: TypeScript cannot model that act() + reanchorSessionClock may change status;
    // the runtime guard here is needed to narrow the union for the property access below.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (result.current.state.status !== 'running') throw new Error('Expected running after reanchor')

    // D-10 reanchor math: newStartedAtSec = newClockNow - lastFrame.elapsedSec
    // The elapsed at reanchor time was captured just before the call.
    const expectedStartedAtSec = newClockNow - elapsedSecBeforeReanchor
    expect(result.current.state.startedAtSec).toBeCloseTo(expectedStartedAtSec, 5)

    unmount()
  })

  it('reanchorSessionClock is a no-op when status !== running (D-10)', () => {
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

    // state.status is 'idle' initially.
    expect(result.current.state.status).toBe('idle')
    const stateBeforeReanchor = result.current.state

    act(() => {
      result.current.reanchorSessionClock(0.5)
    })

    // State reference must be unchanged — no setState fired.
    expect(result.current.state).toBe(stateBeforeReanchor)
    expect(result.current.state.status).toBe('idle')

    unmount()
  })

  it('post-reanchor rAF tick computes elapsedSec from the new startedAtSec consistently (D-10)', () => {
    // Verify that after reanchorSessionClock, the next rAF tick recomputes
    // elapsedSec = clock.now() - newStartedAtSec and sees the same elapsed as before.
    const { result, unmount } = renderHook(() => useSessionEngine(defaultSettings, null, fakeClock))

    act(() => {
      result.current.start()
    })

    // Advance 20s to build up elapsed.
    act(() => {
      vi.advanceTimersByTime(20_000)
    })

    expect(result.current.state.status).toBe('running')
    if (result.current.state.status !== 'running') throw new Error('Expected running')

    const elapsedBeforeReanchor = result.current.state.lastFrame.elapsedSec
    expect(elapsedBeforeReanchor).toBeGreaterThanOrEqual(19.9)

    // The wall clock is currently at ~20s (performance.now()/1000 ≈ 20).
    // Call reanchorSessionClock with a "new AC" currentTime of 1.0s.
    // After reanchor: startedAtSec = 1.0 - 20 = -19.
    // The wall clock now reads ~20s, so next tick computes elapsed = 20 - (-19) = 39?
    // That is NOT what we want — the clock source changes too (the real proxy swap
    // would change the clock source). In this test, the fakeClock (wall clock) is still
    // the injected clock. What reanchorSessionClock does is re-anchor the startedAtSec
    // so that on the NEXT tick, elapsed = clock.now() - newStartedAtSec matches the
    // pre-reanchor elapsed.
    // Since the clock source doesn't change in this test (still wall clock at ~20s),
    // we need newClockNow to be the CURRENT clock value so elapsed is preserved.
    const currentClockNow = fakeClock.now()
    const newClockNow = currentClockNow // simulating newEngine.clock.now() = same instant
    act(() => {
      result.current.reanchorSessionClock(newClockNow)
    })

    // Reason: TypeScript cannot model that act() + reanchorSessionClock may change status;
    // the runtime guard is needed to narrow the union for the property access below.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (result.current.state.status !== 'running') throw new Error('Expected running after reanchor')

    // After reanchor with same clock value: startedAtSec should be (currentClockNow - elapsedBeforeReanchor).
    // On the next rAF tick, clock.now() ≈ currentClockNow, so elapsed = currentClockNow - (currentClockNow - elapsedBeforeReanchor) = elapsedBeforeReanchor.
    const newStartedAtSec = result.current.state.startedAtSec
    expect(newStartedAtSec).toBeCloseTo(currentClockNow - elapsedBeforeReanchor, 5)

    // Advance one rAF tick to verify the tick computes without discontinuity.
    act(() => {
      vi.advanceTimersByTime(100) // one ~16ms rAF frame
    })

    expect(result.current.state.status).toBe('running')
    // Reason: TypeScript cannot model that advanceTimersByTime may change status;
    // the runtime guard is needed to narrow the union for the property access below.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (result.current.state.status !== 'running') throw new Error('Expected running after tick')
    // elapsed should still be approximately the same as before reanchor (no jump).
    expect(result.current.state.lastFrame.elapsedSec).toBeGreaterThanOrEqual(elapsedBeforeReanchor - 0.1)

    unmount()
  })
})

// When useSessionEngine is called with stretchSettings, start() calls
// startStretchSession and the resulting state has stretchSegments (not null).
describe('useSessionEngine — stretch session path (Phase 34)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('start() with stretchSettings produces a running stretch session (stretchSegments not null)', () => {
    const { result, unmount } = renderHook(() =>
      useSessionEngine(DEFAULT_SETTINGS, DEFAULT_STRETCH_SETTINGS, fakeClock),
    )

    act(() => {
      result.current.start()
    })

    expect(result.current.state.status).toBe('running')
    if (result.current.state.status !== 'running') throw new Error('Expected running')
    // startStretchSession populates stretchSegments (not null)
    expect(result.current.state.stretchSegments).not.toBeNull()

    unmount()
  })

  it('start() without stretchSettings (null) produces a standard session (stretchSegments null)', () => {
    const { result, unmount } = renderHook(() =>
      useSessionEngine(DEFAULT_SETTINGS, null, fakeClock),
    )

    act(() => {
      result.current.start()
    })

    expect(result.current.state.status).toBe('running')
    if (result.current.state.status !== 'running') throw new Error('Expected running')
    // startSession leaves stretchSegments null for standard sessions
    expect(result.current.state.stretchSegments).toBeNull()

    unmount()
  })

  it('stretch session advances through phases from the In frame', () => {
    const { result, unmount } = renderHook(() =>
      useSessionEngine(DEFAULT_SETTINGS, DEFAULT_STRETCH_SETTINGS, fakeClock),
    )

    act(() => {
      result.current.start()
    })

    // After start, the first frame should be the In phase at t=0
    expect(result.current.state.status).toBe('running')
    expect(result.current.currentFrame?.phaseLabel).toBe('In')

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    // After 5s the phase should have advanced (Out or still In depending on BPM)
    expect(result.current.state.status).toBe('running')
    expect(result.current.currentFrame).not.toBeNull()

    unmount()
  })
})

// Phase 51 Plan 04 — AC-suspension semantics + foreground long-run smoke.
//
// Locks D-07 (AC suspend freezes session elapsed) + D-07-corollary (timed
// completion fires on AC-time, not wall time) + CLOCK-05 (foreground no-drift
// over a 5-minute simulated window).
//
// Test fixture: createMockSessionClock(initialNow) exposes a controllable
// `now()` independent of vi's fake timers. `advance(deltaSec)` and
// `set(value)` mutate the clock; `freeze()` is implicit (just stop calling
// advance/set). The rAF loop still fires via vi.advanceTimersByTime — but it
// reads clock.now() from this mock instead of performance.now() / 1000.
import type { SessionClock } from '../audio/sessionClock'

interface MockSessionClock {
  clock: SessionClock
  advance(deltaSec: number): void
  set(value: number): void
}

function createMockSessionClock(initialNow: number): MockSessionClock {
  let nowValue = initialNow
  const noopUnsub = (): void => undefined
  return {
    clock: {
      now: () => nowValue,
      schedule: () => undefined,
      setMasterGain: () => undefined,
      onSuspend: () => noopUnsub,
      onResume: () => noopUnsub,
      onClose: () => noopUnsub,
    },
    advance: (delta) => {
      nowValue += delta
    },
    set: (value) => {
      nowValue = value
    },
  }
}

describe('useSessionEngine — AC-suspension semantics (Phase 51 D-07 / CLOCK-05)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // B1 — AC-suspension freezes HRV session elapsed (D-07).
  // The mock clock simulates AC suspension by NOT advancing while vi timers
  // (which drive rAF) continue. lastFrame.elapsedSec must stay frozen at
  // its pre-suspend value, then resume cleanly when the clock advances again.
  it('B1: AC-suspend freezes elapsed; resume continues from frozen value', () => {
    const mock = createMockSessionClock(100)
    const openEnded = { ...defaultSettings, durationMinutes: 'open-ended' as const }
    const { result, unmount } = renderHook(() =>
      useSessionEngine(openEnded, null, mock.clock),
    )

    act(() => {
      result.current.start()
    })

    // Advance AC-time by 10 sec, drive a rAF tick to compute elapsedSec.
    act(() => {
      mock.advance(10)
      vi.advanceTimersByTime(100)
    })

    const elapsedAfter10Sec = result.current.state.status === 'running'
      ? result.current.liveFrame?.elapsedSec ?? 0
      : 0
    expect(elapsedAfter10Sec).toBeGreaterThanOrEqual(9.9)
    expect(elapsedAfter10Sec).toBeLessThanOrEqual(10.1)

    // FREEZE the mock clock (no advance call). Advance wall time / rAF cadence
    // by 10 sec — the rAF tick fires repeatedly but clock.now() returns the
    // same value, so elapsedSec MUST NOT grow.
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    const elapsedAfterFreeze = result.current.state.status === 'running'
      ? result.current.liveFrame?.elapsedSec ?? 0
      : 0
    expect(elapsedAfterFreeze).toBeGreaterThanOrEqual(9.9)
    expect(elapsedAfterFreeze).toBeLessThanOrEqual(10.1)

    // Resume the AC clock by advancing 10 more sec. Drive a rAF tick — elapsed
    // should now be ≈ 20 (the frozen 10 + 10 new), NOT ≈ 30 (frozen 10 +
    // wall-elapsed 10 + new 10).
    act(() => {
      mock.advance(10)
      vi.advanceTimersByTime(100)
    })

    const elapsedAfterResume = result.current.state.status === 'running'
      ? result.current.liveFrame?.elapsedSec ?? 0
      : 0
    expect(elapsedAfterResume).toBeGreaterThanOrEqual(19.9)
    expect(elapsedAfterResume).toBeLessThanOrEqual(20.1)

    unmount()
  })

  // B2 — Timed completion fires on AC-time, not wall-time (D-07 corollary).
  // A 5-min timed session frozen mid-way must NOT auto-complete while wall
  // time advances past the duration; it completes only when the AC clock
  // crosses the target.
  it('B2: timed session completes on AC-time, ignoring wall-time during freeze', () => {
    const mock = createMockSessionClock(0)
    // 5-minute timed session (smallest valid DurationOption per settings.ts).
    const timed = { ...defaultSettings, durationMinutes: 5 as const }
    const { result, unmount } = renderHook(() =>
      useSessionEngine(timed, null, mock.clock),
    )

    act(() => {
      result.current.start()
    })

    // Advance to half-elapsed (150 sec AC-elapsed of the 5-min target).
    act(() => {
      mock.advance(150)
      vi.advanceTimersByTime(100)
    })
    expect(result.current.state.status).toBe('running')

    // FREEZE the AC clock: advance wall time by 10 minutes. If the session
    // read from wall time, it would auto-complete during this advance. It
    // MUST stay running.
    act(() => {
      vi.advanceTimersByTime(10 * 60_000)
    })
    expect(result.current.state.status).toBe('running')

    // Resume the AC clock past the 5-min target. Completion math fires at the
    // next cycle boundary after the target — at bpm 5.5 cycles are ~10.9 sec,
    // so advance the AC clock well past the target to guarantee the boundary
    // is crossed.
    act(() => {
      mock.advance(300) // jump to AC-time 450 (well past 300-sec target)
      vi.advanceTimersByTime(100)
    })
    expect(result.current.state.status).toBe('complete')

    unmount()
  })

  // B7 — Foreground long-run smoke (CLOCK-05).
  // 300 iterations of 1-sec AC-time advance produce 5 minutes of session.
  // Asserts (a) status stays 'running' (open-ended); (b) elapsedSec stays
  // within 100ms of the expected value at each tick; (c) no completion fires
  // prematurely. This is the architectural confirmation that the two-clock
  // divergence path is gone — clock.now() is the only time source feeding
  // the elapsed computation.
  it('B7: foreground 5-min smoke holds elapsedSec within 100ms of AC-time', () => {
    const mock = createMockSessionClock(50)
    const openEnded = { ...defaultSettings, durationMinutes: 'open-ended' as const }
    const { result, unmount } = renderHook(() =>
      useSessionEngine(openEnded, null, mock.clock),
    )

    act(() => {
      result.current.start()
    })

    const ITERATIONS = 300
    for (let i = 1; i <= ITERATIONS; i++) {
      act(() => {
        mock.advance(1)
        vi.advanceTimersByTime(100)
      })
      // Spot-check every 30 iterations to keep the assertion budget reasonable.
      if (i % 30 === 0) {
        expect(result.current.state.status).toBe('running')
        const elapsed = result.current.liveFrame?.elapsedSec ?? 0
        // Tolerance: ±0.1 sec (the rAF tick can lag the clock by one frame at
        // most; that's well under 100ms).
        expect(elapsed).toBeGreaterThanOrEqual(i - 0.1)
        expect(elapsed).toBeLessThanOrEqual(i + 0.1)
      }
    }

    expect(result.current.state.status).toBe('running')
    const finalElapsed = result.current.liveFrame?.elapsedSec ?? 0
    expect(finalElapsed).toBeGreaterThanOrEqual(299.9)
    expect(finalElapsed).toBeLessThanOrEqual(300.1)

    unmount()
  })

  // B5 (engine surface) — runningSnapshotRef.lastElapsedSec freezes under
  // clock freeze. The HRV stats-recording effect at
  // useBreathingSessionController.ts L266-314 reads from
  // `session.runningSnapshotRef.current.lastElapsedSec` when computing
  // `elapsedMs` for `recordResonantSession`. The snapshot is written from
  // inside the rAF tick (useSessionEngine.ts L181-185) as
  // `lastElapsedSec = currentState.lastFrame.elapsedSec`. So:
  //   stats elapsedMs ← snapshot.lastElapsedSec ← state.lastFrame.elapsedSec ← clock.now() − startedAtSec
  // B1 proves the rightmost dependency freezes on AC suspension; this test
  // proves the snapshot inherits that freeze. NK stats (B6) follow by
  // symmetry — the NK controller has the same composition path through
  // `useNKEngine` → `clock.now()`.
  it('B5/B6 (engine surface): runningSnapshotRef.lastElapsedSec inherits clock freeze (D-08 composition)', () => {
    const mock = createMockSessionClock(200)
    const openEnded = { ...defaultSettings, durationMinutes: 'open-ended' as const }
    const { result, unmount } = renderHook(() =>
      useSessionEngine(openEnded, null, mock.clock),
    )

    act(() => {
      result.current.start()
    })

    // Advance AC-time 15 sec; one rAF tick to populate the snapshot.
    act(() => {
      mock.advance(15)
      vi.advanceTimersByTime(100)
    })
    const snapshotPreFreeze = result.current.runningSnapshotRef.current?.lastElapsedSec ?? -1
    expect(snapshotPreFreeze).toBeGreaterThanOrEqual(14.9)
    expect(snapshotPreFreeze).toBeLessThanOrEqual(15.1)

    // Freeze the AC clock; advance wall time by 2 minutes. The rAF tick
    // continues firing but reads frozen clock.now() — the snapshot value
    // must NOT grow.
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    const snapshotDuringFreeze = result.current.runningSnapshotRef.current?.lastElapsedSec ?? -1
    expect(snapshotDuringFreeze).toBeGreaterThanOrEqual(14.9)
    expect(snapshotDuringFreeze).toBeLessThanOrEqual(15.1)

    // Resume the AC clock; the snapshot resumes from where it froze + new
    // AC-elapsed (NOT pre-freeze + wall-elapsed-during-freeze + new).
    act(() => {
      mock.advance(20)
      vi.advanceTimersByTime(100)
    })
    const snapshotPostResume = result.current.runningSnapshotRef.current?.lastElapsedSec ?? -1
    expect(snapshotPostResume).toBeGreaterThanOrEqual(34.9)
    expect(snapshotPostResume).toBeLessThanOrEqual(35.1)

    unmount()
  })

  // B8 — Stretch ramp position is determined by clock.now() − startedAtSec.
  // stretchRamp.ts math is unchanged at Phase 51 (D-09 invariant); the test
  // confirms the upstream clock-source change does not break ramp continuity
  // under freeze/resume.
  it('B8: stretch session lastFrame.elapsedSec rides AC-time (freeze freezes the ramp)', () => {
    const mock = createMockSessionClock(0)
    const { result, unmount } = renderHook(() =>
      useSessionEngine(DEFAULT_SETTINGS, DEFAULT_STRETCH_SETTINGS, mock.clock),
    )

    act(() => {
      result.current.start()
    })

    // Advance into the ramp (25 sec mid-segment) and tick.
    act(() => {
      mock.advance(25)
      vi.advanceTimersByTime(100)
    })
    const elapsedAtPosition = result.current.liveFrame?.elapsedSec ?? -1
    expect(elapsedAtPosition).toBeGreaterThanOrEqual(24.9)
    expect(elapsedAtPosition).toBeLessThanOrEqual(25.1)

    // FREEZE: advance wall time but NOT the AC clock. Ramp position must
    // remain at 25 sec — wall time advancing is irrelevant because the
    // stretch math reads from lastFrame.elapsedSec which reads from clock.
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    const elapsedAfterFreeze = result.current.liveFrame?.elapsedSec ?? -1
    expect(elapsedAfterFreeze).toBeGreaterThanOrEqual(24.9)
    expect(elapsedAfterFreeze).toBeLessThanOrEqual(25.1)

    // Resume: advance AC by 5 sec; ramp progresses to 30 sec position.
    act(() => {
      mock.advance(5)
      vi.advanceTimersByTime(100)
    })
    const elapsedAfterResume = result.current.liveFrame?.elapsedSec ?? -1
    expect(elapsedAfterResume).toBeGreaterThanOrEqual(29.9)
    expect(elapsedAfterResume).toBeLessThanOrEqual(30.1)

    // Status invariant: a stretch session does not auto-complete from a
    // wall-time advance during freeze. The ramp segment table determines
    // completion; status must still be 'running' at 30 sec into a typical
    // stretch (DEFAULT_STRETCH_SETTINGS has 5-min warm-up minimum).
    expect(result.current.state.status).toBe('running')

    unmount()
  })

  // B3 (engine surface) — reanchor preserves elapsed across an AC swap.
  it('B3 (engine surface): reanchorSessionClock preserves elapsed across an AC origin change', () => {
    // Set up: start the session under "AC #1" (mock A starting at 100).
    const mock = createMockSessionClock(100)
    const openEnded = { ...defaultSettings, durationMinutes: 'open-ended' as const }
    const { result, unmount, rerender } = renderHook(
      ({ clock }) => useSessionEngine(openEnded, null, clock),
      { initialProps: { clock: mock.clock } },
    )

    act(() => {
      result.current.start()
    })

    // Advance AC #1 by 30 sec → elapsedSec ≈ 30.
    act(() => {
      mock.advance(30)
      vi.advanceTimersByTime(100)
    })
    const elapsedPreReanchor = result.current.liveFrame?.elapsedSec ?? -1
    expect(elapsedPreReanchor).toBeGreaterThanOrEqual(29.9)
    expect(elapsedPreReanchor).toBeLessThanOrEqual(30.1)

    // Simulate AC reconstruction: "AC #2" starts at currentTime = 0.5.
    // In production, useAudioCues.reconstructEngine swaps the proxy source
    // to newEngine.clock, then fires onSessionClockReanchored(newClockNow).
    // useBreathingSessionController forwards that to session.reanchorSessionClock.
    // The mock here represents AC#2 (origin 0.5).
    const mock2 = createMockSessionClock(0.5)

    // Step 1: reanchor to AC#2's currentTime (0.5) — the engine rewrites
    // startedAtSec = 0.5 − 30 = −29.5 so elapsed math stays at 30.
    act(() => {
      result.current.reanchorSessionClock(0.5)
    })

    // Step 2: re-render with the new clock source so the rAF loop reads
    // from mock2 going forward. (In production this happens automatically
    // because the proxy's identity is stable; here we simulate the swap by
    // rerendering with a different clock object.)
    rerender({ clock: mock2.clock })

    // Step 3: force a rAF tick — elapsed should still be ≈ 30 (preserved).
    act(() => {
      vi.advanceTimersByTime(100)
    })
    const elapsedPostReanchor = result.current.liveFrame?.elapsedSec ?? -1
    expect(elapsedPostReanchor).toBeGreaterThanOrEqual(29.9)
    expect(elapsedPostReanchor).toBeLessThanOrEqual(30.1)

    // Step 4: advance AC#2 by 10 sec → elapsedSec ≈ 40 (the +10 lands on
    // the preserved 30 baseline, NOT 0 from AC#2's origin).
    act(() => {
      mock2.advance(10)
      vi.advanceTimersByTime(100)
    })
    const elapsedAfterAC2Advance = result.current.liveFrame?.elapsedSec ?? -1
    expect(elapsedAfterAC2Advance).toBeGreaterThanOrEqual(39.9)
    expect(elapsedAfterAC2Advance).toBeLessThanOrEqual(40.1)

    unmount()
  })
})

// Phase 52 D-05/D-06/D-07: per-tick elapsed-delta clamp + startedAtSec rebase.
//
// Test strategy: use the existing createMockSessionClock (controllable clock
// independent of vi fake timers). "Hidden window" simulation = advance the
// mock clock by N seconds without firing a rAF tick, then fire a single rAF
// tick via vi.advanceTimersByTime(small). The tick sees rawDelta = N seconds;
// clamp fires when N > MAX_TICK_DELTA_SEC; rebase adjusts startedAtSec.
//
// Tests import MAX_TICK_DELTA_SEC from audioEngine (per "no-design-locking"
// project memory — no hard-coded 0.1 literals in test arithmetic).
import { MAX_TICK_DELTA_SEC } from '../audio/audioEngine'

describe('useSessionEngine — Phase 52 D-05/D-06/D-07 per-tick clamp', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Test 1 (D-05): foreground tick passthrough — rAF at 16ms apart sees
  // rawDelta ≈ 0.016; clamp does NOT fire; startedAtSec is unchanged.
  it('D-05 clamps delta to MAX_TICK_DELTA_SEC: foreground tick passthrough leaves startedAtSec unchanged', () => {
    const mock = createMockSessionClock(100)
    const openEnded = { ...defaultSettings, durationMinutes: 'open-ended' as const }
    const { result, unmount } = renderHook(() =>
      useSessionEngine(openEnded, null, mock.clock),
    )

    act(() => {
      result.current.start()
    })

    // Advance one "foreground frame" — 16ms of clock time + rAF tick.
    act(() => {
      mock.advance(0.016) // 16ms in seconds
      vi.advanceTimersByTime(20)
    })

    expect(result.current.state.status).toBe('running')
    if (result.current.state.status !== 'running') throw new Error('Expected running')
    const startedAtSecAfterFrame1 = result.current.state.startedAtSec

    // Advance another foreground frame.
    act(() => {
      mock.advance(0.016)
      vi.advanceTimersByTime(20)
    })

    if (result.current.state.status !== 'running') throw new Error('Expected running')
    const startedAtSecAfterFrame2 = result.current.state.startedAtSec

    // startedAtSec must be the same across both frames — clamp did NOT fire.
    // (rawDelta ≈ 0.016 < MAX_TICK_DELTA_SEC = 0.1 → no rebase)
    expect(startedAtSecAfterFrame2).toBeCloseTo(startedAtSecAfterFrame1, 10)

    unmount()
  })

  // Test 2 (D-07): clamp fires on hidden-window resumption — advance clock.now()
  // by 5 seconds without rAF, then one tick; startedAtSec rebased forward by
  // (5 - MAX_TICK_DELTA_SEC); new elapsed ≤ pre-hide-elapsed + MAX_TICK_DELTA_SEC.
  it('D-07 rebases startedAtSec by overage on clamp fire: hidden window of 5s produces correct rebase', () => {
    const mock = createMockSessionClock(100)
    const openEnded = { ...defaultSettings, durationMinutes: 'open-ended' as const }
    const { result, unmount } = renderHook(() =>
      useSessionEngine(openEnded, null, mock.clock),
    )

    act(() => {
      result.current.start()
    })

    // Let the session run for 1 second (foreground) to establish baseline.
    act(() => {
      mock.advance(1)
      vi.advanceTimersByTime(100)
    })

    expect(result.current.state.status).toBe('running')
    if (result.current.state.status !== 'running') throw new Error('Expected running')
    const startedAtSecBeforeHide = result.current.state.startedAtSec
    const elapsedBeforeHide = result.current.state.lastFrame.elapsedSec
    expect(elapsedBeforeHide).toBeGreaterThanOrEqual(0.9)

    // Simulate hidden window: advance clock by 5s WITHOUT firing rAF.
    // (Just call mock.advance — do NOT call vi.advanceTimersByTime yet.)
    mock.advance(5)

    // Now fire one rAF tick. The tick sees rawDelta = 5s (>> MAX_TICK_DELTA_SEC).
    // Clamp fires; startedAtSec rebases forward by (5 - MAX_TICK_DELTA_SEC).
    act(() => {
      vi.advanceTimersByTime(20)
    })

    if (result.current.state.status !== 'running') throw new Error('Expected running after hidden tick')
    const startedAtSecAfterClamp = result.current.state.startedAtSec
    const elapsedAfterClamp = result.current.state.lastFrame.elapsedSec

    // startedAtSec must have been rebased forward by (5 - MAX_TICK_DELTA_SEC).
    const expectedRebase = 5 - MAX_TICK_DELTA_SEC
    expect(startedAtSecAfterClamp).toBeCloseTo(startedAtSecBeforeHide + expectedRebase, 5)

    // elapsed = clock.now() - startedAtSec must be ≤ pre-hide-elapsed + MAX_TICK_DELTA_SEC.
    // clock.now() = 100 + 1 + 5 = 106; newStartedAtSec = startedAtSecBeforeHide + 4.9
    // elapsed ≈ elapsedBeforeHide + MAX_TICK_DELTA_SEC (only the clamped delta adds to elapsed)
    expect(elapsedAfterClamp).toBeLessThanOrEqual(elapsedBeforeHide + MAX_TICK_DELTA_SEC + 0.05)

    unmount()
  })

  // Test 3 (D-06): clamp threshold imported from audioEngine — test uses
  // MAX_TICK_DELTA_SEC in arithmetic; no hard-coded 0.1 appears in this file.
  it('D-06 uses imported MAX_TICK_DELTA_SEC (not hard-coded 0.1): clamp fires exactly at threshold', () => {
    const mock = createMockSessionClock(0)
    const openEnded = { ...defaultSettings, durationMinutes: 'open-ended' as const }
    const { result, unmount } = renderHook(() =>
      useSessionEngine(openEnded, null, mock.clock),
    )

    act(() => {
      result.current.start()
    })

    // Advance exactly MAX_TICK_DELTA_SEC (boundary case — should NOT fire rebase
    // since Math.min(rawDelta, MAX_TICK_DELTA_SEC) = rawDelta when rawDelta === MAX_TICK_DELTA_SEC).
    const atThreshold = MAX_TICK_DELTA_SEC
    mock.advance(atThreshold)
    act(() => {
      vi.advanceTimersByTime(20)
    })

    if (result.current.state.status !== 'running') throw new Error('Expected running')
    const startedAtSecAtThreshold = result.current.state.startedAtSec

    // Now advance just above the threshold — clamp MUST fire.
    const aboveThreshold = MAX_TICK_DELTA_SEC + 0.05
    mock.advance(aboveThreshold)
    act(() => {
      vi.advanceTimersByTime(20)
    })

    if (result.current.state.status !== 'running') throw new Error('Expected running after above-threshold tick')
    const startedAtSecAboveThreshold = result.current.state.startedAtSec

    // Above threshold: startedAtSec must have moved forward by the overage.
    const expectedOverage = aboveThreshold - MAX_TICK_DELTA_SEC
    expect(startedAtSecAboveThreshold).toBeCloseTo(startedAtSecAtThreshold + expectedOverage, 5)

    unmount()
  })

  // Test 4 (D-07 practice-time semantics): a 10-minute timed session hidden for
  // 5 minutes mid-way records ≈ 10 minutes of attention time, NOT 15 wall-clock
  // minutes. The hidden 5 minutes are excluded from session duration via the rebase.
  it('D-07 practice-time semantics: 10-min session hidden 5min records ~10min, not 15min', () => {
    const mock = createMockSessionClock(0)
    // 10-minute timed session
    const timed = { ...defaultSettings, durationMinutes: 10 as const }
    const { result, unmount } = renderHook(() =>
      useSessionEngine(timed, null, mock.clock),
    )

    act(() => {
      result.current.start()
    })

    // Run 5 minutes of foreground time (in 30-sec chunks).
    for (let i = 0; i < 10; i++) {
      act(() => {
        mock.advance(30)
        vi.advanceTimersByTime(100)
      })
    }
    expect(result.current.state.status).toBe('running')
    if (result.current.state.status !== 'running') throw new Error('Expected running')
    const elapsedAt5min = result.current.state.lastFrame.elapsedSec
    expect(elapsedAt5min).toBeGreaterThanOrEqual(299.9)
    expect(elapsedAt5min).toBeLessThanOrEqual(300.1)

    // HIDDEN WINDOW: advance clock by 5 minutes WITHOUT rAF.
    mock.advance(5 * 60) // 300 seconds hidden

    // Fire one rAF tick. Clamp fires: rebase forward by (300 - MAX_TICK_DELTA_SEC).
    act(() => {
      vi.advanceTimersByTime(20)
    })

    if (result.current.state.status !== 'running') throw new Error('Expected running after hidden tick')
    const elapsedAfterHiddenWindow = result.current.state.lastFrame.elapsedSec
    // elapsed must still be ≤ 5min + MAX_TICK_DELTA_SEC (NOT 10 min).
    expect(elapsedAfterHiddenWindow).toBeLessThanOrEqual(5 * 60 + MAX_TICK_DELTA_SEC + 0.1)

    // Continue running 5 more foreground minutes so total attention time ≈ 10 min.
    // The session should complete at the cycle boundary after 10-min AC-attention-time.
    for (let i = 0; i < 10; i++) {
      act(() => {
        mock.advance(30)
        vi.advanceTimersByTime(100)
      })
      if (result.current.state.status === 'complete') break
    }

    // Session completes at ~10min of attention time (cycle-boundary aligned).
    // At bpm 5.5, cycles are ~10.9s — advance a bit more to cross the boundary.
    act(() => {
      mock.advance(15)
      vi.advanceTimersByTime(100)
    })

    expect(result.current.state.status).toBe('complete')

    unmount()
  })

  // Test 5: lastClockNowRef initialization at effect start, not hook construction.
  // The ref is initialized to clock.now() at the START of the rAF effect (when
  // status flips to 'running'), NOT at hook construction time.
  it('lastClockNowRef initialized at effect start: first tick sees minimal delta even if time passed before start', () => {
    const mock = createMockSessionClock(50)
    const openEnded = { ...defaultSettings, durationMinutes: 'open-ended' as const }
    const { result, unmount } = renderHook(() =>
      useSessionEngine(openEnded, null, mock.clock),
    )

    // Advance the clock before start() — simulates time passing while hook is
    // constructed but session hasn't started yet. If the ref were initialized at
    // hook construction (clock.now() = 50), the first tick after start() (at t=60)
    // would see rawDelta = 60-50 = 10s → clamp fires spuriously.
    // If initialized at effect-start (when status transitions to 'running'),
    // rawDelta = 0 on the first rAF tick.
    mock.advance(10) // clock.now() = 60

    act(() => {
      result.current.start()
      // effect start: lastClockNowRef.current = clock.now() = 60
    })

    // First rAF tick: rawDelta = clock.now() - 60 ≈ 0 (no time advance between
    // effect-start and first tick under fake timers).
    act(() => {
      vi.advanceTimersByTime(20)
    })

    if (result.current.state.status !== 'running') throw new Error('Expected running')
    // startedAtSec was set at start() = clock.now() - 0 = 60 (start called at t=60).
    // After first tick with NO clamp fire, startedAtSec must be unchanged.
    const startedAtSec = result.current.state.startedAtSec
    // elapsed ≤ MAX_TICK_DELTA_SEC (no spurious 10s clamp-rebase happened).
    const elapsedAfterFirstTick = result.current.state.lastFrame.elapsedSec
    expect(elapsedAfterFirstTick).toBeLessThanOrEqual(MAX_TICK_DELTA_SEC + 0.05)
    // startedAtSec near 60 (the clock.now() at start time).
    expect(startedAtSec).toBeCloseTo(60, 1)

    unmount()
  })

  // Test 6: multiple consecutive hidden windows — each rebase is independent.
  // Successive hidden windows (advance 3s tick; advance 3s tick) each rebase
  // startedAtSec forward by (rawDelta - MAX_TICK_DELTA_SEC) independently.
  it('D-07 multiple consecutive clamps: each rebase is independent, cumulative rebase = sum of overages', () => {
    const mock = createMockSessionClock(0)
    const openEnded = { ...defaultSettings, durationMinutes: 'open-ended' as const }
    const { result, unmount } = renderHook(() =>
      useSessionEngine(openEnded, null, mock.clock),
    )

    act(() => {
      result.current.start()
    })

    // Baseline tick to establish lastClockNow.
    act(() => {
      mock.advance(0.016)
      vi.advanceTimersByTime(20)
    })

    if (result.current.state.status !== 'running') throw new Error('Expected running')
    const startedAtSecBaseline = result.current.state.startedAtSec

    // Hidden window 1: advance 3s, fire tick.
    mock.advance(3)
    act(() => {
      vi.advanceTimersByTime(20)
    })
    if (result.current.state.status !== 'running') throw new Error('Expected running after hide 1')
    const startedAtAfterHide1 = result.current.state.startedAtSec
    const expectedRebase1 = 3 - MAX_TICK_DELTA_SEC
    expect(startedAtAfterHide1).toBeCloseTo(startedAtSecBaseline + expectedRebase1, 5)

    // Hidden window 2: advance another 3s, fire tick.
    mock.advance(3)
    act(() => {
      vi.advanceTimersByTime(20)
    })
    if (result.current.state.status !== 'running') throw new Error('Expected running after hide 2')
    const startedAtAfterHide2 = result.current.state.startedAtSec
    const expectedRebase2 = 3 - MAX_TICK_DELTA_SEC
    // Cumulative rebase = expectedRebase1 + expectedRebase2.
    expect(startedAtAfterHide2).toBeCloseTo(startedAtAfterHide1 + expectedRebase2, 5)
    expect(startedAtAfterHide2).toBeCloseTo(startedAtSecBaseline + expectedRebase1 + expectedRebase2, 5)

    unmount()
  })
})

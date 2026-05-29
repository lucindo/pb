import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

// Phase 50-02: SessionClock is the D-09 substitute for direct wall-clock
// reads. The audioEngine re-export (ABSTR-02) is the preferred entry point so
// downstream callers don't reach into the audio subdirectory's internal layout.
// Phase 52 D-06: MAX_TICK_DELTA_SEC = 0.1 imported as a typed literal constant
// (single source of truth in audioEngine.ts — no duplicated literal here).
import { MAX_TICK_DELTA_SEC } from '../audio/audioEngine'
import type { SessionClock } from '../audio/audioEngine'
import type { SessionFrame } from '../domain/sessionMath'
import type { SessionSettings, StretchSettings } from '../domain/settings'
import { DEFAULT_SETTINGS } from '../domain/settings'
import {
  completeIfNeeded,
  endSession,
  extendTimedSession,
  startSession,
  startStretchSession,
  type SessionState,
} from '../domain/sessionController'

/**
 * Phase 10 HOOKS-02 (D-07): running-session snapshot exported for App-side
 * consumption. Mirrors the shape that App.tsx previously stored in its local
 * running-snapshot ref (HEAD App.tsx:179-183). The hook now owns the writer
 * (D-06) and exposes the read surface via `runningSnapshotRef`. The snapshot
 * persists across the transition out of `running` so the App-level
 * leave-running cleanup effect can compute elapsed without re-narrowing the
 * discriminated union.
 *
 * Lifetime: written once per rAF tick (from inside the setState updater, per
 * D-08) while status is `running`; persists unchanged after the transition
 * out of running (the hook does NOT null on transition because consumer
 * effects fire AFTER hook effects and need to read the snapshot). The
 * snapshot is overwritten on the next session's first rAF tick. Consumers
 * idempotently dedupe via the `key` field (= startedAtSec, post-Phase-50 sec-shaped).
 */
export interface RunningSnapshot {
  key: string
  startedAtSec: number
  lastElapsedSec: number
}

export interface SessionEngine {
  state: SessionState
  /**
   * Phase 10 HOOKS-03: per-phase-stable frame identity. Same `===` reference
   * across renders within the same `cycleIndex:phase`. Use for effects that
   * should fire once per phase boundary — NOT for per-frame visual rendering.
   */
  currentFrame: SessionFrame | null
  /**
   * Phase 10 HOOKS-03: per-rAF frame value. Identity changes every animation
   * frame; `phaseProgress` and `elapsedMs` are fresh. Use for visual rendering
   * (BreathingShape, SessionReadout) — NOT for phase-boundary effects.
   */
  liveFrame: SessionFrame | null
  /**
   * Phase 10 HOOKS-02 (D-06/D-07/D-08): running-session snapshot owned by the
   * engine, written from inside the rAF tick setState updater while status is
   * `running`. Persists unchanged across the transition out of running so
   * consumer effects (App's leave-running cleanup) can read the last known
   * elapsed values. Overwritten on the next session's first rAF tick.
   * Read `.current` synchronously; refs are stable — do NOT put in effect
   * dep arrays.
   */
  runningSnapshotRef: RefObject<RunningSnapshot | null>
  setSelectedSettings(this: void, settings: SessionSettings): void
  start(this: void): void
  end(this: void): void
  /**
   * Extends the running timed session by `durationMinutes`. No-op if the
   * session is not in `running`. Rejections from the underlying domain
   * (e.g., `RangeError` when the new duration violates invariants) are
   * silently absorbed — state is left unchanged. Callers cannot distinguish
   * "applied" from "declined"; if a user-facing affordance needs that
   * distinction, surface it from this hook before consumers are wired.
   */
  extendDuration(this: void, durationMinutes: number): void
  /**
   * Phase 51 Plan 02 (D-10 / D-11): Reanchor `startedAtSec` after an
   * AudioContext reconstruction (Phase 5.1 iOS recovery path).
   *
   * When `useAudioCues.reconstructEngine` builds a new AudioContext, the new
   * AC's `currentTime` starts near 0. The proxy's source swaps to the new
   * clock via `setSource(newEngine.clock)` — at the next rAF tick
   * `clock.now()` returns the new AC's currentTime. Without reanchor,
   * `elapsed = clock.now() - startedAtSec` would compute a negative or
   * wildly wrong value.
   *
   * Reanchor math (D-10):
   *   `newStartedAtSec = newClockNow - lastFrame.elapsedSec`
   *
   * After reanchor, `elapsed = clock.now() - newStartedAtSec` is:
   *   `≈ newClockNow - (newClockNow - preReanchorElapsed) = preReanchorElapsed`
   * — the elapsed is preserved across the swap.
   *
   * D-11 ordering: this method fires BEFORE `onReanchorRequired` (the
   * audio-anchor reanchor). The caller (`useBreathingSessionController` via
   * `onSessionClockReanchored`) guarantees the ordering.
   *
   * No-op when `status !== 'running'` — reanchor on idle/complete is
   * meaningless (no elapsed to preserve).
   *
   * Phase 50 D-02: `startedAtSec` is seconds-shaped.
   */
  reanchorSessionClock(this: void, newClockNow: number): void
}

/**
 * Phase 50-02 (D-01/D-09): the `clock` arg is the new substitute for direct
 * wall-clock reads. Callers MUST supply either an `AudioSessionClock`
 * (when an AudioEngine exists) or a `WallSessionClock` (visuals-only fallback).
 * Phase 51 will swap the source to audioCtx.currentTime via this same SessionClock
 * seam without any further caller change.
 */
export function useSessionEngine(
  initialSettings: SessionSettings = DEFAULT_SETTINGS,
  stretchSettings: StretchSettings | null = null,
  clock: SessionClock,
): SessionEngine {
  const [state, setState] = useState<SessionState>(() => ({
    status: 'idle',
    selectedSettings: { ...initialSettings },
  }))

  // HOOKS-02 / D-06 / D-07: hook owns the running-snapshot ref. Written from
  // inside the rAF tick setState updater (D-08 — Pitfall 1 closure-staleness
  // resolution). App.tsx's running-snapshot effect at HEAD lines 412-420 is
  // DELETED in Task 3; the hook is now the single writer.
  const runningSnapshotRef = useRef<RunningSnapshot | null>(null)

  // Phase 52 D-05 / D-08: monotonic last-clock-now anchor for per-tick delta
  // computation (D-05) and for the synchronous reset inside reanchorSessionClock
  // (D-08 — "reset synchronously inside reanchorSessionClock so the next rAF
  // tick computes delta against the new clock base"). Initial value 0; overwritten
  // at the START of the rAF effect when status transitions to 'running' — NOT at
  // hook construction time (clock may not yet be backed by the AC at construction).
  // Stable ref — NOT a dep array entry anywhere (mirrors runningSnapshotRef posture).
  const lastClockNowRef = useRef<number>(0)

  // AH-WR-05 INVARIANT — STALE-CLOSURE TRAP: the dep array below is
  // intentionally `[state.status, clock]` only, so this effect (and its rAF loop)
  // is created ONCE per session (when status transitions to running) and NOT
  // re-created on every per-frame state update. Consequently the `state` value
  // captured in this effect's closure is FROZEN at the value it had when the
  // session entered `running`. Every per-frame value (elapsedSec, lastFrame,
  // cycleIndex, phaseProgress, ...) MUST be read inside the
  // `setState((currentState) => ...)` updater via `currentState` — NEVER from
  // the outer-closure `state`. Reading `state` (or anything derived from it)
  // from inside `tick` would silently observe first-frame-stale data for the
  // entire session. Any future value the loop needs must be threaded through
  // `currentState`, not the closure. `clock` is included in the dep array per
  // exhaustive-deps; callers thread a stable memoized instance (Phase 50-02
  // Task 4), so the rAF loop is not re-created mid-session in practice.
  // Phase 52 D-07: the clamp-rebase block inside the updater follows the same
  // constraint — startedAtSec is rewritten via the rebasedState shadow variable,
  // NEVER via state.startedAtSec from the outer closure.
  useEffect(() => {
    if (state.status !== 'running') {
      // HOOKS-02 / D-06: DO NOT null the snapshot here. Hook effects (custom-
      // hook useEffects) run BEFORE consumer-component useEffects when both
      // hooks are called in the same component, so nulling on transition out
      // would clobber `runningSnapshotRef.current` BEFORE App's leave-running
      // cleanup effect read it. The snapshot persists across the transition
      // out of running and is overwritten on the next session's first rAF
      // tick (the inside-updater write in `tick` below). App.tsx's
      // `recordedSessionKeyRef` dedupes idempotently via the snapshot's
      // `key` (= startedAtSec), so reading a stale snapshot on a subsequent
      // idle render is safe — the stats write only fires on a fresh key.
      return undefined
    }

    // Phase 52 D-05/D-08 (Pattern note from PATTERNS.md §"Pattern note on the
    // new lastClockNow ref"): initialize at the START of the rAF effect — NOT
    // at hook construction. The clock may not yet be backed by the AudioContext
    // at construction time; initializing here ensures the first tick sees a
    // near-zero rawDelta rather than a large delta from the gap between hook
    // construction and session start.
    lastClockNowRef.current = clock.now()

    let animationFrameId = 0
    let cancelled = false

    const tick = () => {
      // HOOKS-04 / D-10: top-of-tick cancel-guard. An rAF callback that fires
      // AFTER the effect cleanup ran (jsdom fake-timer rAF drain ordering, or
      // a race in a real browser) becomes a no-op. Prevents setState on a
      // torn-down state owner.
      if (cancelled) return

      // Phase 52 D-05/D-06: per-tick delta computation + always-cap clamp.
      // Single read of clock.now() per tick — shared by the clamp math and
      // the completeIfNeeded call inside the updater (consistent clockNowSec).
      const clockNowSec = clock.now()
      const lastClockNow = lastClockNowRef.current
      const rawDelta = clockNowSec - lastClockNow
      // D-05: clamp applies on every tick via Math.min(rawDelta, MAX_TICK_DELTA_SEC).
      // Foreground frames (~16ms) pass through unchanged; only post-hidden-window
      // first-frame is affected (rawDelta >> MAX_TICK_DELTA_SEC).
      // D-06: MAX_TICK_DELTA_SEC = 0.1 imported from audioEngine.ts (no literal).
      // WR-03 (Plan 06): the anchor is advanced optimistically before setState.
      // If the updater short-circuits (status flips to non-running), the anchor is
      // RESET to the pre-tick value inside the non-running branch so the rawDelta
      // credit is NOT consumed without a corresponding rebase. The next running
      // tick will then see the accumulated rawDelta (including the hidden window)
      // and apply the rebase atomically. This preserves the tick-by-tick anchor
      // progression for normal foreground ticks while ensuring the clamp+rebase
      // is atomic: anchor advance only "commits" when the running branch commits.
      lastClockNowRef.current = clockNowSec

      setState((currentState) => {
        if (currentState.status !== 'running') {
          // WR-03 (Plan 06): short-circuit path — reset anchor to pre-tick value.
          // The missed rawDelta (including any hidden-window gap) is preserved for
          // the next running tick, which will then apply the rebase correctly.
          // This makes the anchor advance atomic with the rebase commit:
          // if no rebase commits, the anchor does not advance.
          lastClockNowRef.current = lastClockNow
          return currentState
        }

        // Phase 52 D-07: clamp-rebase block. If rawDelta > MAX_TICK_DELTA_SEC
        // (hidden window resumed), push sessionStartCtxTime forward by the overage
        // so elapsed = clock.now() - startedAtSec stays consistent across the
        // clamp boundary. Hidden time is NOT counted toward session duration.
        // "Practice-time semantics" extends Phase 51 D-07 (iOS lock) to desktop
        // tab-hide. AH-WR-05: startedAtSec is read via currentState (NOT outer-
        // closure state) — rebase uses the rebasedState shadow variable.
        const rebasedState =
          rawDelta > MAX_TICK_DELTA_SEC
            ? {
                ...currentState,
                startedAtSec: currentState.startedAtSec + (rawDelta - MAX_TICK_DELTA_SEC),
              }
            : currentState

        // HOOKS-02 / D-06 / D-08: write the running-snapshot from
        // `rebasedState` (NOT outer-closure `state` — RESEARCH §Pitfall 1
        // closure staleness). Placement: AFTER the early-return narrowed
        // `currentState` to `RunningSessionState` and AFTER the rebase so
        // the snapshot reflects the corrected startedAtSec anchor.
        runningSnapshotRef.current = {
          key: String(rebasedState.startedAtSec),
          startedAtSec: rebasedState.startedAtSec,
          lastElapsedSec: rebasedState.lastFrame.elapsedSec,
        }

        // Pass rebasedState and the captured clockNowSec (NOT a fresh clock.now()
        // call) — the rebase math depends on a single consistent clockNowSec value.
        return completeIfNeeded(rebasedState, clockNowSec)
      })

      // Re-check cancelled BEFORE scheduling the next rAF. The top-of-tick
      // guard (HOOKS-04 / D-10) already covers callbacks that fire after
      // teardown. This second check guards against the narrow case where the
      // setState above commits synchronously, triggers an effect-cleanup that
      // flips `cancelled = true`, and we would otherwise re-schedule a tick
      // on a torn-down state owner. TS narrows `cancelled` as `false` along
      // this path (it was checked at the top); silence the always-truthy
      // warning with a targeted annotation.
      // Reason: `cancelled` is mutated by the effect cleanup function which
      // runs synchronously when the running effect is torn down. The
      // narrower cannot model cross-function reassignment of the closure
      // variable; the runtime check is genuinely needed.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!cancelled) {
        animationFrameId = requestAnimationFrame(tick)
      }
    }

    animationFrameId = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(animationFrameId)
    }
  }, [state.status, clock])

  // HOOKS-03 / D-03: primitives-only useMemo deps. `currentFrame` identity
  // recomputes only when `state.status`, `cycleIndex`, or `phase` change — i.e.
  // at a phase boundary. Within a phase (same cycleIndex:phase across rAF
  // ticks), the same `===` reference is returned, so dep-on-currentFrame
  // effects fire once per phase instead of per rAF.
  //
  // Variant B (local-narrow) per CONTEXT D-03 fallback / RESEARCH A4: TypeScript
  // strict-mode rejects the optional-chain Variant A form
  // (`state.lastFrame?.cycleIndex` in the dep array) because `lastFrame` exists
  // only on `RunningSessionState`. Local narrowing surfaces the primitives
  // (`cycleKey` / `phaseKey`) cleanly so the dep array carries only primitives
  // — and they're computed by the same `state.status === 'running'` narrowing
  // the memo body uses, so the memo and its deps stay in lock-step.
  const cycleKey = state.status === 'running' ? state.lastFrame.cycleIndex : null
  const phaseKey = state.status === 'running' ? state.lastFrame.phase : null
  const currentFrame = useMemo<SessionFrame | null>(
    () => (state.status === 'running' ? state.lastFrame : null),
    // Reason: the useMemo body reads `state.lastFrame` only when `state.status === 'running'`; its identity is fully determined by `state.status`, `cycleIndex`, and `phase` (primitives surfaced as `cycleKey`/`phaseKey` above). Adding `state` to the dep array would defeat the per-phase-stable identity contract (D-03) by re-memoizing on every rAF tick. The Variant B local-narrowing is itself the safe-harbor; the disable is annotated per Phase 7 D-04 / Phase 10 D-19.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.status, cycleKey, phaseKey],
  )

  // HOOKS-03 / D-04: per-rAF live frame. Identity changes every render-cycle
  // by design — visual consumers (BreathingShape, SessionReadout) need fresh
  // `phaseProgress`/`elapsedMs` per frame. Direct read, NO useMemo wrapper.
  const liveFrame: SessionFrame | null = state.status === 'running' ? state.lastFrame : null

  const setSelectedSettings = useCallback((settings: SessionSettings) => {
    setState((currentState) => {
      if (currentState.status === 'running') {
        return currentState
      }

      return {
        status: 'idle',
        selectedSettings: { ...settings },
      }
    })
  }, [])

  // Capture stretchSettings in a ref so the start callback can read the latest
  // value without re-creating the callback every time stretchSettings changes.
  // The start callback has an intentionally-empty dep array (same pattern as
  // end/extendDuration); the ref indirection is the stale-closure-safe approach.
  const stretchSettingsRef = useRef<StretchSettings | null>(stretchSettings)
  useEffect(() => {
    stretchSettingsRef.current = stretchSettings
  }, [stretchSettings])

  const start = useCallback(() => {
    setState((currentState) => {
      if (currentState.status === 'running') {
        return currentState
      }

      // Phase 34: when a stretch settings object is wired in, start a stretch
      // session via startStretchSession instead of the standard startSession.
      // WR-03: pass currentState.selectedSettings as the resonant config so it is
      // preserved through the session (startStretchSession stores it in selectedSettings,
      // lockedSettings carries the synthetic lead-in).
      const sSettings = stretchSettingsRef.current
      if (sSettings !== null) {
        return startStretchSession(sSettings, currentState.selectedSettings, clock.now())
      }

      return startSession(currentState.selectedSettings, clock.now())
    })
  }, [clock])

  const end = useCallback(() => {
    setState((currentState) => {
      if (currentState.status === 'idle') {
        return currentState
      }

      return endSession(currentState)
    })
  }, [])

  const extendDuration = useCallback((durationMinutes: number) => {
    setState((currentState) => {
      if (currentState.status !== 'running') {
        return currentState
      }

      try {
        // DS-WR-01: pass a fresh clock reading so `extendTimedSession` recomputes
        // `lastFrame` from `nowSec - startedAtSec`, mirroring how `startSession` is
        // called above (`startSession(..., clock.now())`). Phase 50-02 Warning #11:
        // comment updated post-SessionClock migration — session capture flows
        // through the injected `clock.now()` only.
        return extendTimedSession(currentState, durationMinutes, clock.now())
      } catch (error) {
        if (error instanceof RangeError) {
          return currentState
        }

        throw error
      }
    })
  }, [clock])

  // Phase 51 Plan 02 (D-10 / D-11): Reanchor startedAtSec after a proxy source
  // swap (AudioContext reconstruction on iOS). The setState updater narrows on
  // 'running' and rewrites startedAtSec = newClockNow - lastFrame.elapsedSec.
  // Deps are `[]` — the updater reads currentState, no closure over `state`.
  const reanchorSessionClock = useCallback((newClockNow: number) => {
    // Phase 52 D-08: reset lastClockNowRef synchronously so the next rAF tick
    // computes rawDelta = clock.now() - newClockNow (≈ 0 for an immediate tick)
    // and the clamp does NOT fire spuriously. Without this reset, the first tick
    // after the proxy source swap would see rawDelta = newClockNow - oldAnchor,
    // which may be large enough to rebase startedAtSec incorrectly.
    //
    // Shape A (D-08): unconditional write before setState. If the session is NOT
    // running, the rAF effect is not active, so the ref value is irrelevant until
    // the next session's start (which re-initializes it via the rAF effect body).
    //
    // Phase 51 D-10/D-11 ordering: this reset fires synchronously inside
    // reanchorSessionClock, which is called BEFORE onAudioReanchorRequired
    // (the audio-anchor reanchor). The ref is stable at the new clock base by
    // the time the next rAF tick fires.
    lastClockNowRef.current = newClockNow

    setState((currentState) => {
      if (currentState.status !== 'running') {
        // No-op: reanchor on idle/complete is meaningless.
        return currentState
      }
      // D-10 reanchor math: preserve pre-reanchor elapsed across the AC swap.
      // newStartedAtSec = newClockNow - elapsedSec
      // Next tick: elapsed = clock.now() - newStartedAtSec
      //          = newClockNow - (newClockNow - preReanchorElapsed)
      //          = preReanchorElapsed  (invariant preserved)
      const newStartedAtSec = newClockNow - currentState.lastFrame.elapsedSec
      return {
        ...currentState,
        startedAtSec: newStartedAtSec,
      }
    })
  }, [])

  return {
    state,
    currentFrame,
    liveFrame,
    runningSnapshotRef,
    setSelectedSettings,
    start,
    end,
    extendDuration,
    reanchorSessionClock,
  }
}

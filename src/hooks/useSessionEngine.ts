import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

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
 * idempotently dedupe via the `key` field (= startedAtMs).
 */
export interface RunningSnapshot {
  key: string
  startedAtMs: number
  lastElapsedMs: number
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
  extendDuration(this: void, durationMinutes: number): void
}

export function useSessionEngine(
  initialSettings: SessionSettings = DEFAULT_SETTINGS,
  stretchSettings: StretchSettings | null = null,
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

  // AH-WR-05 INVARIANT — STALE-CLOSURE TRAP: the dep array below is
  // intentionally `[state.status]` only, so this effect (and its rAF loop) is
  // created ONCE per session and NOT re-created on every per-frame state
  // update. Consequently the `state` value captured in this effect's closure
  // is FROZEN at the value it had when the session entered `running`. Every
  // per-frame value (elapsedMs, lastFrame, cycleIndex, phaseProgress, ...) MUST
  // be read inside the `setState((currentState) => ...)` updater via
  // `currentState` — NEVER from the outer-closure `state`. Reading `state`
  // (or anything derived from it) from inside `tick` would silently observe
  // first-frame-stale data for the entire session. Any future value the loop
  // needs must be threaded through `currentState`, not the closure.
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
      // `key` (= startedAtMs), so reading a stale snapshot on a subsequent
      // idle render is safe — the stats write only fires on a fresh key.
      return undefined
    }

    let animationFrameId = 0
    let cancelled = false

    const tick = () => {
      // HOOKS-04 / D-10: top-of-tick cancel-guard. An rAF callback that fires
      // AFTER the effect cleanup ran (jsdom fake-timer rAF drain ordering, or
      // a race in a real browser) becomes a no-op. Prevents setState on a
      // torn-down state owner.
      if (cancelled) return

      setState((currentState) => {
        if (currentState.status !== 'running') {
          return currentState
        }

        // HOOKS-02 / D-06 / D-08: write the running-snapshot from
        // `currentState` (NOT outer-closure `state` — RESEARCH §Pitfall 1
        // closure staleness). Placement: AFTER the early-return narrowed
        // `currentState` to `RunningSessionState`, BEFORE
        // completeIfNeeded(...) so the snapshot reflects the LAST known
        // elapsed values just before completion math runs.
        runningSnapshotRef.current = {
          key: String(currentState.startedAtMs),
          startedAtMs: currentState.startedAtMs,
          lastElapsedMs: currentState.lastFrame.elapsedMs,
        }

        return completeIfNeeded(currentState, performance.now())
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
  }, [state.status])

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
        return startStretchSession(sSettings, currentState.selectedSettings, performance.now())
      }

      return startSession(currentState.selectedSettings, performance.now())
    })
  }, [])

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
        // `lastFrame` from `nowMs - startedAtMs`, mirroring how `startSession` is
        // called above (`startSession(..., performance.now())`).
        return extendTimedSession(currentState, durationMinutes, performance.now())
      } catch (error) {
        if (error instanceof RangeError) {
          return currentState
        }

        throw error
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
  }
}

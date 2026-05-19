// Navi Kriya OM-counting engine hook.
// Audio is injected as callbacks so this hook is audio-agnostic and fully
// testable with fake timers and vi.fn() stubs.
//
// AH-WR-05 INVARIANT — STALE-CLOSURE TRAP: stepOm reads ONLY eng.current and
// callback refs. It never reads closed-over React state. All per-tick values
// (count, phase, omMs, cueOn, ...) come from the mutable NKEngineRecord ref.
import { useCallback, useEffect, useRef, useState } from 'react'

import type { NaviKriyaSettings, OmLength } from '../domain/naviKriyaSettings'

// D-09: medium = Forrest's measured follow-along pace ~2.16 s/OM
// D-10: fast/medium/slow spread lives in ONE adjustable constant
export const NK_OM_SECONDS: Record<OmLength, number> = {
  fast: 1.75,
  medium: 2.16,
  slow: 3.0,
}

// D-11: lead-in delay between a phase marker and the first OM of that phase.
// Applies to every phase start — round 1 Front, and the Front + Back of every
// round (the window where the user performs the neck-lock head movement).
// 5000ms finalized via Phase 31 UAT (operator-confirmed 2026-05-17): long
// enough that the marker — the HRV breath cue, ~4-5s natural tail — has
// decayed before the first OM, so the cue does not bleed into the count.
export const NK_LEAD_MS = 5000

// D-11 (Phase 31 UAT, operator override): the LAST OM of each phase holds for
// this multiple of a normal OM before the phase transition — a longer, smoother
// settle into the next phase. Applies to the last front OM and the last back OM
// of every round. 1.5× (down from the Phase 31 UAT value of 2×).
export const NK_LAST_OM_HOLD_MULTIPLIER = 1.5

// ---------------------------------------------------------------------------
// Types

interface NKEngineRecord {
  phase: 'front' | 'back' | 'done'
  round: number
  count: number
  frontCount: number
  backCount: number        // = frontCount / 4, computed once at start()
  rounds: number
  omMs: number             // NK_OM_SECONDS[omLength] * 1000
  cueOn: boolean           // mirrors perOmCue; mutable for live toggle via toggleCue()
  startedAtMs: number      // performance.now() at start — for elapsed stats
  completedRounds: number  // fully-completed rounds (for early-end stats)
  // Delay (ms) of the currently-pending step timer. Phase markers schedule
  // the next step with NK_LEAD_MS; per-OM steps use omMs. Recorded so
  // schedule() always has the current pending delay for reference.
  pendingDelayMs: number
  // D-11 fix: armed when an OM reaches the phase target. The phase transition
  // does NOT run in the same tick that counted the last OM — that flashed the
  // final count for 0 ms (back's single OM never showed "1"). Instead the last
  // OM runs for its full omMs like any other, and the NEXT stepOm — seeing this
  // flag — performs the transition.
  pendingTransition: boolean
}

export interface NKAudioCallbacks {
  frontMarker(): void
  backMarker(): void
  tick(): void
  endCue(): void
}

export type NKOnComplete = (result: {
  completedRounds: number
  elapsedMs: number
  isComplete: boolean
}) => void

export interface NKEngineApi {
  nkPhase: 'idle' | 'front' | 'back' | 'done'
  nkRound: number
  nkCount: number
  nkRunning: boolean
  start(this: void, settings: NaviKriyaSettings, callbacks: NKAudioCallbacks, onComplete: NKOnComplete): void
  end(this: void): void
  toggleCue(this: void, on: boolean): void
}

// ---------------------------------------------------------------------------
// Hook

export function useNKEngine(): NKEngineApi {
  // Display state — causes React re-renders
  const [nkPhase, setNkPhase]     = useState<'idle' | 'front' | 'back' | 'done'>('idle')
  const [nkRound, setNkRound]     = useState(1)
  const [nkCount, setNkCount]     = useState(0)
  const [nkRunning, setNkRunning] = useState(false)

  // Mutable engine record — NOT React state (no re-render on mutation)
  const eng   = useRef<NKEngineRecord | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Callback refs — captured at start(), read inside stepOm to avoid stale closures
  const cbsRef        = useRef<NKAudioCallbacks | null>(null)
  const onCompleteRef = useRef<NKOnComplete | null>(null)

  // schedule: internal helper used inside stepOm and other stable callbacks.
  // Records delayMs on the engine record for reference.
  const schedule = useCallback((delayMs: number) => {
    if (timer.current !== null) clearTimeout(timer.current)
    if (eng.current) eng.current.pendingDelayMs = delayMs
    // Reason: stepOm is declared below; the ref indirection breaks the circular dep.
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    timer.current = setTimeout(stepOm, delayMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // stepOm: the per-OM callback. Reads ONLY eng.current and callback refs —
  // never closed-over React state (stale-closure trap prevention, AH-WR-05).
  // Declared as a stable function via useCallback with empty deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stepOm = useCallback(function stepOm() {
    const e = eng.current
    if (!e) return
    const cbs = cbsRef.current

    // D-11 fix: pendingTransition means the previous OM was the last of its
    // phase and has now had its full omMs of display time. Perform the phase
    // change — do NOT count another OM this tick.
    if (e.pendingTransition) {
      e.pendingTransition = false
      if (e.phase === 'front') {
        e.phase = 'back'
        e.count = 0
        setNkPhase('back')
        setNkCount(0)
        if (cbs) cbs.backMarker()
        schedule(NK_LEAD_MS)
      } else if (e.round < e.rounds) {
        // Back phase complete — advance to next round
        e.completedRounds += 1
        e.round += 1
        e.phase = 'front'
        e.count = 0
        setNkRound(e.round)
        setNkPhase('front')
        setNkCount(0)
        if (cbs) cbs.frontMarker()
        schedule(NK_LEAD_MS)
      } else {
        // Final back phase complete — session done
        e.completedRounds += 1
        e.phase = 'done'
        setNkPhase('done')
        setNkRunning(false)
        if (cbs) cbs.endCue()
        const elapsedMs = performance.now() - e.startedAtMs
        if (onCompleteRef.current) {
          onCompleteRef.current({
            completedRounds: e.completedRounds,
            elapsedMs,
            isComplete: true,
          })
        }
      }
      return
    }

    e.count += 1
    setNkCount(e.count)

    if (e.cueOn && cbs) cbs.tick()

    const target = e.phase === 'front' ? e.frontCount : e.backCount

    if (e.count >= target) {
      // Last OM of the phase: arm pendingTransition so the NEXT stepOm changes
      // phase instead of counting (D-11 fix — the last count is shown, not
      // flashed). It also holds longer than a normal OM
      // (NK_LAST_OM_HOLD_MULTIPLIER × omMs) for a smoother settle into the
      // next phase.
      e.pendingTransition = true
      schedule(e.omMs * NK_LAST_OM_HOLD_MULTIPLIER)
    } else {
      schedule(e.omMs)
    }
  }, [schedule])

  const start = useCallback((
    settings: NaviKriyaSettings,
    callbacks: NKAudioCallbacks,
    onComplete: NKOnComplete,
  ) => {
    // Clear any existing timer
    if (timer.current !== null) clearTimeout(timer.current)

    const backCount = settings.frontCount / 4

    eng.current = {
      phase: 'front',
      round: 1,
      count: 0,
      frontCount: settings.frontCount,
      backCount,
      rounds: settings.rounds,
      omMs: NK_OM_SECONDS[settings.omLength] * 1000,
      cueOn: settings.perOmCue,
      startedAtMs: performance.now(),
      completedRounds: 0,
      // start() schedules the first step with NK_LEAD_MS below.
      pendingDelayMs: NK_LEAD_MS,
      pendingTransition: false,
    }

    // Capture callbacks in refs so stepOm reads them without stale closure
    cbsRef.current = callbacks
    onCompleteRef.current = onComplete

    setNkPhase('front')
    setNkRound(1)
    setNkCount(0)
    setNkRunning(true)

    callbacks.frontMarker()
    schedule(NK_LEAD_MS)
  }, [schedule])

  const end = useCallback(() => {
    const e = eng.current
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }

    // Fire onComplete BEFORE resetting state (with current stats)
    if (e && onCompleteRef.current) {
      onCompleteRef.current({
        completedRounds: e.completedRounds,
        elapsedMs: performance.now() - e.startedAtMs,
        isComplete: false,
      })
    }

    eng.current = null
    cbsRef.current = null
    onCompleteRef.current = null

    setNkPhase('idle')
    setNkCount(0)
    setNkRound(1)
    setNkRunning(false)
  }, [])

  const toggleCue = useCallback((on: boolean) => {
    if (eng.current) {
      eng.current.cueOn = on
    }
  }, [])

  // T-31-02 mitigation: cleanup cancels the pending timer on unmount
  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current)
    }
  }, [])

  return {
    nkPhase,
    nkRound,
    nkCount,
    nkRunning,
    start,
    end,
    toggleCue,
  }
}

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

// D-11: lead-in delay between a phase marker and the first OM of that phase
export const NK_LEAD_MS = 700

// D-11: settle delay before the first frontMarker fires at session start (~3–5 s)
export const NK_SETTLE_MS = 3500

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
  pause(this: void): void
  resume(this: void): void
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

  // schedule: internal helper used inside stepOm and other stable callbacks
  const schedule = useCallback((delayMs: number) => {
    if (timer.current !== null) clearTimeout(timer.current)
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

    e.count += 1
    setNkCount(e.count)

    if (e.cueOn && cbs) cbs.tick()

    const target = e.phase === 'front' ? e.frontCount : e.backCount

    if (e.count < target) {
      schedule(e.omMs)
      return
    }

    // Phase target reached
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

  const pause = useCallback(() => {
    if (!eng.current) return
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    setNkRunning(false)
  }, [])

  const resume = useCallback(() => {
    const e = eng.current
    if (!e) return
    setNkRunning(true)
    schedule(e.omMs)
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
    pause,
    resume,
    end,
    toggleCue,
  }
}

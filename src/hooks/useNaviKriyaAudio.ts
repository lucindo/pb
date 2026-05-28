import { useCallback, useEffect, useRef } from 'react'

import { SAFE_LEAD_SEC } from '../audio/audioEngine'
import {
  END_CHORD_RINGOUT_SEC,
  scheduleCountdownTick,
  scheduleEndChord,
  scheduleNKBackMarker,
  scheduleNKFrontMarker,
  scheduleNKTick,
} from '../audio/nkCueSynth'
import { createAudioSessionClock } from '../audio/sessionClock'
import type { TimbreId } from '../domain/settings'
import type { NKAudioCallbacks } from './useNKEngine'

const END_CHORD_RINGOUT_MS =
  Math.ceil((SAFE_LEAD_SEC + END_CHORD_RINGOUT_SEC) * 1000) + 250

const NOOP_AUDIO_CALLBACKS: NKAudioCallbacks = {
  frontMarker: () => undefined,
  backMarker: () => undefined,
  tick: () => undefined,
  endCue: () => undefined,
}

export interface NaviKriyaAudioSession {
  callbacks: NKAudioCallbacks
  countdownTick(this: void): void
}

export interface NaviKriyaAudioController {
  begin(this: void, getTimbre: () => TimbreId): NaviKriyaAudioSession
  close(this: void): void
  closeAfterEndCue(this: void): void
}

function closeAudioContext(audioCtx: AudioContext): void {
  void audioCtx.close().catch(() => {
    // Best-effort teardown: browsers may reject close() after an external state change.
  })
}

function createOptionalAudioContext(): AudioContext | null {
  try {
    return new AudioContext()
  } catch {
    // Audio is optional for Navi Kriya; the visual/timer session continues with no-op cues.
    return null
  }
}

export function useNaviKriyaAudio(muted: boolean): NaviKriyaAudioController {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mutedRef = useRef<boolean>(muted)

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  const begin = useCallback((getTimbre: () => TimbreId): NaviKriyaAudioSession => {
    const audioCtx = createOptionalAudioContext()
    audioCtxRef.current = audioCtx

    if (audioCtx === null) {
      return {
        callbacks: NOOP_AUDIO_CALLBACKS,
        countdownTick: () => undefined,
      }
    }

    // Phase 50 D-08: wrap the AC immediately after construction. The audioCtx
    // is the source of truth (NK AC ownership stays in begin per D-08); the
    // clock is the typed surface for time reads (D-09 — audioCtx.currentTime
    // is no longer read directly by this caller). Per D-03 Option A (resolved
    // 2026-05-27), clock.now() returns audioCtx.currentTime — byte-identical
    // to the pre-refactor read. Per revision 1 Warning #12: this is the NK
    // clock, NOT the engine clock; they wrap distinct AudioContexts. NK passes
    // NO scheduleImpl — clock.schedule is a no-op at Phase 50.
    const clock = createAudioSessionClock(audioCtx)

    // Reason (D-08, mirrors useAudioCues timbreRef posture): timbre is read
    // once and captured into the four returned closures. A cross-tab timbre
    // change mid-session must NOT mutate this session's cues — do not refactor
    // these closures to re-read getTimbre() each call without revisiting D-08.
    const timbre = getTimbre()
    const cueWhen = (): number => clock.now() + SAFE_LEAD_SEC
    const countdownTick = (): void => {
      if (mutedRef.current) return
      scheduleCountdownTick(audioCtx, cueWhen(), audioCtx.destination, timbre)
    }

    return {
      callbacks: {
        frontMarker: () => {
          if (!mutedRef.current) scheduleNKFrontMarker(audioCtx, cueWhen(), audioCtx.destination, timbre)
        },
        backMarker: () => {
          if (!mutedRef.current) scheduleNKBackMarker(audioCtx, cueWhen(), audioCtx.destination, timbre)
        },
        tick: () => {
          if (!mutedRef.current) scheduleNKTick(audioCtx, cueWhen(), audioCtx.destination, timbre)
        },
        endCue: () => {
          if (!mutedRef.current) scheduleEndChord(audioCtx, cueWhen(), audioCtx.destination, timbre)
        },
      },
      countdownTick,
    }
  }, [])

  const close = useCallback((): void => {
    const audioCtx = audioCtxRef.current
    audioCtxRef.current = null
    if (audioCtx !== null) {
      closeAudioContext(audioCtx)
    }
  }, [])

  const closeAfterEndCue = useCallback((): void => {
    const audioCtx = audioCtxRef.current
    audioCtxRef.current = null
    if (audioCtx !== null) {
      window.setTimeout(() => { closeAudioContext(audioCtx) }, END_CHORD_RINGOUT_MS)
    }
  }, [])

  useEffect(() => {
    return () => {
      const audioCtx = audioCtxRef.current
      audioCtxRef.current = null
      if (audioCtx !== null) {
        closeAudioContext(audioCtx)
      }
    }
  }, [])

  return { begin, close, closeAfterEndCue }
}

// Audio-path health surface — the control-plane status half of useAudioCues.
// Owns audioAvailable + the AudioStatusFlag state machine, the three clock-health
// subscribers, and the visibility-resume listener. Split out from useAudioCues so
// the status machine stays separable from the engine lifecycle. The engine itself
// is owned by the lifecycle and passed in via `engineRef` (read-only here); this
// hook keeps the audioEngine free of document.* / window.* access.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import type { AudioEngine } from '../audio/audioEngine'
import type { AudioStatusFlag } from '../audio/audioStatus'

export interface AudioHealth {
  audioAvailable: boolean
  audioStatus: AudioStatusFlag
  setAudioAvailable: (next: boolean) => void
  setAudioStatus: (next: AudioStatusFlag) => void
  /** Clock-health subscribers wired into the engine's clock by the lifecycle on
   *  start() / reconstructEngine(). All gate on engineRef !== null. */
  handleResume(this: void): void
  handleSuspend(this: void): void
  handleClose(this: void): void
  /** Reset the resume-attempt gate so the next suspend cycle starts clean.
   *  Called by the lifecycle on stop() and reconstructEngine(). */
  resetResumeGate(this: void): void
}

export function useAudioHealth(engineRef: RefObject<AudioEngine | null>): AudioHealth {
  const [audioAvailable, setAudioAvailable] = useState<boolean>(true)
  // High-level audio-path health surface.
  const [audioStatus, setAudioStatus] = useState<AudioStatusFlag>('ok')

  // Gate audioStatus = 'needs-resume' on a prior resume attempt for THIS suspend
  // cycle. Without this, AC startup's transient 'suspended' → 'running' transition
  // would briefly flash the affordance for one render. Reset to false on every
  // transition back to 'running' (or on stop()).
  const visibilityResumeAttemptedRef = useRef<boolean>(false)

  // Three clock subscribers — one per channel (suspend / resume / close).
  // AudioStatusFlag is exactly `'ok' | 'needs-resume' | 'unavailable'`.
  //   - handleResume: clears the needs-resume state when AC transitions to running.
  //   - handleSuspend: flips to needs-resume when a prior visibility-resume attempt
  //     is in flight for this cycle (the resume-attempt gate).
  //   - handleClose: sets unavailable when the AC transitions to closed.
  const handleResume = useCallback((): void => {
    if (engineRef.current === null) return
    visibilityResumeAttemptedRef.current = false
    setAudioStatus('ok')
  }, [engineRef])

  const handleSuspend = useCallback((): void => {
    if (engineRef.current === null) return
    // Resume-attempt gate: only flip to 'needs-resume' when a prior visibility-driven
    // resume attempt is in flight for this suspend cycle. Startup-time transient
    // suspended → running transitions are intentionally ignored.
    if (visibilityResumeAttemptedRef.current) {
      setAudioStatus('needs-resume')
    }
  }, [engineRef])

  const handleClose = useCallback((): void => {
    // engine.clock.onClose fires this when the AC transitions to 'closed' — whether
    // via stop()/reconstructEngine paths OR an unexpected browser-side AC kill.
    if (engineRef.current === null) return
    setAudioStatus('unavailable')
  }, [engineRef])

  const resetResumeGate = useCallback((): void => {
    visibilityResumeAttemptedRef.current = false
  }, [])

  // Visibility-resume listener.
  // Mirrors useWakeLock.ts — same shape, same gate posture. The hook owns its own
  // DOM listener so the audioEngine stays free of document.* / window.* access.
  // The single gate is engineRef.current !== null. visibilityResumeAttemptedRef is
  // set to true BEFORE the void-call, which arms the resume-attempt gate inside
  // handleSuspend so a subsequent 'suspended'/'interrupted' transition can flip
  // audioStatus = 'needs-resume'. The optimistic resume call is preserved —
  // sometimes it works without a gesture (headphone in, brief lock, certain iOS
  // versions). When it rejects, the affordance becomes the user's recovery path.
  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState !== 'visible') return
      if (engineRef.current === null) return
      // Arm the gate BEFORE the resume call so a subsequent 'suspended'/'interrupted'
      // statechange can transition audioStatus.
      visibilityResumeAttemptedRef.current = true
      void engineRef.current.resume()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [engineRef])

  return {
    audioAvailable,
    audioStatus,
    setAudioAvailable,
    setAudioStatus,
    handleResume,
    handleSuspend,
    handleClose,
    resetResumeGate,
  }
}

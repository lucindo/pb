// Chris Wilson canonical lookahead scheduler.
// Source: web.dev/audio-scheduling — see 03-RESEARCH.md Pattern 1 lines 222-269.
// Mirrors the cancelled-flag-with-cleanup idiom from src/hooks/useSessionEngine.ts:29-57.
//
// Two-clock split: setTimeout fires every LOOKAHEAD_MS ms on the main thread,
// scans for boundaries that land inside (audioCtx.currentTime + SCHEDULE_AHEAD_SEC),
// and hands the precise audio-clock time off to scheduleAtTime — which the caller
// uses to stamp osc.start(when) at sample-accurate precision.
//
// NEVER read main-thread wallclock APIs here — they drift relative to the
// AudioContext clock (Pitfall 2 in 03-RESEARCH.md). All time decisions consult
// audioCtx.currentTime exclusively.

export const LOOKAHEAD_MS = 25
export const SCHEDULE_AHEAD_SEC = 0.1

export interface SchedulerHandle {
  stop(): void
}

export function startScheduler(
  audioCtx: AudioContext,
  getNextBoundaryAudioTime: () => number | null,
  scheduleAtTime: (audioTime: number) => void,
): SchedulerHandle {
  let timeoutId: number | undefined
  let stopped = false

  const tick = () => {
    if (stopped) return

    let next = getNextBoundaryAudioTime()
    while (next !== null && next < audioCtx.currentTime + SCHEDULE_AHEAD_SEC) {
      scheduleAtTime(next)
      next = getNextBoundaryAudioTime()
    }

    if (!stopped) {
      timeoutId = window.setTimeout(tick, LOOKAHEAD_MS)
    }
  }

  tick()

  return {
    stop() {
      stopped = true
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
        timeoutId = undefined
      }
    },
  }
}

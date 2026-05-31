// swappableSessionClock — stable-identity SessionClock proxy with a swappable
// internal source. Zero React imports.
//
// The returned `clock` object is captured ONCE and never rebuilt; `setSource`
// only reassigns the internal `currentSource` pointer. Consumers hold `clock`
// in dep arrays, so swapping the source does NOT cause a re-render. All five
// SessionClock members delegate to whichever source is current at call time.

import type { Cue, SessionClock } from './sessionClock'

/**
 * Factory return type. `clock` is the stable public `SessionClock` reference;
 * `setSource` swaps the underlying time source (wall → audio AC clock) without
 * changing the externally visible `clock` identity.
 */
export type SwappableSessionClock = {
  clock: SessionClock
  setSource(next: SessionClock): void
}

/**
 * Create a stable-identity `SessionClock` proxy whose internal source can be
 * swapped via `setSource(next)` without changing the externally-visible `clock`
 * reference.
 *
 * @param initialSource - The `SessionClock` the proxy delegates to at
 *   construction time (typically a `createWallSessionClock()` instance used
 *   before an AudioContext is constructed).
 */
export function createSwappableSessionClock(
  initialSource: SessionClock,
): SwappableSessionClock {
  let currentSource: SessionClock = initialSource

  const clock: SessionClock = {
    now: (): number => currentSource.now(),
    schedule: (when: number, cue: Cue): void => { currentSource.schedule(when, cue) },
    onSuspend: (cb: () => void): (() => void) => currentSource.onSuspend(cb),
    onResume: (cb: () => void): (() => void) => currentSource.onResume(cb),
    onClose: (cb: () => void): (() => void) => currentSource.onClose(cb),
  }

  function setSource(next: SessionClock): void {
    currentSource = next
  }

  return { clock, setSource }
}

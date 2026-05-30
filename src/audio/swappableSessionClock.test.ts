// Tests for createSwappableSessionClock.
//
// Covers:
//   - proxy clock identity is === stable across setSource calls.
//   - now() delegates to the CURRENT source; setSource(next) immediately shifts the delegation.
//   - subscription survival: a callback subscribed BEFORE setSource fires from the NEW source.
//   - old-source teardown: the old source's subscriber Set shrinks after setSource.
//   - idempotent unsubscribe: the () => void returned by onSuspend can be called twice safely.
//   - schedule(when, cue) forwarding: proxy routes to the current source and to the new source after setSource.
//   - onResume + onClose channel symmetry with onSuspend.
//
// Assertions target BEHAVIOR (callback invocations, returned-function shape,
// forwarding to the current source) not exact internal field names or Cue field tuples.

import { describe, expect, it, vi } from 'vitest'

import { type SessionClock } from './sessionClock'
import { createSwappableSessionClock } from './swappableSessionClock'

// ---------------------------------------------------------------------------
// Fake SessionClock helper (test-local only)
// ---------------------------------------------------------------------------
// Builds a minimal SessionClock object literal that exposes test-only trigger
// methods (triggerSuspend / triggerResume / triggerClose) for driving fan-out
// without needing a FakeAudioContext.
type FakeClock = SessionClock & {
  triggerSuspend(): void
  triggerResume(): void
  triggerClose(): void
  scheduleImpl: ReturnType<typeof vi.fn>
}

function makeFakeClock(nowValue = 0): FakeClock {
  const suspendSubs = new Set<() => void>()
  const resumeSubs = new Set<() => void>()
  const closeSubs = new Set<() => void>()
  const scheduleImpl = vi.fn()

  return {
    now: () => nowValue,
    schedule: scheduleImpl,
    onSuspend(cb): () => void {
      suspendSubs.add(cb)
      return (): void => { suspendSubs.delete(cb) }
    },
    onResume(cb): () => void {
      resumeSubs.add(cb)
      return (): void => { resumeSubs.delete(cb) }
    },
    onClose(cb): () => void {
      closeSubs.add(cb)
      return (): void => { closeSubs.delete(cb) }
    },
    triggerSuspend(): void { for (const cb of suspendSubs) cb() },
    triggerResume(): void { for (const cb of resumeSubs) cb() },
    triggerClose(): void { for (const cb of closeSubs) cb() },
    scheduleImpl,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSwappableSessionClock', () => {
  // Test 1 — Identity stability across setSource
  it('proxy clock identity is === stable across setSource calls', () => {
    const srcA = makeFakeClock()
    const srcB = makeFakeClock()

    const proxy = createSwappableSessionClock(srcA)
    const capturedRef = proxy.clock

    proxy.setSource(srcB)

    // Same object reference — no re-build on setSource.
    expect(proxy.clock).toBe(capturedRef)
  })

  // Test 2 — now() delegates to current source
  it('now() returns the current source value and updates after setSource', () => {
    const srcA = makeFakeClock(1.5)
    const srcB = makeFakeClock(99.25)

    const proxy = createSwappableSessionClock(srcA)

    expect(proxy.clock.now()).toBe(1.5)

    proxy.setSource(srcB)

    expect(proxy.clock.now()).toBe(99.25)
  })

  // Test 3 — Subscription survives source swap
  it('a callback subscribed before setSource fires from the NEW source after swap', () => {
    const srcA = makeFakeClock()
    const srcB = makeFakeClock()
    const cb = vi.fn()

    const proxy = createSwappableSessionClock(srcA)
    proxy.clock.onSuspend(cb)

    // Verify it fires from srcA pre-swap.
    srcA.triggerSuspend()
    expect(cb).toHaveBeenCalledTimes(1)

    // Swap source.
    proxy.setSource(srcB)

    // The callback must fire from srcB after the swap.
    srcB.triggerSuspend()
    expect(cb).toHaveBeenCalledTimes(2)
  })

  // Test 4 — Old source unsubscribed on swap
  it('callback does NOT fire from the old source after setSource (old-source teardown)', () => {
    const srcA = makeFakeClock()
    const srcB = makeFakeClock()
    const cb = vi.fn()

    const proxy = createSwappableSessionClock(srcA)
    proxy.clock.onSuspend(cb)

    // Fires pre-swap.
    srcA.triggerSuspend()
    expect(cb).toHaveBeenCalledTimes(1)

    proxy.setSource(srcB)

    // Trigger srcA AGAIN after the swap — cb should NOT fire (subscription torn down).
    srcA.triggerSuspend()
    expect(cb).toHaveBeenCalledTimes(1) // Still 1, no increment.
  })

  // Test 5 — Unsubscribe propagation + idempotency
  it('off() removes callback from proxy and from underlying source; second off() is a no-op', () => {
    const srcA = makeFakeClock()
    const cb = vi.fn()

    const proxy = createSwappableSessionClock(srcA)
    const off = proxy.clock.onSuspend(cb)

    // Unsubscribe.
    off()

    // Trigger — cb must NOT fire.
    srcA.triggerSuspend()
    expect(cb).not.toHaveBeenCalled()

    // Second call — must not throw.
    expect(() => { off() }).not.toThrow()

    // Still not invoked after second off().
    srcA.triggerSuspend()
    expect(cb).not.toHaveBeenCalled()
  })

  // Test 6 — schedule(when, cue) forwarding to current + new source
  it('schedule() forwards to the current source and routes to the new source after setSource', () => {
    const srcA = makeFakeClock()
    const srcB = makeFakeClock()

    const proxy = createSwappableSessionClock(srcA)

    proxy.clock.schedule(123, { kind: 'lead-in-tick' })
    expect(srcA.scheduleImpl).toHaveBeenCalledTimes(1)
    expect(srcA.scheduleImpl).toHaveBeenCalledWith(123, { kind: 'lead-in-tick' })

    proxy.setSource(srcB)

    proxy.clock.schedule(456, { kind: 'end-chord' })
    expect(srcB.scheduleImpl).toHaveBeenCalledTimes(1)
    expect(srcB.scheduleImpl).toHaveBeenCalledWith(456, { kind: 'end-chord' })

    // srcA schedule call count is still 1 — no double-dispatch.
    expect(srcA.scheduleImpl.mock.calls.length).toBe(1)
  })

  // Test 7 — onResume + onClose channel symmetry (condensed)
  it('subscription survival applies symmetrically to onResume and onClose channels', () => {
    const srcA = makeFakeClock()
    const srcB = makeFakeClock()
    const resumeCb = vi.fn()
    const closeCb = vi.fn()

    const proxy = createSwappableSessionClock(srcA)
    proxy.clock.onResume(resumeCb)
    proxy.clock.onClose(closeCb)

    // Pre-swap: both fire from srcA.
    srcA.triggerResume()
    srcA.triggerClose()
    expect(resumeCb).toHaveBeenCalledTimes(1)
    expect(closeCb).toHaveBeenCalledTimes(1)

    proxy.setSource(srcB)

    // Post-swap: both fire from srcB.
    srcB.triggerResume()
    srcB.triggerClose()
    expect(resumeCb).toHaveBeenCalledTimes(2)
    expect(closeCb).toHaveBeenCalledTimes(2)

    // Old-source teardown: srcA triggers after swap must NOT increment counts.
    srcA.triggerResume()
    srcA.triggerClose()
    expect(resumeCb).toHaveBeenCalledTimes(2)
    expect(closeCb).toHaveBeenCalledTimes(2)
  })
})

// Tests for createSwappableSessionClock.
//
// Covers:
//   - proxy clock identity is === stable across setSource calls.
//   - now() delegates to the CURRENT source; setSource(next) immediately shifts the delegation.
//   - schedule(when, cue) forwarding: proxy routes to the current source and to the new source after setSource.
//
// Assertions target BEHAVIOR (returned value, forwarding to the current source),
// not internal field names or Cue field tuples.

import { describe, expect, it, vi } from 'vitest'

import { type SessionClock } from './sessionClock'
import { createSwappableSessionClock } from './swappableSessionClock'

// ---------------------------------------------------------------------------
// Fake SessionClock helper (test-local only)
// ---------------------------------------------------------------------------
// Builds a minimal SessionClock object literal. on* are no-op subscribers — the
// proxy delegates to them but no test drives fan-out through the proxy.
type FakeClock = SessionClock & {
  scheduleImpl: ReturnType<typeof vi.fn>
}

function makeFakeClock(nowValue = 0): FakeClock {
  const scheduleImpl = vi.fn()

  return {
    now: () => nowValue,
    schedule: scheduleImpl,
    onSuspend: () => () => undefined,
    onResume: () => () => undefined,
    onClose: () => () => undefined,
    scheduleImpl,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSwappableSessionClock', () => {
  it('proxy clock identity is === stable across setSource calls', () => {
    const srcA = makeFakeClock()
    const srcB = makeFakeClock()

    const proxy = createSwappableSessionClock(srcA)
    const capturedRef = proxy.clock

    proxy.setSource(srcB)

    // Same object reference — no re-build on setSource.
    expect(proxy.clock).toBe(capturedRef)
  })

  it('now() returns the current source value and updates after setSource', () => {
    const srcA = makeFakeClock(1.5)
    const srcB = makeFakeClock(99.25)

    const proxy = createSwappableSessionClock(srcA)

    expect(proxy.clock.now()).toBe(1.5)

    proxy.setSource(srcB)

    expect(proxy.clock.now()).toBe(99.25)
  })

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
})

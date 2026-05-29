// Tests for createAudioSessionClock + createWallSessionClock (Plan 50-01).
//
// Covers:
//   - D-03 Option A contract: audio factory now() returns audioCtx.currentTime;
//     wall factory now() returns performance.now() / 1000.
//   - D-11 wired-real subscribers: onSuspend / onResume / onClose fan-out via the
//     audioCtx 'statechange' listener.
//   - Revision 1 Blocker #1: onClose member added; fan-out on 'closed'; unsubscribe.
//   - Revision 1 Blocker #2: scheduleImpl forwarding when supplied; no-op when absent.
//   - Revision 2 Blocker #1: notifySuspended() engine-only escape hatch — fan-out
//     parity with natural statechange, trigger-source isolation, unsubscribe
//     symmetry, absence on the wall clock.
//
// Per the no-design-locking memory rule: tests assert dispatch BEHAVIOR
// (callback invocations, returned-function shape, scheduleImpl forwarding,
// notifySuspended fan-out), NOT exact Cue field tuples. The Cue catalog is
// closed at Phase 50 (D-04) but future phases may extend per-kind payloads.

import { describe, expect, it, vi } from 'vitest'

import { createAudioSessionClock, createWallSessionClock, type Cue, type SessionClock } from './sessionClock'

// Minimal Fake AudioContext shape used to drive the statechange listener and
// expose a mutable currentTime. The vitest.setup.ts polyfill installs a richer
// FakeAudioContext on window.AudioContext; the typed helper below lets us build
// tightly-controlled instances inside individual tests without leaking jsdom
// behavior into the assertions.
type FakeAudioCtxShape = {
  state: AudioContextState | 'interrupted'
  currentTime: number
  addEventListener: (type: string, listener: EventListener) => void
  removeEventListener: (type: string, listener: EventListener) => void
  _fireStateChange: () => void
}

function makeFakeAudioCtx(initialState: AudioContextState | 'interrupted' = 'running'): FakeAudioCtxShape {
  const listeners = new Map<string, Set<EventListener>>()
  const ctx: FakeAudioCtxShape = {
    state: initialState,
    currentTime: 0,
    addEventListener: vi.fn((type: string, listener: EventListener): void => {
      let set = listeners.get(type)
      if (!set) {
        set = new Set()
        listeners.set(type, set)
      }
      set.add(listener)
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener): void => {
      listeners.get(type)?.delete(listener)
    }),
    _fireStateChange: (): void => {
      const evt = new Event('statechange')
      for (const l of listeners.get('statechange') ?? []) l(evt)
    },
  }
  return ctx
}

// Cast helper — keeps the awkward AudioContext cast in one place. The Fake
// shape is structurally compatible with the bits createAudioSessionClock
// actually reaches into (currentTime, state, addEventListener).
function asAudioCtx(fake: FakeAudioCtxShape): AudioContext {
  return fake as unknown as AudioContext
}

describe('createAudioSessionClock', () => {
  it('now() returns audioCtx.currentTime (D-03 Option A — audio-natural seconds)', () => {
    const audioCtx = makeFakeAudioCtx()
    audioCtx.currentTime = 1.5
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    expect(clock.now()).toBe(1.5)

    audioCtx.currentTime = 2.75
    expect(clock.now()).toBe(2.75)
  })

  it('now() does NOT call performance.now (D-03 anti-drift assertion)', () => {
    const audioCtx = makeFakeAudioCtx()
    audioCtx.currentTime = 3.0
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))

    const perfSpy = vi.spyOn(performance, 'now')
    void clock.now()

    expect(perfSpy).not.toHaveBeenCalled()
    perfSpy.mockRestore()
  })

  it('onSuspend(cb) is invoked on the natural "suspended" statechange transition (D-11)', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const cb = vi.fn()
    clock.onSuspend(cb)

    audioCtx.state = 'suspended'
    audioCtx._fireStateChange()

    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('onSuspend(cb) is invoked on the WebKit "interrupted" statechange transition (D-11 / Phase 5.1)', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const cb = vi.fn()
    clock.onSuspend(cb)

    audioCtx.state = 'interrupted'
    audioCtx._fireStateChange()

    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('onResume(cb) is invoked on "running" and NOT on "suspended" (D-11)', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const resumeCb = vi.fn()
    clock.onResume(resumeCb)

    audioCtx.state = 'suspended'
    audioCtx._fireStateChange()
    expect(resumeCb).not.toHaveBeenCalled()

    audioCtx.state = 'running'
    audioCtx._fireStateChange()
    expect(resumeCb).toHaveBeenCalledTimes(1)
  })

  it('onClose(cb) is invoked on "closed" and NOT onSuspend/onResume subscribers (revision 1 Blocker #1)', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const suspendCb = vi.fn()
    const resumeCb = vi.fn()
    const closeCb = vi.fn()
    clock.onSuspend(suspendCb)
    clock.onResume(resumeCb)
    clock.onClose(closeCb)

    audioCtx.state = 'closed'
    audioCtx._fireStateChange()

    expect(closeCb).toHaveBeenCalledTimes(1)
    expect(suspendCb).not.toHaveBeenCalled()
    expect(resumeCb).not.toHaveBeenCalled()
  })

  it('onClose unsubscribe works (revision 1 Blocker #1)', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const cb = vi.fn()
    const off = clock.onClose(cb)
    off()

    audioCtx.state = 'closed'
    audioCtx._fireStateChange()

    expect(cb).not.toHaveBeenCalled()
  })

  it('onSuspend unsubscribe works', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const cb = vi.fn()
    const off = clock.onSuspend(cb)
    off()

    audioCtx.state = 'suspended'
    audioCtx._fireStateChange()

    expect(cb).not.toHaveBeenCalled()
  })

  it('multiple subscribers on the same channel both fire', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    clock.onSuspend(cb1)
    clock.onSuspend(cb2)

    audioCtx.state = 'suspended'
    audioCtx._fireStateChange()

    expect(cb1).toHaveBeenCalledTimes(1)
    expect(cb2).toHaveBeenCalledTimes(1)
  })

  it('scheduleImpl forwarding: when provided, schedule() calls it with the same args (revision 1 Blocker #2)', () => {
    const audioCtx = makeFakeAudioCtx()
    const impl = vi.fn<(when: number, cue: Cue) => void>()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx), impl)

    clock.schedule(1.5, { kind: 'lead-in-tick' })

    expect(impl).toHaveBeenCalledTimes(1)
    expect(impl).toHaveBeenCalledWith(1.5, { kind: 'lead-in-tick' })
  })

  it('scheduleImpl absent: schedule() is a no-op and does not throw (revision 1 Blocker #2)', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))

    expect(() => {
      clock.schedule(0, { kind: 'lead-in-tick' })
    }).not.toThrow()
  })

  it('notifySuspended() fan-out: invokes suspend subscribers without a statechange event (revision 2 Blocker #1)', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const cb = vi.fn()
    clock.onSuspend(cb)

    // No statechange driven — call notifySuspended directly.
    clock.notifySuspended()

    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('notifySuspended() parity with natural statechange: both trigger the same fan-out (revision 2 Blocker #1)', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const cb = vi.fn()
    clock.onSuspend(cb)

    // Natural statechange transition.
    audioCtx.state = 'suspended'
    audioCtx._fireStateChange()
    // Then a synthetic notifySuspended invocation.
    clock.notifySuspended()

    // Exactly two invocations — same Set, same fan-out path.
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('notifySuspended() does NOT trigger onResume or onClose (revision 2 Blocker #1 trigger-source isolation)', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const suspendCb = vi.fn()
    const resumeCb = vi.fn()
    const closeCb = vi.fn()
    clock.onSuspend(suspendCb)
    clock.onResume(resumeCb)
    clock.onClose(closeCb)

    clock.notifySuspended()

    expect(suspendCb).toHaveBeenCalledTimes(1)
    expect(resumeCb).not.toHaveBeenCalled()
    expect(closeCb).not.toHaveBeenCalled()
  })

  it('notifySuspended() respects unsubscribe (revision 2 Blocker #1 — symmetric path with statechange)', () => {
    const audioCtx = makeFakeAudioCtx()
    const clock = createAudioSessionClock(asAudioCtx(audioCtx))
    const cb = vi.fn()
    const off = clock.onSuspend(cb)
    off()

    clock.notifySuspended()

    expect(cb).not.toHaveBeenCalled()
  })

  it('augmented return type exposes notifySuspended but a SessionClock-widened reference does not (revision 2 Blocker #1)', () => {
    const audioCtx = makeFakeAudioCtx()
    // Augmented type — direct return shape from createAudioSessionClock.
    const augmentedClock = createAudioSessionClock(asAudioCtx(audioCtx))
    expect(typeof augmentedClock.notifySuspended).toBe('function')
    // Should not throw and should perform the fan-out (covered above).
    expect(() => {
      augmentedClock.notifySuspended()
    }).not.toThrow()

    // Widening to the public SessionClock interface erases notifySuspended at
    // the TYPE level — runtime the method still exists on the object, but a
    // SessionClock-typed reference cannot reach it without an unsafe cast.
    // The type-level invariant is verified by `pnpm build` (tsc) — see also
    // the wall-clock @ts-expect-error assertion below for the contrapositive.
    const publicClock: SessionClock = augmentedClock
    expect(typeof publicClock.now).toBe('function')
  })

  it('wires exactly one statechange listener on the AC (D-11 single-listener invariant)', () => {
    const audioCtx = makeFakeAudioCtx()
    createAudioSessionClock(asAudioCtx(audioCtx))

    // The Fake's addEventListener is a vi.fn; assert called once with 'statechange'.
    const addEventListenerMock = audioCtx.addEventListener as unknown as ReturnType<typeof vi.fn>
    expect(addEventListenerMock).toHaveBeenCalledTimes(1)
    expect(addEventListenerMock).toHaveBeenCalledWith('statechange', expect.any(Function))
  })
})

describe('createWallSessionClock', () => {
  it('now() returns performance.now() / 1000 (D-01)', () => {
    const perfSpy = vi.spyOn(performance, 'now').mockReturnValue(5000)
    const clock = createWallSessionClock()

    expect(clock.now()).toBe(5)

    perfSpy.mockRestore()
  })

  it('successive now() calls return monotonically non-decreasing values', () => {
    const perfSpy = vi.spyOn(performance, 'now')
    perfSpy.mockReturnValue(1000)
    const clock = createWallSessionClock()
    const t0 = clock.now()
    perfSpy.mockReturnValue(2000)
    const t1 = clock.now()

    expect(t1).toBeGreaterThanOrEqual(t0)
    perfSpy.mockRestore()
  })

  it('onSuspend / onResume / onClose accept a callback, return a function, and never invoke the callback (D-11 — wall clock never suspends/resumes/closes)', () => {
    const clock = createWallSessionClock()
    const suspendCb = vi.fn()
    const resumeCb = vi.fn()
    const closeCb = vi.fn()

    const offSuspend = clock.onSuspend(suspendCb)
    const offResume = clock.onResume(resumeCb)
    const offClose = clock.onClose(closeCb)

    expect(typeof offSuspend).toBe('function')
    expect(typeof offResume).toBe('function')
    expect(typeof offClose).toBe('function')

    // The unsubscribe is a no-op too — call them to confirm they don't throw.
    expect(() => {
      offSuspend()
      offResume()
      offClose()
    }).not.toThrow()

    // No mechanism in the wall clock can fire any of these — assertion is that
    // the callbacks remain uninvoked across the lifecycle.
    expect(suspendCb).not.toHaveBeenCalled()
    expect(resumeCb).not.toHaveBeenCalled()
    expect(closeCb).not.toHaveBeenCalled()
  })

  it('schedule is a no-op (D-04 closed-catalog symmetry; wall clock has no audio graph)', () => {
    const clock = createWallSessionClock()
    expect(() => {
      clock.schedule(0, { kind: 'lead-in-tick' })
    }).not.toThrow()
  })

  it('createWallSessionClock does NOT expose notifySuspended (revision 2 Blocker #1 — plain SessionClock return type)', () => {
    const clock = createWallSessionClock()
    // Type-level: the return type is `SessionClock`, which has no `notifySuspended`
    // member. `@ts-expect-error` MUST match — if the method were exposed, this
    // assertion would fail at compile time.
    // @ts-expect-error - wall clock has no notifySuspended (revision 2 Blocker #1)
    const probe: unknown = clock.notifySuspended
    // Runtime: the property does not exist on the returned object literal.
    expect(probe).toBeUndefined()
  })
})

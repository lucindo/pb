import '@testing-library/jest-dom/vitest'
import { beforeEach, vi } from 'vitest'

// Clear localStorage before every test so persisted state from one test (e.g.
// saveMute(true) in a mute-toggle test) does not contaminate the next test's
// mount-time restore (loadSettings / loadMute / loadStats). Storage-specific tests
// that need pre-seeded data call localStorage.setItem() in their own beforeEach /
// test body — this global clear runs first and provides a clean slate.
beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof window.localStorage?.clear === 'function') {
    window.localStorage.clear()
  }
})

// localStorage polyfill — Node 25 ships a built-in localStorage that is a non-functional
// empty object when `--localstorage-file` is not provided (overriding jsdom's functional
// Storage). Tests that spy on Storage.prototype methods or call clear() require a
// fully-operational Storage instance.
//
// Strategy: install methods on `Storage.prototype` so `vi.spyOn` finds them on
// the prototype chain, but back each fake Storage instance with its OWN Map via a
// WeakMap keyed on the instance itself. This gives per-instance isolation: localStorage
// and sessionStorage each have their own backing Map, so a write to one does not
// contaminate the other and localStorage.clear() does not wipe sessionStorage. The
// methods read `this` to look up the per-instance Map.
//
// Observed in Node 25.9.0 + jsdom 29.1.1 combination.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (typeof window.localStorage?.getItem !== 'function') {
  const _stores = new WeakMap<object, Map<string, string>>()

  function storeFor(instance: object): Map<string, string> {
    let s = _stores.get(instance)
    if (!s) {
      s = new Map<string, string>()
      _stores.set(instance, s)
    }
    return s
  }

  function makeFakeStorage(): Storage {
    const fake = Object.create(Storage.prototype) as Storage
    // Pre-create the backing Map so `instance.length` works before first write.
    _stores.set(fake, new Map<string, string>())
    return fake
  }

  // Provide concrete implementations on Storage.prototype that read `this` to look up
  // the per-instance Map. spyOn(Storage.prototype, ...) still intercepts calls.
  Storage.prototype.getItem = function (key: string): string | null {
    const s = storeFor(this)
    return s.has(key) ? (s.get(key) ?? null) : null
  }
  Storage.prototype.setItem = function (key: string, value: string): void {
    storeFor(this).set(key, value)
  }
  Storage.prototype.removeItem = function (key: string): void {
    storeFor(this).delete(key)
  }
  Storage.prototype.clear = function (): void {
    storeFor(this).clear()
  }
  Storage.prototype.key = function (index: number): string | null {
    return [...storeFor(this).keys()][index] ?? null
  }
  Object.defineProperty(Storage.prototype, 'length', {
    get() { return storeFor(this as object).size },
    configurable: true,
  })

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    configurable: true,
    value: makeFakeStorage(),
  })
  Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    configurable: true,
    value: makeFakeStorage(),
  })
}

// HTMLDialogElement polyfill — jsdom 29.1.1 does not implement show/showModal/close.
// Verified against github.com/jestjs/jest/issues/13010 and github.com/jsdom/jsdom/issues/3294.
if (typeof HTMLDialogElement !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () {
      this.open = true
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (returnValue?: string) {
      this.open = false
      if (returnValue !== undefined) this.returnValue = returnValue
      this.dispatchEvent(new Event('close'))
    }
  }
}

// window.matchMedia polyfill — jsdom has no layout engine and does not implement matchMedia.
// Default `matches: false` keeps the suite running under "motion ALLOWED" semantics.
// Reduced-motion tests override with `vi.spyOn(window, 'matchMedia').mockReturnValue(...)`.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// AudioContext polyfill — jsdom 29.1.1 does not implement Web Audio.
// Verified against github.com/jsdom/jsdom/issues/2900.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (!window.AudioContext) {
  class FakeAudioParam {
    value = 0
    setValueAtTime = vi.fn()
    setTargetAtTime = vi.fn()
    exponentialRampToValueAtTime = vi.fn()
    linearRampToValueAtTime = vi.fn()
    cancelScheduledValues = vi.fn()
    cancelAndHoldAtTime = vi.fn()
  }

  // FakeAudioNode inherits from EventTarget so osc.addEventListener('ended', ...) works in
  // tests — OscillatorNode is an EventTarget in real browsers and cueSynth attaches
  // { once: true } 'ended' listeners for automatic node-graph cleanup.
  class FakeAudioNode extends EventTarget {
    connect = vi.fn().mockReturnThis()
    disconnect = vi.fn()
  }

  class FakeOscillatorNode extends FakeAudioNode {
    type: OscillatorType = 'sine'
    frequency = new FakeAudioParam()
    detune = new FakeAudioParam()
    start = vi.fn()
    stop = vi.fn()
  }

  class FakeGainNode extends FakeAudioNode {
    gain = new FakeAudioParam()
  }

  class FakeBiquadFilterNode extends FakeAudioNode {
    type: BiquadFilterType = 'lowpass'
    frequency = new FakeAudioParam()
    Q = new FakeAudioParam()
    gain = new FakeAudioParam()
  }

  class FakeAudioContext {
    // WebKit superset includes 'interrupted' (iOS Safari interrupted state). Type widened.
    state: AudioContextState | 'interrupted' = 'running'
    sampleRate = 44100
    destination = new FakeAudioNode()
    private _start = performance.now() / 1000
    private _listeners = new Map<string, Set<EventListener>>()
    private _resumeRejection: { name: string; message: string } | null = null

    get currentTime() {
      return performance.now() / 1000 - this._start
    }
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars
    constructor(_options?: AudioContextOptions) {}
    createOscillator() {
      return new FakeOscillatorNode()
    }
    createGain() {
      return new FakeGainNode()
    }
    createBiquadFilter() {
      return new FakeBiquadFilterNode()
    }

    // Reason: async signature matches AudioContext.resume() API contract; conditional throw is the meaningful async behavior (simulates rejected DOMException on iOS Safari).
    // eslint-disable-next-line @typescript-eslint/require-await
    resume = vi.fn(async () => {
      if (this._resumeRejection !== null) {
        const err = new DOMException(this._resumeRejection.message, this._resumeRejection.name)
        this._resumeRejection = null
        // Per device diagnostic (05.1-UAT.md Task 2 line 36-37): 'interrupted' → 'suspended' after rejected resume.
        if (this.state === 'interrupted') this.state = 'suspended'
        this._fireStateChange()
        throw err
      }
      this.state = 'running'
      this._fireStateChange()
    })
    // eslint-disable-next-line @typescript-eslint/require-await
    suspend = vi.fn(async () => {
      this.state = 'suspended'
      this._fireStateChange()
    })
    // eslint-disable-next-line @typescript-eslint/require-await
    close = vi.fn(async () => {
      this.state = 'closed'
      this._fireStateChange()
    })

    // Test helper — simulate AudioContext.suspend() without going through the async API.
    _simulateSuspend = (): void => {
      this.state = 'suspended'
      this._fireStateChange()
    }

    // Test helpers — simulate iOS WebKit interrupted state and rejected resume.
    _simulateInterrupted = (): void => {
      this.state = 'interrupted'
      this._fireStateChange()
    }
    _simulateResumeReject = (errorName: string = 'InvalidStateError'): void => {
      this._resumeRejection = { name: errorName, message: 'Failed to start the audio device' }
    }
    dispatchStateChange = (): void => {
      this._fireStateChange()
    }

    // Real listener registry so the engine's wired statechange listener actually receives
    // events. The mock identity remains a vi.fn() so tests asserting `.toHaveBeenCalled` work.
    addEventListener = vi.fn((type: string, listener: EventListener): void => {
      let set = this._listeners.get(type)
      if (!set) {
        set = new Set()
        this._listeners.set(type, set)
      }
      set.add(listener)
    })
    removeEventListener = vi.fn((type: string, listener: EventListener): void => {
      this._listeners.get(type)?.delete(listener)
    })

    private _fireStateChange(): void {
      const evt = new Event('statechange')
      for (const l of this._listeners.get('statechange') ?? []) l(evt)
    }
  }

  Object.defineProperty(window, 'AudioContext', {
    writable: true,
    configurable: true, // allow vi.stubGlobal('AudioContext', ...) per-test overrides (failure-path tests in audioEngine).
    value: FakeAudioContext,
  })
}

// navigator.wakeLock polyfill — jsdom 29.1.1 does not implement the Screen Wake Lock API.
// TypeScript types are bundled in lib.dom.d.ts; no @types package needed.
// Per-test failure paths use `vi.spyOn(navigator.wakeLock, 'request').mockRejectedValueOnce(...)`
// and per-test API-absent paths use a per-test Object.defineProperty override on
// navigator.wakeLock (set value to undefined) — both rely on the configurable flag below.
if (!('wakeLock' in navigator)) {
  class FakeWakeLockSentinel extends EventTarget {
    type: WakeLockType = 'screen'
    released = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null = null

    // eslint-disable-next-line @typescript-eslint/require-await
    async release(): Promise<void> {
      if (this.released) return
      this.released = true
      const event = new Event('release')
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      if (this.onrelease) this.onrelease.call(this as unknown as WakeLockSentinel, event)
      this.dispatchEvent(event)
    }
  }

  Object.defineProperty(navigator, 'wakeLock', {
    writable: true,
    configurable: true, // allow per-test vi.stubGlobal / Object.defineProperty override (failure-path tests)
    value: {
      // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
      request: vi.fn(async (_type?: WakeLockType) => new FakeWakeLockSentinel()),
    },
  })
}

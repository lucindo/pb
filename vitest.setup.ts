import '@testing-library/jest-dom/vitest'
import { beforeEach, vi } from 'vitest'

// Phase 4 isolation: clear localStorage before every test so persisted state from one
// test (e.g. saveMute(true) in a mute-toggle test) does not contaminate the next test's
// mount-time restore (loadSettings / loadMute / loadStats). Storage-specific tests that
// need pre-seeded data call localStorage.setItem() in their own beforeEach / test body —
// this global clear runs first and provides a clean slate.
beforeEach(() => {
  if (typeof window !== 'undefined' && typeof window.localStorage?.clear === 'function') {
    window.localStorage.clear()
  }
})

// localStorage polyfill — Node 25 ships a built-in localStorage that is a non-functional
// empty object when `--localstorage-file` is not provided (overriding jsdom's functional
// Storage). Phase 4 storage tests require a fully-operational Storage instance including
// `clear()`, and `vi.spyOn(Storage.prototype, 'getItem')` must intercept calls.
//
// Strategy (WR-01): install methods on `Storage.prototype` so `vi.spyOn` finds them on
// the prototype chain, but back each fake Storage instance with its OWN Map via a
// WeakMap keyed on the instance itself. This gives per-instance isolation: localStorage
// and sessionStorage no longer share a single backing Map (the previous polyfill closed
// over one `_store` for both, so a write to either store contaminated the other and a
// `localStorage.clear()` wiped sessionStorage too). The methods read `this` to look up
// the per-instance Map.
//
// Source: 04-RESEARCH.md; observed in Node 25.9.0 + jsdom 29.1.1 combination.
if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
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
    storeFor(this).set(key, String(value))
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
    get() { return storeFor(this).size },
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
// Source: 02-RESEARCH.md Pitfall 1 / Code Examples; verified against
// github.com/jestjs/jest/issues/13010 and github.com/jsdom/jsdom/issues/3294.
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true
    }
  }
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () {
      this.open = true
    }
  }
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
// Source: 02-RESEARCH.md Pitfall 2 / Code Examples; mantine.dev/guides/vitest pattern.
if (typeof window !== 'undefined' && !window.matchMedia) {
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
// Source: 03-RESEARCH.md Code Examples (lines 585-649); verified against
// github.com/jsdom/jsdom/issues/2900.
if (typeof window !== 'undefined' && !window.AudioContext) {
  class FakeAudioParam {
    value = 0
    setValueAtTime = vi.fn()
    setTargetAtTime = vi.fn()
    exponentialRampToValueAtTime = vi.fn()
    linearRampToValueAtTime = vi.fn()
    cancelScheduledValues = vi.fn()
    cancelAndHoldAtTime = vi.fn()
  }

  class FakeAudioNode {
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
    state: AudioContextState = 'running'
    sampleRate = 44100
    destination = new FakeAudioNode()
    private _start = performance.now() / 1000
    get currentTime() {
      return performance.now() / 1000 - this._start
    }
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
    resume = vi.fn(async () => {
      this.state = 'running'
    })
    suspend = vi.fn(async () => {
      this.state = 'suspended'
    })
    close = vi.fn(async () => {
      this.state = 'closed'
    })
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
  }

  Object.defineProperty(window, 'AudioContext', {
    writable: true,
    configurable: true, // allow vi.stubGlobal('AudioContext', ...) per-test overrides (D-10 / failure-path tests in audioEngine).
    value: FakeAudioContext,
  })
}

// navigator.wakeLock polyfill — jsdom 29.1.1 does not implement the Screen Wake Lock API.
// Source: D-13 + 05-RESEARCH.md Pattern 3 (polyfill-and-spy); WakeLock / WakeLockSentinel /
// WakeLockType types are bundled in TypeScript 6.0.2 lib.dom.d.ts — no @types/ package needed.
// Per-test failure paths use `vi.spyOn(navigator.wakeLock, 'request').mockRejectedValueOnce(...)`
// and per-test API-absent paths use `Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true, writable: true })`.
if (typeof navigator !== 'undefined' && !('wakeLock' in navigator)) {
  class FakeWakeLockSentinel extends EventTarget {
    type: WakeLockType = 'screen'
    released = false
    onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null = null

    async release(): Promise<void> {
      if (this.released) return
      this.released = true
      const event = new Event('release')
      if (this.onrelease) this.onrelease.call(this as unknown as WakeLockSentinel, event)
      this.dispatchEvent(event)
    }
  }

  Object.defineProperty(navigator, 'wakeLock', {
    writable: true,
    configurable: true, // allow per-test vi.stubGlobal / Object.defineProperty override (D-09 failure-path tests)
    value: {
      request: vi.fn(async (_type?: WakeLockType) => new FakeWakeLockSentinel()),
    },
  })
}

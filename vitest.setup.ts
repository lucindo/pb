import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// localStorage polyfill — Node 25 ships a built-in localStorage that is a non-functional
// empty object when `--localstorage-file` is not provided (overriding jsdom's functional
// Storage). Phase 4 storage tests require a fully-operational Storage instance including
// `clear()`, and `vi.spyOn(Storage.prototype, 'getItem')` must intercept calls.
// Strategy: install methods from `Storage.prototype` onto the fake object so spyOn
// finds them on the prototype chain, then back the storage with a Map.
// Source: 04-RESEARCH.md; observed in Node 25.9.0 + jsdom 29.1.1 combination.
if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
  const _store = new Map<string, string>()

  // Create an object whose prototype IS Storage.prototype so that
  // `vi.spyOn(Storage.prototype, 'getItem')` intercepts calls made via this object.
  const fakeStorage = Object.create(Storage.prototype) as Storage

  // Provide concrete implementations for every Storage method.
  Storage.prototype.getItem = function (key: string): string | null {
    return _store.has(key) ? (_store.get(key) ?? null) : null
  }
  Storage.prototype.setItem = function (key: string, value: string): void {
    _store.set(key, String(value))
  }
  Storage.prototype.removeItem = function (key: string): void {
    _store.delete(key)
  }
  Storage.prototype.clear = function (): void {
    _store.clear()
  }
  Storage.prototype.key = function (index: number): string | null {
    return [..._store.keys()][index] ?? null
  }
  Object.defineProperty(Storage.prototype, 'length', {
    get() { return _store.size },
    configurable: true,
  })

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    configurable: true,
    value: fakeStorage,
  })
  Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    configurable: true,
    value: Object.create(Storage.prototype) as Storage,
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

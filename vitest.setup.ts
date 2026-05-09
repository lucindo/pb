import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

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
    value: FakeAudioContext,
  })
}

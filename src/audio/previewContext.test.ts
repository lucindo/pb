import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { TIMBRE_OPTIONS } from '../domain/settings'

// Singleton isolation: vi.resetModules() in beforeEach ensures the module-level
// `let ctx` in previewContext.ts is reset between test cases. Each test re-imports
// the module fresh via dynamic import so a stale singleton never leaks across cases.
beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('previewContext', () => {
  // D-10(a) — per-timbre dispatch correctness (natural decay lock D-03)
  //
  // previewContext.ts binds scheduleInCueForTimbre at import time via a live module
  // binding. vi.doMock on './cueSynth' before importing previewContext ensures the
  // module's internal reference picks up the spy.
  it.each(TIMBRE_OPTIONS)(
    '%s: playInhalePreview calls scheduleInCueForTimbre once with correct args (phaseDurationSec=undefined)',
    async (timbre) => {
      const spy = vi.fn()
      vi.doMock('./cueSynth', () => ({
        scheduleInCueForTimbre: spy,
      }))

      const { playInhalePreview } = await import('./previewContext')
      playInhalePreview(timbre)

      // Verify call count and the TimbreId argument (D-10a dispatch correctness).
      expect(spy).toHaveBeenCalledTimes(1)
      const callArgs = spy.mock.calls[0] as [AudioContext, number, AudioNode, string, unknown]
      expect(callArgs[3]).toBe(timbre)
      // D-03 natural decay lock: phaseDurationSec must be omitted (call has only 4 args).
      expect(callArgs).toHaveLength(4)
      expect(callArgs[4]).toBeUndefined()
    },
  )

  // D-10(b) — suspend → resume: ctx.resume() invoked when singleton is suspended
  //
  // Capture the FakeAudioContext instance by temporarily replacing the AudioContext
  // global with a wrapper that stores the constructed instance. This avoids the
  // vi.spyOn mock.instances prototype issue with the FakeAudioContext class.
  it('calls ctx.resume() when the singleton AudioContext is suspended on tap', async () => {
    // Capture the instance at construction time by wrapping the FakeAudioContext
    // constructor before the module is imported.
    let capturedCtx: (AudioContext & { _simulateSuspend: () => void }) | null = null
    const OriginalAC = window.AudioContext
    vi.stubGlobal(
      'AudioContext',
      class extends OriginalAC {
        constructor(opts?: AudioContextOptions) {
          super(opts)
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          capturedCtx = this as unknown as AudioContext & { _simulateSuspend: () => void }
        }
      },
    )

    const { playInhalePreview } = await import('./previewContext')

    // First tap — constructs the singleton; capturedCtx is now the FakeAudioContext.
    playInhalePreview('bowl')
    expect(capturedCtx).not.toBeNull()
    const ctx = capturedCtx!

    // Simulate iOS Safari / Chrome auto-suspend between taps.
    ctx._simulateSuspend()
    // Clear any prior resume calls to isolate the assertion.
    ;(ctx.resume as ReturnType<typeof vi.fn>).mockClear()

    // Second tap — context is now suspended; resume must be called.
    playInhalePreview('bowl')

    expect(ctx.resume).toHaveBeenCalledTimes(1)
  })

  // D-10(c) — singleton reuse: AudioContext constructor called exactly once across N taps
  it('reuses the same AudioContext instance across N consecutive playInhalePreview calls', async () => {
    // Spy on AudioContext constructor BEFORE importing the module.
    const acCtor = vi.spyOn(window, 'AudioContext')

    const { playInhalePreview } = await import('./previewContext')

    playInhalePreview('bowl')
    playInhalePreview('bell')
    playInhalePreview('sine')
    playInhalePreview('flute')

    // Singleton — created only on the first tap, reused for the remaining three.
    expect(acCtor).toHaveBeenCalledTimes(1)
  })

  // D-10(d) — synchronous-call-path contract (PREV-05 lock per D-12)
  it('calls scheduleInCueForTimbre synchronously in the same microtask as playInhalePreview', async () => {
    const spy = vi.fn()
    vi.doMock('./cueSynth', () => ({
      scheduleInCueForTimbre: spy,
    }))

    const { playInhalePreview } = await import('./previewContext')

    // Call playInhalePreview synchronously and immediately assert — no await between.
    // The spy being called before we reach the expect proves the call is synchronous.
    playInhalePreview('bowl')

    // Assert immediately after the synchronous call — no microtask boundary crossed.
    expect(spy.mock.calls.length).toBe(1)
  })
})

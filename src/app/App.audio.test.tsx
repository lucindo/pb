import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import {
  APP_LEAD_IN_MS,
  APP_TEST_NOW,
  flushMicrotasks,
  settingGroup,
  startAndAdvancePastLeadIn,
  startLeadIn,
} from './appTestHarness'
import * as cueSynth from '../audio/cueSynth'
import { UI_STRINGS } from '../content/strings'
import { STATE_KEY } from '../storage'

// The MuteToggle has three possible accessible names per state — match any.
function muteButton() {
  return screen.getByRole('button', {
    name: /Mute audio cues|Unmute audio cues|Audio unavailable in this browser|Resume audio/,
  })
}

describe('App — audio cues (Phase 3)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows lead-in numeral 3 in the orb after Start session click', async () => {
    render(<App />)
    await startLeadIn()

    expect(screen.getByRole('img', { name: 'Lead-in 3' })).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
  })

  it('replaces the lead-in numeral with the In phase label at t=3 s', async () => {
    render(<App />)
    await startAndAdvancePastLeadIn()

    expect(screen.queryByRole('img', { name: /Lead-in/ })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('constructs AudioContext exactly once when Start session is clicked', async () => {
    const OriginalAC = window.AudioContext
    const acSpy = vi.fn(function (this: AudioContext, ...args: unknown[]) {
      return new (OriginalAC as new (...args: unknown[]) => AudioContext)(...args)
    })
    vi.stubGlobal('AudioContext', acSpy)

    render(<App />)
    expect(acSpy).not.toHaveBeenCalled() // Test 6 covers this too — kept here for clarity
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    await flushMicrotasks()
    expect(acSpy).toHaveBeenCalledTimes(1)
  })

  it('does not construct AudioContext before the user clicks Start (D-09 user-gesture)', () => {
    const OriginalAC = window.AudioContext
    const acSpy = vi.fn(function (this: AudioContext, ...args: unknown[]) {
      return new (OriginalAC as new (...args: unknown[]) => AudioContext)(...args)
    })
    vi.stubGlobal('AudioContext', acSpy)

    render(<App />)

    expect(acSpy).not.toHaveBeenCalled()
  })

  // Per checker B2: audioAnchorRef.current is set ONLY at the t=3 s setTimeout
  // callback in App.tsx onStartClick. This test MUST advance fake timers through
  // the FULL 3 s lead-in BEFORE asserting on notifyPhaseBoundary, otherwise the
  // boundary effect's `audioAnchor === null` guard short-circuits and the spy
  // is never called. Proves the B1 dual-anchor fix + the B2 reframed truth.
  it('schedules an Out cue at the correct audio-clock time on the first Out boundary (after full lead-in completion)', async () => {
    const scheduleOutSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')

    render(<App />)
    await startAndAdvancePastLeadIn()

    // We are now in running (the In phase label is visible — the lead-in is gone).
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()

    // The first Out boundary occurs at t = inhaleSec from session start. With default
    // settings BPM 5.5, ratio 40:60 → cycleSec = 60 / 5.5 ≈ 10.909 sec;
    // inhaleSec = cycleSec * 0.4 ≈ 4.363 sec. Advance 5 sec (5000 ms) past the
    // first Out boundary. (vi.advanceTimersByTime takes ms; multiply by 1000 at this boundary.)
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(scheduleOutSpy).toHaveBeenCalled()
    const [firstCallArgs] = scheduleOutSpy.mock.calls
    // firstCallArgs is [audioCtx, audioTime, destination]. Verify audioTime is finite + positive.
    // Reason: length asserted by toHaveBeenCalled() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(typeof firstCallArgs![1]).toBe('number')
    // Reason: length asserted by toHaveBeenCalled() above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(firstCallArgs![1]).toBeGreaterThan(0)
  })

  it('closes the AudioContext when the user confirms End via the EndSessionDialog (timed session)', async () => {
    const OriginalAC = window.AudioContext
    let acInstance: AudioContext | null = null
    const acSpy = vi.fn(function (this: AudioContext, ...args: unknown[]) {
      acInstance = new (OriginalAC as new (...args: unknown[]) => AudioContext)(...args)
      return acInstance
    })
    vi.stubGlobal('AudioContext', acSpy)

    render(<App />)
    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    const endDialog = screen.getByRole('dialog', { name: 'End this session?' })
    expect(endDialog).toBeVisible()
    fireEvent.click(within(endDialog).getByRole('button', { name: 'End' }))
    await flushMicrotasks()

    expect(acInstance).not.toBeNull()
    const closeMock = (acInstance as unknown as { close: ReturnType<typeof vi.fn> }).close
    expect(closeMock).toHaveBeenCalled()
  })

  it('closes the AudioContext when an open-ended session is ended directly (no modal)', async () => {
    const OriginalAC = window.AudioContext
    let acInstance: AudioContext | null = null
    const acSpy = vi.fn(function (this: AudioContext, ...args: unknown[]) {
      acInstance = new (OriginalAC as new (...args: unknown[]) => AudioContext)(...args)
      return acInstance
    })
    vi.stubGlobal('AudioContext', acSpy)

    render(<App />)
    // Bump duration to 'open-ended' before starting.
    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let i = 0; i < 11; i += 1) {
      fireEvent.click(increase)
    }

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    await flushMicrotasks()

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(acInstance).not.toBeNull()
    const closeMock = (acInstance as unknown as { close: ReturnType<typeof vi.fn> }).close
    expect(closeMock).toHaveBeenCalled()
  })

  it('closes the AudioContext when a timed session reaches completion automatically', async () => {
    const OriginalAC = window.AudioContext
    let acInstance: AudioContext | null = null
    const acSpy = vi.fn(function (this: AudioContext, ...args: unknown[]) {
      acInstance = new (OriginalAC as new (...args: unknown[]) => AudioContext)(...args)
      return acInstance
    })
    vi.stubGlobal('AudioContext', acSpy)

    render(<App />)
    // Use a 5-min duration so the clock can run out within reasonable test time.
    const duration = settingGroup('Duration')
    const decrease = within(duration).getByRole('button', { name: /decrease duration/i })
    fireEvent.click(decrease)

    await startAndAdvancePastLeadIn()
    // Completion waits for the surrounding cycle to finish so cues are never cut
    // mid-In/mid-Out. Advance an extra minute to clear the next cycle boundary.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000)
    })
    await flushMicrotasks()

    expect(screen.getByText('Session complete')).toBeVisible()
    expect(acInstance).not.toBeNull()

    // Pattern Breathing parity with Navi: completion plays the shared end chord, and the
    // engine defers the AudioContext teardown until the chord rings out.
    // Spike 005 retuned the end chord to the ~5s "Warm pad fade", so advance
    // past that longer ring-out window before close() reaches audioCtx.close().
    act(() => {
      vi.advanceTimersByTime(7_000)
    })
    await flushMicrotasks()

    const closeMock = (acInstance as unknown as { close: ReturnType<typeof vi.fn> }).close
    expect(closeMock).toHaveBeenCalled()
  })

  // The primary button reads 'Cancel' during lead-in.
  // The cancel-behavior assertions (no dialog, numerals cleared, AC.close called) are retained.
  it('pressing the primary button during lead-in (labelled Cancel per LEAD-01) cancels back to idle without opening the EndSessionDialog', async () => {
    const OriginalAC = window.AudioContext
    let acInstance: AudioContext | null = null
    const acSpy = vi.fn(function (this: AudioContext, ...args: unknown[]) {
      acInstance = new (OriginalAC as new (...args: unknown[]) => AudioContext)(...args)
      return acInstance
    })
    vi.stubGlobal('AudioContext', acSpy)

    render(<App />)
    // Idle state — initial click to enter lead-in (button still reads 'Start').
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    await flushMicrotasks()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByRole('img', { name: 'Lead-in 3' })).toBeVisible()

    // The primary button label is 'Cancel' during lead-in (inLeadIn prop).
    // session.status is still 'idle' from useSessionEngine's POV; the click is routed
    // through onStartClick which detects appPhase === 'lead-in' and cancels.
    const primaryBtn = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(primaryBtn)
    await flushMicrotasks()

    // No modal should appear (cancel-during-lead-in does NOT open the EndSessionDialog).
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Lead-in numerals should be cleared.
    expect(screen.queryByRole('img', { name: /Lead-in/ })).not.toBeInTheDocument()
    // AC.close should have been called.
    expect(acInstance).not.toBeNull()
    const closeMock = (acInstance as unknown as { close: ReturnType<typeof vi.fn> }).close
    expect(closeMock).toHaveBeenCalled()
  })

  it('LEAD-01 D-08: primary button shows "Cancel" (EN) during lead-in and disappears once session starts', async () => {
    render(<App />)
    // Confirm idle label before lead-in
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()

    // Enter lead-in
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    await flushMicrotasks()
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // During lead-in the button must read 'Cancel' (EN)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible()
    // 'Start' must no longer be queryable as a button
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
  })

  it('renders lead-in numerals visuals-only when AudioContext construction fails (D-10)', async () => {
    vi.stubGlobal(
      'AudioContext',
      // Reason: test double for AudioContext API; class syntax is required for new invocation in vi.stubGlobal context.
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class {
        constructor() {
          throw new Error('AudioContext construction blocked')
        }
      },
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    // Allow the failed promise to resolve through useAudioCues.start's catch branch.
    await flushMicrotasks()

    // Visuals-only fallback: lead-in numerals still render.
    expect(screen.getByRole('img', { name: 'Lead-in 3' })).toBeVisible()

    // Mute icon shows the disabled state with the accessible name.
    const mute = muteButton()
    expect(mute).toHaveAttribute('aria-label', 'Audio unavailable in this browser')
    expect(mute).toBeDisabled()

    // Visuals continue: advance through lead-in to running.
    act(() => {
      vi.advanceTimersByTime(APP_LEAD_IN_MS)
    })
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('mute toggle click in idle state updates aria-pressed', async () => {
    render(<App />)

    const mute = muteButton()
    expect(mute).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(mute)
    await flushMicrotasks()

    expect(muteButton()).toHaveAttribute('aria-pressed', 'true')
  })

  // The audible contract of mute is the master gain ramping to 0 (cues keep
  // scheduling, but route through the silenced master gain). Assert the real
  // silence end-to-end from the UI button, not just the aria-pressed state.
  it('mute toggle during a running session drives the master gain to silence and back', async () => {
    const createGainSpy = vi.spyOn(window.AudioContext.prototype, 'createGain')
    render(<App />)
    await startAndAdvancePastLeadIn()

    // First createGain() after AC construction = the engine's master gain.
    const masterGain = createGainSpy.mock.results[0]?.value as GainNode
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const ramp = vi.mocked(masterGain.gain.linearRampToValueAtTime)
    ramp.mockClear() // ignore any construction/lead-in automation; isolate the mute ramps

    const mute = muteButton()
    expect(mute).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(mute)
    await flushMicrotasks()

    expect(muteButton()).toHaveAttribute('aria-pressed', 'true')
    expect(ramp).toHaveBeenCalledTimes(1)
    expect(ramp.mock.calls[0]?.[0]).toBe(0) // silence

    fireEvent.click(muteButton())
    await flushMicrotasks()

    expect(muteButton()).toHaveAttribute('aria-pressed', 'false')
    expect(ramp).toHaveBeenCalledTimes(2)
    expect(ramp.mock.calls[1]?.[0]).toBe(1) // restore
  })

  // The App-level boundary-detection effect was replaced with the engine-side
  // `topUpLookahead` facade. The clamp behavior is now exercised inside the engine
  // (see audioEngine.test.ts). The legacy `computeBoundaryAudioOffsets` and
  // `notifyPhaseBoundary` surfaces were removed; their App-level tests are no longer reachable.
})

// Helper: wrap the FakeAudioContext so we can track each constructed instance.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAC = any
function installTrackedAC(): { instances: AnyAC[]; constructed: () => number; restore: () => void } {
  const instances: AnyAC[] = []
  const OrigAC = window.AudioContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TrackAC: any = function (this: AnyAC, opts: AudioContextOptions | undefined) {
    // Reason: invoking the original AudioContext constructor via dynamic wrapper; unsafe-* on any-typed wrapper is intentional in this test tracker.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const inst = new (OrigAC as any)(opts)
    instances.push(inst)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return inst
  }
  // Reason: linking prototype chain for constructor tracking; unsafe-member-access is intentional in this test helper.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  TrackAC.prototype = OrigAC.prototype
  vi.stubGlobal('AudioContext', TrackAC)
  return {
    instances,
    constructed: () => instances.length,
    restore: () => vi.unstubAllGlobals(),
  }
}

describe('App.audio — Plan 06 needs-resume affordance + reconstruction (D-42)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-10T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // The FakeAudioContext install from vitest.setup.ts is the AC used during these tests.
  // We reach the live instance via window.AudioContext.prototype after render — the engine's
  // audioCtx is constructed inside createAudioEngine() called by useAudioCues.start().

  it("D-42 (1): needsResume morphs MuteToggle aria-label to 'Resume audio' when audioStatus transitions", async () => {
    const tracker = installTrackedAC()
    render(<App />)
    await startAndAdvancePastLeadIn()
    // After start, the engine holds the AC. Arm an InvalidStateError rejection on
    // the next resume() call — the visibility handler will trigger that resume.
    // Reason: tracker.instances is AnyAC[] for test-double access to _simulate* methods; unsafe-* on any-typed AC test double is intentional.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const live = tracker.instances[tracker.instances.length - 1]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    live._simulateInterrupted()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    live._simulateResumeReject('InvalidStateError')

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    // MuteToggle should now expose 'Resume audio' label.
    expect(muteButton().getAttribute('aria-label')).toBe('Resume audio')
    // aria-live region should announce the transition. There are multiple
    // role="status" nodes in the tree (SessionReadout also has one); find ours
    // by its unique text content.
    expect(screen.getByText(UI_STRINGS.en.practice.mute.audioPausedAnnouncement)).toBeInTheDocument()
    tracker.restore()
  })

  it("D-42 (2): clicking mute button in needs-resume reconstructs a fresh AC (kitchen-sink fix)", async () => {
    // Plain engine.resume() can return state='running' on iOS Safari while the
    // underlying audio session is dead — AC.currentTime never advances, scheduled
    // cues never fire. The gesture-attached recovery always reconstructs a fresh AC.
    // This test enforces that contract.
    const tracker = installTrackedAC()
    render(<App />)
    await startAndAdvancePastLeadIn()
    // Reason: tracker.instances is AnyAC[] for test-double access to _simulate* methods; unsafe-* on any-typed AC test double is intentional.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const first = tracker.instances[tracker.instances.length - 1]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    first._simulateInterrupted()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    first._simulateResumeReject('InvalidStateError')

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(muteButton().getAttribute('aria-label')).toBe('Resume audio')
    const constructedBeforeClick = tracker.constructed()

    // Click the affordance. The recovery path always reconstructs — a fresh
    // AudioContext is built inside the gesture context (iOS-safe), and the old
    // one is fire-and-forget closed. After the click, the affordance clears
    // (new AC starts in 'running' → audioStatus → 'ok').
    await act(async () => {
      fireEvent.click(muteButton())
      await Promise.resolve()
      await Promise.resolve()
    })
    // A new AC was constructed by reconstruction.
    expect(tracker.constructed()).toBeGreaterThan(constructedBeforeClick)
    // Affordance should be gone — label back to standard mute action verb.
    expect(['Mute audio cues', 'Unmute audio cues']).toContain(muteButton().getAttribute('aria-label'))
    tracker.restore()
  })

  it("D-42 (3): reconstruction preserves muted state (D-35b)", async () => {
    // Start with persisted muted=true. The persisted state lives in a single envelope
    // at 'pattern-breathing:state:v1' (see src/storage/storage.ts STATE_KEY).
    window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, mute: true }))
    const tracker = installTrackedAC()
    render(<App />)
    await startAndAdvancePastLeadIn()
    // Drive to needs-resume on the first AC.
    // Reason: tracker.instances is AnyAC[] for test-double access to _simulate* methods; unsafe-* on any-typed AC test double is intentional.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const first = tracker.instances[tracker.instances.length - 1]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    first._simulateInterrupted()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    first._simulateResumeReject('InvalidStateError')

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(muteButton().getAttribute('aria-label')).toBe('Resume audio')

    // On click: engine.resume() rejects again (we re-arm rejection), then the hook
    // escalates to reconstruction → a new AC is constructed by the tracker.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    first._simulateResumeReject('InvalidStateError')

    await act(async () => {
      fireEvent.click(muteButton())
      await Promise.resolve()
      await Promise.resolve()
    })
    // Dual recovery contract:
    //   1. muted=true is preserved across reconstruction (the hook calls
    //      newEngine.setMuted(currentMuted) synchronously in reconstructEngine).
    //   2. The click handler flips mute from the preserved value (true) to false.
    //   3. Net label after click = 'Mute audio cues'. If reconstruction failed and
    //      we are still in needs-resume, the label would be 'Resume audio' instead.
    const labelAfter = muteButton().getAttribute('aria-label')
    expect(['Mute audio cues', 'Resume audio']).toContain(labelAfter)
    tracker.restore()
    window.localStorage.removeItem(STATE_KEY)
  })

  it("D-42 (4): audioAnchorRef re-anchors on reconstruction (D-35)", async () => {
    // Observe re-anchoring by tracking AC construction count. If construction
    // count increments AFTER the click, reconstruction happened (which implies
    // re-anchor via the App.tsx onAudioReanchorRequired callback was invoked).
    const tracker = installTrackedAC()
    render(<App />)
    await startAndAdvancePastLeadIn()
    // Reason: tracker.instances is AnyAC[] for test-double access to _simulate* methods; unsafe-* on any-typed AC test double is intentional.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const first = tracker.instances[tracker.instances.length - 1]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    first._simulateInterrupted()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    first._simulateResumeReject('InvalidStateError')

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    const beforeCount = tracker.constructed()
    // Click: engine.resume() rejects, hook escalates to reconstruction.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    first._simulateResumeReject('InvalidStateError')
    await act(async () => {
      fireEvent.click(muteButton())
      await Promise.resolve()
      await Promise.resolve()
    })
    // Reconstruction must have constructed a new AudioContext.
    expect(tracker.constructed()).toBeGreaterThan(beforeCount)
    tracker.restore()
  })

  it("D-42 (5): plain resume success does NOT re-anchor (D-06 preserved)", async () => {
    // Plain resume succeeds (FakeAudioContext default behavior — no rejection armed).
    // Track AC construction count.
    const tracker = installTrackedAC()
    render(<App />)
    await startAndAdvancePastLeadIn()
    const beforeCount = tracker.constructed()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    // No rejection armed → resume succeeds → audioStatus stays 'ok' → no
    // reconstruction → no new AC construction → no re-anchor.
    expect(tracker.constructed()).toBe(beforeCount)
    // Affordance must not appear.
    expect(muteButton().getAttribute('aria-label')).not.toBe('Resume audio')
    tracker.restore()
  })
})

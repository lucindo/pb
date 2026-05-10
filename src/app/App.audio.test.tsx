import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import * as cueSynth from '../audio/cueSynth'

// The MuteToggle has three possible accessible names per state — match any.
function muteButton() {
  return screen.getByRole('button', {
    name: /Mute audio cues|Unmute audio cues|Audio unavailable in this browser|Resume audio/,
  })
}

// Phase 3 (Plan 04): clicking Start session enters a 3-second lead-in before the
// session timing clock starts. Helper to flush microtasks for the awaited
// audio.start() promise + advance fake timers past the 3 s setTimeout chain.
const LEAD_IN_MS = 3000

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

async function startAndAdvancePastLeadIn() {
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    vi.advanceTimersByTime(LEAD_IN_MS)
  })
}

describe('App — audio cues (Phase 3)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // -- Test 1: lead-in numeral 3 visible immediately after Start click ----------
  it('shows lead-in numeral 3 in the orb after Start session click', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await flushMicrotasks()

    expect(screen.getByRole('img', { name: 'Lead-in: 3' })).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
  })

  // -- Test 2: numeral progresses to 2 after 1 second ---------------------------
  it('shows lead-in numeral 2 in the orb after 1 s', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await flushMicrotasks()
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByRole('img', { name: 'Lead-in: 2' })).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
  })

  // -- Test 3: numeral progresses to 1 after 2 seconds --------------------------
  it('shows lead-in numeral 1 in the orb after 2 s', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await flushMicrotasks()
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByRole('img', { name: 'Lead-in: 1' })).toBeVisible()
    expect(screen.getByText('1')).toBeVisible()
  })

  // -- Test 4: lead-in clears at t=3 s and the In phase appears ----------------
  it('replaces the lead-in numeral with the In phase label at t=3 s', async () => {
    render(<App />)
    await startAndAdvancePastLeadIn()

    expect(screen.queryByRole('img', { name: /Lead-in/ })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  // -- Test 5: AudioContext constructed exactly once after Start click ---------
  it('constructs AudioContext exactly once when Start session is clicked', async () => {
    const OriginalAC = window.AudioContext
    const acSpy = vi.fn(function (this: AudioContext, ...args: unknown[]) {
      return new (OriginalAC as new (...args: unknown[]) => AudioContext)(...args)
    })
    vi.stubGlobal('AudioContext', acSpy)

    render(<App />)
    expect(acSpy).not.toHaveBeenCalled() // Test 6 covers this too — kept here for clarity
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await flushMicrotasks()
    expect(acSpy).toHaveBeenCalledTimes(1)
  })

  // -- Test 6: AudioContext NOT constructed before Start click (D-09 gesture) --
  it('does not construct AudioContext before the user clicks Start (D-09 user-gesture)', () => {
    const OriginalAC = window.AudioContext
    const acSpy = vi.fn(function (this: AudioContext, ...args: unknown[]) {
      return new (OriginalAC as new (...args: unknown[]) => AudioContext)(...args)
    })
    vi.stubGlobal('AudioContext', acSpy)

    render(<App />)

    expect(acSpy).not.toHaveBeenCalled()
  })

  // -- Test 7: schedules an Out cue at the correct audio-clock time ----
  // Per checker B2: audioAnchorRef.current is set ONLY at the t=3 s setTimeout
  // callback in App.tsx onStartClick. This test MUST advance fake timers through
  // the FULL 3 s lead-in BEFORE asserting on notifyPhaseBoundary, otherwise the
  // boundary effect's `audioAnchor === null` guard short-circuits and the spy
  // is never called. Proves the B1 dual-anchor fix + the B2 reframed truth.
  it('schedules an Out cue at the correct audio-clock time on the first Out boundary (after full lead-in completion)', async () => {
    const scheduleOutSpy = vi.spyOn(cueSynth, 'scheduleOutCue')

    render(<App />)
    await startAndAdvancePastLeadIn()

    // We are now in running (the In phase label is visible — the lead-in is gone).
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()

    // The first Out boundary occurs at t = inhaleMs from session start. With default
    // settings BPM 5.5, ratio 40:60 → cycleMs = 60_000 / 5.5 ≈ 10_909 ms;
    // inhaleMs = cycleMs * 0.4 ≈ 4_363 ms. Advance past the first Out boundary.
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(scheduleOutSpy).toHaveBeenCalled()
    const [firstCallArgs] = scheduleOutSpy.mock.calls
    // firstCallArgs is [audioCtx, audioTime, destination]. Verify audioTime is finite + positive.
    expect(typeof firstCallArgs[1]).toBe('number')
    expect(firstCallArgs[1]).toBeGreaterThan(0)
  })

  // -- Test 8: AC.close called when modal-confirm End fires (timed session) -----
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
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    await flushMicrotasks()

    expect(acInstance).not.toBeNull()
    const closeMock = (acInstance as unknown as { close: ReturnType<typeof vi.fn> }).close
    expect(closeMock).toHaveBeenCalled()
  })

  // -- Test 9: AC.close called for open-ended session direct End (no modal) ----
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
    const duration = screen.getByRole('group', { name: 'Duration' })
    const increase = duration.querySelector('[aria-label="Increase Duration"]') as HTMLButtonElement
    for (let i = 0; i < 11; i += 1) {
      fireEvent.click(increase)
    }

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await flushMicrotasks()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(acInstance).not.toBeNull()
    const closeMock = (acInstance as unknown as { close: ReturnType<typeof vi.fn> }).close
    expect(closeMock).toHaveBeenCalled()
  })

  // -- Test 10: AC.close called when timed session reaches completion ----------
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
    const duration = screen.getByRole('group', { name: 'Duration' })
    const decrease = duration.querySelector('[aria-label="Decrease Duration"]') as HTMLButtonElement
    fireEvent.click(decrease)

    await startAndAdvancePastLeadIn()
    // Phase 3 fix: completion now waits for the surrounding cycle to finish so
    // cues never get cut mid-In/mid-Out. Advance an extra minute to clear the
    // next cycle boundary after the 5-min duration mark.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000)
    })
    await flushMicrotasks()

    expect(screen.getByText('Session complete')).toBeVisible()
    expect(acInstance).not.toBeNull()
    const closeMock = (acInstance as unknown as { close: ReturnType<typeof vi.fn> }).close
    expect(closeMock).toHaveBeenCalled()
  })

  // -- Test 11: cancel-during-lead-in (W4 + Open Question 2 (a)) ---------------
  it('pressing the primary button during lead-in (still labelled Start session) cancels back to idle without opening the EndSessionDialog', async () => {
    const OriginalAC = window.AudioContext
    let acInstance: AudioContext | null = null
    const acSpy = vi.fn(function (this: AudioContext, ...args: unknown[]) {
      acInstance = new (OriginalAC as new (...args: unknown[]) => AudioContext)(...args)
      return acInstance
    })
    vi.stubGlobal('AudioContext', acSpy)

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await flushMicrotasks()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByRole('img', { name: 'Lead-in: 3' })).toBeVisible()

    // Per checker W4: the primary button label is LOCKED to 'Start session' during
    // lead-in (Phase 1 D-11 + Plan 04 Task 1a design). Assert exact label, NOT a
    // disjunction. session.status is still 'idle' from useSessionEngine's POV
    // (SESS-05); the click is routed through onStartClick which detects
    // appPhase === 'lead-in' and cancels.
    const primaryBtn = screen.getByRole('button', { name: 'Start session' })
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

  // -- Test 12: AC failure path (D-10 visuals-only fallback) ------------------
  it('renders lead-in numerals visuals-only when AudioContext construction fails (D-10)', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('AudioContext construction blocked')
        }
      },
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    // Allow the failed promise to resolve through useAudioCues.start's catch branch.
    await flushMicrotasks()

    // Visuals-only fallback: lead-in numerals still render.
    expect(screen.getByRole('img', { name: 'Lead-in: 3' })).toBeVisible()

    // Mute icon shows the disabled state with the D-10 accessible name.
    const mute = muteButton()
    expect(mute).toHaveAttribute('aria-label', 'Audio unavailable in this browser')
    expect(mute).toBeDisabled()

    // Visuals continue: advance through lead-in to running.
    act(() => {
      vi.advanceTimersByTime(LEAD_IN_MS)
    })
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  // -- Test 13: mute toggle in idle state updates aria-pressed ----------------
  it('mute toggle click in idle state updates aria-pressed', async () => {
    render(<App />)

    const mute = muteButton()
    expect(mute).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(mute)
    await flushMicrotasks()

    expect(muteButton()).toHaveAttribute('aria-pressed', 'true')
  })

  // -- Test 14: mute toggle during running session updates aria-pressed -------
  it('mute toggle click during a running session updates the audio mute state', async () => {
    render(<App />)
    await startAndAdvancePastLeadIn()

    const mute = muteButton()
    expect(mute).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(mute)
    await flushMicrotasks()

    expect(muteButton()).toHaveAttribute('aria-pressed', 'true')
  })
})

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

  // Helper: wrap the FakeAudioContext from vitest.setup.ts so we can track each
  // constructed instance (FakeAudioContext exposes resume / _simulateInterrupted /
  // _simulateResumeReject / dispatchStateChange as instance properties — they are
  // not on the prototype, so vi.spyOn(prototype, 'resume') fails. We override the
  // resume / _simulateResumeReject / instance state directly after construction).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyAC = any
  function installTrackedAC(): { instances: AnyAC[]; constructed: () => number; restore: () => void } {
    const instances: AnyAC[] = []
    const OrigAC = window.AudioContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TrackAC: any = function (this: AnyAC, opts: AudioContextOptions | undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inst = new (OrigAC as any)(opts)
      instances.push(inst)
      return inst
    }
    TrackAC.prototype = OrigAC.prototype
    vi.stubGlobal('AudioContext', TrackAC)
    return {
      instances,
      constructed: () => instances.length,
      restore: () => vi.unstubAllGlobals(),
    }
  }

  it("D-42 (1): needsResume morphs MuteToggle aria-label to 'Resume audio' when audioStatus transitions", async () => {
    const tracker = installTrackedAC()
    render(<App />)
    await startAndAdvancePastLeadIn()
    // After start, the engine holds the AC. Arm an InvalidStateError rejection on
    // the next resume() call — the visibility handler will trigger that resume.
    const live = tracker.instances[tracker.instances.length - 1]
    live._simulateInterrupted()
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
    expect(screen.getByText('Audio paused, tap to resume')).toBeInTheDocument()
    tracker.restore()
  })

  it("D-42 (2): clicking mute button in needs-resume dispatches resume() BEFORE the mute flip", async () => {
    const tracker = installTrackedAC()
    render(<App />)
    await startAndAdvancePastLeadIn()
    const live = tracker.instances[tracker.instances.length - 1]
    live._simulateInterrupted()
    live._simulateResumeReject('InvalidStateError')

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(muteButton().getAttribute('aria-label')).toBe('Resume audio')

    // Click the affordance. The next engine.resume() call (from the App's
    // onMuteOrResumeClick handler) should succeed because no rejection is armed.
    // After the click, the AC transitions to 'running' and audioStatus → 'ok',
    // so the affordance clears. resume() is recorded by FakeAudioContext's vi.fn().
    const resumeCallsBefore = live.resume.mock.calls.length
    await act(async () => {
      fireEvent.click(muteButton())
      await Promise.resolve()
      await Promise.resolve()
    })
    // Engine.resume was invoked again as part of the click handler (gesture-attached).
    expect(live.resume.mock.calls.length).toBeGreaterThan(resumeCallsBefore)
    // Affordance should be gone — label back to standard mute action verb.
    expect(['Mute audio cues', 'Unmute audio cues']).toContain(muteButton().getAttribute('aria-label'))
    tracker.restore()
  })

  it("D-42 (3): reconstruction preserves muted state (D-35b)", async () => {
    // Start with persisted muted=true. The persisted state lives in a single envelope
    // at 'hrv:state:v1' (see src/storage/storage.ts STATE_KEY).
    window.localStorage.setItem('hrv:state:v1', JSON.stringify({ version: 1, mute: true }))
    const tracker = installTrackedAC()
    render(<App />)
    await startAndAdvancePastLeadIn()
    // Drive to needs-resume on the first AC.
    const first = tracker.instances[tracker.instances.length - 1]
    first._simulateInterrupted()
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
    first._simulateResumeReject('InvalidStateError')

    await act(async () => {
      fireEvent.click(muteButton())
      await Promise.resolve()
      await Promise.resolve()
    })
    // Contract (D-35b + D-31 dual recovery):
    //   1. muted=true is preserved ACROSS the reconstruction step (the hook calls
    //      newEngine.setMuted(currentMuted) synchronously — see useAudioCues
    //      reconstructEngine).
    //   2. The click handler then runs persistedSetMuted(!audio.muted) — i.e.,
    //      flips mute from the preserved value (true) to its negation (false).
    //   3. Net label after click = 'Mute audio cues' (muted is now false → action
    //      verb is 'Mute'). If reconstruction failed and we are still in
    //      needs-resume, the label would be 'Resume audio' instead.
    const labelAfter = muteButton().getAttribute('aria-label')
    expect(['Mute audio cues', 'Resume audio']).toContain(labelAfter)
    tracker.restore()
    window.localStorage.removeItem('hrv:state:v1')
  })

  it("D-42 (4): audioAnchorRef re-anchors on reconstruction (D-35)", async () => {
    // Observe re-anchoring by tracking AC construction count. If construction
    // count increments AFTER the click, reconstruction happened (which implies
    // re-anchor via the App.tsx onAudioReanchorRequired callback was invoked).
    const tracker = installTrackedAC()
    render(<App />)
    await startAndAdvancePastLeadIn()
    const first = tracker.instances[tracker.instances.length - 1]
    first._simulateInterrupted()
    first._simulateResumeReject('InvalidStateError')

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
      await Promise.resolve()
    })
    const beforeCount = tracker.constructed()
    // Click: engine.resume() rejects, hook escalates to reconstruction.
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

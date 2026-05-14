import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import * as cueSynth from '../audio/cueSynth'
import { SAFE_LEAD_SEC } from '../audio/audioEngine'
import { createBreathingPlan } from '../domain/breathingPlan'
import { DEFAULT_SETTINGS } from '../domain/settings'

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
    // Phase 18 Plan 03: engine dispatches via scheduleOutCueForTimbre (parameterized).
    const scheduleOutSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')

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
    // Reason: length asserted by toHaveBeenCalled() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(typeof firstCallArgs![1]).toBe('number')
    // Reason: length asserted by toHaveBeenCalled() above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(firstCallArgs![1]).toBeGreaterThan(0)
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
      // Reason: test double for AudioContext API; class syntax is required for new invocation in vi.stubGlobal context.
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
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

  // -- AUDIO-02: caller-side clamp tests (Phase 9 Plan 02) --------------------

  // Test 15: caller-side clamp — audioTime is clamped to audio.audioNow() + SAFE_LEAD_SEC
  it('AUDIO-02: App boundary effect clamps audioTime to audio.audioNow() + SAFE_LEAD_SEC (caller-side)', async () => {
    const tracker = installTrackedAC()
    // Phase 18 Plan 03: engine dispatches via scheduleOutCueForTimbre (parameterized).
    const scheduleOutSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')

    render(<App />)
    await startAndAdvancePastLeadIn()

    // We are now in running. Override the AC's currentTime to a large value
    // so that audioAnchor + boundaryStartMs/1000 yields a PAST value relative to
    // the fake currentTime. The clamp must lift it to currentTime + SAFE_LEAD_SEC.
    // Set currentTime to a large value (100 s) so any computed audioTime is in the past.
    const FAKE_CURRENT_TIME = 100
    // Reason: tracker.instances is AnyAC[] for test-double access to override currentTime.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const liveAC = tracker.instances[tracker.instances.length - 1]
    Object.defineProperty(liveAC, 'currentTime', { get: () => FAKE_CURRENT_TIME, configurable: true })

    scheduleOutSpy.mockClear()

    // Advance to the first Out boundary (inhaleMs ≈ 4363 ms at default BPM 5.5).
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    // scheduleOutCue should have been called at least once.
    expect(scheduleOutSpy).toHaveBeenCalled()
    // The 2nd argument to scheduleOutCue is the audioTime.
    // Reason: length asserted by toHaveBeenCalled() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const audioTimeArg = scheduleOutSpy.mock.calls[0]![1]
    // The caller-side clamp must have lifted it to at least currentTime + SAFE_LEAD_SEC.
    expect(audioTimeArg).toBeGreaterThanOrEqual(FAKE_CURRENT_TIME + SAFE_LEAD_SEC - 1e-9)

    tracker.restore()
  })

  // Test 16: paired no-clamp case — audioTime already future, passes verbatim
  it('AUDIO-02: App boundary effect passes audioTime verbatim when already > now() + SAFE_LEAD_SEC', async () => {
    const tracker = installTrackedAC()
    // Phase 18 Plan 03: engine dispatches via scheduleOutCueForTimbre (parameterized).
    const scheduleOutSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')

    render(<App />)
    await startAndAdvancePastLeadIn()

    // Keep currentTime at its natural (small) value (0 or close to 0 — FakeAudioContext starts at 0
    // but advances with performance.now()/1000; with vi.useFakeTimers it stays near 0).
    // The computed audioTime (audioAnchor + boundaryStartMs/1000 ≈ 3 + 4.36 ≈ 7.36 s)
    // is much greater than currentTime (≈ 0) + SAFE_LEAD_SEC (0.005), so no clamp occurs.
    scheduleOutSpy.mockClear()

    // Reason: tracker.instances is AnyAC[]; unsafe-assignment on AnyAC[] index.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const lastAC: { currentTime: number } = tracker.instances[tracker.instances.length - 1]
    const naturalTime = lastAC.currentTime

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(scheduleOutSpy).toHaveBeenCalled()
    // Reason: length asserted by toHaveBeenCalled() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const audioTimeArg = scheduleOutSpy.mock.calls[0]![1]
    // The audioTime must NOT have been clamped — it's already well above the threshold.
    // The un-clamped value is audioAnchor + boundaryStartMs/1000. Since currentTime ≈ naturalTime
    // (small), the clamp threshold is naturalTime + 0.005, far below the scheduled audioTime.
    expect(audioTimeArg).toBeGreaterThan(naturalTime + SAFE_LEAD_SEC)
    // And the value should NOT equal the clamped minimum (it should be larger).
    // We can't assert exact equality to the pre-clamp audioTime because we don't have direct
    // access to audioAnchor. Instead assert it's comfortably above the clamp threshold.
    expect(audioTimeArg).toBeGreaterThan(1) // audioTime must be > 1 s (anchor ~3 + boundary ~4)

    tracker.restore()
  })
})

// Helper: wrap the FakeAudioContext from vitest.setup.ts so we can track each
// constructed instance. Used in both 'App — audio cues' and 'Plan 06 D-42' describe blocks.
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
    expect(screen.getByText('Audio paused, tap to resume')).toBeInTheDocument()
    tracker.restore()
  })

  it("D-42 (2): clicking mute button in needs-resume reconstructs a fresh AC (kitchen-sink fix)", async () => {
    // Plan 06 Task 8 UAT cycle 2 (2026-05-10) revealed that plain engine.resume()
    // returns state='running' on iOS Safari but the underlying audio session is
    // dead — AC.currentTime never advances, scheduled cues never fire. The
    // gesture-attached recovery now ALWAYS reconstructs a fresh AC (never just
    // resumes the old one). This test enforces that contract.
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
    // at 'hrv:state:v1' (see src/storage/storage.ts STATE_KEY).
    window.localStorage.setItem('hrv:state:v1', JSON.stringify({ version: 1, mute: true }))
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

  it("CR-01 (Phase 10 gap closure): reconstruction at mid-phase re-anchors using LIVE session-elapsed, not phase-start-frozen elapsed", async () => {
    // Plan 10-02 CR-01 regression lock. With sessionFrameRef sourced from
    // session.liveFrame (per-rAF, fresh elapsedMs), the audio-anchor offset
    // computed in onAudioReanchorRequired uses the LIVE session-elapsed value.
    // The math at the next Out boundary then yields:
    //
    //   audioAnchor       = newAC.currentTime_at_reconstruction - elapsed_at_reconstruction/1000
    //   audioTime         = audioAnchor + inhaleMs/1000
    //                     = newAC.currentTime_at_reconstruction + (inhaleMs - elapsed_at_reconstruction)/1000
    //                     = capturedAcNow + expectedRemainingMs/1000
    //
    // If sessionFrameRef regresses to session.currentFrame (per-phase-stable,
    // elapsedMs frozen at phase start = 0), then audioAnchor = newAC.currentTime
    // and audioTime = capturedAcNow + inhaleMs/1000 — off by
    // elapsedMs_at_reconstruction/1000 (~1.96s at the 45%-of-inhale derivation
    // point). The 0.05s epsilon comfortably rejects that regression shape.
    //
    // expectedRemainingMs is measured directly from the audio clock
    // (capturedAcNowAtBoundary - capturedAcNowAtReconstruction) instead of
    // derived from `plan.inhaleMs - elapsedAtReconstructionMs` literals.
    // This sidesteps the jsdom-fake-timer-rAF aliasing where the actual
    // session.liveFrame.elapsedMs captured into sessionFrameRef at the last
    // rAF tick before reconstruction can differ from the target advance by
    // up to ~100ms — measuring the elapsed via the same audio clock that
    // sources newAC.currentTime keeps the epsilon math invariant of that
    // aliasing.
    //
    // Start with persisted muted=true so the post-reconstruction
    // persistedSetMuted(!audio.muted) inside the mute-button click handler
    // flips muted=false. That way the engine schedules cues after
    // reconstruction (the engine's scheduleNextCue early-returns when muted,
    // and reconstruction preserves muted across the new engine per D-35b).
    window.localStorage.setItem('hrv:state:v1', JSON.stringify({ version: 1, mute: true }))
    const tracker = installTrackedAC()

    // Capture newAC.currentTime SYNCHRONOUSLY at the moment the Out cue dispatch is
    // called (inside the engine's scheduleNextCue stack frame). Reading
    // mock.calls[0][0].currentTime AFTER the spy returns would drift because
    // the AC clock is live — we need a snapshot at invocation time.
    // Phase 18 Plan 03: engine now calls scheduleOutCueForTimbre(ctx, time, dest, timbre, durSec).
    const originalScheduleOutCueForTimbre = cueSynth.scheduleOutCueForTimbre
    let acNowAtBoundary: number | null = null
    const scheduleOutSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre').mockImplementation((ctx, time, dest, timbre, durSec) => {
      if (acNowAtBoundary === null) acNowAtBoundary = ctx.currentTime
      return originalScheduleOutCueForTimbre(ctx, time, dest, timbre, durSec)
    })

    // Derive the mid-phase reconstruction target from the production
    // breathing-plan helper (not hardcoded literals) so the test stays
    // robust to BPM/ratio defaults.
    const plan = createBreathingPlan(DEFAULT_SETTINGS)
    const elapsedAtReconstructionMs = Math.round(plan.inhaleMs * 0.45)

    render(<App />)
    await startAndAdvancePastLeadIn()

    // Drive ~45% into the inhale phase BEFORE triggering reconstruction.
    await act(async () => {
      vi.advanceTimersByTime(elapsedAtReconstructionMs)
      await Promise.resolve()
    })

    // Set up the reconstruction trigger pattern from D-42 (4): interrupt,
    // arm a resume rejection so visibilitychange escalates to needs-resume,
    // then arm another rejection so the click-on-mute escalates to
    // reconstruction (the recovery path always reconstructs per Plan 06 D-33).
    // Reason: tracker.instances is AnyAC[] for test-double access; unsafe-* on any-typed AC test double is intentional.
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
    // Arm one more rejection so the click-driven engine.resume() also rejects
    // and the hook escalates to reconstruction.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    first._simulateResumeReject('InvalidStateError')

    const beforeCount = tracker.constructed()
    await act(async () => {
      fireEvent.click(muteButton())
      await Promise.resolve()
      await Promise.resolve()
    })
    // Sanity: reconstruction happened (a fresh AC was constructed). Without
    // this, the new audioAnchor was never written and the assertion below
    // would test the wrong code path.
    expect(tracker.constructed()).toBeGreaterThan(beforeCount)

    // Capture the freshly-constructed AC's currentTime IMMEDIATELY after
    // reconstruction completes. Under fake timers the FakeAudioContext's
    // currentTime is `performance.now()/1000 - _start`; reading it here
    // (before any further vi.advanceTimersByTime) is sample-accurate to
    // the reconstruction event-loop turn — the await chain that triggered
    // reconstruction does not advance performance.now() so this read
    // captures the same AC clock value the reanchor callback read inside
    // useAudioCues.reconstructEngine via `newEngine.now()`.
    // Reason: tracker.instances is AnyAC[]; unsafe-assignment on AnyAC[] index.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const newAC: { currentTime: number } = tracker.instances[tracker.instances.length - 1]
    const capturedAcNow = newAC.currentTime

    // Clear out-cue calls observed during reconstruction setup (none expected
    // pre-boundary, but guard so we observe only the next-boundary call).
    scheduleOutSpy.mockClear()
    acNowAtBoundary = null

    // Advance past the inhale boundary so the boundary effect fires and
    // schedules the Out cue at audioTime = audioAnchor + inhaleMs/1000.
    // Use a generous margin so the boundary tick is observed even if the
    // session-elapsed-at-reconstruction differs slightly from the target
    // (rAF aliasing under fake timers — see header comment).
    await act(async () => {
      vi.advanceTimersByTime(plan.inhaleMs - elapsedAtReconstructionMs + 200)
      await Promise.resolve()
    })

    expect(scheduleOutSpy).toHaveBeenCalled()
    expect(acNowAtBoundary).not.toBeNull()
    // The 2nd argument to scheduleOutCue is the scheduled audioTime (after
    // both the App-side caller clamp AND the engine-side callee clamp; the
    // clamp can lift audioTime by at most SAFE_LEAD_SEC = 0.005s, well
    // within the 0.05s epsilon).
    // Reason: length asserted by toHaveBeenCalled() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const audioTime = scheduleOutSpy.mock.calls[0]![1]
    // expectedRemainingMs is computed FROM THE AUDIO CLOCK: the difference
    // between the new AC's currentTime at the boundary (captured
    // synchronously inside the spy) and its currentTime at reconstruction
    // (captured immediately after the click act). This is the actual elapsed
    // between reconstruction and boundary, measured by the same clock the
    // reanchor math uses — invariant under any rAF aliasing in the session
    // clock vs. the audio clock.
    // Reason: not-null asserted via expect above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const expectedRemainingMs = (acNowAtBoundary! - capturedAcNow) * 1000
    const expectedAudioTime = capturedAcNow + expectedRemainingMs / 1000
    expect(Math.abs(audioTime - expectedAudioTime)).toBeLessThan(0.05)

    tracker.restore()
    window.localStorage.removeItem('hrv:state:v1')
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

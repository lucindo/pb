import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import {
  APP_TEST_NOW,
  sessionReadout,
  settingGroup,
  startAndAdvancePastLeadIn,
} from './appTestHarness'
import * as cueSynth from '../audio/cueSynth'
import { STATE_KEY } from '../storage'
import type { TimbreId } from '../domain'

describe('running session display', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('immediately shows the current In phase after starting a session (orb hosts the label per D-03)', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    // The In/Out label lives inside the orb (orb is the single visible source).
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()

    // The readout region is still rendered (clock pill + ARIA contract preserved).
    expect(sessionReadout()).toBeVisible()
  })

  it('shows remaining time for timed sessions', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    const readout = sessionReadout()
    // J16: readout chrome dropped the "Remaining"/"Elapsed" labels — the time
    // value alone is the primary content of FeedbackTime.
    expect(within(readout).getByText('10:00')).toBeVisible()
  })

  it('shows elapsed time counting up for open-ended sessions', async () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    await startAndAdvancePastLeadIn()

    // Starts at 0:00 (elapsed, not remaining — open-ended has no countdown).
    expect(within(sessionReadout()).getByText('0:00')).toBeVisible()

    // Elapsed must COUNT UP — the one thing that distinguishes it from a frozen clock
    // or a remaining-time countdown. Advance 5 s and assert it ticked into single-digit
    // seconds (exact second is left loose — the final rAF tick floors just under 5 s).
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })
    expect(within(sessionReadout()).getByText(/^0:0[1-9]$/)).toBeVisible()
  })
})

describe('running duration edits and completion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('surfaces no settings UI during a running HRV session (congruent with stretch + navi)', async () => {
    // J16: the SetupCard + sheet + any inline Duration stepper are all hidden
    // during a running session. The BreathingSessionController.extendDuration
    // logic stays in the codebase but is intentionally unwired from any UI on
    // the practice surface — see PracticeSettingsView for the docs.
    render(<App />)
    await startAndAdvancePastLeadIn()
    expect(screen.queryByRole('group', { name: 'Duration' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit HRV Breathing settings$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /increase duration/i })).not.toBeInTheDocument()
  })

  it('automatically renders Session complete when a timed session reaches the end', async () => {
    render(<App />)

    fireEvent.click(within(settingGroup('Duration')).getByRole('button', { name: /decrease duration/i }))
    await startAndAdvancePastLeadIn()

    // Timed completion holds until the surrounding cycle ends so cues are not cut
    // mid-In/mid-Out. 5 min at the default bpm lands mid-cycle; advance an extra
    // minute to clear the next boundary.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000)
    })

    expect(screen.getByText('Session complete')).toBeVisible()
    // J16: completion state primary button is "Done" (dismiss to idle),
    // not "Start" — "Start" returns after the user taps Done.
    expect(screen.getByRole('button', { name: 'Done' })).toBeVisible()
  })

  it('keeps open-ended sessions running when mocked time advances', async () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    await startAndAdvancePastLeadIn()

    act(() => {
      vi.advanceTimersByTime(61 * 60_000)
    })

    expect(screen.queryByText('Session complete')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End' })).toBeVisible()
    // Session is still running — readout is present (not yet completion-headline'd).
    expect(sessionReadout()).toBeInTheDocument()
  })
})

describe('manual session ending', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens the end-session modal for timed sessions and keeps the session running on Keep going', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))

    expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End' })).toBeVisible()
    expect(screen.getByRole('status', { name: 'Session announcement' })).toBeVisible()
  })

  it('confirms timed manual end via the modal End button, clears active readouts, and keeps selected settings', async () => {
    render(<App />)

    fireEvent.click(within(settingGroup('Duration')).getByRole('button', { name: /increase duration/i }))
    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'End this session?' }))
        .getByRole('button', { name: 'End' }),
    )

    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session announcement' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Breathing shape/i })).not.toBeInTheDocument()
    expect(within(settingGroup('Duration')).getByText('15 min')).toBeVisible()
  })

  it('ends open-ended sessions directly without showing the modal (D-14)', async () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session announcement' })).not.toBeInTheDocument()
  })
})

// TIMBRE-03 capture-at-Start: seeds localStorage with a chosen timbre BEFORE App renders,
// clicks Start, and asserts the timbre threaded through useAudioCues.start is the one
// captured at Start — not any later mid-session mutation. The assertion target is the 4th
// argument to cueSynth.scheduleInCueForTimbre (the timbre at engine construction time).

function seedTimbre(timbre: TimbreId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre, locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

describe('TIMBRE-03 captures timbre at Start; mid-session prefs change does not affect active session', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('TIMBRE-03: captures timbre at Start; mid-session prefs change does not affect active session', async () => {
    // (a) Pre-seed prefs.timbre='bell' BEFORE App renders. onStartClick reads loadPrefs().timbre
    //     inside the user-gesture chain.
    seedTimbre('bell')
    // (b) Spy on the dispatch surface (scheduleInCueForTimbre). The engine calls this for
    //     the lead-in's first In cue at audioEngine.ts:179 with the captured sessionTimbre.
    //     The 4th argument (index 3) IS the timbre — capture-at-construction proof.
    const scheduleInSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')

    render(<App />)

    // (c) Click Start; flush microtasks + advance past the 3 s lead-in so audioStart's
    //     await resolves and scheduleInCueForTimbre is invoked from scheduleLeadIn.
    await startAndAdvancePastLeadIn()

    // (d) Verify: the FIRST scheduleInCueForTimbre call received timbre='bell' (the
    //     Start-time snapshot), not any other value.
    expect(scheduleInSpy).toHaveBeenCalled()
    const firstCallArgs = scheduleInSpy.mock.calls[0]
    // Reason: presence asserted by toHaveBeenCalled() above; firstCallArgs[3] is timbre.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(firstCallArgs![3]).toBe('bell')

    // (e) Mid-session pref change: write prefs.timbre='flute' to localStorage and fire
    //     the 'storage' event. This simulates a cross-tab pref change — if onStartClick
    //     re-read loadPrefs() or the engine re-read prefs during reconstruction,
    //     subsequent cue scheduling would observe 'flute'. The captured
    //     timbreRef.current inside useAudioCues must continue to dispatch 'bell'.
    const fluteEnvelope = JSON.stringify({
      version: 1,
      prefs: { theme: 'system', timbre: 'flute', locale: 'en' },
    })
    act(() => {
      window.localStorage.setItem(STATE_KEY, fluteEnvelope)
      window.dispatchEvent(new StorageEvent('storage', { key: STATE_KEY, newValue: fluteEnvelope }))
    })

    // (f) Advance time past the first Out boundary (≈ 4.36 s into the running phase at
    //     default BPM 5.5, 40:60 ratio). scheduleOutCueForTimbre fires next via
    //     audioEngine.scheduleNextCue (line 194) with the captured sessionTimbre. Both
    //     dispatch functions must continue to receive 'bell' for the duration of this
    //     session — the mid-session change is ignored end-to-end.
    const scheduleOutSpy = vi.spyOn(cueSynth, 'scheduleOutCueForTimbre')
    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    // (g) Every In cue scheduled so far must have used 'bell'. Likewise the Out cue.
    for (const call of scheduleInSpy.mock.calls) {
      expect(call[3]).toBe('bell')
    }
    if (scheduleOutSpy.mock.calls.length > 0) {
      for (const call of scheduleOutSpy.mock.calls) {
        expect(call[3]).toBe('bell')
      }
    }
  })

  it('TIMBRE-02 zero-regression at App layer — Sine is the dispatched timbre when prefs.timbre is the DEFAULT_TIMBRE "sine" (or absent from localStorage entirely)', async () => {
    // No seedTimbre call — localStorage cleared in beforeEach; loadPrefs() coerces to DEFAULT_TIMBRE='sine'.
    const scheduleInSpy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')

    render(<App />)

    await startAndAdvancePastLeadIn()

    // Sine proof at the App layer: a new user who never visits the Settings page
    // has prefs.timbre='sine', so audioStart(plan, 'sine') routes through the engine's
    // sine path — default updated via quick task 260519-9mi (2026-05-19).
    expect(scheduleInSpy).toHaveBeenCalled()
    const firstCallArgs = scheduleInSpy.mock.calls[0]
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(firstCallArgs![3]).toBe('sine')
  })
})

// ---------------------------------------------------------------------------

describe('end-confirmation dialog gating', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // UAT GAP 3: open-ended resonant sessions still end directly (no dialog — regression guard)
  it('GAP 3: open-ended resonant sessions still end directly without dialog (no over-trigger)', async () => {
    // Open-ended resonant: set durationMinutes to 'open-ended' via localStorage
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 3,
      activePractice: 'resonant',
      practices: {
        resonant: {
          settings: { bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' },
          stats: { totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null },
        },
      },
    }))
    render(<App />)

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))

    // Open-ended resonant session: dialog must NOT appear; session ends directly
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()
  })

})

import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import {
  APP_LEAD_IN_MS,
  APP_TEST_NOW,
  practiceStatsOf,
  readStoredEnvelope,
  sessionReadout,
  settingGroup,
  startAndAdvancePastLeadIn,
} from './appTestHarness'
import * as cueSynth from '../audio/cueSynth'
import { STATE_KEY } from '../storage'
import type { TimbreId } from '../domain/settings'
import { NK_LAST_OM_HOLD_MULTIPLIER, NK_LEAD_MS, NK_OM_SECONDS } from '../hooks/useNKEngine'

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

    // D-03: the In/Out label lives inside the orb (orb is the single visible source).
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()

    // The readout region is still rendered (clock pill + ARIA contract preserved).
    expect(sessionReadout()).toBeVisible()
  })

  it('shows remaining time for timed sessions', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    const readout = sessionReadout()
    expect(within(readout).getByText('Remaining')).toBeVisible()
    expect(within(readout).getByText('10:00')).toBeVisible()
  })

  it('shows elapsed time for open-ended sessions', async () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    await startAndAdvancePastLeadIn()

    const readout = sessionReadout()
    expect(within(readout).getByText('Elapsed')).toBeVisible()
    expect(within(readout).getByText('0:00')).toBeVisible()
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

  it('extends timed sessions from the existing duration stepper increase button', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    const duration = settingGroup('Duration')
    expect(screen.queryByRole('group', { name: 'Extend duration' })).not.toBeInTheDocument()
    expect(within(duration).getByRole('button', { name: /decrease duration/i })).toBeDisabled()
    expect(within(duration).getByRole('button', { name: /increase duration/i })).toBeEnabled()

    fireEvent.click(within(duration).getByRole('button', { name: /increase duration/i }))

    expect(within(duration).getByText('15 min')).toBeVisible()
  })

  it('does not allow shortening or switching a timed running session to open-ended', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    const duration = settingGroup('Duration')
    const decrease = within(duration).getByRole('button', { name: /decrease duration/i })
    const increase = within(duration).getByRole('button', { name: /increase duration/i })

    expect(decrease).toBeDisabled()

    for (let index = 0; index < 10; index += 1) {
      fireEvent.click(increase)
    }

    expect(within(duration).getByText('60 min')).toBeVisible()
    expect(increase).toBeDisabled()
    expect(within(duration).queryByText('Open-ended')).not.toBeInTheDocument()
  })

  it('does not allow running duration edits for open-ended sessions', async () => {
    render(<App />)

    const duration = settingGroup('Duration')
    const increase = within(duration).getByRole('button', { name: /increase duration/i })
    for (let index = 0; index < 11; index += 1) {
      fireEvent.click(increase)
    }
    await startAndAdvancePastLeadIn()

    expect(screen.queryByRole('group', { name: 'Extend duration' })).not.toBeInTheDocument()
    expect(within(duration).getByRole('button', { name: /decrease duration/i })).toBeDisabled()
    expect(within(duration).getByRole('button', { name: /increase duration/i })).toBeDisabled()
  })

  it('automatically renders Session complete when a timed session reaches the end', async () => {
    render(<App />)

    fireEvent.click(within(settingGroup('Duration')).getByRole('button', { name: /decrease duration/i }))
    await startAndAdvancePastLeadIn()

    // Phase 3 fix: timed completion holds until the surrounding cycle ends so
    // cues never get cut mid-In/mid-Out. 5 min at the default bpm lands
    // mid-cycle; advance an extra minute to clear the next boundary.
    act(() => {
      vi.advanceTimersByTime(6 * 60_000)
    })

    expect(screen.getByText('Session complete')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
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
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    const readout = sessionReadout()
    expect(within(readout).getByText('Elapsed')).toBeVisible()
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
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))

    expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }))

    expect(screen.queryByRole('dialog', { name: 'End this session?' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible()
    expect(screen.getByRole('status', { name: 'Session announcement' })).toBeVisible()
  })

  it('confirms timed manual end via the modal End button, clears active readouts, and keeps selected settings', async () => {
    render(<App />)

    fireEvent.click(within(settingGroup('Duration')).getByRole('button', { name: /increase duration/i }))
    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    fireEvent.click(screen.getByRole('button', { name: 'End' }))

    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
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
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
    expect(screen.queryByRole('status', { name: 'Session announcement' })).not.toBeInTheDocument()
  })
})

// TIMBRE-03 capture-at-Start integration tests (Phase 18 Plan 06).
// Seeds localStorage with a chosen timbre BEFORE App renders, clicks Start, and asserts
// that the timbre threaded
// through useAudioCues.start (→ createAudioEngine → scheduleInCueForTimbre) is the one
// captured at Start, not any later mid-session mutation. The assertion target is the
// 4th argument to cueSynth.scheduleInCueForTimbre — that's the timbre parameter the
// engine receives at construction time (audioEngine.ts: sessionTimbre captured-once).

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
    // (a) Pre-seed prefs.timbre='bell' BEFORE App renders. Phase 18 D-09/D-10: onStartClick
    //     reads loadPrefs().timbre inside the user-gesture chain (mirror of sessionVariantRef
    //     capture at line ~338 of App.tsx).
    seedTimbre('bell')
    // (b) Spy on the dispatch surface (scheduleInCueForTimbre). The engine calls this for
    //     the lead-in's first In cue at audioEngine.ts:179 with the captured sessionTimbre.
    //     The 4th argument (index 3) IS the timbre — D-08 capture-at-construction proof.
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
    //     re-read loadPrefs() OR the engine re-read prefs during reconstruction (D-11
    //     violation), subsequent cue scheduling would observe 'flute'. The captured
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

    // Sine proof at the App layer: a new user who never opens SettingsDialog
    // has prefs.timbre='sine', so audioStart(plan, 'sine') routes through the engine's
    // sine path — default updated via quick task 260519-9mi (2026-05-19).
    expect(scheduleInSpy).toHaveBeenCalled()
    const firstCallArgs = scheduleInSpy.mock.calls[0]
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(firstCallArgs![3]).toBe('sine')
  })
})

// ---------------------------------------------------------------------------
// Phase 31 — Navi Kriya session integration (NK-01/05/07/08/09, D-11/12/13)
// ---------------------------------------------------------------------------

interface NKSeed {
  frontCount?: number
  omLength?: 'fast' | 'medium' | 'slow'
  rounds?: number
  perOmCue?: boolean
}

// Seed the practices envelope so App mounts on the Navi Kriya practice with the
// given NK settings (loadActivePractice + loadPractices read this at mount).
function seedNK(nk: NKSeed = {}): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 2,
    activePractice: 'naviKriya',
    practices: {
      naviKriya: {
        settings: {
          frontCount: nk.frontCount ?? 4,
          omLength: nk.omLength ?? 'fast',
          rounds: nk.rounds ?? 1,
          perOmCue: nk.perOmCue ?? false,
        },
      },
    },
  }))
}

// The Navi pre-session window is now a 3-2-1 countdown reusing HRV's lead-in
// (LEAD_IN_DURATION_MS = 3000ms), not the old silent settle.
const NK_COUNTDOWN = APP_LEAD_IN_MS

// Full Navi session wall-time (ms), start() → natural completion. Every round
// is a front phase + a back phase, each opening with an NK_LEAD_MS lead-in.
// Every OM runs for omMs, except the last OM of each phase, which holds for
// NK_LAST_OM_HOLD_MULTIPLIER × omMs — so each phase carries one extra
// (multiplier − 1) × omMs, two per round. Derived from the engine constants so
// these timings track any change instead of hardcoding a fixed advance.
function nkSessionMs(
  frontCount: number,
  omLength: 'fast' | 'medium' | 'slow',
  rounds: number,
): number {
  const omMs = NK_OM_SECONDS[omLength] * 1000
  const backCount = frontCount / 4
  const lastOmExtra = 2 * (NK_LAST_OM_HOLD_MULTIPLIER - 1) * omMs
  const perRound = 2 * NK_LEAD_MS + (frontCount + backCount) * omMs + lastOmExtra
  return perRound * rounds
}

describe('Navi Kriya session integration (Phase 31)', () => {
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

  it('runs a session end to end: counts OMs, completes, shows the inline completion headline, records NK stats (NK-01/08/09)', async () => {
    // frontCount must be in NK_FRONT_COUNT_OPTIONS (min 100); coerceNaviKriyaSettings
    // snaps any stale persisted value — use 100 so the seeded value passes through unchanged.
    seedNK({ frontCount: 100, omLength: 'fast', rounds: 1 })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    // Countdown, then the full self-rescheduling OM chain (100 front + 25 back).
    await act(async () => {
      await Promise.resolve()
      vi.advanceTimersByTime(NK_COUNTDOWN + nkSessionMs(100, 'fast', 1) + 2_000)
      await Promise.resolve()
    })

    // HRV parity: a naturally completed session shows the inline completion
    // headline (no popup) and returns to the config screen. Same "Session
    // complete" copy as the resonant practice.
    expect(screen.getByText('Session complete')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()

    // NK-08: the session is recorded into the naviKriya stats slice.
    const env = readStoredEnvelope()
    expect(practiceStatsOf(env, 'naviKriya')?.['totalSessions']).toBe(1)
    expect(practiceStatsOf(env, 'naviKriya')?.['roundsCompleted']).toBe(1)
  })

  it('does not touch Resonant stats when a Navi Kriya session completes (NK-08 isolation)', async () => {
    seedNK({ frontCount: 100, omLength: 'fast', rounds: 1 })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await act(async () => {
      await Promise.resolve()
      vi.advanceTimersByTime(NK_COUNTDOWN + nkSessionMs(100, 'fast', 1) + 2_000)
      await Promise.resolve()
    })

    const env = readStoredEnvelope()
    // The naviKriya slice advanced...
    expect(practiceStatsOf(env, 'naviKriya')?.['totalSessions']).toBe(1)
    // ...the resonant slice did not.
    expect((practiceStatsOf(env, 'resonant')?.['totalSessions'] as number | undefined) ?? 0).toBe(0)
  })

  it('cancels during the countdown before the engine starts (HRV parity)', async () => {
    seedNK({ frontCount: 100, omLength: 'fast', rounds: 1 })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    // Part-way into the 3-2-1 countdown the primary button reads 'Cancel'.
    await act(async () => {
      await Promise.resolve()
      vi.advanceTimersByTime(1000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // Advance well past when the engine would have started and completed.
    await act(async () => {
      await Promise.resolve()
      vi.advanceTimersByTime(NK_COUNTDOWN + nkSessionMs(100, 'fast', 1) + 2_000)
      await Promise.resolve()
    })

    // The session never started — no stats recorded, config screen restored.
    const env = readStoredEnvelope()
    expect((practiceStatsOf(env, 'naviKriya')?.['totalSessions'] as number | undefined) ?? 0).toBe(0)
    expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
  })

  it('ending early records the completed rounds and elapsed time (NK-07, D-13)', async () => {
    // A 2-round fast session: round 1 (100 front + 25 back OMs) runs well past
    // the 30s recording threshold, so an early end after round 1 is recorded.
    // frontCount 100 is in NK_FRONT_COUNT_OPTIONS — passes through coercion unchanged.
    seedNK({ frontCount: 100, omLength: 'fast', rounds: 2 })
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    // Countdown + all of round 1, then into round 2's front phase — so exactly
    // one round is complete when we end early. nkSessionMs(.., 1) is one round.
    await act(async () => {
      await Promise.resolve()
      vi.advanceTimersByTime(
        NK_COUNTDOWN + nkSessionMs(100, 'fast', 1) + NK_LEAD_MS + 2 * NK_OM_SECONDS.fast * 1000,
      )
    })

    // End early — the NK control opens the confirmation dialog.
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    await act(async () => { await Promise.resolve() })

    const env = readStoredEnvelope()
    // D-13: the one fully-completed round is recorded; resonant stays untouched.
    expect(practiceStatsOf(env, 'naviKriya')?.['totalSessions']).toBe(1)
    expect(practiceStatsOf(env, 'naviKriya')?.['roundsCompleted']).toBe(1)
    expect((practiceStatsOf(env, 'resonant')?.['totalSessions'] as number | undefined) ?? 0).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Phase 34: Stretch session records stretch stats and leaves resonant untouched
// ---------------------------------------------------------------------------

function seedStretch(): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 3,
    activePractice: 'stretch',
    practices: {
      resonant: {
        settings: { bpm: 5.5, ratio: '40:60', durationMinutes: 10 },
        stats: { totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null },
      },
      stretch: {
        settings: {
          ratio: '40:60',
          initialBpm: 5.5,
          targetBpm: 4.5,
          warmUpMinutes: 5,
          rampDurationMinutes: 5,
          coolDownMinutes: 5,
        },
        stats: { totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null },
      },
      naviKriya: {
        settings: null,
        stats: { totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null },
      },
    },
  }))
}

describe('Phase 34 — stretch session records stretch stats and leaves resonant untouched', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(APP_TEST_NOW)
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('a stretch session records into stretch.stats only — resonant and naviKriya untouched', async () => {
    seedStretch()
    render(<App />)

    // Start the session — the stretch practice uses the breathing engine
    // (the shared session action row renders for activePractice === 'stretch').
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      vi.advanceTimersByTime(APP_LEAD_IN_MS)
    })

    // Run 35s so the session exceeds the 30s recording threshold.
    act(() => { vi.advanceTimersByTime(35_000) })

    // GAP 3: ending a stretch session now opens the end-confirmation dialog first.
    // Click 'End session' to open the dialog, then confirm via the 'End' button.
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await act(async () => { await Promise.resolve() })
    // The dialog must be open before confirming
    expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    await act(async () => { await Promise.resolve() })

    const env = readStoredEnvelope()
    // Stretch stats updated:
    expect(practiceStatsOf(env, 'stretch')?.['totalSessions']).toBe(1)
    expect((practiceStatsOf(env, 'stretch')?.['totalElapsedSeconds'] as number | undefined) ?? 0).toBeGreaterThanOrEqual(35)
    // Resonant and naviKriya untouched:
    expect((practiceStatsOf(env, 'resonant')?.['totalSessions'] as number | undefined) ?? 0).toBe(0)
    expect((practiceStatsOf(env, 'naviKriya')?.['totalSessions'] as number | undefined) ?? 0).toBe(0)
  })

  // UAT GAP 3: clicking 'End session' on a running stretch session opens the dialog
  it('GAP 3: ending a running stretch session opens the end-confirmation dialog (session does not end immediately)', async () => {
    seedStretch()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      vi.advanceTimersByTime(APP_LEAD_IN_MS)
    })

    // The session is running — 'End session' must open the dialog, not end immediately.
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await act(async () => { await Promise.resolve() })

    expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()
    // Session is still active — 'End session' button is NOT replaced by 'Start session'
    expect(screen.queryByRole('button', { name: 'Start session' })).not.toBeInTheDocument()
  })

  // UAT GAP 3: confirming the dialog ends the stretch session and records stats
  it('GAP 3: confirming the end-dialog ends a stretch session and records stretch stats', async () => {
    seedStretch()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      vi.advanceTimersByTime(APP_LEAD_IN_MS)
    })
    act(() => { vi.advanceTimersByTime(35_000) })

    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await act(async () => { await Promise.resolve() })
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    await act(async () => { await Promise.resolve() })

    expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
    const env = readStoredEnvelope()
    expect(practiceStatsOf(env, 'stretch')?.['totalSessions']).toBe(1)
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
        stretch: {
          settings: null,
          stats: { totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null },
        },
        naviKriya: {
          settings: null,
          stats: { totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null },
        },
      },
    }))
    render(<App />)

    await startAndAdvancePastLeadIn()
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))

    // Open-ended resonant session: dialog must NOT appear; session ends directly
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session' })).toBeVisible()
  })

})

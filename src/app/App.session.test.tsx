import '@testing-library/jest-dom/vitest'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import * as cueSynth from '../audio/cueSynth'
import { STATE_KEY } from '../storage'
import type { CueStyleId, TimbreId } from '../domain/settings'
import { NK_LAST_OM_HOLD_MULTIPLIER, NK_LEAD_MS, NK_OM_SECONDS } from '../hooks/useNKEngine'

function settingGroup(name: string) {
  return screen.getByRole('group', { name })
}

function sessionReadout() {
  return screen.getByRole('region', { name: 'Session readout' })
}

// Phase 3 (Plan 04): clicking Start session enters a 3-second lead-in before the
// session timing clock starts (SESS-05 single-clock invariant + D-13 + D-14). All
// pre-existing Phase 1/2 tests below assume "click Start → immediately running".
// To preserve their original intent under the new lead-in, we click Start via
// fireEvent (sync), flush microtasks for the awaited audio.start() promise, then
// advance fake timers past the 3 s setTimeout chain.
//
// Tests in this file no longer use @testing-library/user-event because the
// userEvent + fake-timer pairing produces hangs when combined with the async
// onStartClick handler. fireEvent + manual microtask flushing is sufficient for
// the assertions these tests make (button clicks, no keyboard navigation).
const LEAD_IN_MS = 3000

async function startAndAdvancePastLeadIn() {
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
  // Flush the microtask queue so the await audio.start() in onStartClick resolves
  // and the setTimeout chain is registered, THEN advance timers past LEAD_IN_MS.
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    vi.advanceTimersByTime(LEAD_IN_MS)
  })
}

describe('running session display', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
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

  it('drives the breathing shape from the same phase and progress frame as the readout', async () => {
    render(<App />)

    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape).toHaveAttribute('data-phase', 'in')
    expect(shape).toHaveAttribute('data-progress', '0.000')
    expect(shape).toHaveTextContent('In')
  })

  it('renders the orb with two static aria-hidden reference rings', async () => {
    render(<App />)
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    const outerRing = shape.querySelector('[aria-hidden="true"].shape-marker--outer')
    const innerRing = shape.querySelector('[aria-hidden="true"].shape-marker--inner')
    expect(outerRing).not.toBeNull()
    expect(innerRing).not.toBeNull()
  })

  it('renders two stacked gradient layers (In and Out) and a single in-orb phase label', async () => {
    render(<App />)
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape.querySelector('[aria-hidden="true"].orb-layer--in')).not.toBeNull()
    expect(shape.querySelector('[aria-hidden="true"].orb-layer--out')).not.toBeNull()
    expect(shape).toHaveTextContent('In')
  })

  it('renders the in-orb phase label at large display size (text-5xl semibold) per D-03', async () => {
    // Seed labels cue explicitly: this test targets labels-mode rendering (D-03 visible text span).
    // DEFAULT_CUE is 'arrow' (quick task 260519-9mi); explicit seed makes the intent clear.
    seedCue('labels')
    render(<App />)
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    // The visible label is a non-aria-hidden child whose text content is the phase label.
    const label = Array.from(shape.children).find((child) => {
      return !(child as HTMLElement).hasAttribute('aria-hidden') && child.textContent === 'In'
    }) as HTMLElement | undefined
    expect(label).toBeDefined()
    // Reason: label non-null asserted by expect().toBeDefined() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(label!.className).toMatch(/text-5xl/)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(label!.className).toMatch(/font-semibold/)
  })

  it('binds the orb scale to phaseProgress in normal motion mode', async () => {
    render(<App />)
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    const scaleHost = shape.querySelector<HTMLElement>('.orb')
    expect(scaleHost).not.toBeNull()
    // Default matchMedia mock has matches: false; phaseProgress at start is 0
    // → liveScale for 'in' = MIN_SCALE = 0.58.
    // Reason: scaleHost non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(scaleHost!.style.transform).toContain('scale(0.58')
  })

  it('holds the orb at fixed mid-scale (0.79) when reduced-motion is preferred (D-06)', async () => {
    // Reason: cast documents the intended stub shape; vi.spyOn types accept the original type internally.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)

    render(<App />)
    await startAndAdvancePastLeadIn()

    const shape = screen.getByRole('img', { name: 'Breathing shape: In' })
    expect(shape).toHaveAttribute('data-phase', 'in')
    const scaleHost = shape.querySelector<HTMLElement>('.orb')
    expect(scaleHost).not.toBeNull()
    // Phase 5.1 Plan 04 post-UAT: transform is `translate3d(0,0,0) scale(...)`
    // (translate3d added for Firefox GPU promotion). The scale(0.79) substring
    // is the assertion that matters — D-06 fixed mid-scale invariant.
    // Reason: scaleHost non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(scaleHost!.style.transform).toMatch(/^translate3d\(0(?:px)?,\s*0(?:px)?,\s*0(?:px)?\)\s+scale\(0\.79\)$/)
  })
})

describe('running duration edits and completion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
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
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
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

function seedCue(cue: CueStyleId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre: 'sine', variant: 'orb', cue, locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

function seedTimbre(timbre: TimbreId): void {
  const envelope = {
    version: 1,
    prefs: { theme: 'system', timbre, variant: 'orb', locale: 'en' },
  }
  window.localStorage.setItem(STATE_KEY, JSON.stringify(envelope))
}

describe('TIMBRE-03 captures timbre at Start; mid-session prefs change does not affect active session', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
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
      prefs: { theme: 'system', timbre: 'flute', variant: 'orb', locale: 'en' },
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

function readEnv(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(STATE_KEY)
  // Reason: test helper reads raw localStorage; shape validated by downstream assertions.
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
}

function statsOf(env: Record<string, unknown> | null, practice: 'resonant' | 'naviKriya' | 'stretch') {
  const practices = env?.['practices'] as Record<string, unknown> | undefined
  const slice = practices?.[practice] as Record<string, unknown> | undefined
  return slice?.['stats'] as Record<string, unknown> | undefined
}

// The Navi pre-session window is now a 3-2-1 countdown reusing HRV's lead-in
// (LEAD_IN_DURATION_MS = 3000ms), not the old silent settle.
const NK_COUNTDOWN = 3000

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
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
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
    const env = readEnv()
    expect(statsOf(env, 'naviKriya')?.['totalSessions']).toBe(1)
    expect(statsOf(env, 'naviKriya')?.['roundsCompleted']).toBe(1)
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

    const env = readEnv()
    // The naviKriya slice advanced...
    expect(statsOf(env, 'naviKriya')?.['totalSessions']).toBe(1)
    // ...the resonant slice did not.
    expect((statsOf(env, 'resonant')?.['totalSessions'] as number | undefined) ?? 0).toBe(0)
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
    const env = readEnv()
    expect((statsOf(env, 'naviKriya')?.['totalSessions'] as number | undefined) ?? 0).toBe(0)
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

    const env = readEnv()
    // D-13: the one fully-completed round is recorded; resonant stays untouched.
    expect(statsOf(env, 'naviKriya')?.['totalSessions']).toBe(1)
    expect(statsOf(env, 'naviKriya')?.['roundsCompleted']).toBe(1)
    expect((statsOf(env, 'resonant')?.['totalSessions'] as number | undefined) ?? 0).toBe(0)
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
    vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
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
    // (SessionControls renders for activePractice === 'stretch').
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      vi.advanceTimersByTime(LEAD_IN_MS)
    })

    // Run 35s so the session exceeds the 30s recording threshold.
    await act(async () => { vi.advanceTimersByTime(35_000) })

    // GAP 3: ending a stretch session now opens the end-confirmation dialog first.
    // Click 'End session' to open the dialog, then confirm via the 'End' button.
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await act(async () => { await Promise.resolve() })
    // The dialog must be open before confirming
    expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    await act(async () => { await Promise.resolve() })

    const env = readEnv()
    // Stretch stats updated:
    expect(statsOf(env, 'stretch')?.['totalSessions']).toBe(1)
    expect((statsOf(env, 'stretch')?.['totalElapsedSeconds'] as number | undefined) ?? 0).toBeGreaterThanOrEqual(35)
    // Resonant and naviKriya untouched:
    expect((statsOf(env, 'resonant')?.['totalSessions'] as number | undefined) ?? 0).toBe(0)
    expect((statsOf(env, 'naviKriya')?.['totalSessions'] as number | undefined) ?? 0).toBe(0)
  })

  // UAT GAP 3: clicking 'End session' on a running stretch session opens the dialog
  it('GAP 3: ending a running stretch session opens the end-confirmation dialog (session does not end immediately)', async () => {
    seedStretch()
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      vi.advanceTimersByTime(LEAD_IN_MS)
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
      vi.advanceTimersByTime(LEAD_IN_MS)
    })
    await act(async () => { vi.advanceTimersByTime(35_000) })

    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await act(async () => { await Promise.resolve() })
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    await act(async () => { await Promise.resolve() })

    expect(screen.getByRole('button', { name: 'Start session' })).toBeInTheDocument()
    const env = readEnv()
    expect(statsOf(env, 'stretch')?.['totalSessions']).toBe(1)
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

  // UAT GAP 4: root layout section is top-anchored (justify-start)
  it('GAP 4: the root layout section is top-anchored (justify-start, not justify-center)', () => {
    render(<App />)
    // The root section must use justify-start, not justify-center
    const sections = document.querySelectorAll('section')
    const rootSection = Array.from(sections).find(
      (s) => s.classList.contains('flex') && s.classList.contains('flex-col'),
    )
    expect(rootSection).toBeDefined()
    expect(rootSection!.classList.contains('justify-start')).toBe(true)
    expect(rootSection!.classList.contains('justify-center')).toBe(false)
  })
})

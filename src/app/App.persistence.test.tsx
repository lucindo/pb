import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { STATE_KEY } from '../storage'

// NOTE: We use fireEvent (not userEvent) throughout this file because the
// userEvent + vi.useFakeTimers() pairing hangs when combined with the async
// onStartClick handler in App.tsx (same issue documented in App.session.test.tsx).
// fireEvent + act(async () => { ... }) is sufficient for all persistence assertions here.

const LEAD_IN_MS = 3000

interface SeedOpts {
  settings?: { bpm?: number; ratio?: string; durationMinutes?: number | 'open-ended' }
  mute?: boolean
  stats?: {
    totalSessions?: number
    totalElapsedSeconds?: number
    lastSessionAtMs?: number | null
    lastSessionDurationSeconds?: number | null
  }
}

function seedEnvelope(opts: SeedOpts = {}) {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 1,
    settings: opts.settings,
    mute: opts.mute,
    stats: opts.stats,
  }))
}

function readEnvelope(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(STATE_KEY)
  // Reason: test helper reads raw localStorage; shape validated by downstream test assertions.
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
}

async function startAndAdvancePastLeadIn() {
  fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    vi.advanceTimersByTime(LEAD_IN_MS)
  })
}

async function advanceTime(ms: number) {
  // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
  // eslint-disable-next-line @typescript-eslint/require-await
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

// vitest.setup.ts already clears localStorage before each test.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-09T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// LOCL-01 — Settings + Mute restoration on mount
// ---------------------------------------------------------------------------
describe('LOCL-01 — restoration on mount', () => {
  it('restores persisted settings (bpm, ratio, durationMinutes) — D-15', () => {
    seedEnvelope({ settings: { bpm: 4, ratio: '50:50', durationMinutes: 5 } })
    render(<App />)
    // SettingsStepper formats BPM as "4 BPM" and Duration as "5 min"
    expect(screen.getByText('4 BPM')).toBeInTheDocument()
    expect(screen.getByText('50:50')).toBeInTheDocument()
    expect(screen.getByText('5 min')).toBeInTheDocument()
  })

  it('restores persisted mute=true (D-14)', () => {
    seedEnvelope({ mute: true })
    render(<App />)
    // MuteToggle aria-label is "Unmute audio cues" when muted=true
    expect(screen.getByRole('button', { name: 'Unmute audio cues' })).toBeInTheDocument()
  })

  it('falls back to defaults when nothing is stored (D-07, D-15)', () => {
    render(<App />)
    expect(screen.getByText('5.5 BPM')).toBeInTheDocument()
    expect(screen.getByText('40:60')).toBeInTheDocument()
    expect(screen.getByText('10 min')).toBeInTheDocument()
    // Default mute is false (D-07) — aria-label "Mute audio cues"
    expect(screen.getByRole('button', { name: 'Mute audio cues' })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// LOCL-01 — Settings + Mute persistence on change
// ---------------------------------------------------------------------------
describe('LOCL-01 — persistence on change', () => {
  it('persists mute toggle to localStorage (D-14)', async () => {
    render(<App />)
    expect(readEnvelope()?.['mute']).not.toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Mute audio cues' }))
    await act(async () => { await Promise.resolve() })
    // After toggle, mute=true is persisted
    expect(readEnvelope()).toMatchObject({ mute: true })
  })

  it('persists settings change via the stepper interaction (LOCL-01)', async () => {
    render(<App />)
    // Click the BPM decrease button — default is 5.5 BPM; decrease goes to 5 BPM.
    const bpmGroup = screen.getByRole('group', { name: 'BPM' })
    fireEvent.click(within(bpmGroup).getByRole('button', { name: 'Decrease BPM' }))
    await act(async () => { await Promise.resolve() })
    const env = readEnvelope()
    // After one decrease from 5.5, bpm should be 5
    expect(env).toMatchObject({ settings: { bpm: 5 } })
  })
})

// ---------------------------------------------------------------------------
// LOCL-02 — Stats accumulation
// ---------------------------------------------------------------------------
describe('LOCL-02 — stats record on each end path', () => {
  it('records a session when timed completion fires (D-01 completion bypass)', async () => {
    seedEnvelope({ settings: { bpm: 5.5, ratio: '40:60', durationMinutes: 5 } })
    render(<App />)
    await startAndAdvancePastLeadIn()
    // Run past 5 minutes — the engine flips to 'complete'.
    // Advance an extra minute so the surrounding cycle finishes (Phase 3 fix).
    await advanceTime(6 * 60_000)
    const env = readEnvelope()
    expect(env).toMatchObject({ stats: { totalSessions: 1 } })
    // elapsed is at least 300s for a 5-min session
    const stats = env?.['stats'] as Record<string, unknown> | undefined
    expect(stats?.['totalElapsedSeconds']).toBeGreaterThanOrEqual(300)
    expect(stats?.['lastSessionAtMs']).toEqual(expect.any(Number))
  })

  it('records a session on manual End when elapsed >= 30s (D-04 + D-01 threshold)', async () => {
    // Open-ended duration so manual End fires directly without modal
    seedEnvelope({ settings: { bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' } })
    render(<App />)
    await startAndAdvancePastLeadIn()
    await advanceTime(35_000)  // 35s elapsed — above 30s threshold (D-01)
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await act(async () => { await Promise.resolve() })
    // Open-ended: no modal. End fires directly. Stats written in cleanup effect.
    const env = readEnvelope()
    expect(env).toMatchObject({ stats: { totalSessions: 1 } })
    const stats = env?.['stats'] as Record<string, unknown> | undefined
    expect(stats?.['totalElapsedSeconds']).toBeGreaterThanOrEqual(35)
  })

  it('does NOT record a sub-30s manual End (D-01 threshold)', async () => {
    seedEnvelope({ settings: { bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' } })
    render(<App />)
    await startAndAdvancePastLeadIn()
    await advanceTime(10_000)  // 10s elapsed — below 30s threshold (D-01)
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await act(async () => { await Promise.resolve() })
    const env = readEnvelope()
    const sessions = (env?.['stats'] as Record<string, unknown> | undefined)?.['totalSessions'] as number | undefined
    expect(sessions ?? 0).toBe(0)
  })

  it('does NOT record on cancel-during-lead-in (D-03 / Pitfall 2)', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await act(async () => {
      await Promise.resolve()
      vi.advanceTimersByTime(1000)  // mid-lead-in (1 of 3 seconds)
    })
    // Re-click during lead-in cancels per onStartClick cancel branch (D-03)
    // session.status is still 'idle' so runningSnapshotRef was never populated
    fireEvent.click(screen.getByRole('button', { name: 'Start session' }))
    await advanceTime(0)
    const env = readEnvelope()
    const sessions2 = (env?.['stats'] as Record<string, unknown> | undefined)?.['totalSessions'] as number | undefined
    expect(sessions2 ?? 0).toBe(0)
  })

  it('does NOT double-write when cleanup effect fires after manual End (Pitfall 1)', async () => {
    seedEnvelope({ settings: { bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' } })
    render(<App />)
    await startAndAdvancePastLeadIn()
    await advanceTime(35_000)
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    // Force any pending rAF/microtasks to flush — the cleanup effect runs here.
    // recordedSessionKeyRef prevents double-write via idempotency key.
    await advanceTime(100)
    const env = readEnvelope()
    expect(env).toMatchObject({ stats: { totalSessions: 1 } })  // exactly one, not two (Pitfall 1)
  })
})

// ---------------------------------------------------------------------------
// LOCL-02 — Footer gating
// ---------------------------------------------------------------------------
describe('LOCL-02 — footer gating (D-09 / D-10)', () => {
  it('hides footer when totalSessions === 0 (D-09)', () => {
    render(<App />)
    // No Reset button from StatsFooter (there may be no dialogs open either)
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
    // No stats text content (no "N sessions" or "N min total")
    expect(screen.queryByText(/\d+ sessions?/)).not.toBeInTheDocument()
  })

  it('shows footer when totalSessions > 0 on idle screen', () => {
    seedEnvelope({
      stats: {
        totalSessions: 3, totalElapsedSeconds: 180,
        lastSessionAtMs: new Date(new Date().getFullYear(), 4, 7).getTime(),
        lastSessionDurationSeconds: 60,
      },
    })
    render(<App />)
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument()
  })

  it('hides footer during inSessionView (D-10)', async () => {
    seedEnvelope({
      stats: {
        totalSessions: 3, totalElapsedSeconds: 180,
        lastSessionAtMs: new Date(new Date().getFullYear(), 4, 7).getTime(),
        lastSessionDurationSeconds: 60,
      },
    })
    render(<App />)
    // Footer visible initially (idle screen)
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
    // Start session — enters inSessionView (lead-in + running)
    await startAndAdvancePastLeadIn()
    // During running (inSessionView=true), footer is hidden (D-10)
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// LOCL-03 — Reset
// ---------------------------------------------------------------------------
describe('LOCL-03 — reset clears stats only (D-11 / D-12)', () => {
  it('clicking Reset opens the confirmation dialog (D-12)', async () => {
    seedEnvelope({
      stats: {
        totalSessions: 3, totalElapsedSeconds: 180,
        lastSessionAtMs: new Date(new Date().getFullYear(), 4, 7).getTime(),
        lastSessionDurationSeconds: 60,
      },
    })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await act(async () => { await Promise.resolve() })
    expect(screen.getByRole('dialog', { name: 'Reset practice stats?' })).toBeInTheDocument()
  })

  it('confirming Reset wipes stats subtree and re-hides footer (D-11)', async () => {
    seedEnvelope({
      settings: { bpm: 4, ratio: '50:50', durationMinutes: 5 },
      mute: true,
      stats: {
        totalSessions: 3, totalElapsedSeconds: 180,
        lastSessionAtMs: 1_700_000_000_000,
        lastSessionDurationSeconds: 60,
      },
    })
    render(<App />)
    // Open the dialog
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await act(async () => { await Promise.resolve() })
    // The dialog has a Reset button inside — use within(dialog) to target it
    const dialog = screen.getByRole('dialog', { name: 'Reset practice stats?' })
    const dialogResetBtn = within(dialog).getByRole('button', { name: 'Reset' })
    fireEvent.click(dialogResetBtn)
    await act(async () => { await Promise.resolve() })

    // Stats subtree is zero (D-11 — resetStats() clears only stats)
    const env = readEnvelope()
    expect(env).toMatchObject({
      stats: { totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null },
    })
    // Settings + mute survive (D-11)
    expect(env).toMatchObject({
      settings: { bpm: 4, ratio: '50:50', durationMinutes: 5 },
      mute: true,
    })

    // Footer disappears (totalSessions=0 → D-09 hides it)
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })

  it('cancelling (Keep) leaves stats untouched (D-12)', async () => {
    seedEnvelope({
      stats: {
        totalSessions: 3, totalElapsedSeconds: 180,
        lastSessionAtMs: 1_700_000_000_000,
        lastSessionDurationSeconds: 60,
      },
    })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await act(async () => { await Promise.resolve() })
    const dialog = screen.getByRole('dialog', { name: 'Reset practice stats?' })
    const keepBtn = within(dialog).getByRole('button', { name: 'Keep' })
    fireEvent.click(keepBtn)
    await act(async () => { await Promise.resolve() })

    // Stats unchanged
    const env = readEnvelope()
    expect(env).toMatchObject({ stats: { totalSessions: 3 } })
    // Footer still present
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument()
  })
})

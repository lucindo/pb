import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import {
  APP_TEST_NOW,
  advanceTime,
  readStoredEnvelope as readRawEnvelope,
  settingGroup,
  startAndAdvancePastLeadIn,
} from './appTestHarness'
import { STATE_KEY } from '../storage'

// NOTE: We use fireEvent (not userEvent) throughout this file because the
// userEvent + vi.useFakeTimers() pairing hangs when combined with the async
// onStartClick handler in App.tsx (same issue documented in App.session.test.tsx).
// fireEvent + act(async () => { ... }) is sufficient for all persistence assertions here.

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

// After the v1→v2 migration, the authoritative resonant stats live at
// env.practices.resonant.stats — recordResonantSession writes here, not env.stats.
function resonantStatsOf(env: Record<string, unknown> | null): Record<string, unknown> | undefined {
  const practices = env?.['practices'] as Record<string, unknown> | undefined
  const resonant = practices?.['resonant'] as Record<string, unknown> | undefined
  return resonant?.['stats'] as Record<string, unknown> | undefined
}

// Resonant settings persist to practices.resonant.settings via saveResonantSettings —
// not the legacy flat env.settings write path.
function resonantSettingsOf(env: Record<string, unknown> | null): Record<string, unknown> | undefined {
  const practices = env?.['practices'] as Record<string, unknown> | undefined
  const resonant = practices?.['resonant'] as Record<string, unknown> | undefined
  return resonant?.['settings'] as Record<string, unknown> | undefined
}

// vitest.setup.ts already clears localStorage before each test.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(APP_TEST_NOW)
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
    // Default mute is false — aria-label "Mute audio cues"
    expect(screen.getByRole('button', { name: 'Mute audio cues' })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// LOCL-01 — Settings + Mute persistence on change
// ---------------------------------------------------------------------------
describe('LOCL-01 — persistence on change', () => {
  it('persists mute toggle to localStorage (D-14)', async () => {
    render(<App />)
    expect(readRawEnvelope()?.['mute']).not.toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Mute audio cues' }))
    await act(async () => { await Promise.resolve() })
    // After toggle, mute=true is persisted
    expect(readRawEnvelope()).toMatchObject({ mute: true })
  })

  it('mute survives a remount — toggle, unmount, fresh App reads the persisted state (D-14)', async () => {
    // The real user behavior ("I muted, reloaded, still muted") — round-trips the toggle
    // through storage, which the separate persist-on-toggle and restore-on-mount tests
    // never exercise together.
    const first = render(<App />)
    expect(screen.getByRole('button', { name: 'Mute audio cues' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mute audio cues' }))
    await act(async () => { await Promise.resolve() })
    expect(readRawEnvelope()).toMatchObject({ mute: true })

    // Simulate a reload: tear down the app and mount a fresh one against the same storage.
    first.unmount()
    render(<App />)

    expect(screen.getByRole('button', { name: 'Unmute audio cues' })).toBeInTheDocument()
  })

  it('persists settings change to the resonant practice slice (LOCL-01 / CR-01)', async () => {
    render(<App />)
    // Click the BPM decrease button — default is 5.5 BPM; decrease goes to 5 BPM.
    const bpmGroup = settingGroup('BPM')
    fireEvent.click(within(bpmGroup).getByRole('button', { name: 'Decrease BPM' }))
    await act(async () => { await Promise.resolve() })
    const env = readRawEnvelope()
    // CR-01: the write target is practices.resonant.settings via
    // saveResonantSettings — the legacy flat env.settings write is no longer used.
    expect(resonantSettingsOf(env)).toMatchObject({ bpm: 5 })
    expect(env?.['settings']).toBeUndefined()
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
    // Advance an extra minute so the surrounding cycle finishes.
    await advanceTime(6 * 60_000)
    const env = readRawEnvelope()
    const stats = resonantStatsOf(env)
    expect(stats?.['totalSessions']).toBe(1)
    // elapsed is at least 300s for a 5-min session
    expect(stats?.['totalElapsedSeconds']).toBeGreaterThanOrEqual(300)
    expect(stats?.['lastSessionAtMs']).toEqual(expect.any(Number))
  })

  it('records a session on manual End when elapsed >= 30s (D-04 + D-01 threshold)', async () => {
    // Open-ended duration so manual End fires directly without modal
    seedEnvelope({ settings: { bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' } })
    render(<App />)
    await startAndAdvancePastLeadIn()
    // Advance well past 35s so the final rAF lands at or above the 35s mark.
    // rAF cadence within vi fake timers settles the final tick at ~last-16ms;
    // a tight 35_000 advance leaves elapsed at ~34.99 which floors to 34.
    await advanceTime(36_000)
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    await act(async () => { await Promise.resolve() })
    // Open-ended: no modal. End fires directly. Stats written in cleanup effect.
    const env = readRawEnvelope()
    const stats = resonantStatsOf(env)
    expect(stats?.['totalSessions']).toBe(1)
    expect(stats?.['totalElapsedSeconds']).toBeGreaterThanOrEqual(35)
  })

  it('does NOT record a sub-30s manual End (D-01 threshold)', async () => {
    seedEnvelope({ settings: { bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' } })
    render(<App />)
    await startAndAdvancePastLeadIn()
    await advanceTime(10_000)  // 10s elapsed — below 30s threshold
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    await act(async () => { await Promise.resolve() })
    const env = readRawEnvelope()
    const sessions = resonantStatsOf(env)?.['totalSessions'] as number | undefined
    expect(sessions ?? 0).toBe(0)
  })

  it('does NOT record on cancel-during-lead-in (D-03 / Pitfall 2)', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    await act(async () => {
      await Promise.resolve()
      vi.advanceTimersByTime(1000)  // mid-lead-in (1 of 3 seconds)
    })
    // Re-click during lead-in cancels; session.status is still 'idle' so
    // runningSnapshotRef was never populated.
    // Button label is 'Cancel' during lead-in.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await advanceTime(0)
    const env = readRawEnvelope()
    const sessions2 = resonantStatsOf(env)?.['totalSessions'] as number | undefined
    expect(sessions2 ?? 0).toBe(0)
  })

  it('does NOT double-write when cleanup effect fires after manual End (Pitfall 1)', async () => {
    seedEnvelope({ settings: { bpm: 5.5, ratio: '40:60', durationMinutes: 'open-ended' } })
    render(<App />)
    await startAndAdvancePastLeadIn()
    await advanceTime(35_000)
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    // Force any pending rAF/microtasks to flush — the cleanup effect runs here.
    // recordedSessionKeyRef prevents double-write via idempotency key.
    await advanceTime(100)
    const env = readRawEnvelope()
    expect(resonantStatsOf(env)?.['totalSessions']).toBe(1)  // exactly one, not two
  })
})

// ---------------------------------------------------------------------------
// PRACTICE-02 — Resonant settings survive remount.
//
// Verifies that App.tsx seeds initialSettings from loadPractices().resonant.settings
// (per-practice envelope), NOT the abandoned flat env.settings field.
// ---------------------------------------------------------------------------

// Seed a v2 envelope directly — flat env.settings is absent (fresh-v2 user).
// version: 2 ensures migrateEnvelope skips the v1→v2 ladder so the test
// exercises the post-fix read path directly, without relying on migration.
function seedV2Envelope(resonantSettings: { bpm: number; ratio: string; durationMinutes: number }) {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 2,
    practices: {
      resonant: { settings: resonantSettings, stats: null },
    },
    activePractice: 'resonant',
  }))
}

describe('PRACTICE-02 — resonant settings survive remount', () => {
  it('fresh-v2 user: resonant settings from practices.resonant.settings survive reload', () => {
    // Seed v2 envelope: practices.resonant.settings holds a non-default BPM.
    // Flat env.settings is absent (fresh post-Phase-30 user, never had it).
    // App.tsx must read from practices.resonant.settings, not the absent flat field.
    seedV2Envelope({ bpm: 4, ratio: '50:50', durationMinutes: 5 })
    render(<App />)
    expect(screen.getByText('4 BPM')).toBeInTheDocument()
    expect(screen.getByText('50:50')).toBeInTheDocument()
    expect(screen.getByText('5 min')).toBeInTheDocument()
  })

  it('v1-migrated user: practices.resonant.settings wins over stale flat env.settings on remount', () => {
    // Simulate a user who: (1) migrated from v1 (flat env.settings = stale BPM 6),
    // then (2) changed settings (saveResonantSettings wrote BPM 4 to practices.resonant).
    // The flat env.settings is now a stale orphan; the read-path must prefer the
    // The read-path must prefer the per-practice value.
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 2,
      settings: { bpm: 6, ratio: '40:60', durationMinutes: 10 },  // stale orphan
      practices: {
        resonant: {
          settings: { bpm: 4, ratio: '50:50', durationMinutes: 5 },  // newer value
          stats: null,
        },
      },
      activePractice: 'resonant',
    }))
    render(<App />)
    // Must show 4 BPM (practices subtree), NOT 6 BPM (stale flat field).
    expect(screen.getByText('4 BPM')).toBeInTheDocument()
    expect(screen.queryByText('6 BPM')).not.toBeInTheDocument()
  })
})


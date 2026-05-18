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

// Reads raw localStorage with NO v1→v2 migration — unlike the production
// readEnvelope in src/storage/storage.ts. Named distinctly to avoid implying
// migration semantics this helper does not have.
function readRawEnvelope(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(STATE_KEY)
  // Reason: test helper reads raw localStorage; shape validated by downstream test assertions.
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null
}

// Phase 30: after the v1→v2 migration the authoritative resonant stats live at
// env.practices.resonant.stats — recordResonantSession / resetPracticeStats
// write here, not the flat env.stats orphan. This helper extracts that subtree.
function resonantStatsOf(env: Record<string, unknown> | null): Record<string, unknown> | undefined {
  const practices = env?.['practices'] as Record<string, unknown> | undefined
  const resonant = practices?.['resonant'] as Record<string, unknown> | undefined
  return resonant?.['stats'] as Record<string, unknown> | undefined
}

// CR-01 (Phase 31): resonant settings now persist to practices.resonant.settings
// via saveResonantSettings — NOT the legacy flat env.settings write path.
function resonantSettingsOf(env: Record<string, unknown> | null): Record<string, unknown> | undefined {
  const practices = env?.['practices'] as Record<string, unknown> | undefined
  const resonant = practices?.['resonant'] as Record<string, unknown> | undefined
  return resonant?.['settings'] as Record<string, unknown> | undefined
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
    expect(readRawEnvelope()?.['mute']).not.toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Mute audio cues' }))
    await act(async () => { await Promise.resolve() })
    // After toggle, mute=true is persisted
    expect(readRawEnvelope()).toMatchObject({ mute: true })
  })

  it('persists settings change to the resonant practice slice (LOCL-01 / CR-01)', async () => {
    render(<App />)
    // Click the BPM decrease button — default is 5.5 BPM; decrease goes to 5 BPM.
    const bpmGroup = screen.getByRole('group', { name: 'BPM' })
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
    // Advance an extra minute so the surrounding cycle finishes (Phase 3 fix).
    await advanceTime(6 * 60_000)
    const env = readRawEnvelope()
    // Phase 30 Pitfall 3: the session records into practices.resonant.stats.
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
    await advanceTime(35_000)  // 35s elapsed — above 30s threshold (D-01)
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
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
    await advanceTime(10_000)  // 10s elapsed — below 30s threshold (D-01)
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    await act(async () => { await Promise.resolve() })
    const env = readRawEnvelope()
    const sessions = resonantStatsOf(env)?.['totalSessions'] as number | undefined
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
    // Button label is 'Cancel' during lead-in (Phase 20 LEAD-01).
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
    fireEvent.click(screen.getByRole('button', { name: 'End session' }))
    // Force any pending rAF/microtasks to flush — the cleanup effect runs here.
    // recordedSessionKeyRef prevents double-write via idempotency key.
    await advanceTime(100)
    const env = readRawEnvelope()
    expect(resonantStatsOf(env)?.['totalSessions']).toBe(1)  // exactly one, not two (Pitfall 1)
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
    // Phase 30 D-08: the dialog title names the active practice being reset.
    expect(screen.getByRole('dialog', { name: 'Reset Resonant Breathing stats?' })).toBeInTheDocument()
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
    const dialog = screen.getByRole('dialog', { name: 'Reset Resonant Breathing stats?' })
    const dialogResetBtn = within(dialog).getByRole('button', { name: 'Reset' })
    fireEvent.click(dialogResetBtn)
    await act(async () => { await Promise.resolve() })

    // Phase 30 D-08 / Pitfall 4: resetPracticeStats zeroes the resonant
    // practice's stats subtree.
    const env = readRawEnvelope()
    expect(resonantStatsOf(env)).toMatchObject({
      totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null,
    })
    // Settings + mute survive as forward-compat orphans (D-11)
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
    const dialog = screen.getByRole('dialog', { name: 'Reset Resonant Breathing stats?' })
    const keepBtn = within(dialog).getByRole('button', { name: 'Keep' })
    fireEvent.click(keepBtn)
    await act(async () => { await Promise.resolve() })

    // Stats unchanged — cancel writes nothing, the seeded v1 disk is untouched.
    const env = readRawEnvelope()
    expect(env).toMatchObject({ stats: { totalSessions: 3 } })
    // Footer still present
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// STORAGE-03 — Cross-tab stats refresh via storage event
// ---------------------------------------------------------------------------
describe('STORAGE-03 — cross-tab stats refresh', () => {
  it('refreshes stats footer when another tab writes the envelope', async () => {
    render(<App />)
    // Negative initial assertion — footer hidden because totalSessions === 0 (D-09 gating).
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()

    // Construct the new envelope JSON and reuse for both setItem and dispatchEvent newValue.
    const newEnvelope = JSON.stringify({
      version: 1,
      stats: {
        totalSessions: 5,
        totalElapsedSeconds: 300,
        lastSessionAtMs: new Date('2026-05-09').getTime(),
        lastSessionDurationSeconds: 60,
      },
    })

    // CRITICAL ORDERING (RESEARCH Pitfall 2): setItem BEFORE dispatchEvent — the listener
    // calls loadStats() which reads disk synchronously; the new payload MUST be on disk
    // before the handler fires or loadStats() returns stale/zero data.
    window.localStorage.setItem(STATE_KEY, newEnvelope)

    // Note: omit `storageArea` from StorageEventInit — jsdom's IDL conversion
    // rejects `window.localStorage` (`parameter 2 has member 'storageArea' that
    // is not of type 'Storage'`). `key` and `newValue` are sufficient for the
    // handler's `e.key === STATE_KEY` filter; `oldValue: null` is included to
    // match the cleared-storage semantics from the spec.
    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside (same pattern as advanceTime at line 51).
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: STATE_KEY,
        newValue: newEnvelope,
        oldValue: null,
      }))
    })

    // Footer becomes visible after the listener-fired re-render.
    expect(screen.getByText(/5 sessions/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('ignores storage events for unrelated keys (D-06a key filter)', async () => {
    seedEnvelope({
      stats: {
        totalSessions: 3,
        totalElapsedSeconds: 180,
        lastSessionAtMs: new Date('2026-05-09').getTime(),
        lastSessionDurationSeconds: 60,
      },
    })
    render(<App />)
    // Initial mount-time loadStats() populated the footer.
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument()

    // WR-01 (Phase 8 REVIEW Option A): mutate STATE_KEY's value on disk to a
    // 99-sessions envelope AFTER mount, BEFORE dispatching the unrelated-key
    // event. The handler reads disk via loadStats() — NOT e.newValue — so the
    // disk state must change to give the negative assertion something concrete
    // to test. Without this step the test would pass for any of three broken
    // listener implementations (filter removed, listener removed entirely,
    // setStats stubbed to no-op) because the disk-side stats never change.
    const unrelatedDiskEnvelope = JSON.stringify({
      version: 1,
      stats: {
        totalSessions: 99,
        totalElapsedSeconds: 0,
        lastSessionAtMs: null,
        lastSessionDurationSeconds: null,
      },
    })
    window.localStorage.setItem(STATE_KEY, unrelatedDiskEnvelope)

    // Dispatch a storage event for an UNRELATED key. The listener must rely
    // solely on the e.key === STATE_KEY filter to ignore it; if the filter
    // is broken, loadStats() would now return 99 and the assertion below
    // would fail.
    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside (same pattern as advanceTime at line 51).
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'some-other-key',
        newValue: 'irrelevant',
      }))
    })

    // Footer STILL shows 3 sessions; the unrelated event was filtered out (D-06a).
    expect(screen.getByText(/3 sessions/)).toBeInTheDocument()
    expect(screen.queryByText(/99 sessions/)).not.toBeInTheDocument()

    // Positive control — dispatch the SAME-shape event but with e.key === STATE_KEY.
    // This proves (a) the 99-sessions envelope was on disk all along (so the
    // negative branch was meaningful, not vacuous) and (b) the listener fires
    // and re-reads via loadStats() when the key DOES match the filter.
    // Reason: async wrapper required to match act()'s async overload; no real awaitable work inside.
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: STATE_KEY,
        newValue: unrelatedDiskEnvelope,
        oldValue: null,
      }))
    })

    // Now the footer reflects the disk state — proves the filter (and ONLY
    // the filter) gated the earlier re-read.
    expect(screen.getByText(/99 sessions/)).toBeInTheDocument()
    expect(screen.queryByText(/3 sessions/)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// PRACTICE-02 — Resonant settings survive remount (Phase 33 gap closure)
//
// These tests verify the read-path fix from Phase 33: App.tsx seeds
// initialSettings from loadPractices().resonant.settings (per-practice
// envelope), NOT the abandoned flat env.settings field. Both scenarios
// would FAIL if Task 1's change were reverted (i.e., if loadSettings()
// were restored).
// ---------------------------------------------------------------------------

// Seed a v2 envelope directly — flat env.settings is absent (fresh-v2 user).
// version: 2 ensures migrateEnvelope skips the v1→v2 ladder so the test
// exercises the post-fix read path directly, without relying on migration.
function seedV2Envelope(resonantSettings: { bpm: number; ratio: string; durationMinutes: number }) {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({
    version: 2,
    practices: {
      resonant: { settings: resonantSettings, stats: null },
      naviKriya: { settings: null, stats: null },
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
    // per-practice value (D-04).
    window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 2,
      settings: { bpm: 6, ratio: '40:60', durationMinutes: 10 },  // stale orphan
      practices: {
        resonant: {
          settings: { bpm: 4, ratio: '50:50', durationMinutes: 5 },  // newer value
          stats: null,
        },
        naviKriya: { settings: null, stats: null },
      },
      activePractice: 'resonant',
    }))
    render(<App />)
    // Must show 4 BPM (practices subtree), NOT 6 BPM (stale flat field).
    expect(screen.getByText('4 BPM')).toBeInTheDocument()
    expect(screen.queryByText('6 BPM')).not.toBeInTheDocument()
  })
})

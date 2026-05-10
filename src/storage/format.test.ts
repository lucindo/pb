import { describe, expect, it } from 'vitest'

import {
  formatTotalMinutes,
  formatSessionCount,
  formatLastSessionDate,
  formatLastSessionDuration,
  formatLastSession,
} from './format'

describe('formatTotalMinutes (D-06)', () => {
  it('renders 0 seconds as "0 min"', () => {
    expect(formatTotalMinutes(0)).toBe('0 min')
  })

  it('renders 47 minutes as "47 min"', () => {
    expect(formatTotalMinutes(47 * 60)).toBe('47 min')
  })

  it('renders 59 min 59 s as "59 min" (floor below 60-min boundary)', () => {
    expect(formatTotalMinutes(59 * 60 + 59)).toBe('59 min')
  })

  it('keeps minutes through the 1.0-hours dead-zone (WR-02 — 60..62 min still shows "N min")', () => {
    // WR-02: 60..62:59 would render as "1.0 hours", visually identical to "60 min".
    // Defer the flip until the hours decimal can show meaningful progression.
    expect(formatTotalMinutes(60 * 60)).toBe('60 min')
    expect(formatTotalMinutes(62 * 60 + 59)).toBe('62 min')
  })

  it('flips to hours format at ~63 minutes ("1.1 hours" — D-06 / WR-02)', () => {
    // 63 min = 3780 s -> 1.05 h, the new flip threshold. toFixed(1) -> "1.1".
    expect(formatTotalMinutes(63 * 60)).toBe('1.1 hours')
  })

  it('renders 126 minutes as "2.1 hours" with one decimal', () => {
    expect(formatTotalMinutes(126 * 60)).toBe('2.1 hours')
  })

  it('renders 17.4 hours as "17.4 hours"', () => {
    expect(formatTotalMinutes(17.4 * 3600)).toBe('17.4 hours')
  })
})

describe('formatSessionCount (D-06 singular/plural)', () => {
  it('renders 0 as "0 sessions"', () => { expect(formatSessionCount(0)).toBe('0 sessions') })
  it('renders 1 as "1 session" (singular)', () => { expect(formatSessionCount(1)).toBe('1 session') })
  it('renders 2 as "2 sessions"', () => { expect(formatSessionCount(2)).toBe('2 sessions') })
  it('renders 12 as "12 sessions" (CONTEXT.md D-08 example)', () => {
    expect(formatSessionCount(12)).toBe('12 sessions')
  })
})

describe('formatLastSessionDate (D-05)', () => {
  // Use deterministic timestamps. Dates constructed via Date(year, monthIndex, day) give local-tz midnight.
  const sameYearAtMs = new Date(2026, 4, 7).getTime()  // May 7, 2026
  const otherYearAtMs = new Date(2025, 4, 7).getTime() // May 7, 2025
  const today = () => new Date(2026, 4, 10).getTime()  // May 10, 2026

  it('renders same-year date without year suffix (e.g. "May 7")', () => {
    const out = formatLastSessionDate(sameYearAtMs, today)
    expect(out).toMatch(/May 7/)
    expect(out).not.toMatch(/2026/)
  })

  it('renders other-year date with year suffix (e.g. "May 7, 2025")', () => {
    const out = formatLastSessionDate(otherYearAtMs, today)
    expect(out).toMatch(/May 7/)
    expect(out).toMatch(/2025/)
  })
})

describe('formatLastSessionDuration (D-07)', () => {
  it('renders 60 s as "1 min"', () => { expect(formatLastSessionDuration(60)).toBe('1 min') })
  it('renders 595 s as "9 min" (9:55 floors to 9 — CONTEXT.md D-07 example)', () => {
    expect(formatLastSessionDuration(595)).toBe('9 min')
  })
  it('renders 0 s as "0 min"', () => { expect(formatLastSessionDuration(0)).toBe('0 min') })
  it('renders 600 s as "10 min"', () => { expect(formatLastSessionDuration(600)).toBe('10 min') })
})

describe('formatLastSession (composition + null guard)', () => {
  it('returns null when lastSessionAtMs is null', () => {
    expect(formatLastSession({
      totalSessions: 0, totalElapsedSeconds: 0, lastSessionAtMs: null, lastSessionDurationSeconds: null,
    })).toBeNull()
  })

  it('returns null when lastSessionDurationSeconds is null', () => {
    expect(formatLastSession({
      totalSessions: 1, totalElapsedSeconds: 60, lastSessionAtMs: 1, lastSessionDurationSeconds: null,
    })).toBeNull()
  })

  it('renders "Last: <date> · <duration>" when both fields present', () => {
    const today = () => new Date(2026, 4, 10).getTime()
    const out = formatLastSession({
      totalSessions: 1, totalElapsedSeconds: 600,
      lastSessionAtMs: new Date(2026, 4, 7).getTime(),
      lastSessionDurationSeconds: 600,
    }, today)
    expect(out).toMatch(/^Last: /)
    expect(out).toMatch(/May 7/)
    expect(out).toMatch(/10 min$/)
    expect(out).toMatch(/·/) // middle dot separator (D-08)
  })
})

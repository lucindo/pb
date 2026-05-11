// src/storage/format.ts
//
// Phase 4 D-05/D-06/D-07: pure display formatters for the StatsFooter.
// Intl.DateTimeFormat instances cached at module scope (one allocation per app load).

import type { PersistedStats } from './stats'

const DATE_FMT_SAME_YEAR = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})
const DATE_FMT_OTHER_YEAR = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

// D-06: < 60 min -> "N min"; >= 60 min -> "N.N hours" with one decimal.
//
// WR-02: defer the hours flip until the rendered hours value rounds up to 1.1
// (i.e. ~63 minutes / 3780 s). For totalSeconds in [3600, 3779] (60:00 through
// 62:59), `(totalSeconds/3600).toFixed(1)` rounds to "1.0" — visually identical
// to the 60-minute boundary tick — so users practising 60-62 minutes would see
// no decimal progression. Keeping minutes through that range preserves D-06's
// spirit ("decimal communicates progression") without crossing a UX dead-zone.
// The minute display continues to tick (60 min -> 61 min -> 62 min) until the
// hours decimal can show a meaningful step (1.1 hours).
const HOURS_FLIP_THRESHOLD_HOURS = 1.05
export function formatTotalMinutes(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const hours = totalSeconds / 3600
  if (hours < HOURS_FLIP_THRESHOLD_HOURS) return `${String(minutes)} min`
  return `${hours.toFixed(1)} hours`
}

// D-06: singular "1 session", else "N sessions"
export function formatSessionCount(count: number): string {
  return count === 1 ? '1 session' : `${String(count)} sessions`
}

// D-05: "May 7" current year; "May 7, 2025" other year.
export function formatLastSessionDate(atMs: number, now: () => number = Date.now): string {
  const d = new Date(atMs)
  const today = new Date(now())
  return d.getFullYear() === today.getFullYear()
    ? DATE_FMT_SAME_YEAR.format(d)
    : DATE_FMT_OTHER_YEAR.format(d)
}

// D-07: integer minutes via floor (e.g. 9:55 session -> "9 min").
export function formatLastSessionDuration(durationSeconds: number): string {
  return `${String(Math.floor(durationSeconds / 60))} min`
}

// D-08: "Last: May 7 · 10 min" — null when stats has no last-session data.
export function formatLastSession(stats: PersistedStats, now: () => number = Date.now): string | null {
  if (stats.lastSessionAtMs === null || stats.lastSessionDurationSeconds === null) return null
  return `Last: ${formatLastSessionDate(stats.lastSessionAtMs, now)} · ${formatLastSessionDuration(stats.lastSessionDurationSeconds)}`
}

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
export function formatTotalMinutes(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = totalSeconds / 3600
  return `${hours.toFixed(1)} hours`
}

// D-06: singular "1 session", else "N sessions"
export function formatSessionCount(count: number): string {
  return count === 1 ? '1 session' : `${count} sessions`
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
  return `${Math.floor(durationSeconds / 60)} min`
}

// D-08: "Last: May 7 · 10 min" — null when stats has no last-session data.
export function formatLastSession(stats: PersistedStats, now: () => number = Date.now): string | null {
  if (stats.lastSessionAtMs === null || stats.lastSessionDurationSeconds === null) return null
  return `Last: ${formatLastSessionDate(stats.lastSessionAtMs, now)} · ${formatLastSessionDuration(stats.lastSessionDurationSeconds)}`
}

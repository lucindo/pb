// Phase 4 D-05/D-06/D-07: display-format helpers for the stats footer.
// NOTE: This is a stub created by Plan 02 to satisfy TypeScript imports.
// The real implementation is shipped by Plan 01. These stubs will be
// overwritten when Plan 01 merges.

const DATE_FMT_SAME_YEAR = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})
const DATE_FMT_OTHER_YEAR = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

// D-05: "May 7" (same year), "May 7, 2025" (different year)
export function formatLastSessionDate(atMs: number, now: () => number = Date.now): string {
  const d = new Date(atMs)
  const today = new Date(now())
  return d.getFullYear() === today.getFullYear()
    ? DATE_FMT_SAME_YEAR.format(d)
    : DATE_FMT_OTHER_YEAR.format(d)
}

// D-07: integer minutes (floor), e.g. "10 min"
export function formatLastSessionDuration(durationSeconds: number): string {
  return `${Math.floor(durationSeconds / 60)} min`
}

// D-06: < 60 min → "47 min"; >= 60 min → "2.1 hours"
export function formatTotalMinutes(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = totalSeconds / 3600
  return `${hours.toFixed(1)} hours`
}

// D-06: singular for 1
export function formatSessionCount(count: number): string {
  return count === 1 ? '1 session' : `${count} sessions`
}

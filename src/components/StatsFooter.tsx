// Phase 4 D-08/D-09/D-10/D-13: footer strip below the main card. Pure presentational
// — receives stats + onResetClick from App.tsx; gating (inSessionView, totalSessions > 0)
// is the parent's responsibility (App.tsx renders this conditionally).
//
// D-08: two short lines.
//   Line 1: "12 sessions · 47 min total"
//   Line 2: "Last: May 7 · 10 min · Reset"
//
// D-13: Reset is an inline text link inside Line 2 (not a button visually, but a
// real <button type="button"> for keyboard + screen-reader correctness). The
// 44x44 hit-area floor is enforced via min-h-[44px] min-w-[44px] padding around
// the visible "Reset" text — the visible text is NOT enlarged (D-13 explicit).

import type { PersistedStats } from '../storage'
import {
  formatSessionCount,
  formatTotalMinutes,
  formatLastSessionDate,
  formatLastSessionDuration,
} from '../storage'

export interface StatsFooterProps {
  stats: PersistedStats
  onResetClick(): void
}

export function StatsFooter({ stats, onResetClick }: StatsFooterProps) {
  const hasLastSession =
    stats.lastSessionAtMs !== null && stats.lastSessionDurationSeconds !== null

  return (
    <div className="mt-6 text-center text-sm leading-6 text-[var(--color-breathing-muted)]">
      <p>
        {formatSessionCount(stats.totalSessions)} · {formatTotalMinutes(stats.totalElapsedSeconds)}{' '}
        total
      </p>
      <p className="mt-1">
        {hasLastSession && (
          <>
            Last: {formatLastSessionDate(stats.lastSessionAtMs as number)} ·{' '}
            {formatLastSessionDuration(stats.lastSessionDurationSeconds as number)}
            {' · '}
          </>
        )}
        <button
          type="button"
          onClick={onResetClick}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 underline underline-offset-2 text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        >
          Reset
        </button>
      </p>
    </div>
  )
}

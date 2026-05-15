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
//
// Phase 19: Path A (translate at component layer). The component computes translated
// strings via strings.sessionsCount / strings.totalMinutes / strings.lastSessionPrefix
// instead of the EN-only format.ts helpers. format.ts is NOT edited (D-19 minimal-diff).

import type { PersistedStats } from '../storage'
import { formatLastSessionDate, formatLastSessionDuration } from '../storage/format'
import type { UiStrings } from '../content/strings'

export interface StatsFooterProps {
  stats: PersistedStats
  onResetClick(this: void): void
  strings: UiStrings['stats']
}

export function StatsFooter({ stats, onResetClick, strings }: StatsFooterProps) {
  // Phase 19 Path A: translate at component layer (D-19 minimal-diff).
  // Compose the last-session line using formatLastSessionDate + formatLastSessionDuration
  // from format.ts (date/duration extraction helpers), then pass through strings.lastSessionPrefix.
  const lastDate =
    stats.lastSessionAtMs !== null && stats.lastSessionDurationSeconds !== null
      ? formatLastSessionDate(stats.lastSessionAtMs)
      : null
  const lastDuration =
    stats.lastSessionDurationSeconds !== null
      ? formatLastSessionDuration(stats.lastSessionDurationSeconds)
      : null
  const lastLine =
    lastDate !== null && lastDuration !== null
      ? strings.lastSessionPrefix(lastDate, lastDuration)
      : null

  return (
    <div className="mt-6 text-center text-sm leading-6 text-[var(--color-breathing-muted)]">
      <p>
        {strings.sessionsCount(stats.totalSessions)} · {strings.totalMinutes(stats.totalElapsedSeconds)}{' '}
        {strings.totalSuffix}
      </p>
      {/* WR-04: line 2 wraps the optional "Last: …" text + Reset button in a
          flex container that handles vertical alignment explicitly. Previously
          the <p> contained a 44 px inline-flex button inside a 24 px line-height
          line-box, producing visible asymmetry between line 1 (24 px) and line 2
          (extended to 44 px only on the line with the button). Using flex with
          items-center centers the button against the surrounding text without
          extending the line-box, and `flex-wrap` keeps narrow viewports tidy.
          A <div role="presentation"> is more semantically appropriate than a
          <p> because the line is a flex layout container, not a paragraph. */}
      <div role="presentation" className="mt-1 flex flex-wrap items-center justify-center gap-x-1">
        {lastLine && <span>{lastLine} ·</span>}
        <button
          type="button"
          onClick={onResetClick}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 underline underline-offset-2 text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        >
          {strings.reset}
        </button>
      </div>
    </div>
  )
}

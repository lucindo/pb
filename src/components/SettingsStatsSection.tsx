import { useState, type ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import type { LocaleId } from '../domain'
import type { PersistedStats } from '../storage'
import { ConfirmDialog } from './ConfirmDialog'
import { SectionCard } from './primitives/SectionCard'
import { SettingsSectionHeader } from './SettingsSectionHeader'

export interface SettingsStatsSectionProps {
  sectionLabel: string
  stat: PersistedStats
  strings: UiStrings['stats']
  locale: LocaleId
  // Display name of the single practice — interpolated into the reset confirm copy.
  practiceName: string
  onReset(this: void): void
}

// Human-readable total practice time. Past 72h it switches to an approximate
// "days" form (with exact hours kept in parentheses, localized via formatDays)
// so a heavy user's lifetime total doesn't grow into an unwieldy hour count.
function formatTotalTime(
  totalSeconds: number,
  formatDays: (days: number, hours: number) => string,
): string {
  if (totalSeconds < 60) return `${String(totalSeconds)}s`
  const minutes = Math.floor(totalSeconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours >= 72) return formatDays(Math.round(hours / 24), hours)
  if (hours > 0) {
    const remMinutes = minutes % 60
    return remMinutes > 0 ? `${String(hours)}h ${String(remMinutes)}m` : `${String(hours)}h`
  }
  return `${String(minutes)}m`
}

function formatLastSession(ms: number | null, locale: LocaleId, empty: string): string {
  if (ms === null) return empty
  return new Date(ms).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

function StatRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <span style={{ color: 'var(--color-breathing-text-soft)', fontSize: 13 }}>{label}</span>
      <span
        style={{
          color: 'var(--color-breathing-text)',
          fontSize: 13,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  )
}

/** Inline Statistics block on the Settings page: the single practice's session
 *  totals plus a reset that confirms through ConfirmDialog before clearing. */
export function SettingsStatsSection({
  sectionLabel,
  stat,
  strings,
  locale,
  practiceName,
  onReset,
}: SettingsStatsSectionProps): ReactElement {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { fields, empty } = strings

  const confirmReset = (): void => {
    onReset()
    setConfirmOpen(false)
  }

  return (
    <>
      <SettingsSectionHeader label={sectionLabel} />
      <SectionCard padding="14px 16px">
        <div className="grid gap-2">
          <StatRow label={fields.sessions} value={String(stat.totalSessions)} />
          <StatRow
            label={fields.totalTime}
            value={formatTotalTime(stat.totalElapsedSeconds, strings.totalTimeDays)}
          />
          <StatRow
            label={fields.lastSession}
            value={formatLastSession(stat.lastSessionAtMs, locale, empty)}
          />
          <div
            className="flex justify-end pt-3"
            style={{ borderTop: '1px solid var(--color-border-soft)', marginTop: 4 }}
          >
            <button
              type="button"
              onClick={() => { setConfirmOpen(true) }}
              className="rounded-full bg-[var(--color-breathing-accent)] px-5 py-2 text-xs font-semibold text-[var(--color-breathing-on-accent)] transition hover:bg-[var(--color-breathing-accent-strong)] active:bg-[var(--color-breathing-accent-strong)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
            >
              {strings.reset}
            </button>
          </div>
        </div>
      </SectionCard>
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={confirmReset}
        onCancel={() => { setConfirmOpen(false) }}
        title={strings.resetConfirm.title(practiceName)}
        confirmLabel={strings.resetConfirm.confirm}
        cancelLabel={strings.resetConfirm.cancel}
        body={strings.resetConfirm.body}
      />
    </>
  )
}

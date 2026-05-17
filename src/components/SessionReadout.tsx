import type { SessionFrame } from '../domain/sessionMath'
import { formatDuration } from '../domain/sessionMath'
import type { SessionStatus } from '../domain/sessionController'
import type { StretchStage } from '../domain/stretchRamp'
import type { UiStrings } from '../content/strings'
import { StatusPanel } from './StatusPanel'

// Exhaustive stage→label map — a new StretchStage without a case is a compile error.
function stageText(stage: StretchStage, strings: UiStrings['readout']): string {
  switch (stage) {
    case 'hold-initial':
      return strings.stageHoldInitial
    case 'ramp':
      return strings.stageRamp
    case 'hold-target':
      return strings.stageHoldTarget
  }
}

export interface SessionReadoutProps {
  frame: SessionFrame | null
  status: SessionStatus
  /** When true, render the translated completion headline. App.tsx sets this when
   *  status === 'complete' && !inSessionView (Phase 19 CR-01 fix — replaces the
   *  hardcoded `state.message: 'Session complete'` literal that bypassed i18n). */
  showCompletionHeadline?: boolean
  strings: UiStrings['readout']
  /** UI-01 / WR-08: when true, the component is rendering the pre-session
   *  lead-in placeholder. The caller commits to providing a non-null `frame`.
   *  The component renders the timer chip (label + formatted duration) and
   *  ignores `status`. Documents the lead-in contract at the component boundary
   *  so callers no longer override `status` to 'idle'. */
  isLeadInPlaceholder?: boolean
}

export function SessionReadout({ frame, status, showCompletionHeadline, strings, isLeadInPlaceholder }: SessionReadoutProps) {
  // UI-01 / WR-08: lead-in placeholder branch fires FIRST so the timer chip
  // renders unconditionally, ignoring status and message. Caller commits to a
  // non-null frame when this is true (typed-only contract — no runtime assert).
  if (isLeadInPlaceholder) {
    const placeholderLabel = frame?.remainingMs === null ? strings.elapsed : strings.remaining
    const placeholderValue = frame
      ? formatDuration(frame.remainingMs ?? frame.elapsedMs)
      : '0:00'
    return (
      <StatusPanel legend={strings.statusLabel} ariaLabel={strings.readoutAriaLabel}>
        <div
          role="status"
          aria-label={strings.announcementAriaLabel}
          aria-live="polite"
          aria-atomic="true"
        />
        <div
          aria-live="off"
          className="mt-4 inline-flex items-baseline gap-3 rounded-full bg-[var(--color-breathing-surface)]/80 px-5 py-3 text-[var(--color-breathing-accent-strong)]"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]">
            {placeholderLabel}
          </span>
          <span className="font-mono text-2xl font-semibold">{placeholderValue}</span>
        </div>
      </StatusPanel>
    )
  }

  if (status === 'idle' && frame === null && !showCompletionHeadline) {
    return null
  }

  const timeLabel = frame?.remainingMs === null ? strings.elapsed : strings.remaining
  const timeValue = frame ? formatDuration(frame.remainingMs ?? frame.elapsedMs) : '0:00'
  // Phase 3 polish: when the session has completed, the "Session complete"
  // headline is the only useful information — the timer chip would just read
  // "Remaining 0:00" forever, which is noise. Hide it on the complete state.
  const showTimeChip = status !== 'complete' && frame !== null
  // A running stretch session shows Stage · Remaining · BPM on one line.
  const isStretchRunning = showTimeChip && frame.currentBpm !== undefined

  return (
    <StatusPanel legend={strings.statusLabel} ariaLabel={strings.readoutAriaLabel}>
      <div
        role="status"
        aria-label={strings.announcementAriaLabel}
        aria-live="polite"
        aria-atomic="true"
      >
        {showCompletionHeadline ? (
          <p className="text-3xl font-semibold text-[var(--color-breathing-accent-strong)]">{strings.sessionComplete}</p>
        ) : null}
      </div>
      {/* D-13/D-14: a running stretch session shows Stage · Remaining · BPM as
          three labeled cells in one row — fits mobile, each value distinct.
          D-15: the Stretch→Settle transition is silent (no cue/marker).
          Standard sessions keep the plain timer chip. */}
      {isStretchRunning && frame.currentBpm !== undefined ? (
        <div
          aria-live="off"
          className="mt-4 flex items-stretch rounded-[1.25rem] bg-[var(--color-breathing-surface)]/80 px-2 py-3 text-[var(--color-breathing-accent-strong)]"
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)]">
              {strings.stageLabel}
            </span>
            <span className="text-lg font-semibold">
              {frame.stage !== undefined ? stageText(frame.stage, strings) : ''}
            </span>
          </div>
          <span className="w-px self-stretch bg-[var(--color-breathing-muted)]/40" />
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)]">
              {timeLabel}
            </span>
            <span className="font-mono text-lg font-semibold">{timeValue}</span>
          </div>
          <span className="w-px self-stretch bg-[var(--color-breathing-muted)]/40" />
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)]">
              {strings.currentBpmLabel}
            </span>
            <span className="font-mono text-lg font-semibold">{frame.currentBpm.toFixed(1)}</span>
          </div>
        </div>
      ) : showTimeChip ? (
        <div
          aria-live="off"
          className="mt-4 inline-flex items-baseline gap-3 rounded-full bg-[var(--color-breathing-surface)]/80 px-5 py-3 text-[var(--color-breathing-accent-strong)]"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]">
            {timeLabel}
          </span>
          <span className="font-mono text-2xl font-semibold">{timeValue}</span>
        </div>
      ) : null}
    </StatusPanel>
  )
}

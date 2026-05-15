import type { SessionFrame } from '../domain/sessionMath'
import { formatDuration } from '../domain/sessionMath'
import type { SessionStatus } from '../domain/sessionController'
import type { StretchStage } from '../domain/stretchRamp'
import type { UiStrings } from '../content/strings'

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
      <section
        aria-label={strings.readoutAriaLabel}
        className="mb-6 rounded-[1.75rem] border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-bg-soft)]/80 p-5 text-center shadow-inner shadow-teal-900/5"
      >
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
      </section>
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

  return (
    <section
      aria-label={strings.readoutAriaLabel}
      className="mb-6 rounded-[1.75rem] border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-bg-soft)]/80 p-5 text-center shadow-inner shadow-teal-900/5"
    >
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
      {showTimeChip ? (
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
      {/* D-13/D-14: live BPM chip + stage label — running stretch sessions only.
          D-15: the ramp→hold-target transition is silent (no cue/marker). */}
      {frame !== null && frame.currentBpm !== undefined && status !== 'complete' ? (
        <>
          <div
            aria-live="off"
            className="mt-2 inline-flex items-baseline gap-2 rounded-full bg-[var(--color-breathing-surface)]/80 px-4 py-2 text-[var(--color-breathing-accent-strong)]"
          >
            <span className="font-mono text-2xl font-semibold">{frame.currentBpm.toFixed(1)}</span>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]">
              {strings.currentBpmLabel}
            </span>
          </div>
          {frame.stage !== undefined ? (
            <p
              aria-live="off"
              className="mt-1 text-center text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]"
            >
              {stageText(frame.stage, strings)}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

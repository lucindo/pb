import {
  formatDuration,
  type SessionFrame,
  type SessionStatus,
  type StretchStage,
} from '../domain'
import type { UiStrings } from '../content/strings'
import { StatusPanel } from './StatusPanel'

// Exhaustive stage→label map — a new StretchStage without a case is a compile error.
function stageText(stage: StretchStage, strings: UiStrings['practice']['readout']): string {
  switch (stage) {
    case 'hold-initial':
      return strings.stageHoldInitial
    case 'ramp':
      return strings.stageRamp
    case 'hold-target':
      return strings.stageHoldTarget
  }
}

// Plain timer chip — standard (non-stretch) sessions.
function TimerChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      aria-live="off"
      className="mt-4 inline-flex items-baseline gap-3 rounded-full bg-[var(--color-breathing-surface)]/80 px-5 py-3 text-[var(--color-breathing-accent-strong)]"
    >
      <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]">
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold">{value}</span>
    </div>
  )
}

// Stretch readout — Stage · Remaining · BPM in three labeled cells. Shared by
// the running stretch session AND the lead-in placeholder so the countdown
// previews the same readout the session will show (D-13/D-14).
function StretchRow({
  frame,
  timeLabel,
  timeValue,
  strings,
}: {
  frame: SessionFrame
  timeLabel: string
  timeValue: string
  strings: UiStrings['practice']['readout']
}) {
  return (
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
        <span className="font-mono text-lg font-semibold">
          {frame.currentBpm !== undefined ? frame.currentBpm.toFixed(1) : ''}
        </span>
      </div>
    </div>
  )
}

export interface SessionReadoutProps {
  frame: SessionFrame | null
  strings: UiStrings['practice']['readout']
}

export interface LeadInSessionReadoutProps extends SessionReadoutProps {
  mode: 'lead-in'
}

export interface ActiveSessionReadoutProps extends SessionReadoutProps {
  mode: 'session'
  status: SessionStatus
  showCompletionHeadline: boolean
}

export type SessionReadoutModeProps =
  | LeadInSessionReadoutProps
  | ActiveSessionReadoutProps

export function SessionReadout(props: SessionReadoutModeProps) {
  const { frame, strings } = props

  if (props.mode === 'lead-in') {
    const placeholderLabel = frame?.remainingMs === null ? strings.elapsed : strings.remaining
    const placeholderValue = frame
      ? formatDuration(frame.remainingMs ?? frame.elapsedMs)
      : '0:00'
    // A stretch session's lead-in preview shows the Stage/Remaining/BPM row —
    // the same readout the running session shows — instead of a plain chip.
    const isStretchPlaceholder = frame !== null && frame.currentBpm !== undefined
    return (
      <StatusPanel legend={strings.statusLabel} ariaLabel={strings.readoutAriaLabel}>
        <div
          role="status"
          aria-label={strings.announcementAriaLabel}
          aria-live="polite"
          aria-atomic="true"
        />
        {isStretchPlaceholder ? (
          <StretchRow frame={frame} timeLabel={placeholderLabel} timeValue={placeholderValue} strings={strings} />
        ) : (
          <TimerChip label={placeholderLabel} value={placeholderValue} />
        )}
      </StatusPanel>
    )
  }

  if (props.status === 'idle' && frame === null && !props.showCompletionHeadline) {
    return null
  }

  const timeLabel = frame?.remainingMs === null ? strings.elapsed : strings.remaining
  const timeValue = frame ? formatDuration(frame.remainingMs ?? frame.elapsedMs) : '0:00'
  // Phase 3 polish: when the session has completed, the "Session complete"
  // headline is the only useful information — the timer chip would just read
  // "Remaining 0:00" forever, which is noise. Hide it on the complete state.
  const showTimeChip = props.status !== 'complete' && frame !== null
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
        {props.showCompletionHeadline ? (
          <p className="text-3xl font-semibold text-[var(--color-breathing-accent-strong)]">{strings.sessionComplete}</p>
        ) : null}
      </div>
      {/* D-13/D-14: a running stretch session shows Stage · Remaining · BPM as
          three labeled cells in one row — fits mobile, each value distinct.
          D-15: the Stretch→Settle transition is silent (no cue/marker).
          Standard sessions keep the plain timer chip. */}
      {isStretchRunning ? (
        <StretchRow frame={frame} timeLabel={timeLabel} timeValue={timeValue} strings={strings} />
      ) : showTimeChip ? (
        <TimerChip label={timeLabel} value={timeValue} />
      ) : null}
    </StatusPanel>
  )
}

import type { SessionFrame } from '../domain/sessionMath'
import { formatDuration } from '../domain/sessionMath'
import type { SessionStatus } from '../domain/sessionController'

export interface SessionReadoutProps {
  frame: SessionFrame | null
  status: SessionStatus
  message?: 'Session complete'
  /** UI-01 / WR-08: when true, the component is rendering the pre-session
   *  lead-in placeholder. The caller commits to providing a non-null `frame`.
   *  The component renders the timer chip (label + formatted duration) and
   *  ignores `status` and `message`. Documents the lead-in contract at the
   *  component boundary so callers no longer override `status` to 'idle'. */
  isLeadInPlaceholder?: boolean
}

export function SessionReadout({ frame, status, message, isLeadInPlaceholder }: SessionReadoutProps) {
  // UI-01 / WR-08: lead-in placeholder branch fires FIRST so the timer chip
  // renders unconditionally, ignoring status and message. Caller commits to a
  // non-null frame when this is true (typed-only contract — no runtime assert).
  if (isLeadInPlaceholder) {
    const placeholderLabel = frame?.remainingMs === null ? 'Elapsed' : 'Remaining'
    const placeholderValue = frame
      ? formatDuration(frame.remainingMs ?? frame.elapsedMs)
      : '0:00'
    return (
      <section
        aria-label="Session readout"
        className="mb-6 rounded-[1.75rem] border border-teal-100 bg-teal-50/80 p-5 text-center shadow-inner shadow-teal-900/5"
      >
        <div
          role="status"
          aria-label="Session announcement"
          aria-live="polite"
          aria-atomic="true"
        />
        <div
          aria-live="off"
          className="mt-4 inline-flex items-baseline gap-3 rounded-full bg-white/80 px-5 py-3 text-slate-900"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
            {placeholderLabel}
          </span>
          <span className="font-mono text-2xl font-semibold">{placeholderValue}</span>
        </div>
      </section>
    )
  }

  if (status === 'idle' && frame === null && message === undefined) {
    return null
  }

  const timeLabel = frame?.remainingMs === null ? 'Elapsed' : 'Remaining'
  const timeValue = frame ? formatDuration(frame.remainingMs ?? frame.elapsedMs) : '0:00'
  // Phase 3 polish: when the session has completed, the "Session complete"
  // headline is the only useful information — the timer chip would just read
  // "Remaining 0:00" forever, which is noise. Hide it on the complete state.
  const showTimeChip = status !== 'complete' && frame !== null

  return (
    <section
      aria-label="Session readout"
      className="mb-6 rounded-[1.75rem] border border-teal-100 bg-teal-50/80 p-5 text-center shadow-inner shadow-teal-900/5"
    >
      <div
        role="status"
        aria-label="Session announcement"
        aria-live="polite"
        aria-atomic="true"
      >
        {message ? (
          <p className="text-3xl font-semibold text-teal-900">{message}</p>
        ) : null}
      </div>
      {showTimeChip ? (
        <div
          aria-live="off"
          className="mt-4 inline-flex items-baseline gap-3 rounded-full bg-white/80 px-5 py-3 text-slate-900"
        >
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
            {timeLabel}
          </span>
          <span className="font-mono text-2xl font-semibold">{timeValue}</span>
        </div>
      ) : null}
    </section>
  )
}

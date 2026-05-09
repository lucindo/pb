import type { SessionFrame } from '../domain/sessionMath'
import { formatDuration } from '../domain/sessionMath'
import type { SessionStatus } from '../domain/sessionController'

export interface SessionReadoutProps {
  frame: SessionFrame | null
  status: SessionStatus
  message?: 'Session complete'
}

export function SessionReadout({ frame, status, message }: SessionReadoutProps) {
  if (status === 'idle' && frame === null && message === undefined) {
    return null
  }

  const timeLabel = frame?.remainingMs === null ? 'Elapsed' : 'Remaining'
  const timeValue = frame ? formatDuration(frame.remainingMs ?? frame.elapsedMs) : '0:00'

  return (
    <section
      aria-label="Session readout"
      className="mb-6 rounded-[1.75rem] border border-teal-100 bg-teal-50/80 p-5 text-center shadow-inner shadow-teal-900/5"
    >
      <div role="status" aria-label="Session readout" aria-live="polite" aria-atomic="true">
        {message ? (
          <p className="text-3xl font-semibold text-teal-900">{message}</p>
        ) : null}
      </div>
      <div
        aria-live="off"
        className="mt-4 inline-flex items-baseline gap-3 rounded-full bg-white/80 px-5 py-3 text-slate-900"
      >
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
          {timeLabel}
        </span>
        <span className="font-mono text-2xl font-semibold">{timeValue}</span>
      </div>
    </section>
  )
}

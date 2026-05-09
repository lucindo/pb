import { DURATION_OPTIONS } from '../domain/settings'

export interface RunningDurationControlProps {
  lockedDurationMinutes: number | 'open-ended'
  selectedDurationMinutes: number | 'open-ended'
  onIncrease(durationMinutes: number): void
}

export function RunningDurationControl({
  lockedDurationMinutes,
  selectedDurationMinutes,
  onIncrease,
}: RunningDurationControlProps) {
  if (lockedDurationMinutes === 'open-ended' || selectedDurationMinutes === 'open-ended') {
    return null
  }

  const minimumDuration = Math.max(lockedDurationMinutes, selectedDurationMinutes)
  const availableDurations = DURATION_OPTIONS.flatMap((duration) =>
    typeof duration === 'number' && duration > minimumDuration ? [duration] : [],
  )

  if (availableDurations.length === 0) {
    return null
  }

  return (
    <fieldset
      aria-label="Extend duration"
      className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-left shadow-sm shadow-teal-900/5"
    >
      <legend className="px-1 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
        Extend duration
      </legend>
      <p className="mt-2 text-sm text-slate-600">Timed sessions can only be extended.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {availableDurations.map((duration) => (
          <button
            key={duration}
            type="button"
            className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            onClick={() => onIncrease(duration)}
          >
            Extend to {duration} min
          </button>
        ))}
      </div>
    </fieldset>
  )
}

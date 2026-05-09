import type { SessionFrame } from '../domain/sessionMath'

export interface BreathingShapeProps {
  frame: SessionFrame | null
}

export function BreathingShape({ frame }: BreathingShapeProps) {
  if (frame === null) {
    return null
  }

  const progress = Math.min(1, Math.max(0, frame.phaseProgress))
  const scale = frame.phase === 'in' ? 0.78 + progress * 0.22 : 1 - progress * 0.22

  return (
    <div
      role="img"
      aria-label={`Breathing shape: ${frame.phaseLabel}`}
      data-phase={frame.phase}
      data-progress={progress.toFixed(3)}
      className="mx-auto mb-5 grid size-40 place-items-center rounded-full border-4 border-teal-200 bg-gradient-to-br from-teal-100 to-emerald-50 text-lg font-semibold text-teal-900 shadow-lg shadow-teal-900/10 transition-transform duration-200"
      style={{ transform: `scale(${scale})` }}
    >
      <span className="rounded-full bg-white/75 px-4 py-2 shadow-sm">{frame.phaseLabel}</span>
    </div>
  )
}

import type { SessionStatus } from '../domain/sessionController'

export interface SessionControlsProps {
  status: SessionStatus
  onStart(): void
  onEnd(): void
}

export function SessionControls({ status, onStart, onEnd }: SessionControlsProps) {
  const isRunning = status === 'running'

  return (
    <button
      type="button"
      className="mt-6 w-full rounded-full bg-teal-700 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-200"
      onClick={isRunning ? onEnd : onStart}
    >
      {isRunning ? 'End session' : 'Start session'}
    </button>
  )
}

import { BreathingShape } from '../components/BreathingShape'
import { SettingsForm } from '../components/SettingsForm'
import { SessionReadout } from '../components/SessionReadout'
import { SessionControls } from '../components/SessionControls'
import { useSessionEngine } from '../hooks/useSessionEngine'

export default function App() {
  const session = useSessionEngine()
  const { state } = session
  const isRunning = state.status === 'running'
  const endSession = () => {
    if (state.status === 'running' && state.lockedSettings.durationMinutes !== 'open-ended') {
      if (!window.confirm('End this timed session?')) {
        return
      }
    }

    session.end()
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-breathing-bg-soft),_var(--color-breathing-bg)_48%,_#f8fffc)] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col items-center justify-center text-center sm:min-h-[calc(100vh-4rem)]">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-teal-700">
          HRV practice
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          HRV breathing timer
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
          Choose a calm, supported timing pattern, then start a continuous inhale
          and exhale session with no pauses.
        </p>
        <div className="mt-10 w-full rounded-[2rem] border border-white/80 bg-white/70 p-5 shadow-[var(--shadow-breathing-card)] backdrop-blur sm:p-6">
          <BreathingShape frame={session.currentFrame} />
          <SessionReadout
            frame={session.currentFrame}
            status={state.status}
            message={state.status === 'complete' ? state.message : undefined}
          />
          <SettingsForm
            settings={state.selectedSettings}
            isRunning={isRunning}
            onChange={session.setSelectedSettings}
            onExtendDuration={session.extendDuration}
          />
          <SessionControls status={state.status} onStart={session.start} onEnd={endSession} />
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Timing stays local to this browser and continuously alternates In and Out with no
            pause segment.
          </p>
        </div>
      </section>
    </main>
  )
}

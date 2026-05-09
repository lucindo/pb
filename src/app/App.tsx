import { SettingsForm } from '../components/SettingsForm'
import { SessionControls } from '../components/SessionControls'
import { useSessionEngine } from '../hooks/useSessionEngine'

export default function App() {
  const session = useSessionEngine()
  const { state } = session
  const isRunning = state.status === 'running'

  return (
    <main className="min-h-screen bg-[var(--color-breathing-bg)] px-6 py-8 text-slate-900">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center text-center">
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
        <div className="mt-10 w-full rounded-[2rem] border border-white/70 bg-white/60 p-5 shadow-xl shadow-teal-950/5 backdrop-blur sm:p-6">
          <SettingsForm
            settings={state.selectedSettings}
            isRunning={isRunning}
            onChange={session.setSelectedSettings}
          />
          <SessionControls status={state.status} onStart={session.start} onEnd={session.end} />
        </div>
      </section>
    </main>
  )
}

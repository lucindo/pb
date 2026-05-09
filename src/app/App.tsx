import { useState } from 'react'

import { SettingsForm } from '../components/SettingsForm'
import { DEFAULT_SETTINGS, type SessionSettings } from '../domain/settings'

export default function App() {
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS)

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
          <SettingsForm settings={settings} isRunning={false} onChange={setSettings} />
          <button
            type="button"
            className="mt-6 w-full rounded-full bg-teal-700 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-200"
          >
            Start session
          </button>
        </div>
      </section>
    </main>
  )
}

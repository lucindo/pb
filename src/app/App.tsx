import { useEffect, useState } from 'react'

import { BreathingShape } from '../components/BreathingShape'
import { EndSessionDialog } from '../components/EndSessionDialog'
import { SettingsForm } from '../components/SettingsForm'
import { SessionReadout } from '../components/SessionReadout'
import { SessionControls } from '../components/SessionControls'
import { useSessionEngine } from '../hooks/useSessionEngine'

export default function App() {
  const session = useSessionEngine()
  const { state } = session
  const isRunning = state.status === 'running'
  const [endDialogOpen, setEndDialogOpen] = useState<boolean>(false)

  // WR-01: Auto-close the confirmation modal when the session leaves the running
  // state on its own (e.g. timer reaches the end while the modal is open). Without
  // this, the modal would float over a "Session complete" readout for an arbitrary
  // window until the user dismissed it.
  useEffect(() => {
    if (state.status !== 'running' && endDialogOpen) {
      setEndDialogOpen(false)
    }
  }, [state.status, endDialogOpen])

  // D-14: open-ended sessions still end directly; only timed sessions raise the modal.
  // D-13: when the modal opens, the session timing clock keeps running (no session.pause; no setTimeout).
  const requestEnd = () => {
    if (state.status === 'running' && state.lockedSettings.durationMinutes !== 'open-ended') {
      setEndDialogOpen(true)
      return
    }
    session.end()
  }

  const confirmEnd = () => {
    setEndDialogOpen(false)
    session.end()
  }

  const cancelEnd = () => {
    setEndDialogOpen(false)
    // session continues — clock keeps running (D-13). No additional work.
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
          <SessionControls status={state.status} onStart={session.start} onEnd={requestEnd} />
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Timing stays local to this browser and continuously alternates In and Out with no
            pause segment.
          </p>
        </div>
      </section>
      <EndSessionDialog
        open={endDialogOpen}
        onConfirm={confirmEnd}
        onCancel={cancelEnd}
      />
    </main>
  )
}

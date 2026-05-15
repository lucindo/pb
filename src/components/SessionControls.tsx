import type { SessionStatus } from '../domain/sessionController'
import type { UiStrings } from '../content/strings'
import { MuteToggle } from './MuteToggle'

export interface SessionControlsProps {
  status: SessionStatus
  onStart(this: void): void
  onEnd(this: void): void
  strings: UiStrings['controls']
  // Phase 3 (D-05): inline mute toggle next to the primary action.
  // OPTIONAL — when ANY of the three new audio props is undefined, the legacy
  // single-button layout is rendered instead. This keeps the Phase 1/2 App tests
  // (which never pass these props) green throughout Wave 3 until Plan 04 wires
  // App.tsx → SessionControls. Per checker B3, partial wiring during dev never
  // produces a half-broken toggle: all three must be defined or none render.
  muted?: boolean
  audioAvailable?: boolean
  /** Plan 06 D-32: when true, MuteToggle morphs into a Resume affordance. The
   *  click handler at the App level dispatches audio.resume() synchronously
   *  inside the gesture chain before flipping mute (D-31/D-33). */
  needsResume?: boolean
  /** A11Y-01: forwarded verbatim to MuteToggle.resumeHintId. App owns the id
   *  string (the aria-live resume-hint region lives at the App level). Optional
   *  on this interface to preserve backward compatibility with legacy-layout
   *  callers that never render MuteToggle. */
  resumeHintId?: string
  onMuteToggle?(this: void): void
}

export function SessionControls({
  status,
  onStart,
  onEnd,
  strings,
  muted,
  audioAvailable,
  needsResume,
  resumeHintId,
  onMuteToggle,
}: SessionControlsProps) {
  const isRunning = status === 'running'
  // Per checker B3: render the inline-mute layout ONLY when all three new audio
  // props are wired. Partial wiring (e.g. just `muted`) falls back to legacy.
  const showMuteToggle =
    muted !== undefined && audioAvailable !== undefined && onMuteToggle !== undefined

  if (!showMuteToggle) {
    // LEGACY Phase-1 layout — preserved verbatim from the pre-Phase-3 file.
    // Phase 1/2 callers reach this branch (App.tsx tests in App.session.test.tsx
    // and App.dialog.test.tsx). All Phase 3 callers (Plan 04 App.tsx) pass the
    // three audio props and hit the inline-mute branch below.
    return (
      <button
        type="button"
        className="mt-6 min-h-11 w-full rounded-full bg-[var(--color-breathing-accent-strong)] px-6 py-4 text-lg font-semibold text-[var(--color-breathing-on-accent)] shadow-lg shadow-teal-900/20 transition hover:bg-[var(--color-breathing-accent)] active:bg-[var(--color-breathing-accent-strong)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        onClick={isRunning ? onEnd : onStart}
      >
        {isRunning ? strings.endSession : strings.startSession}
      </button>
    )
  }

  // Phase 3 inline-mute layout (D-05). Wrapper claims `mt-6` (the legacy button
  // class moved out so spacing is identical); primary button uses `flex-1` so
  // MuteToggle's size-11 occupies a fixed slot on the right. All other Phase 1
  // button classes are preserved EXCEPT mt-6 (moved to wrapper) and w-full
  // (replaced by flex-1).
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        type="button"
        className="min-h-11 flex-1 rounded-full bg-[var(--color-breathing-accent-strong)] px-6 py-4 text-lg font-semibold text-[var(--color-breathing-on-accent)] shadow-lg shadow-teal-900/20 transition hover:bg-[var(--color-breathing-accent)] active:bg-[var(--color-breathing-accent-strong)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        onClick={isRunning ? onEnd : onStart}
      >
        {isRunning ? strings.endSession : strings.startSession}
      </button>
      <MuteToggle
        muted={muted}
        audioAvailable={audioAvailable}
        needsResume={needsResume}
        resumeHintId={resumeHintId ?? ''}
        onToggle={onMuteToggle}
      />
    </div>
  )
}

// Phase 3 D-05/D-06/D-07/D-10/D-17: inline icon-button toggle for the audio cues.
// Pure presentational layer — receives props from the app view model and emits
// a click callback. No hook calls, no AudioContext access.
//
// Class string mirrors src/components/SettingsStepper.tsx:42-50 (the Phase 2
// icon-button baseline) verbatim, EXCEPT:
// - size-12 → size-11 (44 px exact match for the Phase 2 D-17 hit-area floor)
// - text-2xl + leading-none dropped (this button hosts an SVG icon, not a glyph)

import type { UiStrings } from '../content/strings'

export interface MuteToggleProps {
  muted: boolean
  audioAvailable: boolean
  /** Plan 06 D-32: when true, button morphs into a resume affordance —
   *  refresh-arrow glyph + aria-label from strings.resume. Priority: audioAvailable=false
   *  outranks; muted is ignored in label and aria-pressed is undefined. */
  needsResume?: boolean
  /** A11Y-01: id of the App-level aria-live resume-hint region. When needsResume
   *  is true, aria-describedby is set to this id so screen readers announce the
   *  hint text. When needsResume is false, aria-describedby is omitted to avoid
   *  empty-content announcements (the live region text is the empty string when
   *  not in needs-resume mode). */
  resumeHintId: string
  strings: UiStrings['mute']
  onToggle(this: void): void
}

export function MuteToggle({ muted, audioAvailable, needsResume, resumeHintId, strings, onToggle }: MuteToggleProps) {
  // Plan 06 D-32: label priority — unavailable > needsResume > muted/unmuted.
  // Phase 3 D-10 'unavailable' takes highest priority and outranks needsResume because
  // in practice the hook's audioStatus state machine makes them mutually exclusive
  // (audioStatus='unavailable' suppresses 'needs-resume') — but the priority order
  // is defensive against any future state surface change.
  const label = !audioAvailable
    ? strings.unavailable
    : needsResume
      ? strings.resume
      : muted
        ? strings.unmute
        : strings.mute

  return (
    <button
      type="button"
      aria-pressed={needsResume ? undefined : muted}
      aria-describedby={needsResume ? resumeHintId : undefined}
      aria-label={label}
      title={label}
      disabled={!audioAvailable}
      onClick={onToggle}
      className="grid size-11 min-h-11 min-w-11 place-items-center rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {needsResume ? <ResumeIcon /> : muted ? <SpeakerSlashIcon /> : <SpeakerIcon />}
    </button>
  )
}

// 03-PATTERNS.md line 538: 24-line inline SVG per icon is sufficient — no asset
// bundle, no icon-font dependency, ships with the component.

function SpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Speaker body */}
      <path d="M11 5L6 9H2v6h4l5 4z" />
      {/* Sound waves */}
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function SpeakerSlashIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Speaker body */}
      <path d="M11 5L6 9H2v6h4l5 4z" />
      {/* Slash overlay (X over the waves) */}
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  )
}

// Plan 06 D-32 / discretion #1: refresh-arrow glyph for the resume affordance.
// Calm/meditative — suggests "resume" not "warning"; no red, no alarm. Same 24×24
// viewBox + currentColor stroke convention as SpeakerIcon / SpeakerSlashIcon
// (Pattern G — single icon-bundling convention across the component).
function ResumeIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Refresh arc */}
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      {/* Arrowhead */}
      <polyline points="3 3 3 8 8 8" />
    </svg>
  )
}

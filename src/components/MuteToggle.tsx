// Inline icon-button toggle for the audio cues. Pure presentational layer —
// receives props from the app view model and emits a click callback.
// No hook calls, no AudioContext access.
//
// Chrome: border-soft 1px + breathing-surface bg + text-soft icon stroke
// (currentColor). Hit area 44px exact via size-11. No shadow (flat treatment).
// Hover/active drop to bg-soft; focus ring stays on accent for keyboard
// visibility; disabled drops to 45% opacity.

import type { ReactElement } from 'react'
import { RefreshIcon } from './icons/RefreshIcon'
import { SpeakerIcon } from './icons/SpeakerIcon'
import { SpeakerMutedIcon } from './icons/SpeakerMutedIcon'
import type { UiStrings } from '../content/strings'

export interface MuteToggleProps {
  muted: boolean
  audioAvailable: boolean
  /** When true, button morphs into a resume affordance —
   *  refresh-arrow glyph + aria-label from strings.resume. Priority: audioAvailable=false
   *  outranks; muted is ignored in label and aria-pressed is undefined. */
  needsResume?: boolean | undefined
  /** A11Y-01: id of the App-level aria-live resume-hint region. When needsResume
   *  is true AND this id is provided, aria-describedby is set so screen readers
   *  announce the hint text. When needsResume is false (or the id is omitted —
   *  e.g. the navi audio VM has no resume flow), aria-describedby is omitted
   *  to avoid empty-content announcements. */
  resumeHintId?: string | undefined
  strings: UiStrings['practice']['mute']
  onToggle(this: void): void
}

export function MuteToggle({ muted, audioAvailable, needsResume, resumeHintId, strings, onToggle }: MuteToggleProps): ReactElement {
  // Label priority (defensive — states are mutually exclusive in practice):
  // unavailable > needsResume > muted/unmuted.
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
      aria-describedby={needsResume && resumeHintId !== undefined ? resumeHintId : undefined}
      aria-label={label}
      title={label}
      disabled={!audioAvailable}
      onClick={onToggle}
      className="grid size-11 min-h-11 min-w-11 place-items-center rounded-full border border-[var(--color-border-soft)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-text-soft)] transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {needsResume ? (
        <RefreshIcon width={20} height={20} strokeWidth={2} />
      ) : muted ? (
        <SpeakerMutedIcon width={20} height={20} strokeWidth={2} />
      ) : (
        <SpeakerIcon width={20} height={20} strokeWidth={2} />
      )}
    </button>
  )
}

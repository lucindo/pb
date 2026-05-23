import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { MuteToggle } from './MuteToggle'

export interface SessionAudioToggleProps {
  muted: boolean
  audioAvailable: boolean
  needsResume: boolean
  resumeHintId: string
  onMuteToggle(this: void): void
}

export interface SessionActionRowProps {
  primaryLabel: string
  onPrimaryClick(this: void): void
  audio: SessionAudioToggleProps
  muteStrings: UiStrings['practice']['mute']
}

export function SessionActionRow({
  primaryLabel,
  onPrimaryClick,
  audio,
  muteStrings,
}: SessionActionRowProps): ReactElement {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        type="button"
        className="min-h-11 flex-1 rounded-full bg-[var(--color-breathing-accent-strong)] px-6 py-4 text-lg font-semibold text-[var(--color-breathing-on-accent)] shadow-lg shadow-teal-900/20 transition hover:bg-[var(--color-breathing-accent)] active:bg-[var(--color-breathing-accent-strong)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        onClick={onPrimaryClick}
      >
        {primaryLabel}
      </button>
      <MuteToggle
        muted={audio.muted}
        audioAvailable={audio.audioAvailable}
        needsResume={audio.needsResume}
        resumeHintId={audio.resumeHintId}
        strings={muteStrings}
        onToggle={audio.onMuteToggle}
      />
    </div>
  )
}

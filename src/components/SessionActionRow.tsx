import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { MuteToggle } from './MuteToggle'

export interface SessionAudioToggleProps {
  muted: boolean
  audioAvailable: boolean
  needsResume: boolean
  /** Required when needsResume can become true; omitted by the navi audio VM
   *  which has no resume flow. Forwarded as-is to MuteToggle. */
  resumeHintId?: string
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
      {/* Primary button: accent bg, on-accent text, weight 600 / 15 px /
          tracking 0.06em, py-4, no shadow. */}
      <button
        type="button"
        className="flex-1 rounded-full bg-[var(--color-breathing-accent)] py-4 text-[15px] font-semibold tracking-[0.06em] text-[var(--color-breathing-on-accent)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 motion-reduce:transition-none"
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

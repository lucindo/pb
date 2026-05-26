import type { ReactElement } from 'react'

import { SessionActionRow } from '../components/SessionActionRow'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'

type AudioControls = AppViewModel['audio']
type PracticeControlsViewModel = AppViewModel['practiceControls']

/** Two audio sources by design:
 *  - `controls.audio` is the per-practice audio toggle VM (breathing's audio
 *    for resonant/stretch, a navi-specific VM with needsResume=false for navi).
 *    Drives the mute button.
 *  - `audio` is the breathing VM unconditionally and drives the global
 *    aria-live resume-hint region. Breathing's WebAudio context is the only
 *    one that needs resume hints; the live region announces audio-paused state
 *    regardless of which practice is foregrounded so screen readers always
 *    hear the hint once.
 *  Renaming would clash with existing consumers; this comment is the
 *  contract. */
interface PracticeControlsViewProps {
  controls: PracticeControlsViewModel
  audio: AudioControls
}

export function PracticeControlsView({
  controls,
  audio,
}: PracticeControlsViewProps): ReactElement {
  const mute = useUiStrings().practice.mute
  return (
    <>
      <SessionActionRow
        primaryLabel={controls.primaryLabel}
        onPrimaryClick={controls.onPrimaryClick}
        audio={controls.audio}
        muteStrings={mute}
      />
      <AudioResumeAnnouncement audio={audio} announcement={mute.audioPausedAnnouncement} />
    </>
  )
}

interface AudioResumeAnnouncementProps {
  audio: AudioControls
  announcement: string
}

function AudioResumeAnnouncement({
  audio,
  announcement,
}: AudioResumeAnnouncementProps): ReactElement {
  return (
    <div id={audio.resumeHintId} role="status" aria-live="polite" className="sr-only">
      {audio.needsResume ? announcement : ''}
    </div>
  )
}

import type { ReactElement } from 'react'

import { SessionActionRow } from '../components/SessionActionRow'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'

type PracticeControlsViewModel = AppViewModel['practiceControls']
type AudioToggle = PracticeControlsViewModel['audio']

/** `controls.audio` is the audio toggle VM — it drives both the mute button
 *  and the aria-live resume-hint region announcing audio-paused state. */
interface PracticeControlsViewProps {
  controls: PracticeControlsViewModel
}

export function PracticeControlsView({
  controls,
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
      <AudioResumeAnnouncement audio={controls.audio} announcement={mute.audioPausedAnnouncement} />
    </>
  )
}

interface AudioResumeAnnouncementProps {
  audio: AudioToggle
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

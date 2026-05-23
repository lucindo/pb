import type { ReactElement } from 'react'

import { SessionActionRow } from '../components/SessionActionRow'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'

type AudioControls = AppViewModel['audio']
type PracticeControlsViewModel = AppViewModel['practiceControls']

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

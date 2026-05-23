import type { ReactElement } from 'react'

import { SessionActionRow } from '../components/SessionActionRow'
import type { AppViewModel } from './appViewModel'

type UiStrings = AppViewModel['uiStrings']
type AudioControls = AppViewModel['audio']
type PracticeControlsViewModel = AppViewModel['practiceControls']

interface PracticeControlsViewProps {
  controls: PracticeControlsViewModel
  audio: AudioControls
  uiStrings: UiStrings
}

export function PracticeControlsView({
  controls,
  audio,
  uiStrings,
}: PracticeControlsViewProps): ReactElement {
  return (
    <>
      <SessionActionRow
        primaryLabel={controls.primaryLabel}
        onPrimaryClick={controls.onPrimaryClick}
        audio={controls.audio}
        muteStrings={uiStrings.practice.mute}
      />
      <AudioResumeAnnouncement
        audio={audio}
        announcement={uiStrings.practice.mute.audioPausedAnnouncement}
      />
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

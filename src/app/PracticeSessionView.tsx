import type { ReactElement } from 'react'

import type { AppViewModel } from './appViewModel'
import { BreathingSessionSurface } from './BreathingSessionSurface'
import { NaviKriyaSessionSurface } from './NaviKriyaSessionSurface'

type UiStrings = AppViewModel['uiStrings']
type PracticeSessionViewModel = AppViewModel['practiceSession']

interface PracticeSessionViewProps {
  session: PracticeSessionViewModel
  uiStrings: UiStrings
}

export function PracticeSessionView({
  session,
  uiStrings,
}: PracticeSessionViewProps): ReactElement {
  if (session.kind === 'naviKriya') {
    return (
      <NaviKriyaSessionSurface
        presentation={session.presentation}
        breathingStrings={uiStrings.breathing}
        readoutStrings={uiStrings.readout}
        nkReadoutStrings={uiStrings.nkReadout}
      />
    )
  }

  return (
    <BreathingSessionSurface
      presentation={session.presentation}
      breathingStrings={uiStrings.breathing}
      readoutStrings={uiStrings.readout}
    />
  )
}

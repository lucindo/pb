import type { ReactElement } from 'react'

import type { OrbIdleBehavior } from '../featureFlags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'
import { BreathingSessionSurface } from './BreathingSessionSurface'

type PracticeSessionViewModel = AppViewModel['practiceSession']

interface PracticeSessionViewProps {
  session: PracticeSessionViewModel
  idleMode: OrbIdleBehavior
}

export function PracticeSessionView({
  session,
  idleMode,
}: PracticeSessionViewProps): ReactElement {
  const practice = useUiStrings().practice

  return (
    <BreathingSessionSurface
      presentation={session.presentation}
      breathingStrings={practice.breathing}
      readoutStrings={practice.readout}
      bpmUnit={practice.settingsForm.bpmUnit}
      idleMode={idleMode}
    />
  )
}

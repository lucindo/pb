import type { ReactElement } from 'react'

import type { BreathingShapeVariant, OrbIdleBehavior, RingCueStyle } from '../featureFlags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'
import { BreathingSessionSurface } from './BreathingSessionSurface'

type PracticeSessionViewModel = AppViewModel['practiceSession']

interface PracticeSessionViewProps {
  session: PracticeSessionViewModel
  variant: BreathingShapeVariant
  idleMode: OrbIdleBehavior
  ringCue: RingCueStyle
}

export function PracticeSessionView({
  session,
  variant,
  idleMode,
  ringCue,
}: PracticeSessionViewProps): ReactElement {
  const practice = useUiStrings().practice

  return (
    <BreathingSessionSurface
      presentation={session.presentation}
      breathingStrings={practice.breathing}
      readoutStrings={practice.readout}
      bpmUnit={practice.settingsForm.bpmUnit}
      variant={variant}
      idleMode={idleMode}
      ringCue={ringCue}
    />
  )
}

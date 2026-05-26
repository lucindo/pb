import type { ReactElement } from 'react'

import type { BreathingShapeVariant, OrbIdleBehavior, RingCueStyle } from '../featureFlags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'
import { BreathingSessionSurface } from './BreathingSessionSurface'
import { NaviKriyaSessionSurface } from './NaviKriyaSessionSurface'

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

  if (session.kind === 'naviKriya') {
    return (
      <NaviKriyaSessionSurface
        presentation={session.presentation}
        breathingStrings={practice.breathing}
        readoutStrings={practice.readout}
        nkReadoutStrings={practice.nkReadout}
        variant={variant}
        idleMode={idleMode}
        ringCue={ringCue}
      />
    )
  }

  // Resonant + stretch render through the same surface — stretch frames
  // piggyback on the breathing controller. The kind discriminator is kept
  // explicit so a future split (or a new practice that does not share the
  // breathing controller) becomes a missing-arm type error.
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

import type { ReactElement } from 'react'

import type { BreathingShapeVariant } from '../featureFlags'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'
import { BreathingSessionSurface } from './BreathingSessionSurface'
import { NaviKriyaSessionSurface } from './NaviKriyaSessionSurface'

type PracticeSessionViewModel = AppViewModel['practiceSession']

interface PracticeSessionViewProps {
  session: PracticeSessionViewModel
  variant: BreathingShapeVariant
}

export function PracticeSessionView({
  session,
  variant,
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
      />
    )
  }

  return (
    <BreathingSessionSurface
      presentation={session.presentation}
      breathingStrings={practice.breathing}
      readoutStrings={practice.readout}
      variant={variant}
    />
  )
}

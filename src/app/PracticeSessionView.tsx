import type { ReactElement } from 'react'

import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppViewModel } from './appViewModel'
import { BreathingSessionSurface } from './BreathingSessionSurface'

type PracticeSessionViewModel = AppViewModel['practiceSession']

interface PracticeSessionViewProps {
  session: PracticeSessionViewModel
}

export function PracticeSessionView({
  session,
}: PracticeSessionViewProps): ReactElement {
  const practice = useUiStrings().practice

  return (
    <BreathingSessionSurface
      presentation={session.presentation}
      breathingStrings={practice.breathing}
      readoutStrings={practice.readout}
    />
  )
}

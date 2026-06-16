import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { BreathingRing } from '../components/BreathingRing'
import { SessionReadout } from '../components/SessionReadout'
import type { BreathingPresentation } from './sessionPresentation'

export interface BreathingSessionSurfaceProps {
  presentation: BreathingPresentation
  breathingStrings: UiStrings['practice']['breathing']
  readoutStrings: UiStrings['practice']['readout']
}

export function BreathingSessionSurface({
  presentation,
  breathingStrings,
  readoutStrings,
}: BreathingSessionSurfaceProps): ReactElement {
  return (
    <>
      <BreathingRing
        frame={presentation.shape.frame}
        leadInDigit={presentation.shape.leadInDigit}
        strings={breathingStrings}
        showCompletion={presentation.readout.showCompletionHeadline}
      />
      {presentation.readout.isLeadInPlaceholder ? (
        <SessionReadout
          mode="lead-in"
          frame={presentation.readout.frame}
          strings={readoutStrings}
        />
      ) : (
        <SessionReadout
          mode="session"
          frame={presentation.readout.frame}
          status={presentation.readout.status}
          showCompletionHeadline={presentation.readout.showCompletionHeadline}
          strings={readoutStrings}
        />
      )}
    </>
  )
}

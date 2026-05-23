import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { OrbShape } from '../components/OrbShape'
import { SessionReadout } from '../components/SessionReadout'
import type { BreathingPresentation } from './sessionPresentation'

export interface BreathingSessionSurfaceProps {
  presentation: BreathingPresentation
  breathingStrings: UiStrings['breathing']
  readoutStrings: UiStrings['readout']
}

export function BreathingSessionSurface({
  presentation,
  breathingStrings,
  readoutStrings,
}: BreathingSessionSurfaceProps): ReactElement {
  return (
    <>
      <OrbShape
        cue={presentation.shape.cue}
        frame={presentation.shape.frame}
        leadInDigit={presentation.shape.leadInDigit}
        strings={breathingStrings}
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

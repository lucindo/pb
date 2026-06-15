import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { OrbShape } from '../components/OrbShape'
import { SessionReadout } from '../components/SessionReadout'
import type { BreathingPresentation } from './sessionPresentation'

export interface BreathingSessionSurfaceProps {
  presentation: BreathingPresentation
  breathingStrings: UiStrings['practice']['breathing']
  readoutStrings: UiStrings['practice']['readout']
  bpmUnit: string
}

export function BreathingSessionSurface({
  presentation,
  breathingStrings,
  readoutStrings,
  bpmUnit,
}: BreathingSessionSurfaceProps): ReactElement {
  return (
    <>
      <OrbShape
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
          bpm={presentation.readout.bpm}
          ratio={presentation.readout.ratio}
          bpmUnit={bpmUnit}
        />
      ) : (
        <SessionReadout
          mode="session"
          frame={presentation.readout.frame}
          status={presentation.readout.status}
          showCompletionHeadline={presentation.readout.showCompletionHeadline}
          strings={readoutStrings}
          bpm={presentation.readout.bpm}
          ratio={presentation.readout.ratio}
          bpmUnit={bpmUnit}
        />
      )}
    </>
  )
}

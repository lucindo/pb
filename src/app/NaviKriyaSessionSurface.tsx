import type { ReactElement } from 'react'

import { NKSessionReadout } from '../components/NKSessionReadout'
import { NKShape } from '../components/NKShape'
import { OrbShape } from '../components/OrbShape'
import { SessionCompletionHeadline } from '../components/SessionCompletionHeadline'
import type { UiStrings } from '../content/strings'
import type { BreathingShapeVariant, OrbIdleBehavior, RingCueStyle } from '../featureFlags'
import type { NaviKriyaPresentation } from './sessionPresentation'

export interface NaviKriyaSessionSurfaceProps {
  presentation: NaviKriyaPresentation
  breathingStrings: UiStrings['practice']['breathing']
  readoutStrings: UiStrings['practice']['readout']
  nkReadoutStrings: UiStrings['practice']['nkReadout']
  variant: BreathingShapeVariant
  idleMode: OrbIdleBehavior
  ringCue: RingCueStyle
}

export function NaviKriyaSessionSurface({
  presentation,
  breathingStrings,
  readoutStrings,
  nkReadoutStrings,
  variant,
  idleMode,
  ringCue,
}: NaviKriyaSessionSurfaceProps): ReactElement {
  return (
    <>
      {presentation.shape.kind === 'orb' ? (
        <OrbShape
          cue={presentation.shape.cue}
          frame={null}
          leadInDigit={presentation.shape.leadInDigit}
          strings={breathingStrings}
          variant={variant}
          idleMode={idleMode}
          ringCue={ringCue}
          showCompletion={presentation.showCompletionHeadline}
        />
      ) : (
        <NKShape
          key={presentation.shape.key}
          count={presentation.shape.count}
          phase={presentation.shape.phase}
          isPaused={presentation.shape.isPaused}
          strings={breathingStrings}
          nkReadoutStrings={nkReadoutStrings}
          variant={variant}
        />
      )}

      {presentation.readout !== null && (
        <NKSessionReadout
          phase={presentation.readout.phase}
          round={presentation.readout.round}
          totalRounds={presentation.readout.totalRounds}
          count={presentation.readout.count}
          target={presentation.readout.target}
          strings={nkReadoutStrings}
        />
      )}

      {presentation.showCompletionHeadline && (
        <SessionCompletionHeadline
          ariaLabel={nkReadoutStrings.readoutAriaLabel}
          headline={readoutStrings.sessionComplete}
          subhead={readoutStrings.takeAMoment}
        />
      )}
    </>
  )
}

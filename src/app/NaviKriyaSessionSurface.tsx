import type { ReactElement } from 'react'

import { NKSessionReadout } from '../components/NKSessionReadout'
import { NKShape } from '../components/NKShape'
import { OrbShape } from '../components/OrbShape'
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
        <section aria-label={nkReadoutStrings.readoutAriaLabel} className="w-full">
          <div role="status" aria-live="polite" aria-atomic="true" className="mt-7 flex flex-col items-center">
            <p
              style={{
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: 'var(--color-breathing-text)',
              }}
            >
              {readoutStrings.sessionComplete}
            </p>
            <p
              className="uppercase"
              style={{
                marginTop: 6,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.16em',
                color: 'var(--color-breathing-muted)',
              }}
            >
              {readoutStrings.takeAMoment}
            </p>
          </div>
        </section>
      )}
    </>
  )
}

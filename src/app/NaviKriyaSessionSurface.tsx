import type { ReactElement } from 'react'

import { NKSessionReadout } from '../components/NKSessionReadout'
import { NKShape } from '../components/NKShape'
import { OrbShape } from '../components/OrbShape'
import { StatusPanel } from '../components/StatusPanel'
import type { UiStrings } from '../content/strings'
import type { BreathingShapeVariant, OrbIdleBehavior } from '../featureFlags'
import type { NaviKriyaPresentation } from './sessionPresentation'

export interface NaviKriyaSessionSurfaceProps {
  presentation: NaviKriyaPresentation
  breathingStrings: UiStrings['practice']['breathing']
  readoutStrings: UiStrings['practice']['readout']
  nkReadoutStrings: UiStrings['practice']['nkReadout']
  variant: BreathingShapeVariant
  idleMode: OrbIdleBehavior
}

export function NaviKriyaSessionSurface({
  presentation,
  breathingStrings,
  readoutStrings,
  nkReadoutStrings,
  variant,
  idleMode,
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
        <StatusPanel
          legend={nkReadoutStrings.statusLabel}
          ariaLabel={nkReadoutStrings.readoutAriaLabel}
        >
          <div role="status" aria-live="polite" aria-atomic="true">
            <p className="text-3xl font-semibold text-[var(--color-breathing-accent-strong)]">
              {readoutStrings.sessionComplete}
            </p>
          </div>
        </StatusPanel>
      )}
    </>
  )
}

import type { ReactElement } from 'react'

import { NKSessionReadout } from '../components/NKSessionReadout'
import { NKShape } from '../components/NKShape'
import { OrbShape } from '../components/OrbShape'
import { SessionReadout } from '../components/SessionReadout'
import { StatusPanel } from '../components/StatusPanel'
import type { AppViewModel } from './appViewModel'

type UiStrings = AppViewModel['uiStrings']
type PracticeSessionViewModel = AppViewModel['practiceSession']

interface PracticeSessionViewProps {
  session: PracticeSessionViewModel
  uiStrings: UiStrings
}

export function PracticeSessionView({
  session,
  uiStrings,
}: PracticeSessionViewProps): ReactElement {
  if (session.kind === 'naviKriya') {
    return (
      <NaviKriyaSessionView
        presentation={session.presentation}
        uiStrings={uiStrings}
      />
    )
  }

  return <BreathingSessionView presentation={session.presentation} uiStrings={uiStrings} />
}

interface BreathingSessionViewProps {
  presentation: Extract<PracticeSessionViewModel, { kind: 'breathing' }>['presentation']
  uiStrings: UiStrings
}

function BreathingSessionView({
  presentation,
  uiStrings,
}: BreathingSessionViewProps): ReactElement {
  return (
    <>
      <OrbShape
        cue={presentation.shape.cue}
        frame={presentation.shape.frame}
        leadInDigit={presentation.shape.leadInDigit}
        strings={uiStrings.breathing}
      />
      {presentation.readout.isLeadInPlaceholder ? (
        <SessionReadout
          mode="lead-in"
          frame={presentation.readout.frame}
          strings={uiStrings.readout}
        />
      ) : (
        <SessionReadout
          mode="session"
          frame={presentation.readout.frame}
          status={presentation.readout.status}
          showCompletionHeadline={presentation.readout.showCompletionHeadline}
          strings={uiStrings.readout}
        />
      )}
    </>
  )
}

interface NaviKriyaSessionViewProps {
  presentation: Extract<PracticeSessionViewModel, { kind: 'naviKriya' }>['presentation']
  uiStrings: UiStrings
}

function NaviKriyaSessionView({
  presentation,
  uiStrings,
}: NaviKriyaSessionViewProps): ReactElement {
  return (
    <>
      {presentation.shape.kind === 'orb' ? (
        <OrbShape
          cue={presentation.shape.cue}
          frame={null}
          leadInDigit={presentation.shape.leadInDigit}
          strings={uiStrings.breathing}
        />
      ) : (
        <NKShape
          key={presentation.shape.key}
          count={presentation.shape.count}
          phase={presentation.shape.phase}
          isPaused={presentation.shape.isPaused}
          strings={uiStrings.breathing}
          nkReadoutStrings={uiStrings.nkReadout}
        />
      )}

      {presentation.readout !== null && (
        <NKSessionReadout
          phase={presentation.readout.phase}
          round={presentation.readout.round}
          totalRounds={presentation.readout.totalRounds}
          count={presentation.readout.count}
          target={presentation.readout.target}
          strings={uiStrings.nkReadout}
        />
      )}

      {presentation.showCompletionHeadline && (
        <StatusPanel
          legend={uiStrings.nkReadout.statusLabel}
          ariaLabel={uiStrings.nkReadout.readoutAriaLabel}
        >
          <div role="status" aria-live="polite" aria-atomic="true">
            <p className="text-3xl font-semibold text-[var(--color-breathing-accent-strong)]">
              {uiStrings.readout.sessionComplete}
            </p>
          </div>
        </StatusPanel>
      )}
    </>
  )
}

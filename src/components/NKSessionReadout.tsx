import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { FeedbackCount } from './FeedbackCount'

// Spike 010 FeedbackCount (index.html L1087-1121) wired for Navi: big OM
// count + small " / target" baseline-aligned, above an uppercase tracked
// "ROUND X OF Y · PHASE" context line.

export interface NKSessionReadoutProps {
  phase: 'front' | 'back'
  round: number
  totalRounds: number
  count: number
  target: number
  strings: UiStrings['practice']['nkReadout']
}

export function NKSessionReadout({
  phase,
  round,
  totalRounds,
  count,
  target,
  strings,
}: NKSessionReadoutProps): ReactElement {
  const phaseLabel = phase === 'front' ? strings.front : strings.back
  // Reuses the existing localized `roundOf` formatter for the round portion;
  // appends ` · {phase}` so the uppercase secondary reads as a single line.
  const small = `${strings.roundOf(round, totalRounds)} · ${phaseLabel}`
  return (
    <section aria-label={strings.readoutAriaLabel} className="w-full">
      <FeedbackCount
        big={String(count)}
        mid={`/ ${String(target)}`}
        small={small}
        ariaLabel={strings.announcementAriaLabel}
      />
    </section>
  )
}

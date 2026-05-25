import type { ReactElement } from 'react'

import {
  formatDuration,
  type SessionFrame,
  type SessionStatus,
  type StretchStage,
} from '../domain'
import type { UiStrings } from '../content/strings'
import { FeedbackTime } from './FeedbackTime'

// Spike 010 FeedbackHRV (index.html L1060-1085) + FeedbackStretch — both
// resolve to FeedbackTime: a big remaining-time number above an uppercase
// tracked secondary line. HRV's secondary is "X BPM · ratio" (static), the
// stretch path's secondary is "X BPM · STAGE" (currentBpm + stage from frame).
// Completion shows just the "Session complete" headline; lead-in shows the
// placeholder time the upcoming session will count down from.

function stageText(stage: StretchStage, strings: UiStrings['practice']['readout']): string {
  switch (stage) {
    case 'hold-initial':
      return strings.stageHoldInitial
    case 'ramp':
      return strings.stageRamp
    case 'hold-target':
      return strings.stageHoldTarget
  }
}

export interface SessionReadoutProps {
  frame: SessionFrame | null
  strings: UiStrings['practice']['readout']
  /** Resonant pace context — drives the HRV secondary line. Always provided
   *  for HRV; the stretch path uses frame.currentBpm + frame.stage instead. */
  bpm: number
  ratio: string
  /** BPM unit token from settingsForm strings ("BPM" / "RPM" per locale). */
  bpmUnit: string
}

export interface LeadInSessionReadoutProps extends SessionReadoutProps {
  mode: 'lead-in'
}

export interface ActiveSessionReadoutProps extends SessionReadoutProps {
  mode: 'session'
  status: SessionStatus
  showCompletionHeadline: boolean
}

export type SessionReadoutModeProps =
  | LeadInSessionReadoutProps
  | ActiveSessionReadoutProps

export function SessionReadout(props: SessionReadoutModeProps): ReactElement | null {
  const { frame, strings, bpm, ratio, bpmUnit } = props

  // Session complete: drop the FeedbackTime, surface a centered headline +
  // "Take a moment" subtitle. Preserves the role=region wrapper so existing
  // harness queries keep working.
  if (props.mode === 'session' && props.showCompletionHeadline) {
    return (
      <section aria-label={strings.readoutAriaLabel} className="w-full">
        <div
          role="status"
          aria-label={strings.announcementAriaLabel}
          aria-live="polite"
          aria-atomic="true"
          className="mt-7 flex flex-col items-center"
        >
          <p
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'var(--color-breathing-text)',
            }}
          >
            {strings.sessionComplete}
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
            {strings.takeAMoment}
          </p>
        </div>
      </section>
    )
  }

  // Running-complete: hide the FeedbackTime so the user doesn't see
  // "0:00" forever after the session ends (J3 polish, preserved).
  if (props.mode === 'session' && props.status === 'complete') {
    return null
  }

  if (frame === null) return null

  const primary = formatDuration(frame.remainingMs ?? frame.elapsedMs)

  // Stretch path: currentBpm + stage are set on the frame. Format
  // "{currentBpm} {bpmUnit} · {stage}" — stage label rendered uppercase by
  // FeedbackTime's CSS.
  // HRV path: format "{bpm} {bpmUnit} · {ratio}" using the static settings.
  const secondary = frame.currentBpm !== undefined && frame.stage !== undefined
    ? `${frame.currentBpm.toFixed(1)} ${bpmUnit} · ${stageText(frame.stage, strings)}`
    : `${String(bpm)} ${bpmUnit} · ${ratio}`

  return (
    <section aria-label={strings.readoutAriaLabel} className="w-full">
      <FeedbackTime
        primary={primary}
        secondary={secondary}
        ariaLabel={strings.announcementAriaLabel}
      />
    </section>
  )
}

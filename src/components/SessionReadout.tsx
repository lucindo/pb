import type { ReactElement } from 'react'

import {
  formatDuration,
  type SessionFrame,
  type SessionStatus,
} from '../domain'
import type { UiStrings } from '../content/strings'
import { FeedbackTime } from './FeedbackTime'
import { SessionCompletionHeadline } from './SessionCompletionHeadline'

// The HRV readout resolves to FeedbackTime: a big remaining-time number above an
// uppercase tracked secondary line ("X BPM · ratio"). Completion shows just the
// "Session complete" headline; lead-in shows the placeholder time the upcoming
// session counts from.

export interface SessionReadoutProps {
  frame: SessionFrame | null
  strings: UiStrings['practice']['readout']
  /** Resonant pace context — drives the secondary line. */
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
      <SessionCompletionHeadline
        ariaLabel={strings.readoutAriaLabel}
        announcementAriaLabel={strings.announcementAriaLabel}
        headline={strings.sessionComplete}
        subhead={strings.takeAMoment}
      />
    )
  }

  // Running-complete: hide the FeedbackTime so the user doesn't see
  // "0:00" forever after the session ends (J3 polish, preserved).
  if (props.mode === 'session' && props.status === 'complete') {
    return null
  }

  if (frame === null) return null

  const primary = formatDuration(frame.remainingSec ?? frame.elapsedSec)

  // "{bpm} {bpmUnit} · {ratio}" using the static settings.
  const secondary = `${String(bpm)} ${bpmUnit} · ${ratio}`

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

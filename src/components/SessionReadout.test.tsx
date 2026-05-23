import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SessionFrame } from '../domain'
import { SessionReadout } from './SessionReadout'
import { UI_STRINGS } from '../content/strings'
import type { UiStrings } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// Sample frame with a non-null remainingMs for timed session scenarios.
// 600_000 ms remaining → formatDuration renders "10:00".
const sampleFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  elapsedMs: 0,
  remainingMs: 600_000,
  phaseProgress: 0,
  cycleIndex: 0,
  isComplete: false,
}

// Stretch-shaped frame: SessionFrame carrying the optional stretch live-state fields.
const stretchFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  elapsedMs: 0,
  remainingMs: 600_000,
  phaseProgress: 0,
  cycleIndex: 0,
  isComplete: false,
  currentBpm: 5.5,
  stage: 'ramp',
  cycleStartMs: 0,
  currentCycleMs: 10_909,
  currentInhaleMs: 4_363,
  currentExhaleMs: 6_545,
}

interface RenderReadoutProps {
  mode?: 'lead-in' | 'session'
  frame?: SessionFrame | null
  status?: 'idle' | 'running' | 'complete'
  showCompletionHeadline?: boolean
  strings?: UiStrings['readout']
}

function renderReadout(props: RenderReadoutProps = {}) {
  const strings = props.strings ?? EN_STRINGS_FIXTURE.readout
  const frame = props.frame ?? null

  if (props.mode === 'lead-in') {
    return render(
      <SessionReadout
        mode="lead-in"
        frame={frame}
        strings={strings}
      />,
    )
  }

  return render(
    <SessionReadout
      mode="session"
      frame={frame}
      status={props.status ?? 'idle'}
      showCompletionHeadline={props.showCompletionHeadline ?? false}
      strings={strings}
    />,
  )
}

describe('SessionReadout', () => {
  it('lead-in mode with a non-null frame renders timer chip label and formatted duration', () => {
    renderReadout({ mode: 'lead-in', frame: sampleFrame })
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('lead-in mode ignores completion headline state owned by session mode', () => {
    renderReadout({ mode: 'lead-in', frame: sampleFrame })
    expect(screen.getByText('Remaining')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.queryByText(EN_STRINGS_FIXTURE.readout.sessionComplete)).not.toBeInTheDocument()
  })

  it('session mode with status "complete" and a non-null frame renders translated headline and hides chip', () => {
    renderReadout({
      frame: sampleFrame,
      status: 'complete',
      showCompletionHeadline: true,
    })
    expect(screen.getByText(EN_STRINGS_FIXTURE.readout.sessionComplete)).toBeInTheDocument()
    expect(screen.queryByText('Remaining')).not.toBeInTheDocument()
  })

  it('session mode with status "idle", null frame, and no completion headline returns null', () => {
    const { container } = renderReadout({ status: 'idle', frame: null })
    expect(container.firstChild).toBeNull()
  })
})

describe('SessionReadout — stretch live BPM + stage (Plan 22-04)', () => {
  it('a standard frame (no currentBpm) renders no BPM chip and no stage label', () => {
    renderReadout({ frame: sampleFrame, status: 'running' })
    expect(screen.queryByText('BPM')).not.toBeInTheDocument()
    expect(screen.queryByText('Stretch')).not.toBeInTheDocument()
  })

  it('a running stretch frame renders the live BPM chip to one decimal + the unit label', () => {
    renderReadout({ frame: stretchFrame, status: 'running' })
    expect(screen.getByText('5.5')).toBeInTheDocument()
    expect(screen.getByText('BPM')).toBeInTheDocument()
  })

  it('maps each stretch stage to its label', () => {
    const cases: { stage: NonNullable<SessionFrame['stage']>; label: string }[] = [
      { stage: 'hold-initial', label: 'Warm-up' },
      { stage: 'ramp', label: 'Stretch' },
      { stage: 'hold-target', label: 'Settle' },
    ]
    for (const { stage, label } of cases) {
      const { unmount } = renderReadout({ frame: { ...stretchFrame, stage }, status: 'running' })
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })

  it('a completed stretch session renders no BPM chip', () => {
    renderReadout({ frame: stretchFrame, status: 'complete', showCompletionHeadline: true })
    expect(screen.queryByText('5.5')).not.toBeInTheDocument()
  })

  it('the lead-in placeholder branch previews the stretch readout for a stretch frame', () => {
    // The countdown must preview the same Stage/Remaining/BPM readout the
    // running stretch session shows — not a plain timer chip.
    renderReadout({ mode: 'lead-in', frame: stretchFrame })
    expect(screen.getByText('5.5')).toBeInTheDocument()
    expect(screen.getByText('BPM')).toBeInTheDocument()
    expect(screen.getByText('Stretch')).toBeInTheDocument()
  })
})

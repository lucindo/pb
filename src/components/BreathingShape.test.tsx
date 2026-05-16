import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BreathingShape } from './BreathingShape'
import type { SessionFrame } from '../domain/sessionMath'
import type { VisualVariantId } from '../domain/settings'
import { UI_STRINGS } from '../content/strings'

// ── cue prop threading (Phase 25 Plan 03) ────────────────────────────────────
// BreathingShape must forward cue to all 3 sibling shapes. Verified by asserting
// the arrow SVG is rendered (cue='arrow') or the text label is rendered (cue='labels')
// in the dispatched shape's output.

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// Sample frame for dispatcher-level smoke tests. BreathingShape.test.tsx
// only covers the dispatcher's idle null-return guard, variant dispatch, and
// lead-in-priority routing. Structural assertions for OrbBody + OrbLeadIn,
// SquareBody + SquareLeadIn, RingBody + RingLeadIn live in the sibling test files.
const sampleFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  phaseProgress: 0,
  cycleIndex: 0,
  elapsedMs: 0,
  remainingMs: null,
  isComplete: false,
}

describe('BreathingShape', () => {
  // ── Idle null-return guard (D-04) ─────────────────────────────────────────
  it('renders null when frame is null and no leadInDigit (no variant prop)', () => {
    const { container } = render(<BreathingShape frame={null} strings={EN_STRINGS_FIXTURE.breathing} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when frame is null and leadInDigit is null (variant="orb")', () => {
    const { container } = render(<BreathingShape variant="orb" frame={null} leadInDigit={null} strings={EN_STRINGS_FIXTURE.breathing} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders null when frame is null and no leadInDigit (variant="square" — idle guard applies regardless of variant)', () => {
    const { container } = render(<BreathingShape variant="square" frame={null} strings={EN_STRINGS_FIXTURE.breathing} />)
    expect(container.firstChild).toBeNull()
  })

  // ── Default-to-orb (VARIANT-02 zero-regression) ───────────────────────────
  it('defaults variant to "orb" when no variant prop is passed', () => {
    const { container } = render(<BreathingShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const root = container.querySelector('[role="img"]')
    expect(root).toHaveAttribute('data-variant', 'orb')
  })

  // ── Dispatch by variant — body render ────────────────────────────────────
  it.each<VisualVariantId>(['orb', 'square', 'diamond'])(
    'dispatches to the correct sibling for body render (variant="%s")',
    (variant) => {
      const { container } = render(<BreathingShape variant={variant} frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
      const root = container.querySelector('[role="img"]')
      expect(root).toHaveAttribute('data-variant', variant)
    },
  )

  // ── Dispatch by variant — lead-in render ─────────────────────────────────
  it.each<VisualVariantId>(['orb', 'square', 'diamond'])(
    'dispatches to the correct sibling for lead-in render (variant="%s")',
    (variant) => {
      const { container } = render(
        <BreathingShape variant={variant} frame={null} leadInDigit={3} strings={EN_STRINGS_FIXTURE.breathing} />,
      )
      const root = container.querySelector('[role="img"]')
      expect(root).toHaveAttribute('data-variant', variant)
      expect(root).not.toHaveAttribute('data-phase')
      expect(screen.getByText('3')).toBeVisible()
    },
  )

  // ── Lead-in priority (D-14) ───────────────────────────────────────────────
  it('lead-in wins when both frame and leadInDigit are set (D-14 priority) — renders lead-in, not body', () => {
    render(<BreathingShape variant="orb" frame={sampleFrame} leadInDigit={2} strings={EN_STRINGS_FIXTURE.breathing} />)
    expect(screen.queryByRole('img', { name: 'Breathing shape: In' })).not.toBeInTheDocument()
    // EN strings.leadInAriaLabel(2) = 'Lead-in 2' (no colon — matches strings catalog)
    expect(screen.getByRole('img', { name: 'Lead-in 2' })).toBeVisible()
  })

  // ── Unknown variant fallback (defense in depth) ──────────────────────────
  it('falls back to OrbShape when variant is an unknown value (defense in depth)', () => {
    const { container } = render(
      <BreathingShape variant={'unknown' as VisualVariantId} frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />,
    )
    const root = container.querySelector('[role="img"]')
    expect(root).toHaveAttribute('data-variant', 'orb')
  })

  // ── cue prop forwarding (Phase 25 Plan 03) ───────────────────────────────
  it('defaults cue to "labels" when no cue prop is passed — text label visible (zero regression)', () => {
    render(<BreathingShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    // The phaseLabel "In" should appear as visible text (labels mode)
    expect(screen.getByText('In')).toBeVisible()
  })

  it.each<VisualVariantId>(['orb', 'square', 'diamond'])(
    'forwards cue="arrow" to variant="%s" — chevron SVG present',
    (variant) => {
      const { container } = render(
        <BreathingShape variant={variant} cue="arrow" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />,
      )
      expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    },
  )

  it.each<VisualVariantId>(['orb', 'square', 'diamond'])(
    'forwards cue="arrow" to variant="%s" — sr-only phaseLabel present (CUE-03)',
    (variant) => {
      render(
        <BreathingShape variant={variant} cue="arrow" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />,
      )
      const srSpan = screen.getByText('In')
      expect(srSpan.className).toContain('sr-only')
    },
  )

  it.each<VisualVariantId>(['orb', 'square', 'diamond'])(
    'lead-in digit is unchanged when cue="arrow" for variant="%s" (D-07)',
    (variant) => {
      const { container } = render(
        <BreathingShape variant={variant} cue="arrow" frame={null} leadInDigit={2} strings={EN_STRINGS_FIXTURE.breathing} />,
      )
      // Lead-in digit present
      expect(screen.getByText('2')).toBeVisible()
      // Lead-in has no data-phase (it's the pre-state)
      const root = container.querySelector('[role="img"]')
      expect(root).not.toHaveAttribute('data-phase')
    },
  )
})

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BreathingRing } from './BreathingRing'
import type { SessionFrame } from '../domain'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// Sample frame: `remainingSec` is null for open-ended, a number for timed;
// either is fine here since RingBody only reads phase/phaseLabel/phaseProgress.
const sampleFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  phaseProgress: 0,
  cycleIndex: 0,
  elapsedSec: 0,
  remainingSec: null,
  isComplete: false,
}

describe('BreathingRing', () => {
  it('renders the RingBody when frame is provided and leadInDigit is null', () => {
    render(<BreathingRing frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    // EN: strings.breathingShapeAriaLabel = 'Breathing shape', strings.inhale = 'In'
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('renders the lead-in digit in the orb area when leadInDigit is set (3)', () => {
    render(<BreathingRing frame={null} leadInDigit={3} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    // EN: strings.leadInAriaLabel(3) = 'Lead-in 3'
    expect(screen.getByRole('img', { name: 'Lead-in 3' })).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
  })

  it('renders the lead-in digit 2', () => {
    render(<BreathingRing frame={null} leadInDigit={2} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByRole('img', { name: 'Lead-in 2' })).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
  })

  it('renders the lead-in digit 1', () => {
    render(<BreathingRing frame={null} leadInDigit={1} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByRole('img', { name: 'Lead-in 1' })).toBeVisible()
    expect(screen.getByText('1')).toBeVisible()
  })

  it('renders lead-in when both frame and leadInDigit are set (lead-in wins)', () => {
    render(<BreathingRing frame={sampleFrame} leadInDigit={2} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(
      screen.queryByRole('img', { name: 'Breathing shape: In' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Lead-in 2' })).toBeVisible()
  })
})

describe('BreathingRing — phase label', () => {
  it('renders the localized phaseLabel text for "in"', () => {
    render(<BreathingRing frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByText('In')).toBeVisible()
  })

  it('renders the localized phaseLabel text for "out"', () => {
    const outFrame: SessionFrame = { ...sampleFrame, phase: 'out', phaseLabel: 'Out' }
    render(<BreathingRing frame={outFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByText('Out')).toBeVisible()
  })

  it('root role=img aria-label carries the localized shape label + phaseLabel', () => {
    render(<BreathingRing frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })
})

// Locks the invariants: a running frame renders the progress-arc SVG layer
// (2 path elements), reduced-motion suppresses the arc layer (faint outer
// track survives), and t === 0 (phase boundary) suppresses it too per
// `showArc = !reducedMotion && t > 0`.
//
// SVG selector uses viewBox="0 0 100 100" to disambiguate the arc layer from
// other SVGs on the surface. Reduced-motion case mocks `window.matchMedia` per
// the canonical pattern in `src/hooks/usePrefersReducedMotion.test.ts`.
describe('BreathingRing — progress arc', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // phaseProgress > 0 + < 1 → showArc = true, both branches assign endpoints.
  const partialFrame: SessionFrame = { ...sampleFrame, phaseProgress: 0.5 }

  it('renders the arc layer (track + progress path) for a running frame', () => {
    const { container } = render(
      <BreathingRing frame={partialFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    // Two paths = the faint track + the progress arc. Stroke color/width are visual
    // tokens (asserted nowhere — they belong to the design layer, not behavior).
    const paths = container.querySelectorAll(
      'svg[aria-hidden="true"][viewBox="0 0 100 100"] path',
    )
    expect(paths.length).toBe(2)
  })

  it('reduced-motion suppresses the arc layer (outer track still rendered)', () => {
    // Reason: cast documents the intended stub shape; matchMedia returns a structurally-compatible mock.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)

    const { container } = render(
      <BreathingRing frame={partialFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    const arcSvg = container.querySelector('svg[aria-hidden="true"][viewBox="0 0 100 100"]')
    expect(arcSvg).toBeNull()
    // The faint outer track <span> survives reduced-motion.
    const outerTrack = container.querySelector('span[aria-hidden="true"]')
    expect(outerTrack).not.toBeNull()
  })

  it('at t === 0 (phase boundary) suppresses the arc layer', () => {
    // sampleFrame has phaseProgress: 0 → t = 0 → showArc = false.
    const { container } = render(
      <BreathingRing frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    const arcSvg = container.querySelector('svg[aria-hidden="true"][viewBox="0 0 100 100"]')
    expect(arcSvg).toBeNull()
  })
})

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
  phase: 'inhale',
  phaseIndex: 0,
  phaseProgress: 0,
  round: 1,
  totalRounds: 'open-ended',
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

  it('renders the localized phaseLabel text for "exhale"', () => {
    const outFrame: SessionFrame = { ...sampleFrame, phase: 'exhale' }
    render(<BreathingRing frame={outFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByText('Out')).toBeVisible()
  })

  it('renders the shared "Hold" label for both hold phases', () => {
    for (const phase of ['hold-in', 'hold-out'] as const) {
      const { unmount } = render(
        <BreathingRing frame={{ ...sampleFrame, phase }} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
      )
      expect(screen.getByText('Hold')).toBeVisible()
      unmount()
    }
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

  it('keeps the completed (full) arc closed during hold-in', () => {
    const arcSelector = 'svg[aria-hidden="true"][viewBox="0 0 100 100"] path'
    // A fully-completed inhale (progress 1) is the reference for "closed".
    const completed = render(
      <BreathingRing frame={{ ...sampleFrame, phase: 'inhale', phaseProgress: 1 }} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    const fullD = completed.container.querySelector(arcSelector)?.getAttribute('d')
    completed.unmount()

    // hold-in keeps that closed arc regardless of its own progress.
    const { container } = render(
      <BreathingRing frame={{ ...partialFrame, phase: 'hold-in' }} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    const paths = container.querySelectorAll(arcSelector)
    expect(paths.length).toBe(2)
    expect(paths[0]?.getAttribute('d')).toBe(fullD)
  })

  it('suppresses the arc during hold-out (ring is empty after the exhale)', () => {
    const { container } = render(
      <BreathingRing frame={{ ...partialFrame, phase: 'hold-out' }} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    expect(container.querySelector('svg[aria-hidden="true"][viewBox="0 0 100 100"]')).toBeNull()
  })
})

// The hold progress bar replaces the arc during holds. The fill is the only span
// with a percentage width — that uniquely identifies it across the layered spans.
describe('BreathingRing — hold progress bar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function findFill(container: HTMLElement): HTMLElement | undefined {
    return [...container.querySelectorAll('span')].find((s) => s.style.width.endsWith('%'))
  }

  it.each(['hold-in', 'hold-out'] as const)('%s renders a fill sized to phaseProgress', (phase) => {
    const { container } = render(
      <BreathingRing frame={{ ...sampleFrame, phase, phaseProgress: 0.5 }} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    expect(findFill(container)?.style.width).toBe('50%')
  })

  it('renders no hold bar fill during inhale/exhale', () => {
    const { container } = render(
      <BreathingRing frame={{ ...sampleFrame, phaseProgress: 0.5 }} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    expect(findFill(container)).toBeUndefined()
  })

  it('reduced-motion keeps the track but suppresses the advancing fill', () => {
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
      <BreathingRing frame={{ ...sampleFrame, phase: 'hold-in', phaseProgress: 0.5 }} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    expect(findFill(container)).toBeUndefined() // no advancing fill
    expect(screen.getByText('Hold')).toBeVisible() // label + track still present
  })
})

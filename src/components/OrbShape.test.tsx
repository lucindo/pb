import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OrbShape } from './OrbShape'
import type { SessionFrame } from '../domain'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// Sample frame for the existing-Phase-2-behavior tests. `remainingMs` is part of
// the SessionFrame contract (src/domain/sessionMath.ts) — null for open-ended,
// a number for timed; either is fine here since OrbBody only reads
// phase/phaseLabel/phaseProgress.
const sampleFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  phaseProgress: 0,
  cycleIndex: 0,
  elapsedMs: 0,
  remainingMs: null,
  isComplete: false,
}

describe('OrbShape', () => {
  it('renders the OrbBody when frame is provided and leadInDigit is null', () => {
    render(<OrbShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    // EN: strings.breathingShapeAriaLabel = 'Breathing shape', strings.inhale = 'In'
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('renders the lead-in digit in the orb area when leadInDigit is set (3)', () => {
    render(<OrbShape frame={null} leadInDigit={3} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    // EN: strings.leadInAriaLabel(3) = 'Lead-in 3'
    expect(screen.getByRole('img', { name: 'Lead-in 3' })).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
  })

  it('renders the lead-in digit 2', () => {
    render(<OrbShape frame={null} leadInDigit={2} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByRole('img', { name: 'Lead-in 2' })).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
  })

  it('renders the lead-in digit 1', () => {
    render(<OrbShape frame={null} leadInDigit={1} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByRole('img', { name: 'Lead-in 1' })).toBeVisible()
    expect(screen.getByText('1')).toBeVisible()
  })

  it('renders lead-in when both frame and leadInDigit are set (lead-in wins)', () => {
    render(<OrbShape frame={sampleFrame} leadInDigit={2} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(
      screen.queryByRole('img', { name: 'Breathing shape: In' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Lead-in 2' })).toBeVisible()
  })
})

// ── Phase 25 Plan 03: cue prop threading ─────────────────────────────────────
describe('OrbShape — cue prop (Phase 25 Plan 03)', () => {
  it('defaults cue to "labels" when no cue prop passed — phaseLabel text visible (zero regression)', () => {
    render(<OrbShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByText('In')).toBeVisible()
  })

  it('cue="labels" renders the localized phaseLabel text for "in"', () => {
    render(<OrbShape cue="labels" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByText('In')).toBeVisible()
  })

  it('cue="arrow", phase="in" renders an aria-hidden SVG in the phase slot', () => {
    const { container } = render(
      <OrbShape cue="arrow" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).not.toBeNull()
  })

  it('cue="arrow" keeps the phaseLabel in the DOM for screen reader parity', () => {
    render(<OrbShape cue="arrow" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByText('In')).toBeInTheDocument()
  })

  it('cue="arrow", phase="out" renders SVG (out sampleFrame)', () => {
    const outFrame: SessionFrame = { ...sampleFrame, phase: 'out', phaseLabel: 'Out' }
    const { container } = render(
      <OrbShape cue="arrow" frame={outFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('cue="nose" renders an aria-hidden SVG for "in"', () => {
    const { container } = render(
      <OrbShape cue="nose" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('cue="nose" keeps the phaseLabel in the DOM for screen reader parity', () => {
    render(<OrbShape cue="nose" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByText('In')).toBeInTheDocument()
  })

  it('root role=img aria-label is unchanged in arrow mode (shape root unaffected)', () => {
    render(<OrbShape cue="arrow" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    // The root aria-label still contains the localized shape label + phaseLabel
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('lead-in digit is unchanged when cue="arrow" (D-07 — OrbLeadIn has no cue param)', () => {
    render(<OrbShape cue="arrow" frame={null} leadInDigit={2} strings={EN_STRINGS_FIXTURE.practice.breathing} />)
    expect(screen.getByText('2')).toBeVisible()
  })
})

// ── Phase 45 Plan 02: ringCue prop ────────────────────────────────────────────
// Locks three invariants from the plan: default-unchanged (no arc SVG),
// progress-arc renders 2 path elements with spike-locked stroke values,
// reduced-motion suppresses the arc layer. Bonus: t === 0 (phase boundary)
// also suppresses the arc layer per `showArc = !reducedMotion && t > 0`.
//
// SVG selector uses viewBox="0 0 100 100" to disambiguate the new arc layer
// from CueGlyph SVGs (which use a 24-viewBox per CheckmarkGlyph at OrbShape
// line ~128). Reduced-motion case mocks `window.matchMedia` per the canonical
// pattern in `src/hooks/usePrefersReducedMotion.test.ts` lines 19-28.
describe('OrbShape — ringCue prop (Phase 45)', () => {
  // Scoped to this block — earlier describes do not touch matchMedia.
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // phaseProgress > 0 + < 1 → showArc = true, both branches assign endpoints.
  const partialFrame: SessionFrame = { ...sampleFrame, phaseProgress: 0.5 }

  it('default (ringCue omitted) renders no SVG arc layer — existing rings unchanged', () => {
    const { container } = render(
      <OrbShape frame={partialFrame} strings={EN_STRINGS_FIXTURE.practice.breathing} />,
    )
    const arcSvg = container.querySelector('svg[aria-hidden="true"][viewBox="0 0 100 100"]')
    expect(arcSvg).toBeNull()
  })

  it('ringCue="progress-arc" renders exactly 2 path elements with spike-locked stroke values', () => {
    const { container } = render(
      <OrbShape
        frame={partialFrame}
        ringCue="progress-arc"
        strings={EN_STRINGS_FIXTURE.practice.breathing}
      />,
    )
    const paths = container.querySelectorAll(
      'svg[aria-hidden="true"][viewBox="0 0 100 100"] path',
    )
    expect(paths.length).toBe(2)
    paths.forEach((p) => {
      expect(p.getAttribute('stroke')).toBe('var(--color-breathing-accent)')
      expect(p.getAttribute('stroke-width')).toBe('2.5')
    })
  })

  it('ringCue="progress-arc" + reduced-motion suppresses the arc layer (outer track still rendered)', () => {
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
      <OrbShape
        frame={partialFrame}
        ringCue="progress-arc"
        strings={EN_STRINGS_FIXTURE.practice.breathing}
      />,
    )
    const arcSvg = container.querySelector('svg[aria-hidden="true"][viewBox="0 0 100 100"]')
    expect(arcSvg).toBeNull()
    // The faint outer track <span> survives reduced-motion + progress-arc.
    const outerTrack = container.querySelector('span[aria-hidden="true"]')
    expect(outerTrack).not.toBeNull()
  })

  it('ringCue="progress-arc" at t === 0 (phase boundary) suppresses the arc layer', () => {
    // sampleFrame has phaseProgress: 0 → t = 0 → showArc = false.
    const { container } = render(
      <OrbShape
        frame={sampleFrame}
        ringCue="progress-arc"
        strings={EN_STRINGS_FIXTURE.practice.breathing}
      />,
    )
    const arcSvg = container.querySelector('svg[aria-hidden="true"][viewBox="0 0 100 100"]')
    expect(arcSvg).toBeNull()
  })
})

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SquareShape } from './SquareShape'
import type { SessionFrame } from '../domain/sessionMath'
import * as prm from '../hooks/usePrefersReducedMotion'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS_FIXTURE = UI_STRINGS.en

// Sample frame — same stub used in OrbShape.test.tsx.
const sampleFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  phaseProgress: 0,
  cycleIndex: 0,
  elapsedMs: 0,
  remainingMs: null,
  isComplete: false,
}

describe('SquareShape', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Smoke tests
  it('renders the SquareBody when frame is provided and leadInDigit is null', () => {
    render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    // EN: strings.breathingShapeAriaLabel = 'Breathing shape', strings.inhale = 'In'
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('renders the lead-in digit 3', () => {
    render(<SquareShape frame={null} leadInDigit={3} strings={EN_STRINGS_FIXTURE.breathing} />)
    // EN: strings.leadInAriaLabel(3) = 'Lead-in 3'
    expect(screen.getByRole('img', { name: 'Lead-in 3' })).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
  })

  it('renders the lead-in digit 2', () => {
    render(<SquareShape frame={null} leadInDigit={2} strings={EN_STRINGS_FIXTURE.breathing} />)
    expect(screen.getByRole('img', { name: 'Lead-in 2' })).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
  })

  it('renders the lead-in digit 1', () => {
    render(<SquareShape frame={null} leadInDigit={1} strings={EN_STRINGS_FIXTURE.breathing} />)
    expect(screen.getByRole('img', { name: 'Lead-in 1' })).toBeVisible()
    expect(screen.getByText('1')).toBeVisible()
  })

  // data-variant attribute presence (D-16)
  it('Body root carries data-variant="square"', () => {
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const root = container.querySelector('[role="img"]')
    expect(root).toHaveAttribute('data-variant', 'square')
  })

  it('LeadIn root carries data-variant="square"', () => {
    const { container } = render(<SquareShape frame={null} leadInDigit={2} strings={EN_STRINGS_FIXTURE.breathing} />)
    const root = container.querySelector('[role="img"]')
    expect(root).toHaveAttribute('data-variant', 'square')
  })

  // Geometry: Square-specific class assertions
  it('.orb div has rounded-[18%] class (NOT rounded-full) — Square geometry delta 2', () => {
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(orb!.classList.contains('rounded-\\[18\\%\\]') || orb!.className.includes('rounded-[18%]')).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(orb!.classList.contains('rounded-full')).toBe(false)
  })

  it('.orb-layer--in has rounded-[inherit] class (inherits Square 18% from parent .orb)', () => {
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const layerIn = container.querySelector('.orb-layer--in')
    expect(layerIn).not.toBeNull()
    // Reason: layerIn non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(layerIn!.className.includes('rounded-[inherit]')).toBe(true)
  })

  it('.orb-layer--out has rounded-[inherit] class (inherits Square 18% from parent .orb)', () => {
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const layerOut = container.querySelector('.orb-layer--out')
    expect(layerOut).not.toBeNull()
    // Reason: layerOut non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(layerOut!.className.includes('rounded-[inherit]')).toBe(true)
  })

  it('.shape-marker--outer does NOT have rounded-full class (CSS [data-variant=\'square\'] selector handles radius)', () => {
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const outer = container.querySelector('.shape-marker--outer')
    expect(outer).not.toBeNull()
    // Reason: outer non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(outer!.classList.contains('rounded-full')).toBe(false)
  })

  it('.shape-marker--inner does NOT have rounded-full class (CSS [data-variant=\'square\'] selector handles radius)', () => {
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const inner = container.querySelector('.shape-marker--inner')
    expect(inner).not.toBeNull()
    // Reason: inner non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(inner!.classList.contains('rounded-full')).toBe(false)
  })

  // Anchoring: Phase 5.1 D-12 / D-20 / D-21 structural contract
  it('.shape-marker--outer has explicit four-edge offsets (-1.5px) (D-21 + D-12)', () => {
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const outer = container.querySelector('.shape-marker--outer')
    expect(outer).not.toBeNull()
    // Reason: outer non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = outer!.getAttribute('style') ?? ''
    expect(style).toMatch(/left:\s*-1\.5px/)
    expect(style).toMatch(/top:\s*-1\.5px/)
    expect(style).toMatch(/right:\s*-1\.5px/)
    expect(style).toMatch(/bottom:\s*-1\.5px/)
    expect(style).not.toMatch(/(^|;)\s*inset\s*:/)
  })

  it('.orb div uses four-edge anchoring (left:0 right:0 top:0 bottom:0), NOT inset-0 (D-20)', () => {
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = orb!.getAttribute('style') ?? ''
    expect(style).toMatch(/left:\s*0(px)?\b/)
    expect(style).toMatch(/right:\s*0(px)?\b/)
    expect(style).toMatch(/top:\s*0(px)?\b/)
    expect(style).toMatch(/bottom:\s*0(px)?\b/)
    expect(style).not.toMatch(/width:\s*100%/)
    expect(style).not.toMatch(/height:\s*100%/)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(orb!).not.toHaveClass('inset-0')
  })

  // Kinematics: GPU-promoted scale transform
  it('.orb style.transform contains translate3d(0,0,0) scale(...) (GPU-promoted kinematics)', () => {
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = orb!.getAttribute('style') ?? ''
    expect(style).toMatch(/transform:\s*(?:translate3d\([^)]+\)\s+)?scale\(/)
  })

  // Reduced-motion: MID_SCALE = 0.79 substitution (VARIANT-04)
  it('reduced-motion mock true → .orb style.transform contains scale(0.79) (MID_SCALE substitution)', () => {
    vi.spyOn(prm, 'usePrefersReducedMotion').mockReturnValue(true)
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = orb!.getAttribute('style') ?? ''
    expect(style).toContain('scale(0.79)')
  })

  // VARIANT-04: .orb host has motion-reduce:transition-none on both Body and LeadIn
  it('Body .orb host has motion-reduce:transition-none class (VARIANT-04)', () => {
    const { container } = render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(orb!.className.includes('motion-reduce:transition-none')).toBe(true)
  })

  // VARIANT-04: LeadIn keeps the orb at MID_SCALE
  it('lead-in keeps the orb at MID_SCALE (scale(0.79)) regardless of reduced-motion state (VARIANT-04)', () => {
    const { container } = render(<SquareShape frame={null} leadInDigit={1} strings={EN_STRINGS_FIXTURE.breathing} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(orb!.getAttribute('style')).toContain('scale(0.79)')
  })

  // VARIANT-05: lead-in digit size and color
  it('lead-in digit renders at text-7xl with color var(--color-orb-in-text) (VARIANT-05)', () => {
    const { container } = render(<SquareShape frame={null} leadInDigit={2} strings={EN_STRINGS_FIXTURE.breathing} />)
    const digit = container.querySelector('span.text-7xl')
    expect(digit).not.toBeNull()
    // Reason: digit non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(digit!.textContent).toBe('2')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = digit!.getAttribute('style') ?? ''
    expect(style).toContain('var(--color-orb-in-text)')
  })
})

// ── Phase 25 Plan 03: cue prop threading ─────────────────────────────────────
describe('SquareShape — cue prop (Phase 25 Plan 03)', () => {
  it('defaults cue to "labels" when no cue prop passed — phaseLabel text visible (zero regression)', () => {
    render(<SquareShape frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    expect(screen.getByText('In')).toBeVisible()
  })

  it('cue="arrow" renders an aria-hidden SVG in the phase slot for "in"', () => {
    const { container } = render(
      <SquareShape cue="arrow" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />,
    )
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('cue="arrow" renders sr-only phaseLabel (CUE-03)', () => {
    render(<SquareShape cue="arrow" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    const srSpan = screen.getByText('In')
    expect(srSpan.className).toContain('sr-only')
  })

  it('cue="nose" renders an aria-hidden SVG for "in"', () => {
    const { container } = render(
      <SquareShape cue="nose" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />,
    )
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('root role=img aria-label is unchanged in arrow mode (shape root unaffected)', () => {
    render(<SquareShape cue="arrow" frame={sampleFrame} strings={EN_STRINGS_FIXTURE.breathing} />)
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('lead-in digit is unchanged when cue="arrow" (D-07 — SquareLeadIn has no cue param)', () => {
    render(<SquareShape cue="arrow" frame={null} leadInDigit={2} strings={EN_STRINGS_FIXTURE.breathing} />)
    expect(screen.getByText('2')).toBeVisible()
    const digit = screen.getByText('2')
    expect(digit.className).not.toContain('sr-only')
  })
})

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RingShape } from './RingShape'
import type { SessionFrame } from '../domain/sessionMath'
import * as prm from '../hooks/usePrefersReducedMotion'

// Sample frame — same stub used in OrbShape.test.tsx and SquareShape.test.tsx.
const sampleFrame: SessionFrame = {
  phase: 'in',
  phaseLabel: 'In',
  phaseProgress: 0,
  cycleIndex: 0,
  elapsedMs: 0,
  remainingMs: null,
  isComplete: false,
}

describe('RingShape', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Smoke tests
  it('renders the RingBody when frame is provided and leadInDigit is null', () => {
    render(<RingShape frame={sampleFrame} />)
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('renders the lead-in digit 3', () => {
    render(<RingShape frame={null} leadInDigit={3} />)
    expect(screen.getByRole('img', { name: 'Lead-in: 3' })).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
  })

  it('renders the lead-in digit 2', () => {
    render(<RingShape frame={null} leadInDigit={2} />)
    expect(screen.getByRole('img', { name: 'Lead-in: 2' })).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
  })

  it('renders the lead-in digit 1', () => {
    render(<RingShape frame={null} leadInDigit={1} />)
    expect(screen.getByRole('img', { name: 'Lead-in: 1' })).toBeVisible()
    expect(screen.getByText('1')).toBeVisible()
  })

  // data-variant attribute presence (D-16)
  it('Body root carries data-variant="ring"', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
    const root = container.querySelector('[role="img"]')
    expect(root).toHaveAttribute('data-variant', 'ring')
  })

  it('LeadIn root carries data-variant="ring"', () => {
    const { container } = render(<RingShape frame={null} leadInDigit={2} />)
    const root = container.querySelector('[role="img"]')
    expect(root).toHaveAttribute('data-variant', 'ring')
  })

  // Geometry: Ring retains rounded-full (circular outer edge)
  it('.orb div retains rounded-full class (ring outer edge is circular — UNLIKE Square)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(orb!.classList.contains('rounded-full')).toBe(true)
  })

  it('.orb-layer--in retains rounded-full class (radial-gradient hollow center applied via CSS, not classes)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
    const layerIn = container.querySelector('.orb-layer--in')
    expect(layerIn).not.toBeNull()
    // Reason: layerIn non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(layerIn!.classList.contains('rounded-full')).toBe(true)
  })

  it('.orb-layer--out retains rounded-full class (radial-gradient hollow center applied via CSS, not classes)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
    const layerOut = container.querySelector('.orb-layer--out')
    expect(layerOut).not.toBeNull()
    // Reason: layerOut non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(layerOut!.classList.contains('rounded-full')).toBe(true)
  })

  it('.shape-marker--outer retains rounded-full class (concentric circular thin ring)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
    const outer = container.querySelector('.shape-marker--outer')
    expect(outer).not.toBeNull()
    // Reason: outer non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(outer!.classList.contains('rounded-full')).toBe(true)
  })

  it('.shape-marker--inner retains rounded-full class (concentric circular thin ring)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
    const inner = container.querySelector('.shape-marker--inner')
    expect(inner).not.toBeNull()
    // Reason: inner non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(inner!.classList.contains('rounded-full')).toBe(true)
  })

  // Anchoring: Phase 5.1 D-12 / D-20 / D-21 structural contract
  it('.shape-marker--outer has explicit four-edge offsets (-1.5px) (D-21 + D-12)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
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
    const { container } = render(<RingShape frame={sampleFrame} />)
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

  // Inner marker dimensions
  it('.shape-marker--inner width/height are MIN_SCALE*100% (same as Orb)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
    const inner = container.querySelector('.shape-marker--inner')
    expect(inner).not.toBeNull()
    // Reason: inner non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = inner!.getAttribute('style') ?? ''
    // 58% = MIN_SCALE * 100; jsdom may serialize 0.58*100 as 57.99...% due to
    // floating-point — match the leading digits rather than the exact value.
    expect(style).toMatch(/width:\s*5[78](\.\d+)?%/)
    expect(style).toMatch(/height:\s*5[78](\.\d+)?%/)
  })

  // Kinematics: GPU-promoted scale transform
  it('.orb style.transform contains translate3d(0,0,0) scale(...) (GPU-promoted kinematics)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
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
    const { container } = render(<RingShape frame={sampleFrame} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = orb!.getAttribute('style') ?? ''
    expect(style).toContain('scale(0.79)')
  })

  // VARIANT-04: .orb host has motion-reduce:transition-none on both Body and LeadIn
  it('Body .orb host has motion-reduce:transition-none class (VARIANT-04)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(orb!.className.includes('motion-reduce:transition-none')).toBe(true)
  })

  // VARIANT-04: LeadIn keeps the orb at MID_SCALE
  it('lead-in keeps the orb at MID_SCALE (scale(0.79)) regardless of reduced-motion state (VARIANT-04)', () => {
    const { container } = render(<RingShape frame={null} leadInDigit={1} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(orb!.getAttribute('style')).toContain('scale(0.79)')
  })

  // VARIANT-05: lead-in digit size and color
  it('lead-in digit renders at text-7xl with color var(--color-orb-in-text) (VARIANT-05)', () => {
    const { container } = render(<RingShape frame={null} leadInDigit={2} />)
    const digit = container.querySelector('span.text-7xl')
    expect(digit).not.toBeNull()
    // Reason: digit non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(digit!.textContent).toBe('2')
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const style = digit!.getAttribute('style') ?? ''
    expect(style).toContain('var(--color-orb-in-text)')
  })

  // Negative assertion: TSX must NOT inline-override background on gradient layers
  // (CSS owns the radial-gradient override — this test catches accidental drift)
  it('no inline background style on .orb-layer--in (CSS owns the radial-gradient)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
    const layerIn = container.querySelector('.orb-layer--in')
    expect(layerIn).not.toBeNull()
    // layerIn cast to HTMLElement after null assertion above (querySelector returns Element | null)
    expect((layerIn as HTMLElement).style.background).toBe('')
  })

  it('no inline background style on .orb-layer--out (CSS owns the radial-gradient)', () => {
    const { container } = render(<RingShape frame={sampleFrame} />)
    const layerOut = container.querySelector('.orb-layer--out')
    expect(layerOut).not.toBeNull()
    // layerOut cast to HTMLElement after null assertion above (querySelector returns Element | null)
    expect((layerOut as HTMLElement).style.background).toBe('')
  })
})

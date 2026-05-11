import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BreathingShape } from './BreathingShape'
import type { SessionFrame } from '../domain/sessionMath'

// Sample frame for the existing-Phase-2-behavior tests. `remainingMs` is part of
// the SessionFrame contract (src/domain/sessionMath.ts) — null for open-ended,
// a number for timed; either is fine here since BreathingShapeBody only reads
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

describe('BreathingShape', () => {
  it('renders null when both frame and leadInDigit are absent', () => {
    const { container } = render(<BreathingShape frame={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the BreathingShapeBody when frame is provided and leadInDigit is null', () => {
    render(<BreathingShape frame={sampleFrame} />)
    expect(screen.getByRole('img', { name: 'Breathing shape: In' })).toBeVisible()
  })

  it('renders the lead-in digit in the orb area when leadInDigit is set (3)', () => {
    render(<BreathingShape frame={null} leadInDigit={3} />)
    expect(screen.getByRole('img', { name: 'Lead-in: 3' })).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
  })

  it('renders the lead-in digit 2', () => {
    render(<BreathingShape frame={null} leadInDigit={2} />)
    expect(screen.getByRole('img', { name: 'Lead-in: 2' })).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
  })

  it('renders the lead-in digit 1', () => {
    render(<BreathingShape frame={null} leadInDigit={1} />)
    expect(screen.getByRole('img', { name: 'Lead-in: 1' })).toBeVisible()
    expect(screen.getByText('1')).toBeVisible()
  })

  it('lead-in wins when both frame and leadInDigit are set (D-14 priority)', () => {
    render(<BreathingShape frame={sampleFrame} leadInDigit={2} />)
    expect(
      screen.queryByRole('img', { name: 'Breathing shape: In' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Lead-in: 2' })).toBeVisible()
  })

  it('lead-in keeps the orb at MID_SCALE (no scaling animation, scale(0.79))', () => {
    const { container } = render(<BreathingShape frame={null} leadInDigit={1} />)
    const orb = container.querySelector('.orb')
    expect(orb).not.toBeNull()
    // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(orb!.getAttribute('style')).toContain('scale(0.79)')
  })

  it('lead-in does not have data-phase or data-progress attributes (it is a neutral pre-state)', () => {
    const { container } = render(<BreathingShape frame={null} leadInDigit={3} />)
    const root = container.querySelector('[role="img"]')
    expect(root).not.toBeNull()
    // Reason: root non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(root!.getAttribute('data-phase')).toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(root!.getAttribute('data-progress')).toBeNull()
  })

  it('lead-in renders digit with text-7xl class (one step larger than the In/Out label)', () => {
    const { container } = render(<BreathingShape frame={null} leadInDigit={2} />)
    const digit = container.querySelector('span.text-7xl')
    expect(digit).not.toBeNull()
    // Reason: digit non-null asserted by expect().not.toBeNull() immediately above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(digit!.textContent).toBe('2')
  })
})

describe('BreathingShape — Phase 5.1 Plan 04 WR-03 structural contract (D-24)', () => {
  // Plan 04 background: Safari Desktop UAT (05.1-UAT.md Task 3) revealed
  // that abs-pos children of `display: grid; place-items: center` are
  // sized against an implicit auto-track on Safari, collapsing `.orb`
  // (which used `inset-0`) to 58% of parent. The fix is the WR-03
  // explicit-positioning pattern (D-20) on `.orb` and explicit four-edge
  // offsets (D-21) on the outer ring in BOTH render sites (D-22). jsdom
  // cannot reproduce the Safari quirk, so this test locks the post-fix
  // DOM markup so the bug cannot silently return.

  describe('BreathingShapeBody (frame=sampleFrame)', () => {
    it('renders a `.orb` element', () => {
      const { container } = render(<BreathingShape frame={sampleFrame} />)
      const orb = container.querySelector('.orb')
      expect(orb).not.toBeNull()
    })

    it('`.orb` does NOT have the Tailwind `inset-0` class (D-20)', () => {
      const { container } = render(<BreathingShape frame={sampleFrame} />)
      const orb = container.querySelector('.orb')
      expect(orb).not.toBeNull()
      // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(orb!).not.toHaveClass('inset-0')
    })

    it('`.orb` has explicit four-edge anchoring left/right/top/bottom (D-20 + post-UAT hotfix)', () => {
      const { container } = render(<BreathingShape frame={sampleFrame} />)
      const orb = container.querySelector('.orb')
      expect(orb).not.toBeNull()
      // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const style = orb!.getAttribute('style') ?? ''
      // jsdom serializes React's `left: 0` as `left: 0px` for length props.
      // Four-edge form (not `width: 100%`) — percent dims froze Safari's
      // transform transition; four-edge anchoring matches the working outer-ring
      // pattern and preserves the transition.
      expect(style).toMatch(/left:\s*0(px)?\b/)
      expect(style).toMatch(/right:\s*0(px)?\b/)
      expect(style).toMatch(/top:\s*0(px)?\b/)
      expect(style).toMatch(/bottom:\s*0(px)?\b/)
      expect(style).not.toMatch(/width:\s*100%/)
      expect(style).not.toMatch(/height:\s*100%/)
    })

    it('`.orb` still carries the existing transform: scale(...) (Phase 2 D-01/D-02 preserved)', () => {
      const { container } = render(<BreathingShape frame={sampleFrame} />)
      const orb = container.querySelector('.orb')
      expect(orb).not.toBeNull()
      // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const style = orb!.getAttribute('style') ?? ''
      expect(style).toMatch(/transform:\s*(?:translate3d\([^)]+\)\s+)?scale\(/)
    })

    it('`.orb-ring--outer` has explicit four-edge offsets, not `inset:` shorthand (D-21)', () => {
      const { container } = render(<BreathingShape frame={sampleFrame} />)
      const outer = container.querySelector('.orb-ring--outer')
      expect(outer).not.toBeNull()
      // Reason: outer non-null asserted by expect().not.toBeNull() immediately above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const style = outer!.getAttribute('style') ?? ''
      expect(style).toMatch(/left:\s*-1\.5px/)
      expect(style).toMatch(/top:\s*-1\.5px/)
      expect(style).toMatch(/right:\s*-1\.5px/)
      expect(style).toMatch(/bottom:\s*-1\.5px/)
      // The `inset:` shorthand must NOT appear (it is the form Plan 02
      // shipped that Plan 04 supersedes for unification per D-19/D-21).
      expect(style).not.toMatch(/(^|;)\s*inset\s*:/)
    })

    it('`.orb-ring--outer` does NOT have the Tailwind `inset-0` class (defensive, locks Plan 02 + Plan 04)', () => {
      const { container } = render(<BreathingShape frame={sampleFrame} />)
      const outer = container.querySelector('.orb-ring--outer')
      expect(outer).not.toBeNull()
      // Reason: outer non-null asserted by expect().not.toBeNull() immediately above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(outer!).not.toHaveClass('inset-0')
    })

    it('`.orb-ring--inner` is unchanged from the WR-03 template (D-26 / D-11 guard)', () => {
      const { container } = render(<BreathingShape frame={sampleFrame} />)
      const inner = container.querySelector('.orb-ring--inner')
      expect(inner).not.toBeNull()
      // Reason: inner non-null asserted by expect().not.toBeNull() immediately above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(inner!).toHaveClass('left-1/2')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(inner!).toHaveClass('top-1/2')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(inner!).toHaveClass('-translate-x-1/2')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(inner!).toHaveClass('-translate-y-1/2')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const style = inner!.getAttribute('style') ?? ''
      // 58% = MIN_SCALE * 100; jsdom may serialize 0.58*100 as 57.99...% due to
      // floating-point — match the leading digits rather than the exact value.
      expect(style).toMatch(/width:\s*5[78](\.\d+)?%/)
      expect(style).toMatch(/height:\s*5[78](\.\d+)?%/)
    })
  })

  describe('BreathingShapeLeadIn (leadInDigit=2) — D-22 mirror', () => {
    it('renders a `.orb` element', () => {
      const { container } = render(<BreathingShape frame={null} leadInDigit={2} />)
      const orb = container.querySelector('.orb')
      expect(orb).not.toBeNull()
    })

    it('lead-in `.orb` does NOT have the Tailwind `inset-0` class (D-20 + D-22)', () => {
      const { container } = render(<BreathingShape frame={null} leadInDigit={2} />)
      const orb = container.querySelector('.orb')
      expect(orb).not.toBeNull()
      // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(orb!).not.toHaveClass('inset-0')
    })

    it('lead-in `.orb` has explicit four-edge anchoring left/right/top/bottom (D-20 + D-22 + post-UAT hotfix)', () => {
      const { container } = render(<BreathingShape frame={null} leadInDigit={2} />)
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
    })

    it('lead-in `.orb` still carries transform: scale(0.79) (Phase 2 D-06 + Phase 3 D-14 preserved)', () => {
      const { container } = render(<BreathingShape frame={null} leadInDigit={2} />)
      const orb = container.querySelector('.orb')
      expect(orb).not.toBeNull()
      // Reason: orb non-null asserted by expect().not.toBeNull() immediately above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const style = orb!.getAttribute('style') ?? ''
      expect(style).toMatch(/transform:\s*(?:translate3d\([^)]+\)\s+)?scale\(0\.79\)/)
    })

    it('lead-in `.orb-ring--outer` has explicit four-edge offsets, not `inset:` shorthand (D-21 + D-22)', () => {
      const { container } = render(<BreathingShape frame={null} leadInDigit={2} />)
      const outer = container.querySelector('.orb-ring--outer')
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

    it('lead-in `.orb-ring--outer` does NOT have the Tailwind `inset-0` class', () => {
      const { container } = render(<BreathingShape frame={null} leadInDigit={2} />)
      const outer = container.querySelector('.orb-ring--outer')
      expect(outer).not.toBeNull()
      // Reason: outer non-null asserted by expect().not.toBeNull() immediately above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(outer!).not.toHaveClass('inset-0')
    })

    it('lead-in `.orb-ring--inner` is unchanged from the WR-03 template', () => {
      const { container } = render(<BreathingShape frame={null} leadInDigit={2} />)
      const inner = container.querySelector('.orb-ring--inner')
      expect(inner).not.toBeNull()
      // Reason: inner non-null asserted by expect().not.toBeNull() immediately above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(inner!).toHaveClass('left-1/2')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(inner!).toHaveClass('top-1/2')
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const style = inner!.getAttribute('style') ?? ''
      // 58% = MIN_SCALE * 100; jsdom may serialize 0.58*100 as 57.99...% due to
      // floating-point — match the leading digits rather than the exact value.
      expect(style).toMatch(/width:\s*5[78](\.\d+)?%/)
      expect(style).toMatch(/height:\s*5[78](\.\d+)?%/)
    })
  })
})

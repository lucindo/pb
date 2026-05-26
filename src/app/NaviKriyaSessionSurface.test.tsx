import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NaviKriyaSessionSurface } from './NaviKriyaSessionSurface'
import { UI_STRINGS } from '../content/strings'

const EN_STRINGS = UI_STRINGS.en

// Minimal presentation fixture for the completion state.
const completionPresentation = {
  shape: { kind: 'orb' as const, cue: 'nose' as const, leadInDigit: null },
  readout: null,
  showCompletionHeadline: true,
}

// Minimal presentation fixture for the idle (pre-session) state.
const idlePresentation = {
  shape: { kind: 'orb' as const, cue: 'nose' as const, leadInDigit: null },
  readout: null,
  showCompletionHeadline: false,
}

describe('NaviKriyaSessionSurface completion branch', () => {
  it('forwards showCompletion to OrbShape — CheckmarkGlyph polyline is rendered on session complete', () => {
    const { container } = render(
      <NaviKriyaSessionSurface
        presentation={completionPresentation}
        breathingStrings={EN_STRINGS.practice.breathing}
        readoutStrings={EN_STRINGS.practice.readout}
        nkReadoutStrings={EN_STRINGS.practice.nkReadout}
        variant="orb-halo"
        idleMode="still"
        ringCue="progress-arc"
      />,
    )

    // OrbShape.showCompletion renders the CheckmarkGlyph with specific points.
    // Matching on polyline points avoids false matches from other 24×24 SVG icons.
    expect(container.querySelector('polyline[points="5 13 10 18 19 7"]')).not.toBeNull()
    // Regression guard: the "Session complete" headline is also rendered.
    expect(screen.getByText('Session complete')).toBeVisible()
  })

  it('idle state — no checkmark polyline when showCompletionHeadline is false (negative control)', () => {
    const { container } = render(
      <NaviKriyaSessionSurface
        presentation={idlePresentation}
        breathingStrings={EN_STRINGS.practice.breathing}
        readoutStrings={EN_STRINGS.practice.readout}
        nkReadoutStrings={EN_STRINGS.practice.nkReadout}
        variant="orb-halo"
        idleMode="still"
        ringCue="progress-arc"
      />,
    )

    // When showCompletionHeadline is false the checkmark must NOT appear —
    // proves the prop drives the glyph, not a global side effect.
    expect(container.querySelector('polyline[points="5 13 10 18 19 7"]')).toBeNull()
  })
})

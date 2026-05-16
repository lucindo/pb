// Phase 29 Plan 01: IosInstallSteps component tests.
// Covers 3 behaviors: all three step texts rendered, id prop propagated to
// container div, and the iOS Share SVG (aria-hidden) is present.
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { IosInstallSteps } from './IosInstallSteps'
import { UI_STRINGS } from '../content/strings'

function renderSteps(id = 'test-ios-steps') {
  return render(
    <IosInstallSteps id={id} strings={UI_STRINGS.en.install} />,
  )
}

describe('IosInstallSteps', () => {
  it('renders all three step texts', () => {
    renderSteps()
    expect(screen.getByText(UI_STRINGS.en.install.iosStep1)).toBeInTheDocument()
    expect(screen.getByText(UI_STRINGS.en.install.iosStep2)).toBeInTheDocument()
    expect(screen.getByText(UI_STRINGS.en.install.iosStep3)).toBeInTheDocument()
  })

  it('the container div uses the provided id prop', () => {
    const { container } = renderSteps('settings-ios-steps')
    const div = container.querySelector('#settings-ios-steps')
    expect(div).not.toBeNull()
  })

  it('contains the iOS Share SVG (aria-hidden)', () => {
    const { container } = renderSteps()
    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).not.toBeNull()
  })

  // GAP-1 regression: every step <li> must carry an explicit theme-aware
  // var(--color-breathing-*) token so none inherits the page-default text color
  // (which is near-black and unreadable against dark theme backgrounds).
  // Contract per 29-UI-SPEC §Color: step 1 = accent-strong, steps 2 & 3 = muted.
  it('GAP-1 regression: all three step list items carry a theme-aware color token', () => {
    const { container } = renderSteps()
    const listItems = container.querySelectorAll('li')
    // Exactly 3 steps
    expect(listItems).toHaveLength(3)
    // Every <li> has a className that includes a var(--color-breathing-* token
    // — no step inherits the theme-unaware page default (readability invariant)
    listItems.forEach((li) => {
      expect(li.className).toContain('var(--color-breathing-')
    })
    // Step 1: first-step highlight (accent-strong per UI-SPEC)
    expect(listItems[0]?.className).toContain('text-[var(--color-breathing-accent-strong)]')
    // Steps 2 & 3: secondary body text (muted per UI-SPEC; dark muted-vs-bg contrast 5.36)
    expect(listItems[1]?.className).toContain('text-[var(--color-breathing-muted)]')
    expect(listItems[2]?.className).toContain('text-[var(--color-breathing-muted)]')
  })
})

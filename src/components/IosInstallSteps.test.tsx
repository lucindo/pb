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

})

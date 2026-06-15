import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'
import { UI_STRINGS } from '../content/strings'
import { LearnPanel } from './LearnPanel'

function renderPanel() {
  return render(
    <LearnPanel
      learnContent={LEARN_CONTENT.en}
      lockedCopy={LOCKED_COPY.en}
      strings={UI_STRINGS.en.learn}
    />,
  )
}

describe('LearnPanel', () => {
  it('renders the Forrest explainer heading (LEARN-03 — shared, always)', () => {
    renderPanel()
    expect(screen.getByText(LEARN_CONTENT.en.explainer.forrest.title)).toBeInTheDocument()
  })

  it('renders the resources heading + the four Forrest resource links', () => {
    renderPanel()
    expect(screen.getByText(UI_STRINGS.en.learn.resourcesHeading)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /YouTube channel/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Website/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '"Mastering Meditation" book' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Patreon' })).toBeInTheDocument()
  })

  it('renders the native-apps section for resonant (D-02 gate)', () => {
    renderPanel()
    expect(screen.getByText(UI_STRINGS.en.learn.nativeAppsHeading)).toBeInTheDocument()
  })

  it('omits the adaptation block for resonant (HRV has no adaptation)', () => {
    renderPanel()
    const adaptation = LEARN_CONTENT.en.practices.stretch.adaptation
    expect(screen.queryByText(adaptation?.title ?? '')).not.toBeInTheDocument()
  })

  it('renders the locked affiliation micro-line + inspiredByForrest tagline', () => {
    renderPanel()
    expect(screen.getByText(LOCKED_COPY.en.inspiredByForrest)).toBeInTheDocument()
    expect(screen.getByText(LOCKED_COPY.en.affiliationLine)).toBeInTheDocument()
  })

  it('every <a> carries target="_blank" + rel="noopener noreferrer" (D-07)', () => {
    const { container } = renderPanel()
    const links = container.querySelectorAll('a')
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })
})

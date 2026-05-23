import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LEARN_CONTENT } from '../../content/learnContent'
import { LOCKED_COPY } from '../../content/lockedCopy'
import { UI_STRINGS } from '../../content/strings'
import { UiStringsProvider } from '../../hooks/useUiStringsContext'
import { LearnPage } from './LearnPage'

function renderPage(props: Partial<{ onBack: () => void }> = {}) {
  const onBack = props.onBack ?? vi.fn()
  const utils = render(
    <UiStringsProvider value={UI_STRINGS.en}>
      <LearnPage
        learnContent={LEARN_CONTENT.en}
        lockedCopy={LOCKED_COPY.en}
        activePractice="resonant"
        onBack={onBack}
      />
    </UiStringsProvider>,
  )
  return { ...utils, onBack }
}

describe('LearnPage', () => {
  it('renders the page title in a TopAppBar h1', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'About this practice' })).toBeInTheDocument()
  })

  it('renders the back button with the locked Close aria-label', () => {
    renderPage()
    expect(screen.getByRole('button', { name: UI_STRINGS.en.learn.close })).toBeInTheDocument()
  })

  it('back button invokes onBack', async () => {
    const user = userEvent.setup()
    const { onBack } = renderPage()
    await user.click(screen.getByRole('button', { name: UI_STRINGS.en.learn.close }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders the LearnPanel body — Forrest explainer + resources', () => {
    renderPage()
    expect(screen.getByText(LEARN_CONTENT.en.explainer.forrest.title)).toBeInTheDocument()
    expect(screen.getByText(UI_STRINGS.en.learn.resourcesHeading)).toBeInTheDocument()
  })

  it('every <a> in the page has target="_blank" + rel="noopener noreferrer" (D-07 preserved)', () => {
    const { container } = renderPage()
    const links = container.querySelectorAll('a')
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('focuses the back button on mount', () => {
    renderPage()
    expect(screen.getByRole('button', { name: UI_STRINGS.en.learn.close })).toHaveFocus()
  })
})

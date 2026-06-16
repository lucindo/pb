import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'
import { LearnPanel } from './LearnPanel'

function renderPanel() {
  return render(
    <LearnPanel learnContent={LEARN_CONTENT.en} lockedCopy={LOCKED_COPY.en} />,
  )
}

describe('LearnPanel', () => {
  it('renders every section heading and body', () => {
    renderPanel()
    for (const section of LEARN_CONTENT.en.sections) {
      expect(screen.getByText(section.title)).toBeInTheDocument()
      expect(screen.getByText(section.body)).toBeInTheDocument()
    }
  })

  it('renders the locked affiliation micro-line', () => {
    renderPanel()
    expect(screen.getByText(LOCKED_COPY.en.affiliationLine)).toBeInTheDocument()
  })
})

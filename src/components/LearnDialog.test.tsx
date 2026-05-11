import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LEARN_CONTENT } from '../content/learnContent'
import { LearnDialog } from './LearnDialog'

function renderDialog(
  props: Partial<{ open: boolean; onClose: () => void }> = {},
) {
  const onClose = props.onClose ?? vi.fn()
  const utils = render(
    <LearnDialog open={props.open ?? false} onClose={onClose} />,
  )
  return { ...utils, onClose }
}

describe('LearnDialog — closed state', () => {
  it('does not show the modal when open=false (IN-03 anti-flake — query raw <dialog>)', () => {
    const { container } = renderDialog({ open: false })
    const dialog = container.querySelector('dialog')
    expect(dialog).not.toBeNull()
    expect((dialog as HTMLDialogElement).open).toBe(false)
  })
})

describe('LearnDialog — open state default focus + locked copy', () => {
  it('opens with focus on Close button (D-05 default-focus-on-non-link safety)', () => {
    renderDialog({ open: true })
    const dialog = screen.getByRole('dialog', { name: 'About this practice' }) as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('renders the modal title "About this practice"', () => {
    renderDialog({ open: true })
    expect(screen.getByText('About this practice')).toBeVisible()
  })

  it('renders the locked phrase "inspired by Forrest\'s teachings" (D-11, D-19e)', () => {
    renderDialog({ open: true })
    expect(screen.getByText(/inspired by Forrest's teachings/)).toBeInTheDocument()
  })

  it('does NOT render any medical-advice sentence inside the modal (D-14 amendment 2026-05-10)', () => {
    // D-14 was amended: the medical-advice micro-line moved to the main breathing
    // card (D-15 amendment). Only the affiliation micro-line stays in the modal.
    renderDialog({ open: true })
    expect(
      screen.queryByText(/not medical advice/i),
    ).not.toBeInTheDocument()
  })

  it('renders the locked affiliation micro-line (D-14 #2)', () => {
    renderDialog({ open: true })
    expect(
      screen.getByText('Independent project. Not affiliated with Forrest Knutson.'),
    ).toBeInTheDocument()
  })
})

describe('LearnDialog — Esc + backdrop close paths', () => {
  it('Esc (dialog cancel event) invokes onClose via preventDefault path', () => {
    const { onClose, container } = renderDialog({ open: true })
    const dialog = container.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the backdrop (event.target === dialog itself) invokes onClose', () => {
    const { onClose, container } = renderDialog({ open: true })
    const dialog = container.querySelector('dialog')!
    fireEvent.click(dialog, { target: dialog })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking inside the inner panel (not the backdrop) does NOT invoke onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog({ open: true })
    // Click on the title h2 — child of the dialog, not the dialog element itself
    await user.click(screen.getByText('About this practice'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('clicking the Close button invokes onClose exactly once', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog({ open: true })
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('LearnDialog — external link security', () => {
  it('the YouTube channel link has target="_blank" and rel="noopener noreferrer"', () => {
    renderDialog({ open: true })
    const link = screen.getByRole('link', { name: /YouTube channel/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('the Website link has target="_blank" and rel="noopener noreferrer"', () => {
    renderDialog({ open: true })
    const link = screen.getByRole('link', { name: /Website/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('the Book link has target="_blank", rel="noopener noreferrer", and locked href (D-12)', () => {
    renderDialog({ open: true })
    const link = screen.getByRole('link', { name: 'Book' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('href', 'https://amzn.to/3RTAVqi')
  })

  it('the Patreon link is rendered with correct label, href, target, and rel (D-12 amendment)', () => {
    // Deviation D-12 amendment: patreon is the 4th key, rendered between book and heroVideo.
    renderDialog({ open: true })
    const link = screen.getByRole('link', { name: 'Patreon' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://www.patreon.com/forrestknutson')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('every <a> element in the dialog has target="_blank" and rel="noopener noreferrer" (D-07, D-19d)', () => {
    const { container } = renderDialog({ open: true })
    const links = container.querySelectorAll('a')
    // Expect at least 4 links (youtubeChannel + website + book + patreon + heroVideo + keyVideos)
    expect(links.length).toBeGreaterThanOrEqual(4)
    // The patreon link is included in this iteration — it must carry the same security posture.
    links.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  it('renders all keyVideos links with correct security attributes', () => {
    const { container } = renderDialog({ open: true })
    const keyVideos = LEARN_CONTENT.links.keyVideos
    // Every key video link must carry both security attributes.
    keyVideos.forEach((video) => {
      const link = container.querySelector(`a[href="${video.url}"]`)
      expect(link).not.toBeNull()
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })
})

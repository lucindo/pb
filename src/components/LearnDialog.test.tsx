import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LEARN_CONTENT } from '../content/learnContent'
import { LOCKED_COPY } from '../content/lockedCopy'
import { UI_STRINGS } from '../content/strings'
import type { LocaleId } from '../domain/settings'
import { LearnDialog } from './LearnDialog'

function renderDialog(
  props: Partial<{ open: boolean; onClose: () => void; locale: LocaleId }> = {},
) {
  const locale: LocaleId = props.locale ?? 'en'
  const onClose = props.onClose ?? vi.fn()
  const utils = render(
    <LearnDialog
      open={props.open ?? false}
      onClose={onClose}
      learnContent={LEARN_CONTENT[locale]}
      lockedCopy={LOCKED_COPY[locale]}
      strings={UI_STRINGS[locale].learn}
    />,
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
    // Reason: cast documents that getByRole returns HTMLDialogElement; TS infers HTMLElement but dialog.open requires HTMLDialogElement.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
    // Reason: dialog element is always present when open=true; querySelector('dialog') is guaranteed non-null.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dialog = container.querySelector('dialog')!
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking the backdrop (event.target === dialog itself) invokes onClose', () => {
    const { onClose, container } = renderDialog({ open: true })
    // Reason: dialog element is always present when open=true; querySelector('dialog') is guaranteed non-null.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    const link = screen.getByRole('link', { name: '"Mastering Meditation" book' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('href', 'https://www.amazon.com/Mastering-Meditation-Eight-Steps-Beginner-ebook/dp/B0CCFWP4W8?sr=8-1&linkId=1a5a2958fc89bdb6769b54d0bc9a4d17&language=en_US')
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

  it('renders all resonant practice videos links with correct security attributes', () => {
    const { container } = renderDialog({ open: true })
    // Phase 32: videos moved from links.keyVideos to practices.resonant.videos
    const resonantVideos = LEARN_CONTENT.en.practices.resonant.videos
    // Every practice video link must carry both security attributes.
    resonantVideos.forEach((video) => {
      const link = container.querySelector(`a[href="${video.url}"]`)
      expect(link).not.toBeNull()
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })
})

describe('LearnDialog — PT-BR rendering', () => {
  it('renders PT-BR forrest title + lockedCopy.inspiredByForrest when locale="pt-BR"', () => {
    renderDialog({ open: true, locale: 'pt-BR' })
    expect(screen.getByText(UI_STRINGS['pt-BR'].learn.title)).toBeInTheDocument()
    expect(screen.getByText(LOCKED_COPY['pt-BR'].inspiredByForrest)).toBeInTheDocument()
    expect(screen.queryByText('About this practice')).not.toBeInTheDocument()
  })
})

describe('LearnDialog — native-app store links', () => {
  it('App Store link has correct href, target="_blank", and rel="noopener noreferrer" (D-04, T-24-01)', () => {
    renderDialog({ open: true })
    const link = screen.getByRole('link', { name: /App Store/i })
    expect(link).toHaveAttribute('href', LEARN_CONTENT.en.links.appStoreIos.url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('Google Play link has correct href, target="_blank", and rel="noopener noreferrer" (D-04, T-24-01)', () => {
    renderDialog({ open: true })
    const link = screen.getByRole('link', { name: /Google Play/i })
    expect(link).toHaveAttribute('href', LEARN_CONTENT.en.links.googlePlayAndroid.url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the native-apps section heading for EN locale (D-01, D-08)', () => {
    renderDialog({ open: true })
    expect(screen.getByText(UI_STRINGS.en.learn.nativeAppsHeading)).toBeInTheDocument()
  })

  it('renders PT-BR native-apps heading and both PT-BR link labels (D-06)', () => {
    renderDialog({ open: true, locale: 'pt-BR' })
    expect(screen.getByText(UI_STRINGS['pt-BR'].learn.nativeAppsHeading)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: LEARN_CONTENT['pt-BR'].links.appStoreIos.label })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: LEARN_CONTENT['pt-BR'].links.googlePlayAndroid.label })).toBeInTheDocument()
  })
})

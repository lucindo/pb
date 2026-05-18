import { useEffect, useRef, type MouseEventHandler } from 'react'

import type { LearnContent } from '../content/learnContent'
import type { LockedCopy } from '../content/lockedCopy'
import type { UiStrings } from '../content/strings'

// CONTEXT.md D-05: native <dialog> with imperative showModal/close.
// D-07: every external link carries target="_blank" rel="noopener noreferrer".
// Phase 19 D-03/D-04: locked Forrest phrase + affiliation flow through props
//   (learnContent / lockedCopy resolved by useLocale() in App.tsx). Plan 08 stop-gap removed.
// D-05/D-07/D-14/D-15 attribution below.
// D-14: two disclaimer micro-lines inline (not in learnContent.ts).
// D-15: disclaimer copy lives ONLY inside this modal — not on the main screen.
// Phase 32 Plan 01: updated to use practices.resonant for the explainer/videos sections.
//   Full practice-aware rendering (D-01 order, naviKriya partition, D-02 native-apps gate)
//   is added in Plan 02.

export interface LearnDialogProps {
  open: boolean
  onClose(this: void): void
  learnContent: LearnContent
  lockedCopy: LockedCopy
  strings: UiStrings['learn']
}

export function LearnDialog({ open, onClose, learnContent, lockedCopy, strings }: LearnDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Imperative open/close so the browser sets up <dialog>'s top-layer + inert behavior.
  // D-05: default focus on Close button — never on a Forrest link.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      // AC-WR-05: a force-closed dialog can leave dialog.open === false while
      // React still believes open === true; showModal() then throws
      // InvalidStateError if the dialog is actually already open non-modally.
      try {
        dialog.showModal()
      } catch {
        /* already modal — safe to ignore */
      }
      dialog.scrollTop = 0
      closeButtonRef.current?.focus({ preventScroll: true })
      // iOS Safari does not always honor preventScroll: true and ends up
      // auto-scrolling the bottom Close button into view, leaving the
      // dialog opened mid-content. Reset scrollTop again on the next paint
      // so the re-scroll loses to our reset.
      requestAnimationFrame(() => {
        if (dialog.scrollTop !== 0) dialog.scrollTop = 0
      })
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Esc fires `cancel` (preventable) then `close`. We handle `cancel` and call onClose.
  // Pitfall 5 mitigation: preventDefault to avoid double-fire of close.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [onClose])

  // Click on the dialog itself (backdrop area) -> close.
  // Click on a child (the inner panel) -> ignored.
  const handleBackdropClick: MouseEventHandler<HTMLDialogElement> = (event) => {
    if (event.target === dialogRef.current) {
      onClose()
    }
  }

  const { explainer, links } = learnContent
  // Phase 32 Plan 01: resonant practice content (description + videos).
  // Plan 02 will replace this with practice-aware selection using activePractice prop.
  const resonantContent = learnContent.practices.resonant

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="learn-dialog-title"
      onClick={handleBackdropClick}
      className="modal-fade m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)] p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
    >
      <div className="grid gap-5 p-6 sm:p-7">
        <h2 id="learn-dialog-title" className="text-2xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)]">{strings.title}</h2>

        {/* Practice description sections (resonant by default — Plan 02 will add practice-aware selection) */}
        <div className="grid gap-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{resonantContent.description.section1.title}</h3>
            <p className="text-base leading-6 text-[var(--color-breathing-muted)]">{resonantContent.description.section1.body}</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{resonantContent.description.section2.title}</h3>
            <p className="text-base leading-6 text-[var(--color-breathing-muted)]">{resonantContent.description.section2.body}</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{explainer.forrest.title}</h3>
            {explainer.forrest.body.split('\n\n').map((paragraph) => (
              <p key={paragraph} className="text-base leading-6 text-[var(--color-breathing-muted)] [&:not(:first-of-type)]:mt-2">{paragraph}</p>
            ))}
            <p className="text-base leading-6 italic text-[var(--color-breathing-muted)] [&:not(:first-of-type)]:mt-2">{lockedCopy.inspiredByForrest}</p>
          </div>
        </div>

        {/* Forrest Resources — shared, always rendered */}
        <div>
          <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{strings.resourcesHeading}</h3>
          <div className="mt-1 grid gap-2">
            <a
              href={links.youtubeChannel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
            >
              {links.youtubeChannel.label}
            </a>
            <a
              href={links.website.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
            >
              {links.website.label}
            </a>
            <a
              href={links.book.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
            >
              {links.book.label}
            </a>
            {/* D-12 amendment: patreon is the 4th key, between book and videos */}
            <a
              href={links.patreon.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
            >
              {links.patreon.label}
            </a>
          </div>
        </div>

        {/* Practice videos — resonant by default (Plan 02 will add practice-aware selection) */}
        <div>
          <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{strings.videosHeading}</h3>
          <div className="mt-1 grid gap-2">
            {resonantContent.videos.map((video) => (
              <a
                key={video.url}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
              >
                {video.label}
              </a>
            ))}
          </div>
        </div>

        {/* D-01 (Phase 24): native-apps sub-section.
            D-02: resonant-only (Plan 02 will add the activePractice === 'resonant' gate).
            D-04 / T-24-01: target="_blank" rel="noopener noreferrer" on both links.
            D-08: heading and labels name the "Resonant Breathing" app only — no Forrest authorship claim. */}
        <div>
          <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{strings.nativeAppsHeading}</h3>
          <div className="mt-1 grid gap-2">
            <a
              href={links.appStoreIos.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
            >
              {links.appStoreIos.label}
            </a>
            <a
              href={links.googlePlayAndroid.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-base font-medium text-[var(--color-breathing-accent)] hover:text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
            >
              {links.googlePlayAndroid.label}
            </a>
          </div>
        </div>

        {/* D-14 amendment (2026-05-10, user-approved): the medical-advice
            micro-line was moved from this modal to the main breathing card
            (D-15 amendment). Only the affiliation micro-line remains here. */}
        <p className="text-center text-xs text-[var(--color-breathing-muted)]">
          {lockedCopy.affiliationLine}
        </p>

        {/* T-06-08 mitigation: default focus lands here (Close), not on any link.
            Prevents accidental Enter dispatching navigation on a Forrest link. */}
        <div className="flex justify-center">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] px-5 py-2 text-base font-semibold text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >{strings.close}</button>
        </div>
      </div>
    </dialog>
  )
}

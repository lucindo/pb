import { useEffect, useRef, type MouseEventHandler } from 'react'

import type { LearnContent } from '../content/learnContent'
import type { LockedCopy } from '../content/lockedCopy'
import type { UiStrings } from '../content/strings'
import type { PracticeId } from '../storage/practices'

// CONTEXT.md D-05: native <dialog> with imperative showModal/close.
// D-07: every external link carries target="_blank" rel="noopener noreferrer".
// Phase 19 D-03/D-04: locked Forrest phrase + affiliation flow through props
//   (learnContent / lockedCopy resolved by useLocale() in App.tsx). Plan 08 stop-gap removed.
// D-05/D-07/D-14/D-15 attribution below.
// D-14: two disclaimer micro-lines inline (not in learnContent.ts).
// D-15: disclaimer copy lives ONLY inside this modal — not on the main screen.
// Phase 32 Plan 02: practice-aware rendering — activePractice prop drives practice content selection.
//   D-01 section order: practice description → practice videos → Forrest explainer →
//   Forrest Resources → (native apps, resonant only per D-02) → affiliation → Close.
//   D-04: dialog title stays generic ("About this practice") — no practice name in title.
//   D-07: every <a> carries target="_blank" rel="noopener noreferrer".
//   D-08: practice-description heading is the sole signal of which practice is shown.

export interface LearnDialogProps {
  open: boolean
  onClose(this: void): void
  learnContent: LearnContent
  lockedCopy: LockedCopy
  strings: UiStrings['learn']
  activePractice: PracticeId
}

export function LearnDialog({ open, onClose, learnContent, lockedCopy, strings, activePractice }: LearnDialogProps) {
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

  const { explainer, links, practices } = learnContent
  // D-07: auto-tracks active practice — no in-dialog toggle; renders whichever practice the switcher is on.
  // Phase 34: stretch does not yet have its own learn content; fall back to resonant content so the
  // dialog can open without crashing (practices map only has resonant + naviKriya keys).
  const practiceContentKey = activePractice === 'stretch' ? 'resonant' : activePractice
  const practiceContent = practices[practiceContentKey as keyof typeof practices]
  // D-01 (SECOND): video sub-heading follows the resolved content key (practiceContentKey),
  // not the raw activePractice. Stretch falls back to resonant content AND the resonant
  // heading — so the heading always matches the content actually rendered.
  const videosHeading = practiceContentKey === 'resonant' ? strings.videosHeading : strings.naviKriyaVideosHeading

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="learn-dialog-title"
      onClick={handleBackdropClick}
      className="modal-fade m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)] p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
    >
      <div className="grid gap-5 p-6 sm:p-7">
        <h2 id="learn-dialog-title" className="text-2xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)]">{strings.title}</h2>

        {/* D-01 (FIRST): Practice description — practice-specific per activePractice.
            D-08: section headings are the sole signal of which practice is shown; no extra practice label. */}
        <div className="grid gap-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{practiceContent.description.section1.title}</h3>
            <p className="text-base leading-6 text-[var(--color-breathing-muted)]">{practiceContent.description.section1.body}</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{practiceContent.description.section2.title}</h3>
            <p className="text-base leading-6 text-[var(--color-breathing-muted)]">{practiceContent.description.section2.body}</p>
          </div>
        </div>

        {/* D-01 (SECOND): Practice videos — practice-specific.
            Heading: videosHeading for resonant, naviKriyaVideosHeading for NK.
            Links: flat practiceContent.videos array — [heroVideo, ...keyVideos] for resonant; 2 links for NK.
            D-07: every <a> carries target="_blank" rel="noopener noreferrer". */}
        <div>
          <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{videosHeading}</h3>
          <div className="mt-1 grid gap-2">
            {practiceContent.videos.map((video) => (
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

        {/* D-01 (THIRD): Who is Forrest Knutson — shared, always rendered (LEARN-03). */}
        <div>
          <h3 className="text-base font-semibold text-[var(--color-breathing-accent-strong)]">{explainer.forrest.title}</h3>
          {explainer.forrest.body.split('\n\n').map((paragraph) => (
            <p key={paragraph} className="text-base leading-6 text-[var(--color-breathing-muted)] [&:not(:first-of-type)]:mt-2">{paragraph}</p>
          ))}
          <p className="text-base leading-6 italic text-[var(--color-breathing-muted)] [&:not(:first-of-type)]:mt-2">{lockedCopy.inspiredByForrest}</p>
        </div>

        {/* D-01 (FOURTH): Forrest Resources — shared, always rendered (LEARN-03). */}
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
            {/* D-12 amendment: patreon is the 4th key */}
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

        {/* D-01 (FIFTH): native-apps sub-section — resonant only per D-02.
            D-02: fully omitted for Navi Kriya — no heading, no links, no placeholder div.
            D-04 / T-24-01: target="_blank" rel="noopener noreferrer" on both links.
            D-08: heading and labels name the "Resonant Breathing" app only — no Forrest authorship claim. */}
        {activePractice === 'resonant' && (
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
        )}

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

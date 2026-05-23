import { useCallback, useRef } from 'react'

import type { LearnContent } from '../content/learnContent'
import type { LockedCopy } from '../content/lockedCopy'
import type { UiStrings } from '../content/strings'
import type { PracticeId } from '../storage/practices'
import { LearnPanel } from './LearnPanel'
import { useModalDialog } from './useModalDialog'

// CONTEXT.md D-05: native <dialog> with imperative showModal/close.
// D-07: every external link carries target="_blank" rel="noopener noreferrer" (enforced by LearnPanel).
// Phase 19 D-03/D-04: locked Forrest phrase + affiliation flow through props.
// D-14 amendment: medical-advice micro-line is on the main breathing card, NOT here.
//
// Body sections live in LearnPanel — shared with the LearnPage surface used
// by the appScreen=='learn' route. This component is the legacy modal path
// and is slated for deletion in the refactor loop's Item G once LearnPage is
// confirmed live.

export interface LearnDialogProps {
  open: boolean
  onClose(this: void): void
  learnContent: LearnContent
  lockedCopy: LockedCopy
  strings: UiStrings['learn']
  activePractice: PracticeId
}

export function LearnDialog({ open, onClose, learnContent, lockedCopy, strings, activePractice }: LearnDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const focusCloseButton = useCallback((dialog: HTMLDialogElement): void => {
    dialog.scrollTop = 0
    closeButtonRef.current?.focus({ preventScroll: true })
    // iOS Safari does not always honor preventScroll: true and can scroll the
    // bottom Close button into view; reset on the next paint so the dialog opens at top.
    requestAnimationFrame(() => {
      if (dialog.scrollTop !== 0) dialog.scrollTop = 0
    })
  }, [])
  const { dialogRef, onBackdropClick } = useModalDialog({
    open,
    onClose,
    onAfterOpen: focusCloseButton,
  })

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="learn-dialog-title"
      onClick={onBackdropClick}
      className="modal-fade m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)] p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
    >
      <div className="grid gap-5 p-6 sm:p-7">
        <h2 id="learn-dialog-title" className="text-center text-2xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)]">{strings.title}</h2>

        <LearnPanel
          learnContent={learnContent}
          lockedCopy={lockedCopy}
          strings={strings}
          activePractice={activePractice}
        />

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

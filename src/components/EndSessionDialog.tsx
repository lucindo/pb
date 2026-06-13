import { useEffect, useRef, type MouseEventHandler, type ReactNode } from 'react'

import type { UiStrings } from '../content/strings'

export interface EndSessionDialogProps {
  open: boolean
  onConfirm(this: void): void
  onCancel(this: void): void
  strings: UiStrings['practice']['endSessionDialog']
  // Optional summary slot rendered between the title and the action buttons —
  // the Navi Kriya completion dialog uses it for the rounds/duration summary.
  body?: ReactNode
}

export function EndSessionDialog({ open, onConfirm, onCancel, strings, body }: EndSessionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Imperative open/close so the browser sets up <dialog>'s top-layer + inert behavior.
  // Default focus on Keep going (cancel), not on the destructive primary.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      // A force-closed dialog can leave dialog.open === false while React still
      // believes open === true; showModal() then throws InvalidStateError if
      // the dialog is actually already open non-modally.
      try {
        dialog.showModal()
      } catch {
        /* already modal — safe to ignore */
      }
      cancelButtonRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Esc fires `cancel` (preventable) then `close`. We handle `cancel` and call onCancel.
  // preventDefault avoids double-fire of the close event.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onCancel()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [onCancel])

  // Click on the dialog itself (backdrop area) → cancel.
  // Click on a child (the inner panel) → ignored.
  const handleBackdropClick: MouseEventHandler<HTMLDialogElement> = (event) => {
    if (event.target === dialogRef.current) {
      onCancel()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="end-session-title"
      onClick={handleBackdropClick}
      className="modal-fade m-0 mt-auto mb-0 max-h-[85vh] w-full max-w-full overflow-y-auto rounded-t-3xl rounded-b-none border-t border-[var(--color-border-soft)] bg-[var(--color-breathing-surface)] p-0 shadow-[0_-10px_30px_rgba(0,0,0,0.10)] backdrop:bg-[var(--color-modal-backdrop)] sm:m-auto sm:max-h-[82vh] sm:w-auto sm:max-w-sm sm:rounded-2xl sm:border sm:shadow-[0_16px_48px_rgba(0,0,0,0.22)]"
    >
      <div className="p-6 pb-7 sm:p-7">
        {/* Mobile grabber — mirrors the settings sheet so the early-end prompt
            reads as a native bottom sheet on phones, not a floating web card. */}
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-1 w-11 rounded-full sm:hidden"
          style={{ background: 'var(--color-border-soft)' }}
        />
        <div className="grid gap-5">
        <h2
          id="end-session-title"
          style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}
          className="text-center text-[var(--color-breathing-text)]"
        >
          {strings.title}
        </h2>
        {body !== undefined && (
          <div className="text-sm text-[var(--color-breathing-text-soft)]">{body}</div>
        )}
        {/* F2: column order matches DOM order on mobile (Keep going on top, End
            below) so the destructive action doesn't sit above the safe one. On
            desktop the row places primary action (End) right of Keep going. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[var(--color-border-soft)] bg-transparent px-5 py-3 text-[15px] font-medium text-[var(--color-breathing-text)] transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {strings.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-[var(--color-breathing-accent)] px-5 py-3 text-[15px] font-semibold text-[var(--color-breathing-on-accent)] transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {strings.confirm}
          </button>
        </div>
        </div>
      </div>
    </dialog>
  )
}

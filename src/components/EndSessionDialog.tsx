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
      className="modal-fade m-auto max-w-sm rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-breathing-surface)] p-0 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop:bg-[var(--color-modal-backdrop)]"
    >
      <div className="grid gap-5 p-6 sm:p-7">
        <h2
          id="end-session-title"
          style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}
          className="text-[var(--color-breathing-text)]"
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
            className="rounded-full border border-[var(--color-border-soft)] bg-transparent px-5 py-3 text-[15px] font-medium tracking-[0.04em] text-[var(--color-breathing-text)] transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {strings.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-[var(--color-breathing-accent)] px-5 py-3 text-[15px] font-semibold tracking-[0.06em] text-[var(--color-breathing-on-accent)] transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {strings.confirm}
          </button>
        </div>
      </div>
    </dialog>
  )
}

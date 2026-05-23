import { useEffect, useRef, type MouseEventHandler, type ReactNode } from 'react'

import type { UiStrings } from '../content/strings'

export interface EndSessionDialogProps {
  open: boolean
  onConfirm(this: void): void
  onCancel(this: void): void
  strings: UiStrings['endSessionDialog']
  // D-12: optional summary slot rendered between the title and the action
  // buttons — the Navi Kriya completion dialog uses it for the rounds/duration
  // summary. When absent the dialog behaves byte-identically to before.
  body?: ReactNode
}

export function EndSessionDialog({ open, onConfirm, onCancel, strings, body }: EndSessionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Imperative open/close so the browser sets up <dialog>'s top-layer + inert behavior.
  // D-12: default focus on Keep going (cancel), not on the destructive primary.
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
      cancelButtonRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Esc fires `cancel` (preventable) then `close`. We handle `cancel` and call onCancel.
  // RESEARCH Pitfall 5: prevent default to avoid double-fire of the close event.
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
      className="modal-fade m-auto max-w-sm rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)] p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
    >
      <div className="grid gap-5 p-6 sm:p-7">
        <h2
          id="end-session-title"
          className="text-2xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)]"
        >
          {strings.title}
        </h2>
        {body !== undefined && (
          <div className="text-sm text-[var(--color-breathing-muted)]">{body}</div>
        )}
        {/* F2: drop flex-col-reverse so mobile column order matches DOM order
            (Keep going on top, End below). Previously column-reverse stacked the
            destructive End above Keep going on mobile, which inverts the safety
            stance behind D-12 (default focus on Keep going). Desktop layout
            (sm:flex-row sm:justify-end) keeps Keep going left, End right, where
            CTA conventions place primary actions. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] px-5 py-2 text-base font-semibold text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {strings.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-full bg-[var(--color-destructive)] px-5 py-2 text-base font-semibold text-[var(--color-destructive-on)] shadow-lg shadow-red-900/20 transition hover:bg-[var(--color-destructive-hover)] active:bg-[var(--color-destructive-active)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            {strings.confirm}
          </button>
        </div>
      </div>
    </dialog>
  )
}

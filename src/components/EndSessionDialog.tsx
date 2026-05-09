import { useEffect, useRef, type MouseEventHandler } from 'react'

export interface EndSessionDialogProps {
  open: boolean
  onConfirm(): void
  onCancel(): void
}

export function EndSessionDialog({ open, onConfirm, onCancel }: EndSessionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Imperative open/close so the browser sets up <dialog>'s top-layer + inert behavior.
  // D-12: default focus on Keep going (cancel), not on the destructive primary.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
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
      className="modal-fade m-auto max-w-sm rounded-3xl border border-teal-100 bg-white p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
    >
      <div className="grid gap-5 p-6 sm:p-7">
        <h2
          id="end-session-title"
          className="text-2xl font-semibold tracking-tight text-slate-950"
        >
          End this session?
        </h2>
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
            className="min-h-12 rounded-full border border-teal-200 bg-white px-5 py-2 text-base font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            Keep going
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-full bg-teal-700 px-5 py-2 text-base font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-800 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            End
          </button>
        </div>
      </div>
    </dialog>
  )
}

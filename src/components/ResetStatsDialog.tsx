import { useEffect, useRef, type MouseEventHandler } from 'react'

export interface ResetStatsDialogProps {
  open: boolean
  onConfirm(this: void): void
  onCancel(this: void): void
}

export function ResetStatsDialog({ open, onConfirm, onCancel }: ResetStatsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Imperative open/close so the browser sets up <dialog>'s top-layer + inert behavior.
  // Phase 4 D-12: default focus on Keep (cancel), not on the destructive Reset.
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
  // Pitfall 5 mitigation: preventDefault to avoid double-fire of close.
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

  // Click on the dialog itself (backdrop area) -> cancel.
  // Click on a child (the inner panel) -> ignored.
  const handleBackdropClick: MouseEventHandler<HTMLDialogElement> = (event) => {
    if (event.target === dialogRef.current) {
      onCancel()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reset-stats-title"
      onClick={handleBackdropClick}
      className="modal-fade m-auto max-w-sm rounded-3xl border border-teal-100 bg-white p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
    >
      <div className="grid gap-5 p-6 sm:p-7">
        <h2
          id="reset-stats-title"
          className="text-2xl font-semibold tracking-tight text-slate-950"
        >
          Reset practice stats?
        </h2>
        {/* Same row layout as Phase 2 dialog: Keep on top (mobile col), Keep left / Reset right (desktop row). */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="min-h-12 rounded-full border border-teal-200 bg-white px-5 py-2 text-base font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 active:bg-teal-100 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-12 rounded-full bg-red-700 px-5 py-2 text-base font-semibold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-800 active:bg-red-900 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >
            Reset
          </button>
        </div>
      </div>
    </dialog>
  )
}

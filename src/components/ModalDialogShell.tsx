import type { ReactElement, ReactNode } from 'react'

import { useModalDialog } from './useModalDialog'

interface ModalDialogShellProps {
  open: boolean
  labelledBy: string
  onClose(this: void): void
  children: ReactNode
}

export function ModalDialogShell({
  open,
  labelledBy,
  onClose,
  children,
}: ModalDialogShellProps): ReactElement {
  const { dialogRef, onBackdropClick } = useModalDialog({ open, onClose })

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onClick={onBackdropClick}
      className="modal-fade m-auto max-w-md rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)] p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
    >
      {children}
    </dialog>
  )
}

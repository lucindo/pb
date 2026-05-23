import {
  useCallback,
  useEffect,
  useRef,
  type MouseEventHandler,
  type RefObject,
} from 'react'

export interface UseModalDialogArgs {
  open: boolean
  onClose(this: void): void
  onAfterOpen?(this: void, dialog: HTMLDialogElement): void
}

export interface ModalDialogBindings {
  dialogRef: RefObject<HTMLDialogElement | null>
  onBackdropClick: MouseEventHandler<HTMLDialogElement>
}

export function useModalDialog({
  open,
  onClose,
  onAfterOpen,
}: UseModalDialogArgs): ModalDialogBindings {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return

    if (open && !dialog.open) {
      try {
        dialog.showModal()
      } catch {
        // A force-closed dialog can leave browser modal state out of sync with
        // React's open prop; keep rendering and let the next prop change reconcile.
      }
      onAfterOpen?.(dialog)
      return
    }

    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, onAfterOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) return

    const handleCancel = (event: Event): void => {
      event.preventDefault()
      onClose()
    }

    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [onClose])

  const onBackdropClick = useCallback<MouseEventHandler<HTMLDialogElement>>(
    (event) => {
      if (event.target === dialogRef.current) {
        onClose()
      }
    },
    [onClose],
  )

  return { dialogRef, onBackdropClick }
}

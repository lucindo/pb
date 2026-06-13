import { type ReactElement, type ReactNode } from 'react'

import type { UiStrings } from '../content/strings'
import { ConfirmDialog } from './ConfirmDialog'

export interface EndSessionDialogProps {
  open: boolean
  onConfirm(this: void): void
  onCancel(this: void): void
  strings: UiStrings['practice']['endSessionDialog']
  // Optional summary slot rendered between the title and the action buttons —
  // the Navi Kriya completion dialog uses it for the rounds/duration summary.
  body?: ReactNode
}

export function EndSessionDialog({ open, onConfirm, onCancel, strings, body }: EndSessionDialogProps): ReactElement {
  return (
    <ConfirmDialog
      open={open}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title={strings.title}
      confirmLabel={strings.confirm}
      cancelLabel={strings.cancel}
      body={body}
    />
  )
}

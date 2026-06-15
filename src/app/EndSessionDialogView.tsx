import type { ReactElement } from 'react'

import { EndSessionDialog } from '../components/EndSessionDialog'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppDialogsViewModel } from './appViewModel'

interface EndSessionDialogViewProps {
  dialogs: AppDialogsViewModel
}

/** Renders the end-session confirmation dialog. It stays modal — a
 *  confirmation flow, not a navigation destination. Only rendered from
 *  PracticeScreen since an end-session prompt can only fire while a session
 *  is running (which forces appScreen='practice'). */
export function EndSessionDialogView({ dialogs }: EndSessionDialogViewProps): ReactElement {
  const strings = useUiStrings().practice.endSessionDialog
  const { endSession } = dialogs
  return (
    <EndSessionDialog
      open={endSession.open}
      onConfirm={endSession.onConfirm}
      onCancel={endSession.onCancel}
      strings={strings}
    />
  )
}

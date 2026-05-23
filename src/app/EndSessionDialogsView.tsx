import type { ReactElement } from 'react'

import { EndSessionDialog } from '../components/EndSessionDialog'
import { useUiStrings } from '../hooks/useUiStringsContext'
import type { AppDialogsViewModel } from './appViewModel'

interface EndSessionDialogsViewProps {
  dialogs: AppDialogsViewModel
}

/** Renders the per-practice end-session confirmation dialogs. These remain
 *  modal — they are confirmation flows, not navigation destinations. Only
 *  rendered from PracticeScreen since end-session prompts can only fire
 *  while a session is running (which forces appScreen='practice'). */
export function EndSessionDialogsView({
  dialogs,
}: EndSessionDialogsViewProps): ReactElement {
  const strings = useUiStrings().practice.endSessionDialog
  return (
    <>
      {dialogs.endSessionDialogs.map((dialog) => (
        <EndSessionDialog
          key={dialog.id}
          open={dialog.open}
          onConfirm={dialog.onConfirm}
          onCancel={dialog.onCancel}
          strings={strings}
        />
      ))}
    </>
  )
}

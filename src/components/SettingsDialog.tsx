import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { ModalDialogShell } from './ModalDialogShell'
import { SettingsPanel } from './SettingsPanel'

const SETTINGS_DIALOG_TITLE_ID = 'settings-dialog-title'

export interface SettingsDialogProps {
  open: boolean
  onClose(this: void): void
  inSessionView: boolean
  strings: Pick<UiStrings, 'appSettings' | 'install'>
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
}

export function SettingsDialog({
  open,
  onClose,
  inSessionView,
  strings,
  isIOS,
  isStandalone,
  installable,
  onInstall,
}: SettingsDialogProps): ReactElement {
  return (
    <ModalDialogShell
      open={open}
      labelledBy={SETTINGS_DIALOG_TITLE_ID}
      onClose={onClose}
    >
      <SettingsPanel
        titleId={SETTINGS_DIALOG_TITLE_ID}
        inSessionView={inSessionView}
        strings={strings}
        isIOS={isIOS}
        isStandalone={isStandalone}
        installable={installable}
        onInstall={onInstall}
        onClose={onClose}
      />
    </ModalDialogShell>
  )
}

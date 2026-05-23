import type { ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { SettingsPanelBody } from './SettingsPanelBody'

// Legacy modal Settings panel. Renders the title + body + bottom Close button
// inside the existing SettingsDialog. Body content lives in SettingsPanelBody
// so the new AppSettingsPage can reuse it without duplicating the picker
// stack. Scheduled for removal in refactor-loop Item G once AppSettingsPage
// is confirmed live.

export interface SettingsPanelProps {
  titleId: string
  inSessionView: boolean
  strings: Pick<UiStrings, 'appSettings' | 'install'>
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
  onClose(this: void): void
}

export function SettingsPanel({
  titleId,
  inSessionView,
  strings,
  isIOS,
  isStandalone,
  installable,
  onInstall,
  onClose,
}: SettingsPanelProps): ReactElement {
  return (
    <div className="grid gap-5 p-6 sm:p-7">
      <h2 id={titleId} className="text-2xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)]">
        {strings.appSettings.title}
      </h2>
      <SettingsPanelBody
        inSessionView={inSessionView}
        strings={strings}
        isIOS={isIOS}
        isStandalone={isStandalone}
        installable={installable}
        onInstall={onInstall}
      />
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] px-5 py-2 text-base font-semibold text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        >
          {strings.appSettings.close}
        </button>
      </div>
    </div>
  )
}

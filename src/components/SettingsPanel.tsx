import { useState, type ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { CuePicker } from './CuePicker'
import { IosInstallSteps } from './IosInstallSteps'
import { LanguagePicker } from './LanguagePicker'
import { ThemePicker } from './ThemePicker'
import { TimbrePicker } from './TimbrePicker'

export interface SettingsPanelProps {
  titleId: string
  inSessionView: boolean
  strings: Pick<UiStrings, 'settings' | 'themes' | 'cue' | 'timbres' | 'install'>
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
  onClose(this: void): void
}

function SettingsInstallSection({
  inSessionView,
  strings,
  isIOS,
  onInstall,
}: {
  inSessionView: boolean
  strings: UiStrings['install']
  isIOS: boolean
  onInstall(this: void): Promise<void>
}): ReactElement {
  const [iosExpanded, setIosExpanded] = useState<boolean>(false)

  return (
    <div>
      <p className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">
        {strings.settingsLabel}
      </p>
      <div className="mt-2">
        {isIOS ? (
          <>
            <button
              type="button"
              aria-expanded={iosExpanded}
              aria-controls="settings-ios-steps"
              disabled={inSessionView}
              onClick={() => { setIosExpanded(prev => !prev) }}
              className="mx-auto block min-h-[44px] text-sm font-semibold text-[var(--color-breathing-accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {strings.iosStepsButton}
            </button>
            {iosExpanded && <IosInstallSteps id="settings-ios-steps" strings={strings} />}
          </>
        ) : (
          <button
            type="button"
            disabled={inSessionView}
            onClick={() => { void onInstall() }}
            className="min-h-[44px] rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] px-5 py-2 text-sm font-semibold text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {strings.installButton}
          </button>
        )}
      </div>
    </div>
  )
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
        {strings.settings.title}
      </h2>
      <ThemePicker disabled={inSessionView} strings={strings.themes} sectionLabel={strings.settings.themeLabel} />
      <CuePicker disabled={inSessionView} strings={strings.cue} sectionLabel={strings.settings.cueLabel} />
      <TimbrePicker disabled={inSessionView} strings={strings.timbres} sectionLabel={strings.settings.timbreLabel} />
      <LanguagePicker disabled={inSessionView} sectionLabel={strings.settings.languageLabel} />
      {installable && !isStandalone && (
        <SettingsInstallSection
          inSessionView={inSessionView}
          strings={strings.install}
          isIOS={isIOS}
          onInstall={onInstall}
        />
      )}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] px-5 py-2 text-base font-semibold text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        >
          {strings.settings.close}
        </button>
      </div>
    </div>
  )
}

import { useState, type ReactElement } from 'react'

import type { UiStrings } from '../content/strings'
import { CuePicker } from './CuePicker'
import { IosInstallSteps } from './IosInstallSteps'
import { LanguagePicker } from './LanguagePicker'
import { ThemePicker } from './ThemePicker'
import { TimbrePicker } from './TimbrePicker'

// Body of the Settings surface — pickers + install row. Shared by:
//   - SettingsPanel.tsx (legacy modal path; SettingsDialog wraps it; deleted in Item G)
//   - app/pages/AppSettingsPage.tsx (full-page surface via PageShell + TopAppBar)
// Excludes the title and bottom Close button — those belong to the surrounding
// chrome (modal h2 / page TopAppBar).

export interface SettingsPanelBodyProps {
  inSessionView: boolean
  strings: Pick<UiStrings, 'appSettings' | 'install'>
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
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

export function SettingsPanelBody({
  inSessionView,
  strings,
  isIOS,
  isStandalone,
  installable,
  onInstall,
}: SettingsPanelBodyProps): ReactElement {
  return (
    <div className="grid gap-5">
      <ThemePicker disabled={inSessionView} strings={strings.appSettings.themes} sectionLabel={strings.appSettings.themeLabel} />
      <CuePicker disabled={inSessionView} strings={strings.appSettings.cue} sectionLabel={strings.appSettings.cueLabel} />
      <TimbrePicker disabled={inSessionView} strings={strings.appSettings.timbres} sectionLabel={strings.appSettings.timbreLabel} />
      <LanguagePicker disabled={inSessionView} sectionLabel={strings.appSettings.languageLabel} />
      {installable && !isStandalone && (
        <SettingsInstallSection
          inSessionView={inSessionView}
          strings={strings.install}
          isIOS={isIOS}
          onInstall={onInstall}
        />
      )}
    </div>
  )
}

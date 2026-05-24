import { useState, type ReactElement, type ReactNode } from 'react'

import type { UiStrings } from '../content/strings'
import { CuePicker } from './CuePicker'
import { IosInstallSteps } from './IosInstallSteps'
import { LanguagePicker } from './LanguagePicker'
import { SettingsSectionHeader } from './SettingsSectionHeader'
import { ThemePicker } from './ThemePicker'
import { TimbrePicker } from './TimbrePicker'

// Body of the Settings surface — pickers + install row + about. Consumed by
// AppSettingsPage. Excludes the title and back affordance — those belong
// to the surrounding page chrome (TopAppBar).
//
// J14: restructured into 4 spike-locked sections per spike 010 sixth +
// seventh pass (index.html lines 1797-1894): Appearance / Language / Audio
// / About. Each section is a self-contained card (border-soft + surface +
// 20px radius). Install moves into About (operator OQ-1). Spike's
// illustrative "Subtle haptics" toggle in Audio is intentionally omitted
// per [[spike-is-design-not-features]] — no haptics in the app domain.

const GITHUB_URL = 'https://github.com/lucindo/hrv'

export interface SettingsPanelBodyProps {
  inSessionView: boolean
  strings: Pick<UiStrings, 'appSettings' | 'install'>
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
}

// Spike-locked card chrome — border-soft 1px + surface bg + 20px radius
// (spike index.html lines 1809-1814). Padding varies per section content;
// callers supply via the `padding` prop.
function SectionCard({
  padding,
  children,
}: {
  padding: string
  children: ReactNode
}): ReactElement {
  return (
    <div
      style={{
        background: 'var(--color-breathing-surface)',
        border: '1px solid var(--color-border-soft)',
        borderRadius: 20,
        padding,
      }}
    >
      {children}
    </div>
  )
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

function AboutRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): ReactElement {
  return (
    <div className="flex items-center justify-between">
      <span
        style={{
          color: 'var(--color-breathing-text-soft)',
          fontSize: 13,
        }}
      >
        {label}
      </span>
      {children}
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
  const showInstallRow = installable && !isStandalone
  return (
    <div>
      {/* Appearance */}
      <SettingsSectionHeader label={strings.appSettings.sections.appearance} />
      <SectionCard padding="16px">
        <ThemePicker
          disabled={inSessionView}
          strings={strings.appSettings.themes}
          sectionLabel={strings.appSettings.themeLabel}
          sectionLabelHidden
        />
      </SectionCard>

      {/* Language */}
      <SettingsSectionHeader label={strings.appSettings.sections.language} />
      <SectionCard padding="16px">
        <LanguagePicker
          disabled={inSessionView}
          sectionLabel={strings.appSettings.languageLabel}
          sectionLabelHidden
        />
      </SectionCard>

      {/* Audio */}
      <SettingsSectionHeader label={strings.appSettings.sections.audio} />
      <SectionCard padding="16px">
        <div className="grid gap-4">
          <CuePicker
            disabled={inSessionView}
            strings={strings.appSettings.cue}
            sectionLabel={strings.appSettings.cueLabel}
          />
          <TimbrePicker
            disabled={inSessionView}
            strings={strings.appSettings.timbres}
            sectionLabel={strings.appSettings.timbreLabel}
          />
        </div>
      </SectionCard>

      {/* About */}
      <SettingsSectionHeader label={strings.appSettings.sections.about} />
      <SectionCard padding="14px 16px">
        <div className="grid gap-2">
          <AboutRow label={strings.appSettings.about.versionLabel}>
            <span
              style={{
                color: 'var(--color-breathing-text)',
                fontSize: 13,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {__APP_VERSION__}
            </span>
          </AboutRow>
          <AboutRow label={strings.appSettings.about.sourceLabel}>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
              style={{
                color: 'var(--color-breathing-accent-strong)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {strings.appSettings.about.sourceLinkText} →
            </a>
          </AboutRow>
          {showInstallRow && (
            <div
              className="pt-3"
              style={{
                borderTop: '1px solid var(--color-border-soft)',
                marginTop: 4,
              }}
            >
              <SettingsInstallSection
                inSessionView={inSessionView}
                strings={strings.install}
                isIOS={isIOS}
                onInstall={onInstall}
              />
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

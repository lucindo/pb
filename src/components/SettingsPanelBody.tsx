import { useState, type ReactElement, type ReactNode } from 'react'

import type { UiStrings } from '../content/strings'
import type { LocaleId } from '../domain'
import type { PersistedStats } from '../storage'
import { usePreferenceChoice } from '../hooks/usePreferenceChoice'
import { IosInstallSteps } from './IosInstallSteps'
import { LanguagePicker } from './LanguagePicker'
import { SectionCard } from './primitives/SectionCard'
import { SettingsSectionHeader } from './SettingsSectionHeader'
import { SettingsStatsSection } from './SettingsStatsSection'
import { SettingsToggleRow } from './SettingsToggleRow'
import { ThemePicker } from './ThemePicker'
import { TimbrePicker } from './TimbrePicker'

// Body of the Settings surface — one page, four sections plus a privacy note.
// Consumed by AppSettingsPage; excludes the title + back affordance, which
// belong to the surrounding page chrome (TopAppBar).
//
//   System      — Theme · Language
//   Sound       — Timbre · Bypass silent mode
//   Statistics  — inline session totals + reset
//   About       — version · source · install
//   (privacy note rendered below About)

const GITHUB_URL = 'https://github.com/lucindo/hrv'

export interface SettingsPanelBodyProps {
  inSessionView: boolean
  strings: Pick<UiStrings, 'appSettings' | 'install' | 'stats'>
  isIOS: boolean
  isStandalone: boolean
  installable: boolean
  onInstall(this: void): Promise<void>
  // Inline Statistics block.
  stat: PersistedStats
  practiceName: string
  locale: LocaleId
  onResetStats(this: void): void
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
      <p className="text-sm font-medium text-[var(--color-breathing-text-soft)]">
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
              className="mx-auto block min-h-[44px] text-sm font-medium text-[var(--color-breathing-text-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
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
            className="min-h-[44px] rounded-full border border-[var(--color-border-soft)] bg-[var(--color-breathing-surface)] px-5 py-2 text-sm font-medium text-[var(--color-breathing-text-soft)] transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
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
  stat,
  practiceName,
  locale,
  onResetStats,
}: SettingsPanelBodyProps): ReactElement {
  const [bypassSilentMode, setBypassSilentMode] = usePreferenceChoice('bypassSilentMode')
  const showInstallRow = installable && !isStandalone
  return (
    <div>
      {/* System */}
      <SettingsSectionHeader label={strings.appSettings.sections.system} />
      <SectionCard padding="16px">
        <div className="grid gap-4">
          <ThemePicker
            disabled={inSessionView}
            strings={strings.appSettings.themes}
            sectionLabel={strings.appSettings.themeLabel}
          />
          <LanguagePicker
            disabled={inSessionView}
            sectionLabel={strings.appSettings.languageLabel}
          />
        </div>
      </SectionCard>

      {/* Sound */}
      <SettingsSectionHeader label={strings.appSettings.sections.sound} />
      <SectionCard padding="16px">
        <div className="grid gap-4">
          <TimbrePicker
            disabled={inSessionView}
            strings={strings.appSettings.timbres}
            sectionLabel={strings.appSettings.timbreLabel}
          />
          {/* Changing this toggle mid-session does NOT rebuild the audio engine. The
              flag is read at engine construction time (Start click / reconstruct); a
              toggle change applies on the next engine construction. */}
          <SettingsToggleRow
            label={strings.appSettings.bypassSilentMode.label}
            ariaLabel={strings.appSettings.bypassSilentMode.label}
            checked={bypassSilentMode}
            onChange={setBypassSilentMode}
            disabled={inSessionView}
          />
        </div>
      </SectionCard>

      {/* Statistics */}
      <SettingsStatsSection
        sectionLabel={strings.appSettings.sections.statistics}
        stat={stat}
        strings={strings.stats}
        locale={locale}
        practiceName={practiceName}
        onReset={onResetStats}
      />

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
              {[__APP_VERSION__, __APP_BUILD_SHA__, __APP_BUILD_DATE__]
                .filter((v) => typeof v === 'string' && v.length > 0)
                .join(' · ') || 'unknown'}
              {' · '}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
                style={{
                  color: 'var(--color-breathing-accent-strong)',
                  fontWeight: 600,
                }}
              >
                {strings.appSettings.about.sourceLinkText} →
              </a>
            </span>
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

      {/* Privacy note — applies to the inline stats above; sits below About. */}
      <p className="mt-6 text-center text-xs leading-relaxed text-[var(--color-breathing-muted)]">
        {strings.stats.privacyNote}
      </p>
    </div>
  )
}

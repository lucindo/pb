import { useState } from 'react'

import { CuePicker } from './CuePicker'
import { IosInstallSteps } from './IosInstallSteps'
import { LanguagePicker } from './LanguagePicker'
import { ThemePicker } from './ThemePicker'
import { TimbrePicker } from './TimbrePicker'
import type { UiStrings } from '../content/strings'
import { useModalDialog } from './useModalDialog'

// src/components/SettingsDialog.tsx
//
// Phase 15 INFRA-04: SettingsDialog — native <dialog> shell for four customization pickers.
//
// D-05: single onClose prop (no onConfirm/onCancel split — not a destructive action).
// D-10: inner layout single column, Theme → Cue → Timbre → Language order. (Phase 38: Variant slot removed.)
// D-11: Close affordance = explicit Close button + native Esc + backdrop-click cancel.
// D-12: auto-close on inSessionView is handled in App.tsx (WR-09 useEffect); this component
//        receives the resulting open=false prop and closes imperatively via dialogRef.
// D-13: NO explicit focus call on open — SettingsDialog has no destructive default;
//        native focus-return contract.
// D-15: zero new npm dependencies — pure React + native <dialog>.
// D-18: locked strings — title "Settings", Close button "Close".

export interface SettingsDialogProps {
  open: boolean
  onClose(this: void): void
  inSessionView: boolean
  strings: Pick<UiStrings, 'settings' | 'themes' | 'cue' | 'timbres' | 'install'>
  // Phase 29 additions (D-01 through D-10):
  isIOS: boolean
  isStandalone: boolean
  installable: boolean          // = isIOS || deferredPrompt !== null, pre-computed in App.tsx
  onInstall(this: void): Promise<void>
}

export function SettingsDialog({ open, onClose, inSessionView, strings, isIOS, isStandalone, installable, onInstall }: SettingsDialogProps) {
  const [iosExpanded, setIosExpanded] = useState<boolean>(false)
  const { dialogRef, onBackdropClick } = useModalDialog({ open, onClose })

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="settings-dialog-title"
      onClick={onBackdropClick}
      className="modal-fade m-auto max-w-md rounded-3xl border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-surface)] p-0 shadow-[var(--shadow-breathing-card)] backdrop:bg-[var(--color-modal-backdrop)]"
    >
      <div className="grid gap-5 p-6 sm:p-7">
        <h2 id="settings-dialog-title" className="text-2xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)]">{strings.settings.title}</h2>
        {/* D-10 (updated Phase 25 Plan 04 / Phase 38): Theme → Cue → Timbre → Language order (Landmine 7: each receives disabled={inSessionView}) */}
        <ThemePicker disabled={inSessionView} strings={strings.themes} sectionLabel={strings.settings.themeLabel} />
        <CuePicker disabled={inSessionView} strings={strings.cue} sectionLabel={strings.settings.cueLabel} />
        <TimbrePicker disabled={inSessionView} strings={strings.timbres} sectionLabel={strings.settings.timbreLabel} />
        <LanguagePicker disabled={inSessionView} sectionLabel={strings.settings.languageLabel} />
        {/* D-01/D-02: install row — last block before Close, below Language picker.
            D-04/D-08: shown only when installable AND not already standalone.
            D-09/D-10: no isPhone check — present on desktop Chrome/Edge too. */}
        {installable && !isStandalone && (
          <div>
            <p className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">
              {strings.install.settingsLabel}
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
                    {strings.install.iosStepsButton}
                  </button>
                  {iosExpanded && <IosInstallSteps id="settings-ios-steps" strings={strings.install} />}
                </>
              ) : (
                <button
                  type="button"
                  disabled={inSessionView}
                  onClick={() => { void onInstall() }}
                  className="min-h-[44px] rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] px-5 py-2 text-sm font-semibold text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {strings.install.installButton}
                </button>
              )}
            </div>
          </div>
        )}
        {/* D-11 + D-18: explicit Close button — primary mobile dismiss path */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-full border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] px-5 py-2 text-base font-semibold text-[var(--color-breathing-accent-strong)] shadow-sm transition hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
          >{strings.settings.close}</button>
        </div>
      </div>
    </dialog>
  )
}

// src/components/LanguagePicker.tsx
//
// Phase 19 (I18N-01..02): Fills the Phase 15 stub body with a real radiogroup
// mirroring TimbrePicker.tsx verbatim (D-22 token-binding).
//
// D-08: useLocaleChoice() owns mount-time storage read + savePrefs write path.
// D-14: Option labels use LOCALE_DISPLAY_NAMES (native endonyms) — labels are
//       identical in BOTH UI locales (English / Português (Brasil)).
// D-20: LanguagePickerProps accepts ONLY { disabled: boolean }; no new props.
// D-22: Zero hardcoded Tailwind palette utilities (theme.no-hardcoded-classes guard);
//       all color references are var(--color-breathing-*) tokens verbatim from TimbrePicker.
// D-23: a11y posture — role=radiogroup + aria-labelledby + aria-disabled on
//       container; role=radio + checked state attribute + DOM disabled on each option button;
//       44×44 min hit area + focus-visible ring chain.
//
// NOTE: Section label 'Language' stays hardcoded for this plan.
// Plan 06 Task 7 (LanguagePicker sectionLabel widening + SettingsDialog drill)
// will replace it with a translatable prop driven by strings.settings.languageLabel.

import { LOCALE_OPTIONS, type LocaleId } from '../domain/settings'
import { useLocaleChoice } from '../hooks/useLocaleChoice'
import { LOCALE_DISPLAY_NAMES } from '../content/strings'

export interface LanguagePickerProps {
  disabled: boolean
}

export function LanguagePicker({ disabled }: LanguagePickerProps) {
  const { locale, setLocale } = useLocaleChoice()

  return (
    <div>
      <p id="language-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">Language</p>
      <div
        role="radiogroup"
        aria-labelledby="language-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-2 gap-2"
      >
        {LOCALE_OPTIONS.map((id: LocaleId) => {
          const selected = locale === id
          const label = LOCALE_DISPLAY_NAMES[id]
          const selectedClasses = 'border-2 border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] text-[var(--color-breathing-accent-strong)]'
          const unselectedClasses = 'border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'
          const baseClasses = 'min-h-12 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45'

          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => { setLocale(id) }}
              className={`${baseClasses} ${selected ? selectedClasses : unselectedClasses}`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

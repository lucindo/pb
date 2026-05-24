import { LOCALE_OPTIONS, type LocaleId } from '../domain'
import { useLocaleChoice } from '../hooks/useLocaleChoice'
import { LOCALE_DISPLAY_NAMES } from '../content/strings'
import { SegmentedControl } from './primitives/SegmentedControl'

export interface LanguagePickerProps {
  disabled: boolean
  sectionLabel: string
  sectionLabelHidden?: boolean
}

export function LanguagePicker({ disabled, sectionLabel, sectionLabelHidden }: LanguagePickerProps) {
  const { locale, setLocale } = useLocaleChoice()
  const options = LOCALE_OPTIONS.map((id) => ({ id, label: LOCALE_DISPLAY_NAMES[id] }))
  return (
    <div>
      <p
        id="language-picker-label"
        className={
          sectionLabelHidden
            ? 'sr-only'
            : 'mb-2 text-sm font-semibold text-[var(--color-breathing-accent-strong)]'
        }
      >
        {sectionLabel}
      </p>
      <SegmentedControl<LocaleId>
        options={options}
        value={locale}
        onChange={setLocale}
        ariaLabel={sectionLabel}
        disabled={disabled}
      />
    </div>
  )
}

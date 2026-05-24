import { LOCALE_OPTIONS, type LocaleId } from '../domain'
import { useLocaleChoice } from '../hooks/useLocaleChoice'
import { LOCALE_DISPLAY_NAMES } from '../content/strings'
import { PickerCardGrid } from './primitives/PickerCardGrid'

export interface LanguagePickerProps {
  disabled: boolean
  sectionLabel: string
  sectionLabelHidden?: boolean
}

export function LanguagePicker({ disabled, sectionLabel, sectionLabelHidden }: LanguagePickerProps) {
  const { locale, setLocale } = useLocaleChoice()
  return (
    <PickerCardGrid<LocaleId>
      sectionLabel={sectionLabel}
      sectionLabelHidden={sectionLabelHidden}
      labelId="language-picker-label"
      options={LOCALE_OPTIONS}
      value={locale}
      onChange={setLocale}
      renderOption={(id) => LOCALE_DISPLAY_NAMES[id]}
      columns={2}
      disabled={disabled}
    />
  )
}

import { LOCALE_OPTIONS, type LocaleId } from '../domain'
import { useLocaleChoice } from '../hooks/useLocaleChoice'
import { LOCALE_DISPLAY_NAMES } from '../content/strings'
import { PickerCardGrid } from './primitives/PickerCardGrid'

export interface LanguagePickerProps {
  disabled: boolean
  sectionLabel: string
}

export function LanguagePicker({ disabled, sectionLabel }: LanguagePickerProps) {
  const { locale, setLocale } = useLocaleChoice()
  return (
    <PickerCardGrid<LocaleId>
      sectionLabel={sectionLabel}
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

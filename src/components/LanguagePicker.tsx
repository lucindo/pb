import type { ReactElement } from 'react'
import { LOCALE_OPTIONS, type LocaleId } from '../domain'
import { usePreferenceChoice } from '../hooks/usePreferenceChoice'
import { LOCALE_DISPLAY_NAMES } from '../content/strings'
import { SegmentedField } from './primitives/SegmentedField'

export interface LanguagePickerProps {
  disabled: boolean
  sectionLabel: string
  sectionLabelHidden?: boolean
}

export function LanguagePicker({ disabled, sectionLabel, sectionLabelHidden }: LanguagePickerProps): ReactElement {
  const [locale, setLocale] = usePreferenceChoice('locale')
  const options = LOCALE_OPTIONS.map((id) => ({ id, label: LOCALE_DISPLAY_NAMES[id] }))
  return (
    <SegmentedField<LocaleId>
      sectionLabel={sectionLabel}
      sectionLabelHidden={sectionLabelHidden}
      options={options}
      value={locale}
      onChange={setLocale}
      disabled={disabled}
    />
  )
}

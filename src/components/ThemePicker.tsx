import { THEME_OPTIONS, type ThemeId } from '../domain'
import { useThemeChoice } from '../hooks/useThemeChoice'
import type { UiStrings } from '../content/strings'
import { PickerCardGrid } from './primitives/PickerCardGrid'

export interface ThemePickerProps {
  disabled: boolean
  strings: UiStrings['appSettings']['themes']
  sectionLabel: string
  sectionLabelHidden?: boolean
}

export function ThemePicker({ disabled, strings, sectionLabel, sectionLabelHidden }: ThemePickerProps) {
  const { theme, setTheme } = useThemeChoice()
  return (
    <PickerCardGrid<ThemeId>
      sectionLabel={sectionLabel}
      sectionLabelHidden={sectionLabelHidden}
      labelId="theme-picker-label"
      options={THEME_OPTIONS}
      value={theme}
      onChange={setTheme}
      renderOption={(id) => strings[id]}
      columns={3}
      disabled={disabled}
    />
  )
}

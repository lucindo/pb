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

// Theme color-swatches matching the spike's L1831-1834 pattern (a 14×14 circle
// showing the theme's bg color, regardless of the currently rendered theme).
// Hex values come from src/styles/theme.css --color-breathing-bg in each scope.
const SWATCH_STYLE: Record<ThemeId, React.CSSProperties> = {
  light: { background: '#f3f5f7' },
  dark: { background: '#1a1d24' },
  system: { background: 'linear-gradient(90deg, #f3f5f7 0%, #f3f5f7 50%, #1a1d24 50%, #1a1d24 100%)' },
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
      renderOption={(id) => (
        <>
          <span
            aria-hidden="true"
            className="inline-block size-3.5 shrink-0 rounded-full border border-[var(--color-border-soft)]"
            style={SWATCH_STYLE[id]}
          />
          <span>{strings[id]}</span>
        </>
      )}
      columns={3}
      disabled={disabled}
    />
  )
}

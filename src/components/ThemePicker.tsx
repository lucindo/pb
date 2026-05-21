// src/components/ThemePicker.tsx
//
// Phase 15 D-01: one file per customization dimension — Phase 16 fills this file body.
// SettingsDialog.tsx is NOT edited in Phase 16 (D-19 hard invariant).
// D-20: ThemePickerProps accepts ONLY { disabled: boolean }; the setTheme setter
// comes from internal useThemeChoice() — NOT from props.
// UI-SPEC §1: radiogroup over native <button role="radio"> with aria-checked semantics.
// D-22: English-locked labels (Light/Dark/System verbatim); Phase 19 owns translation.

import { THEME_OPTIONS, type ThemeId } from '../domain/settings'
import { useThemeChoice } from '../hooks/useThemeChoice'
import type { UiStrings } from '../content/strings'

export interface ThemePickerProps {
  disabled: boolean
  strings: UiStrings['themes']
  sectionLabel: string
}

export function ThemePicker({ disabled, strings, sectionLabel }: ThemePickerProps) {
  const { theme, setTheme } = useThemeChoice()

  return (
    <div>
      <p id="theme-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">{sectionLabel}</p>
      <div
        role="radiogroup"
        aria-labelledby="theme-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-3 gap-2"
      >
        {THEME_OPTIONS.map((id: ThemeId) => {
          const selected = theme === id
          const label = strings[id]
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
              onClick={() => { setTheme(id) }}
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

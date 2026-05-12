// src/components/ThemePicker.tsx
//
// Phase 15 D-01: one file per customization dimension — Phase 16 (THEME-01..05) fills
// THIS file body to add the theme picker UI; SettingsDialog.tsx is NOT edited in Phase 16.
// D-02: accepts exactly { disabled: boolean }; self-reads loadPrefs() — no value prop.
// D-04: stub renders label + current stored value as read-only text (`Theme: system`).
// D-06: zero write-path calls at Phase 15 — read-only stub only.
// D-18: locked stub format `Theme: {prefs.theme}` — verbatim, no display-mapping function.

import { loadPrefs } from '../storage/prefs'

export interface ThemePickerProps {
  disabled: boolean
}

export function ThemePicker({ disabled }: ThemePickerProps) {
  const prefs = loadPrefs()
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">Theme</p>
      <p className={`text-sm ${disabled ? 'text-[var(--color-breathing-muted)]' : 'text-slate-700'}`}>
        Theme: {prefs.theme}
      </p>
    </div>
  )
}

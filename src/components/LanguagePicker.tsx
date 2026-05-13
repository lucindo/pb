// src/components/LanguagePicker.tsx
//
// Phase 15 D-01: one file per customization dimension — Phase 19 (I18N-01..07) fills
// THIS file body to add the language picker UI; SettingsDialog.tsx is NOT edited in Phase 19.
// D-02: accepts exactly { disabled: boolean }; self-reads loadPrefs() — no value prop.
// D-04: stub renders label + current stored value as read-only text (`Language: en`).
// D-06: zero write-path calls at Phase 15 — read-only stub only.
// D-18: section label is 'Language' (not 'Locale') — maps to prefs.locale field.
//       Phase 19 may later display full locale names ('English' / 'Português (Brasil)');
//       Phase 15 ships the raw BCP-47 identifier per Phase 14 D-08 lock.

import { loadPrefs } from '../storage/prefs'

export interface LanguagePickerProps {
  disabled: boolean
}

export function LanguagePicker({ disabled }: LanguagePickerProps) {
  const prefs = loadPrefs()
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">Language</p>
      <p className={`text-sm ${disabled ? 'text-[var(--color-breathing-muted)]' : 'text-slate-700'}`}>
        Language: {prefs.locale}
      </p>
    </div>
  )
}

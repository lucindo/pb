// src/components/TimbrePicker.tsx
//
// Phase 15 D-01: one file per customization dimension — Phase 18 (TIMBRE-01..05) fills
// THIS file body to add the timbre picker UI; SettingsDialog.tsx is NOT edited in Phase 18.
// D-02: accepts exactly { disabled: boolean }; self-reads loadPrefs() — no value prop.
// D-04: stub renders label + current stored value as read-only text (`Timbre: bowl`).
// D-06: zero write-path calls at Phase 15 — read-only stub only.
// D-18: locked stub format — `Label: value` verbatim, no display-mapping function.

import { loadPrefs } from '../storage/prefs'

export interface TimbrePickerProps {
  disabled: boolean
}

export function TimbrePicker({ disabled }: TimbrePickerProps) {
  const prefs = loadPrefs()
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">Timbre</p>
      <p className={`text-sm ${disabled ? 'text-[var(--color-breathing-muted)]' : 'text-slate-700'}`}>
        Timbre: {prefs.timbre}
      </p>
    </div>
  )
}

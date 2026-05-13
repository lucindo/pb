// src/components/VariantPicker.tsx
//
// Phase 15 D-01: one file per customization dimension — Phase 17 (VARIANT-01..07) fills
// THIS file body to add the variant picker UI; SettingsDialog.tsx is NOT edited in Phase 17.
// D-02: accepts exactly { disabled: boolean }; self-reads loadPrefs() — no value prop.
// D-04: stub renders label + current stored value as read-only text (`Variant: orb`).
// D-06: zero write-path calls at Phase 15 — read-only stub only.
// D-18: locked stub format — `Label: value` verbatim, no display-mapping function.

import { loadPrefs } from '../storage/prefs'

export interface VariantPickerProps {
  disabled: boolean
}

export function VariantPicker({ disabled }: VariantPickerProps) {
  const prefs = loadPrefs()
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">Variant</p>
      <p className={`text-sm ${disabled ? 'text-[var(--color-breathing-muted)]' : 'text-[var(--color-breathing-accent-strong)]'}`}>
        Variant: {prefs.variant}
      </p>
    </div>
  )
}

// src/components/TimbrePicker.tsx
//
// Phase 18 (TIMBRE-01..05): verbatim mirror of ThemePicker.tsx (D-06 name-only
// radiogroup) with theme→timbre substitutions. useTimbreChoice (Plan 02) owns
// both the mount-time storage read and the savePrefs() write path, so the
// direct storage import the Phase 15 stub used is no longer needed here.
// SettingsDialog.tsx is NOT edited (D-16 hard invariant — the timbre body lives
// entirely inside TimbrePicker.tsx + useTimbreChoice.ts).
// Phase 14 D-09 file-split preserved — domain/settings.ts + storage/prefs.ts NOT edited.
// D-17: TimbrePickerProps accepts ONLY { disabled: boolean }; no new props at the
// SettingsDialog call site.
// D-19: every color reference is var(--color-breathing-*) — theme.no-hardcoded-classes
// guard stays green (zero banned palette utilities; see src/styles/theme.no-hardcoded-classes.test.ts
// for the authoritative pattern list).
// D-20: a11y posture (role=radiogroup + aria-labelledby + aria-disabled on container;
// role=radio + aria-checked + DOM disabled on each option button) + 44×44 hit area via
// min-h-12 — identical to ThemePicker.

import { TIMBRE_OPTIONS, type TimbreId } from '../domain/settings'
import { useTimbreChoice } from '../hooks/useTimbreChoice'

export interface TimbrePickerProps {
  disabled: boolean
}

export function TimbrePicker({ disabled }: TimbrePickerProps) {
  const { timbre, setTimbre } = useTimbreChoice()

  return (
    <div>
      <p id="timbre-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">Timbre</p>
      <div
        role="radiogroup"
        aria-labelledby="timbre-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-2 gap-2"
      >
        {TIMBRE_OPTIONS.map((id: TimbreId) => {
          const selected = timbre === id
          const label = id.charAt(0).toUpperCase() + id.slice(1)
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
              onClick={() => { setTimbre(id) }}
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

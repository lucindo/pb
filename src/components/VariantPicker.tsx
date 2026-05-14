// src/components/VariantPicker.tsx
//
// Phase 17 Plan 05: Full radiogroup body for variant selection.
// Mirrors ThemePicker.tsx posture verbatim with inline shape swatches stacked
// above option labels. Consumes useVariantChoice (Plan 04) for state + write path.
// Honors VARIANT-06 a11y floor (44×44 hit area + focus-visible ring) and
// Phase 15 D-02 picker prop contract ({ disabled: boolean } only — no value prop).
// D-20: SettingsDialog.tsx is NOT edited in Phase 17.
// D-23: zero hardcoded color classes — all color references via var(--color-*) tokens
// or token-bound Tailwind shorthand utilities (text-breathing-accent, ring-breathing-accent).

import { VARIANT_OPTIONS, type VisualVariantId } from '../domain/settings'
import { useVariantChoice } from '../hooks/useVariantChoice'

export interface VariantPickerProps {
  disabled: boolean
}

export function VariantPicker({ disabled }: VariantPickerProps) {
  const { variant, setVariant } = useVariantChoice()

  return (
    <div>
      <p id="variant-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">Variant</p>
      <div
        role="radiogroup"
        aria-labelledby="variant-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-3 gap-2"
      >
        {VARIANT_OPTIONS.map((id: VisualVariantId) => {
          const selected = variant === id
          const label = id.charAt(0).toUpperCase() + id.slice(1)
          const selectedClasses = 'border-2 border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] text-[var(--color-breathing-accent-strong)]'
          const unselectedClasses = 'border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'
          const baseClasses = 'min-h-12 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 flex flex-col items-center gap-1'

          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => { setVariant(id) }}
              className={`${baseClasses} ${selected ? selectedClasses : unselectedClasses}`}
            >
              {/* Swatch primitive per variant (UI-SPEC §"Inline Shape Swatches"):
                  - Orb: span with orb-layer--in class + borderRadius 50%
                  - Square: span with orb-layer--in class + borderRadius 18%
                  - Ring: SVG circle stroke (Pitfall 8 — radial-gradient invisible at 24px) */}
              {id === 'ring' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="var(--color-orb-in-from)" strokeWidth="4" />
                </svg>
              ) : (
                <span className="block w-6 h-6 relative" aria-hidden="true">
                  <span
                    className="orb-layer--in absolute inset-0"
                    style={{ borderRadius: id === 'square' ? '18%' : '50%' }}
                  />
                </span>
              )}
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

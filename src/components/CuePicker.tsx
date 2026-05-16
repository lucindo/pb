// src/components/CuePicker.tsx
//
// Phase 25 Plan 04: Radiogroup picker for cue style selection.
// Mirrors VariantPicker.tsx posture verbatim with CueGlyph previews stacked
// above option labels. Consumes useCueChoice (Plan 02) for state + write path.
// Honors Phase 15 D-02 picker prop contract ({ disabled, strings, sectionLabel } — NO value prop).
// D-23: zero hardcoded color classes — all color references via var(--color-*) tokens
// or token-bound Tailwind shorthand utilities (text-breathing-accent, ring-breathing-accent).
// Distinct DOM id "cue-picker-label" to avoid collision with VariantPicker's label id.

import { CUE_OPTIONS, type CueStyleId } from '../domain/settings'
import { useCueChoice } from '../hooks/useCueChoice'
import { CueGlyph } from './CueGlyph'
import type { UiStrings } from '../content/strings'

export interface CuePickerProps {
  disabled: boolean
  strings: UiStrings['cue']
  sectionLabel: string
}

export function CuePicker({ disabled, strings, sectionLabel }: CuePickerProps) {
  const { cue, setCue } = useCueChoice()

  return (
    <div>
      <p id="cue-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">{sectionLabel}</p>
      <div
        role="radiogroup"
        aria-labelledby="cue-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-3 gap-2"
      >
        {CUE_OPTIONS.map((id: CueStyleId) => {
          const selected = cue === id
          const label = strings[id]
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
              onClick={() => { setCue(id) }}
              className={`${baseClasses} ${selected ? selectedClasses : unselectedClasses}`}
            >
              {/* Preview glyph: CueGlyph in preview mode — picker-swatch color token
                  (matches VariantPicker swatches) and a "T" for the text option.
                  Scaled wrapper renders it at swatch size, not in-orb display size. */}
              <span className="block w-8 h-8 overflow-hidden flex items-center justify-center" aria-hidden="true">
                <span className="scale-50 origin-center block">
                  <CueGlyph cue={id} phase="in" phaseLabel={label} preview />
                </span>
              </span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

import type { ReactElement, ReactNode } from 'react'

export type PickerCardLayout = 'inline' | 'stack'

export interface PickerCardGridProps<T extends string> {
  sectionLabel: string
  labelId: string
  options: readonly T[]
  value: T
  onChange(this: void, next: T): void
  renderOption(this: void, option: T): ReactNode
  columns: 2 | 3
  disabled: boolean
  optionLayout?: PickerCardLayout
}

const COLUMNS_CLASS: Record<2 | 3, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
}

// Class strings are byte-equivalent to the per-picker copies in Cue/Theme/
// Timbre/LanguagePicker prior to Item E — kept verbatim so the radiogroup
// posture (44×44 hit area via min-h-12, focus-visible ring chain, accent
// border on selected, disabled opacity floor) stays identical.
const BASE_BUTTON =
  'min-h-12 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45'
const SELECTED_BUTTON =
  'border-2 border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] text-[var(--color-breathing-accent-strong)]'
const UNSELECTED_BUTTON =
  'border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'
const STACK_LAYOUT = 'flex flex-col items-center gap-1'

/** Radiogroup-as-cards primitive. Shared shape behind CuePicker / ThemePicker /
 *  TimbrePicker / LanguagePicker — each consumer becomes a thin adapter that
 *  owns its own choice hook and option→label mapping. The primitive owns the
 *  visual posture (card buttons, selected/unselected styling, a11y wiring)
 *  and the layout grid.
 *
 *  `labelId` is explicit (not auto-generated via useId) so existing tests
 *  that assert on specific id strings (e.g. CuePicker.test.tsx checks
 *  `getElementById('cue-picker-label')`) keep passing without rewrite.
 *
 *  `optionLayout='stack'` adds `flex flex-col items-center gap-1` to each
 *  button — used by CuePicker to stack the CueGlyph swatch above the label.
 *  Default `'inline'` matches the other three pickers' single-line layout. */
export function PickerCardGrid<T extends string>({
  sectionLabel,
  labelId,
  options,
  value,
  onChange,
  renderOption,
  columns,
  disabled,
  optionLayout = 'inline',
}: PickerCardGridProps<T>): ReactElement {
  const layoutClass = optionLayout === 'stack' ? ` ${STACK_LAYOUT}` : ''

  return (
    <div>
      <p id={labelId} className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">{sectionLabel}</p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled}
        className={`mt-2 grid ${COLUMNS_CLASS[columns]} gap-2`}
      >
        {options.map((id) => {
          const selected = value === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => { onChange(id) }}
              className={`${BASE_BUTTON}${layoutClass} ${selected ? SELECTED_BUTTON : UNSELECTED_BUTTON}`}
            >
              {renderOption(id)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

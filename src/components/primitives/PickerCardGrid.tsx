import type { ReactElement, ReactNode } from 'react'

export type PickerCardLayout = 'inline' | 'stack'

export interface PickerCardGridProps<T extends string> {
  sectionLabel: string
  labelId: string
  options: readonly T[]
  value: T
  onChange(this: void, next: T): void
  renderOption(this: void, option: T): ReactNode
  columns: 2 | 3 | 4
  disabled?: boolean
  optionLayout?: PickerCardLayout | undefined
  // When true, the `<p>` sublabel is rendered sr-only — visible label duty has
  // moved to an enclosing SettingsSectionHeader, but the radiogroup's
  // `aria-labelledby` link stays intact for screen readers.
  sectionLabelHidden?: boolean | undefined
}

const COLUMNS_CLASS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

// Picker card chrome (locked values):
// - Selected: bg=bg-soft + 1px accent border + text token
// - Unselected: bg=surface + 1px border-soft + text-soft
// - No shadow
// - Inline layout: rounded-full, px-3 py-1.5, 12 px label, icon + label in row
// - Stack layout: rounded-2xl, py-3, 11 px label / 18 px glyph, glyph above label
const BASE_BUTTON =
  'transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45'
const SELECTED_BUTTON =
  'border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] text-[var(--color-breathing-text)]'
const UNSELECTED_BUTTON =
  'border border-[var(--color-border-soft)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-text-soft)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'
const INLINE_LAYOUT =
  'inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs'
const STACK_LAYOUT =
  'flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 text-[11px] tracking-[0.04em]'

/** Radiogroup-as-cards primitive. Shared shape behind CuePicker / ThemePicker /
 *  TimbrePicker / LanguagePicker — each consumer becomes a thin adapter that
 *  owns its own choice hook and option→label mapping. The primitive owns the
 *  visual posture (card buttons, selected/unselected styling, a11y wiring)
 *  and the layout grid.
 *
 *  `labelId` is explicit (not auto-generated via useId) so callers control the
 *  `aria-labelledby` id.
 *
 *  `optionLayout='stack'` switches each button to STACK_LAYOUT (glyph stacked
 *  above the label) — used by CuePicker. Default `'inline'` matches the other
 *  three pickers' single-line layout. */
export function PickerCardGrid<T extends string>({
  sectionLabel,
  labelId,
  options,
  value,
  onChange,
  renderOption,
  columns,
  disabled = false,
  optionLayout = 'inline',
  sectionLabelHidden = false,
}: PickerCardGridProps<T>): ReactElement {
  const layoutClass = optionLayout === 'stack' ? STACK_LAYOUT : INLINE_LAYOUT
  const labelClass = sectionLabelHidden
    ? 'sr-only'
    : 'text-sm font-semibold text-[var(--color-breathing-accent-strong)]'
  const radiogroupMarginClass = sectionLabelHidden ? '' : 'mt-2 '

  return (
    <div>
      <p id={labelId} className={labelClass}>{sectionLabel}</p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled}
        className={`${radiogroupMarginClass}grid ${COLUMNS_CLASS[columns]} gap-2`}
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
              className={`${BASE_BUTTON} ${layoutClass} ${selected ? SELECTED_BUTTON : UNSELECTED_BUTTON} ${selected ? 'font-semibold' : 'font-medium'}`}
            >
              {renderOption(id)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

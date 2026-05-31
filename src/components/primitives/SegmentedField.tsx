import type { ReactElement } from 'react'

import { SegmentedControl, type SegmentedControlOption } from './SegmentedControl'

export interface SegmentedFieldProps<T extends string> {
  sectionLabel: string
  options: ReadonlyArray<SegmentedControlOption<T>>
  value: T
  onChange(this: void, next: T): void
  disabled?: boolean
  // When true the `<p>` sublabel renders sr-only — visible label duty has moved to
  // an enclosing SettingsSectionHeader, but SegmentedControl's `ariaLabel` link
  // stays intact for screen readers.
  sectionLabelHidden?: boolean
}

/** Section-labelled SegmentedControl. Shared chrome behind OrbPicker /
 *  RingCuePicker / LanguagePicker — each consumer becomes a thin adapter that
 *  owns its own choice hook and option→label mapping. The primitive owns the
 *  label posture (the accent-strong sublabel `<p>`) and forwards to
 *  SegmentedControl. Parallels PickerCardGrid for the card-style pickers.
 *
 *  Distinct from SettingsSegmentedRow, which wraps SegmentedControl in the
 *  SettingsRow border-t/py-3 row chrome for the settings forms. */
export function SegmentedField<T extends string>({
  sectionLabel,
  options,
  value,
  onChange,
  disabled = false,
  sectionLabelHidden = false,
}: SegmentedFieldProps<T>): ReactElement {
  return (
    <div>
      <p
        className={
          sectionLabelHidden
            ? 'sr-only'
            : 'mb-2 text-sm font-semibold text-[var(--color-breathing-accent-strong)]'
        }
      >
        {sectionLabel}
      </p>
      <SegmentedControl<T>
        options={options}
        value={value}
        onChange={onChange}
        ariaLabel={sectionLabel}
        disabled={disabled}
      />
    </div>
  )
}

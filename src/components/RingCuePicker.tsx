import type { RingCueStyle } from '../featureFlags'
import { useRingCueChoice } from '../hooks/useRingCueChoice'
import { SegmentedControl } from './primitives/SegmentedControl'

export interface RingCuePickerProps {
  disabled: boolean
  sectionLabel: string
  sectionLabelHidden?: boolean
  strings: { arc: string; rings: string }
}

export function RingCuePicker({ disabled, sectionLabel, sectionLabelHidden, strings }: RingCuePickerProps) {
  const { ringCue, setRingCue } = useRingCueChoice()
  const options = [
    { id: 'progress-arc' as const, label: strings.arc },
    { id: 'outer-inner' as const, label: strings.rings },
  ]
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
      <SegmentedControl<RingCueStyle>
        options={options}
        value={ringCue}
        onChange={setRingCue}
        ariaLabel={sectionLabel}
        disabled={disabled}
      />
    </div>
  )
}

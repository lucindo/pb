import type { BreathingShapeVariant } from '../featureFlags'
import { useBreathingShapeChoice } from '../hooks/useBreathingShapeChoice'
import { SegmentedControl } from './primitives/SegmentedControl'

export interface OrbPickerProps {
  disabled: boolean
  sectionLabel: string
  sectionLabelHidden?: boolean
  strings: { halo: string; minimal: string; kuthasta: string }
}

export function OrbPicker({ disabled, sectionLabel, sectionLabelHidden, strings }: OrbPickerProps) {
  const { breathingShape, setBreathingShape } = useBreathingShapeChoice()
  const options = [
    { id: 'orb-halo' as const, label: strings.halo },
    { id: 'minimal-rings' as const, label: strings.minimal },
    { id: 'spiritual-eye' as const, label: strings.kuthasta },
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
      <SegmentedControl<BreathingShapeVariant>
        options={options}
        value={breathingShape}
        onChange={setBreathingShape}
        ariaLabel={sectionLabel}
        disabled={disabled}
      />
    </div>
  )
}

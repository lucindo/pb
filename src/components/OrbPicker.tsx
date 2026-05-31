import type { BreathingShapeVariant } from '../featureFlags'
import { usePreferenceChoice } from '../hooks/usePreferenceChoice'
import { SegmentedField } from './primitives/SegmentedField'

export interface OrbPickerProps {
  disabled: boolean
  sectionLabel: string
  sectionLabelHidden?: boolean
  strings: { halo: string; minimal: string; kuthasta: string }
}

export function OrbPicker({ disabled, sectionLabel, sectionLabelHidden, strings }: OrbPickerProps) {
  const [breathingShape, setBreathingShape] = usePreferenceChoice('breathingShape')
  const options = [
    { id: 'orb-halo' as const, label: strings.halo },
    { id: 'minimal-rings' as const, label: strings.minimal },
    { id: 'spiritual-eye' as const, label: strings.kuthasta },
  ]
  return (
    <SegmentedField<BreathingShapeVariant>
      sectionLabel={sectionLabel}
      sectionLabelHidden={sectionLabelHidden}
      options={options}
      value={breathingShape}
      onChange={setBreathingShape}
      disabled={disabled}
    />
  )
}

import type { RingCueStyle } from '../featureFlags'
import { usePreferenceChoice } from '../hooks/usePreferenceChoice'
import { SegmentedField } from './primitives/SegmentedField'

export interface RingCuePickerProps {
  disabled: boolean
  sectionLabel: string
  sectionLabelHidden?: boolean
  strings: { arc: string; rings: string }
}

export function RingCuePicker({ disabled, sectionLabel, sectionLabelHidden, strings }: RingCuePickerProps) {
  const [ringCue, setRingCue] = usePreferenceChoice('ringCue')
  const options = [
    { id: 'progress-arc' as const, label: strings.arc },
    { id: 'outer-inner' as const, label: strings.rings },
  ]
  return (
    <SegmentedField<RingCueStyle>
      sectionLabel={sectionLabel}
      sectionLabelHidden={sectionLabelHidden}
      options={options}
      value={ringCue}
      onChange={setRingCue}
      disabled={disabled}
    />
  )
}

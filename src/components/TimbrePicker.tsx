import { TIMBRE_OPTIONS, type TimbreId } from '../domain'
import { useTimbreChoice } from '../hooks/useTimbreChoice'
import { playInhalePreview } from '../audio/previewContext'
import type { UiStrings } from '../content/strings'
import { PickerCardGrid } from './primitives/PickerCardGrid'

export interface TimbrePickerProps {
  disabled: boolean
  strings: UiStrings['timbres']
  sectionLabel: string
}

export function TimbrePicker({ disabled, strings, sectionLabel }: TimbrePickerProps) {
  const { timbre, setTimbre } = useTimbreChoice()
  const onChange = (id: TimbreId): void => {
    setTimbre(id)
    playInhalePreview(id)
  }
  return (
    <PickerCardGrid<TimbreId>
      sectionLabel={sectionLabel}
      labelId="timbre-picker-label"
      options={TIMBRE_OPTIONS}
      value={timbre}
      onChange={onChange}
      renderOption={(id) => strings[id]}
      columns={2}
      disabled={disabled}
    />
  )
}

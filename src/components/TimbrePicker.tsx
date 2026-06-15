import type { ReactElement } from 'react'
import { TIMBRE_OPTIONS, type TimbreId } from '../domain'
import { usePreferenceChoice } from '../hooks/usePreferenceChoice'
import { playInhalePreview } from '../audio/previewContext'
import type { UiStrings } from '../content/strings'
import { PickerCardGrid } from './primitives/PickerCardGrid'

export interface TimbrePickerProps {
  disabled: boolean
  strings: UiStrings['appSettings']['timbres']
  sectionLabel: string
}

// Timbre glyphs: Unicode characters chosen as abstract representations of each
// timbre — kept inline with the label to match the Appearance picker chrome.
const TIMBRE_GLYPH: Record<TimbreId, string> = {
  bowl: '◯',
  bell: '⟡',
  sine: '∿',
  flute: '⌇',
}

export function TimbrePicker({ disabled, strings, sectionLabel }: TimbrePickerProps): ReactElement {
  const [timbre, setTimbre] = usePreferenceChoice('timbre')
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
      renderOption={(id) => (
        <>
          <span aria-hidden="true" className="text-sm leading-none">
            {TIMBRE_GLYPH[id]}
          </span>
          <span>{strings[id]}</span>
        </>
      )}
      columns={2}
      disabled={disabled}
    />
  )
}

import { CUE_OPTIONS, type CueStyleId } from '../domain'
import { useCueChoice } from '../hooks/useCueChoice'
import { CueGlyph } from './CueGlyph'
import type { UiStrings } from '../content/strings'
import { PickerCardGrid } from './primitives/PickerCardGrid'

export interface CuePickerProps {
  disabled: boolean
  strings: UiStrings['appSettings']['cue']
  sectionLabel: string
}

export function CuePicker({ disabled, strings, sectionLabel }: CuePickerProps) {
  const { cue, setCue } = useCueChoice()
  return (
    <PickerCardGrid<CueStyleId>
      sectionLabel={sectionLabel}
      labelId="cue-picker-label"
      options={CUE_OPTIONS}
      value={cue}
      onChange={setCue}
      columns={4}
      disabled={disabled}
      optionLayout="stack"
      renderOption={(id) => {
        const label = strings[id]
        return (
          <>
            <span className="block w-8 h-8 overflow-hidden flex items-center justify-center" aria-hidden="true">
              <span className="scale-50 origin-center block">
                <CueGlyph cue={id} phase="in" phaseLabel={label} preview />
              </span>
            </span>
            <span>{label}</span>
          </>
        )
      }}
    />
  )
}

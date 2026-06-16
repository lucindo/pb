import type { PatternSettings } from './settings'

export type PresetId = 'box-4' | 'weiss' | '1-4-2'
export type PresetSelection = PresetId | 'custom'

// The five pattern fields a preset fixes — everything but rounds, which a preset
// never touches (FR-14).
export type PatternShape = Omit<PatternSettings, 'rounds'>

export interface PatternPreset {
  readonly id: PresetId
  readonly shape: PatternShape
}

export const PRESETS: readonly PatternPreset[] = [
  { id: 'box-4', shape: { inhale: 1, holdIn: 1, exhale: 1, holdOut: 1, multiplier: 4 } },
  { id: 'weiss', shape: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, multiplier: 1 } },
  { id: '1-4-2', shape: { inhale: 1, holdIn: 4, exhale: 2, holdOut: 0, multiplier: 1 } },
]

function shapeMatches(shape: PatternShape, s: PatternSettings): boolean {
  return (
    shape.inhale === s.inhale &&
    shape.holdIn === s.holdIn &&
    shape.exhale === s.exhale &&
    shape.holdOut === s.holdOut &&
    shape.multiplier === s.multiplier
  )
}

// The named preset whose five fields exactly match the current settings, else
// 'custom' (FR-15). Two patterns with equal effective seconds but different
// field values (e.g. 1·1·1·1 ×4 vs 4·4·4·4 ×1) are distinct selections.
export function resolvePreset(settings: PatternSettings): PresetSelection {
  return PRESETS.find((p) => shapeMatches(p.shape, settings))?.id ?? 'custom'
}

// Applying a preset sets the five pattern fields and leaves rounds unchanged (FR-14).
export function applyPreset(settings: PatternSettings, preset: PatternPreset): PatternSettings {
  return { ...preset.shape, rounds: settings.rounds }
}

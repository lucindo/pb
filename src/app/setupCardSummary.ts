import type { SetupCardItem } from '../components/SetupCard'
import type { UiStrings } from '../content/strings'
import type { OmLength } from '../domain'
import type { AppPracticeSettingsViewModel } from './appViewModel'

export interface BuildSetupCardSummaryArgs {
  settings: AppPracticeSettingsViewModel
  practice: UiStrings['practice']
}

// Maps the practice-settings viewmodel into pre-formatted SetupCard items
// using the existing per-practice form labels + units. Returns null when the
// card should not render (navi session active → kind 'hidden'; stretch +
// isRunning → no in-session controls per J10 OQ-2 "hide on Stretch Running").
// Resonant + isRunning keeps the card visible to preserve the extend-duration
// affordance (the form gates everything except the Duration stepper).
export function buildSetupCardSummary({
  settings,
  practice,
}: BuildSetupCardSummaryArgs): readonly SetupCardItem[] | null {
  if (settings.kind === 'hidden') return null

  const f = practice.settingsForm

  if (settings.kind === 'resonant') {
    const s = settings.settings
    return [
      { label: f.bpmLabel, value: `${String(s.bpm)} ${f.bpmUnit}` },
      { label: f.ratioLabel, value: s.ratio },
      {
        label: f.durationLabel,
        value:
          s.durationMinutes === 'open-ended'
            ? f.openEndedLabel
            : `${String(s.durationMinutes)} ${f.minutesUnit}`,
      },
    ]
  }

  if (settings.kind === 'stretch') {
    if (settings.isRunning) return null
    const s = settings.settings
    // Visual summary only: 3 cells matching the HRV card shape. The actual
    // configuration (warm-up / ramp / cool-down / ratio) stays in the
    // SettingsSheet form. Duration = warmUp + ramp + coolDown; if coolDown is
    // open-ended the whole total is open-ended.
    const durationValue =
      s.coolDownMinutes === 'open-ended'
        ? f.openEndedLabel
        : `${String(s.warmUpMinutes + s.rampDurationMinutes + s.coolDownMinutes)} ${f.minutesUnit}`
    return [
      { label: f.initialBpmShortLabel, value: `${String(s.initialBpm)} ${f.bpmUnit}` },
      { label: f.targetBpmShortLabel, value: `${String(s.targetBpm)} ${f.bpmUnit}` },
      { label: f.durationLabel, value: durationValue },
    ]
  }

  const n = settings.settings
  const nk = practice.nkControls
  const omLengthLabel = formatOmLength(n.omLength, nk)
  return [
    { label: nk.roundsLabel, value: String(n.rounds) },
    { label: nk.frontCountShortLabel, value: String(n.frontCount) },
    { label: nk.omLengthShortLabel, value: omLengthLabel },
  ]
}

function formatOmLength(value: OmLength, nk: UiStrings['practice']['nkControls']): string {
  if (value === 'fast') return nk.omLengthFast
  if (value === 'slow') return nk.omLengthSlow
  return nk.omLengthMedium
}

// Resolves the per-practice display name used for the SetupCard aria-label
// and the SettingsSheet subtitle. Reuses the existing switcher headings so no
// new strings are needed for the practice name itself.
export function resolveSheetPracticeName(
  settings: AppPracticeSettingsViewModel,
  switcher: UiStrings['practice']['switcher'],
): string | null {
  if (settings.kind === 'resonant') return switcher.resonantHeading
  if (settings.kind === 'stretch') return switcher.stretchHeading
  if (settings.kind === 'naviKriya') return switcher.naviKriyaHeading
  return null
}

import type { SetupCardItem } from '../components/SetupCard'
import type { UiStrings } from '../content/strings'
import type { AppPracticeSettingsViewModel } from './appViewModel'

export interface BuildSetupCardSummaryArgs {
  settings: AppPracticeSettingsViewModel
  practice: UiStrings['practice']
}

// Maps the practice-settings viewmodel into pre-formatted SetupCard items using
// the form labels + units. Returns null when the card should not render: hidden
// during a running session (the extend-duration callback stays retained but
// unwired — see PracticeSettingsView) and on Complete so the completion panel
// reads alone.
export function buildSetupCardSummary({
  settings,
  practice,
}: BuildSetupCardSummaryArgs): readonly SetupCardItem[] | null {
  if (settings.isRunning || settings.isComplete) return null

  const f = practice.settingsForm
  const s = settings.settings
  return [
    { id: 'bpm', label: f.bpmLabel, value: `${String(s.bpm)} ${f.bpmUnit}` },
    { id: 'ratio', label: f.ratioLabel, value: s.ratio },
    {
      id: 'duration',
      label: f.durationLabel,
      value:
        s.durationMinutes === 'open-ended'
          ? f.openEndedLabel
          : `${String(s.durationMinutes)} ${f.minutesUnit}`,
    },
  ]
}

// Resolves the display name used for the SetupCard aria-label and the
// SettingsSheet subtitle.
export function resolveSheetPracticeName(
  settings: AppPracticeSettingsViewModel,
  switcher: UiStrings['practice']['switcher'],
): string | null {
  void settings
  return switcher.patternBreathingHeading
}

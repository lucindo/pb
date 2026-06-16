import type { SetupCardItem } from '../components/SetupCard'
import type { UiStrings } from '../content/strings'
import type { AppPracticeSettingsViewModel } from './appViewModel'

export interface BuildSetupCardSummaryArgs {
  settings: AppPracticeSettingsViewModel
  practice: UiStrings['practice']
}

// Maps the practice-settings viewmodel into pre-formatted SetupCard items using
// the form labels. Returns null when the card should not render: hidden during a
// running session and on Complete so the completion panel reads alone.
export function buildSetupCardSummary({
  settings,
  practice,
}: BuildSetupCardSummaryArgs): readonly SetupCardItem[] | null {
  if (settings.isRunning || settings.isComplete) return null

  const f = practice.settingsForm
  const s = settings.settings
  return [
    {
      id: 'pattern',
      label: f.patternLabel,
      value: `${String(s.inhale)}·${String(s.holdIn)}·${String(s.exhale)}·${String(s.holdOut)}`,
    },
    { id: 'scale', label: f.scaleLabel, value: `×${String(s.multiplier)}` },
    {
      id: 'rounds',
      label: f.roundsLabel,
      value: s.rounds === 'open-ended' ? f.openEndedLabel : String(s.rounds),
    },
  ]
}

import {
  BPM_OPTIONS,
  COOLDOWN_OPTIONS,
  DURATION_OPTIONS,
  RAMP_DURATION_OPTIONS,
  RATIO_OPTIONS,
  STRETCH_INITIAL_BPM_OPTIONS,
  WARMUP_MINUTES_OPTIONS,
  type CoolDownMinutes,
  type DurationOption,
  type RatioLabel,
  type SessionSettings,
  type WarmUpMinutes,
} from '../domain/settings'
import { computeStretchTotalMs } from '../domain/stretchRamp'
import {
  DEFAULT_NK_SETTINGS,
  NK_FRONT_COUNT_OPTIONS,
  NK_ROUNDS_OPTIONS,
  OM_LENGTH_OPTIONS,
  type NaviKriyaSettings,
  type OmLength,
} from '../domain/naviKriyaSettings'
import { NK_OM_SECONDS, NK_SETTLE_MS } from '../hooks/useNKEngine'
import { UI_STRINGS, type UiStrings } from '../content/strings'
import type { PracticeId } from '../storage/practices'
import { ModeToggle } from './ModeToggle'
import { SettingsStepper } from './SettingsStepper'

export interface SettingsFormProps {
  // Phase 30 D-03: SettingsForm is the practice-aware inline controls host —
  // it dispatches on activePractice between the resonant knobs and the Navi
  // Kriya structural scaffold.
  activePractice: PracticeId
  settings: SessionSettings
  isRunning: boolean
  onChange(this: void, settings: SessionSettings): void
  onExtendDuration(this: void, durationMinutes: number): void
  strings: UiStrings['settingsForm']
  // Phase 30: practice display copy (heading per practice, NK placeholder).
  practiceStrings: UiStrings['practice']
  // Phase 30: label for the NK Start button — App.tsx passes
  // uiStrings.controls.startSession so the NK CTA matches the resonant one.
  startSessionLabel: string
  // Phase 31 (NK-02/03/04/06, D-14): the editable Navi Kriya session
  // parameters and their callbacks. Optional so App.tsx keeps compiling until
  // Plan 31-06 wires the real state; the NK branch falls back to safe defaults.
  nkSettings?: NaviKriyaSettings
  onNKSettingsChange?: (this: void, settings: NaviKriyaSettings) => void
  onNKStartClick?: (this: void) => void
  isNKSessionRunning?: boolean
  // NK control copy lives at the UiStrings top level, not under settingsForm.
  nkControlsStrings?: UiStrings['nkControls']
}

export function SettingsForm({
  activePractice,
  settings,
  isRunning,
  onChange,
  onExtendDuration,
  strings,
  startSessionLabel,
  nkSettings = DEFAULT_NK_SETTINGS,
  onNKSettingsChange = () => undefined,
  onNKStartClick = () => undefined,
  isNKSessionRunning = false,
  nkControlsStrings = UI_STRINGS.en.nkControls,
}: SettingsFormProps) {
  const formatBpm = (value: number): string => `${String(value)} ${strings.bpmUnit}`
  const formatMinutes = (value: number): string => `${String(value)} ${strings.minutesUnit}`
  const formatDuration = (value: DurationOption): string =>
    value === 'open-ended' ? strings.openEndedLabel : `${String(value)} ${strings.minutesUnit}`
  const formatCoolDown = (value: CoolDownMinutes): string =>
    value === 'open-ended' ? strings.holdOpenEndedLabel : `${String(value)} ${strings.minutesUnit}`

  const durationOptions = DURATION_OPTIONS as readonly DurationOption[]
  const durationIndex = durationOptions.indexOf(settings.durationMinutes)
  const nextDuration = durationOptions[durationIndex + 1]

  const isStretch = settings.mode === 'stretch'
  // D-01: targetBpm is a strictly-down ramp — only BPM values below initialBpm.
  const targetBpmOptions = (BPM_OPTIONS as readonly number[]).filter((v) => v < settings.initialBpm)
  // The stretch Duration box is read-only: warm-up + ramp + cool-down summed.
  const stretchTotalMs = computeStretchTotalMs(settings)
  const stretchDurationText = stretchTotalMs === null
    ? strings.openEndedLabel
    : `${String(stretchTotalMs / 60_000)} ${strings.minutesUnit}`

  const updateSettings = (nextSettings: Partial<SessionSettings>) => {
    onChange({ ...settings, ...nextSettings })
  }

  const updateDuration = (durationMinutes: DurationOption) => {
    if (isRunning) {
      if (typeof durationMinutes === 'number') {
        onExtendDuration(durationMinutes)
      }
      return
    }

    updateSettings({ durationMinutes })
  }

  // Lowering initialBpm can leave targetBpm at or above it; correct it down to
  // the highest valid option below the new initialBpm (Interaction Contract).
  const updateInitialBpm = (initialBpm: number) => {
    if (settings.targetBpm >= initialBpm) {
      const validTargets = (BPM_OPTIONS as readonly number[]).filter((v) => v < initialBpm)
      updateSettings({ initialBpm, targetBpm: validTargets[validTargets.length - 1] })
      return
    }
    updateSettings({ initialBpm })
  }

  const formatOmLength = (value: OmLength): string =>
    value === 'fast'
      ? nkControlsStrings.omLengthFast
      : value === 'slow'
        ? nkControlsStrings.omLengthSlow
        : nkControlsStrings.omLengthMedium

  // D-14: estimated session duration — derived in render (never memoized) so it
  // tracks every NK settings change live. Total OMs per round = front + back,
  // back = front / 4; plus the one-time settle overhead before the first round.
  const nkBackCount = nkSettings.frontCount / 4
  const estimatedMinutes = Math.round(
    (nkSettings.rounds * (nkSettings.frontCount + nkBackCount) * NK_OM_SECONDS[nkSettings.omLength] * 1000
      + NK_SETTLE_MS) / 60_000,
  )

  const updateNkSettings = (next: Partial<NaviKriyaSettings>) => {
    onNKSettingsChange({ ...nkSettings, ...next })
  }

  return (
    <div className="grid w-full gap-4" aria-label={strings.ariaLabel}>
      {activePractice === 'resonant' ? (
        <>
          {/* D-05: Standard/Stretch switch — next-session-only, hidden while running. */}
          {!isRunning && (
            <ModeToggle
              isStretch={isStretch}
              modeLabel={strings.sessionModeLabel}
              standardLabel={strings.modeStandard}
              stretchLabel={strings.modeStretch}
              onChange={(toStretch) => { updateSettings({ mode: toStretch ? 'stretch' : 'standard' }) }}
            />
          )}
          {!isRunning && (isStretch ? (
            <>
              <SettingsStepper
                label={strings.initialBpmLabel}
                value={settings.initialBpm}
                options={STRETCH_INITIAL_BPM_OPTIONS}
                formatValue={formatBpm}
                onChange={updateInitialBpm}
                strings={strings.stepper}
              />
              <SettingsStepper
                label={strings.targetBpmLabel}
                value={settings.targetBpm}
                options={targetBpmOptions}
                formatValue={formatBpm}
                onChange={(targetBpm) => { updateSettings({ targetBpm }) }}
                strings={strings.stepper}
              />
              <SettingsStepper<RatioLabel>
                label={strings.ratioLabel}
                value={settings.ratio}
                options={RATIO_OPTIONS}
                onChange={(ratio) => { updateSettings({ ratio }) }}
                strings={strings.stepper}
              />
              <SettingsStepper<WarmUpMinutes>
                label={strings.holdInitialLabel}
                value={settings.warmUpMinutes}
                options={WARMUP_MINUTES_OPTIONS}
                formatValue={formatMinutes}
                onChange={(warmUpMinutes) => { updateSettings({ warmUpMinutes }) }}
                strings={strings.stepper}
              />
              <SettingsStepper
                label={strings.rampDurationLabel}
                value={settings.rampDurationMinutes}
                options={RAMP_DURATION_OPTIONS}
                formatValue={formatMinutes}
                onChange={(rampDurationMinutes) => { updateSettings({ rampDurationMinutes }) }}
                strings={strings.stepper}
              />
              <SettingsStepper<CoolDownMinutes>
                label={strings.holdTargetLabel}
                value={settings.coolDownMinutes}
                options={COOLDOWN_OPTIONS}
                formatValue={formatCoolDown}
                onChange={(coolDownMinutes) => { updateSettings({ coolDownMinutes }) }}
                strings={strings.stepper}
              />
            </>
          ) : (
            <>
              <SettingsStepper
                label={strings.bpmLabel}
                value={settings.bpm}
                options={BPM_OPTIONS}
                formatValue={formatBpm}
                onChange={(bpm) => { updateSettings({ bpm }) }}
                strings={strings.stepper}
              />
              <SettingsStepper<RatioLabel>
                label={strings.ratioLabel}
                value={settings.ratio}
                options={RATIO_OPTIONS}
                onChange={(ratio) => { updateSettings({ ratio }) }}
                strings={strings.stepper}
              />
            </>
          ))}
          {/* Duration: read-only computed total in stretch mode (warm-up + ramp +
              cool-down); the extendable stepper in standard mode. */}
          {isStretch ? (
            <SettingsStepper<string>
              label={strings.durationLabel}
              value={stretchDurationText}
              options={[stretchDurationText]}
              readOnly
              onChange={() => undefined}
              strings={strings.stepper}
            />
          ) : (
            <SettingsStepper<DurationOption>
              label={strings.durationLabel}
              value={settings.durationMinutes}
              options={durationOptions}
              formatValue={formatDuration}
              onChange={updateDuration}
              disableDecrease={isRunning}
              disableIncrease={isRunning && typeof nextDuration !== 'number'}
              strings={strings.stepper}
            />
          )}
        </>
      ) : (
        // Phase 31 (NK-02/03/04/06, D-14): the real Navi Kriya controls fill
        // the slot the Phase 30 stub held — rounds, front OM count, OM pace, a
        // per-OM tick toggle, a live duration estimate, and a live Start
        // button. The practice is named in the app header (App.tsx), not by an
        // inline heading; no resonant knobs render in this branch.
        <>
          <SettingsStepper<number>
            label={nkControlsStrings.roundsLabel}
            value={nkSettings.rounds}
            options={NK_ROUNDS_OPTIONS}
            onChange={(rounds) => { updateNkSettings({ rounds }) }}
            disabled={isNKSessionRunning}
            strings={strings.stepper}
          />
          <SettingsStepper<number>
            label={nkControlsStrings.frontCountLabel}
            value={nkSettings.frontCount}
            options={NK_FRONT_COUNT_OPTIONS}
            onChange={(frontCount) => { updateNkSettings({ frontCount }) }}
            disabled={isNKSessionRunning}
            strings={strings.stepper}
          />
          <SettingsStepper<OmLength>
            label={nkControlsStrings.omLengthLabel}
            value={nkSettings.omLength}
            options={OM_LENGTH_OPTIONS}
            formatValue={formatOmLength}
            onChange={(omLength) => { updateNkSettings({ omLength }) }}
            disabled={isNKSessionRunning}
            strings={strings.stepper}
          />
          {/* D-07: the per-OM tick toggle stays interactive while a session
              runs — the engine reads cueOn from its mutable ref, so a live flip
              is stale-closure-safe. Hence no isNKSessionRunning gating here. */}
          <ModeToggle
            isStretch={nkSettings.perOmCue}
            modeLabel={nkControlsStrings.perOmCueLabel}
            standardLabel={nkControlsStrings.perOmCueOff}
            stretchLabel={nkControlsStrings.perOmCueOn}
            onChange={(perOmCue) => { updateNkSettings({ perOmCue }) }}
          />
          {/* D-14: live estimated session duration — low-prominence secondary
              label; aria-live so screen readers announce updates. */}
          <p
            aria-live="polite"
            className="text-sm text-center text-[var(--color-breathing-muted)]"
          >
            {nkControlsStrings.estimatedDuration(estimatedMinutes)}
          </p>
          <button
            type="button"
            onClick={onNKStartClick}
            disabled={isNKSessionRunning}
            className="mt-6 min-h-11 w-full rounded-full bg-[var(--color-breathing-accent-strong)] px-6 py-4 text-lg font-semibold text-[var(--color-breathing-on-accent)] shadow-lg shadow-teal-900/20 transition hover:bg-[var(--color-breathing-accent)] active:bg-[var(--color-breathing-accent-strong)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {startSessionLabel}
          </button>
        </>
      )}
    </div>
  )
}

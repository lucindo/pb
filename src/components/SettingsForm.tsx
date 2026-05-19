import {
  BPM_OPTIONS,
  COOLDOWN_OPTIONS,
  DEFAULT_STRETCH_SETTINGS,
  DURATION_OPTIONS,
  RAMP_DURATION_OPTIONS,
  RATIO_OPTIONS,
  STRETCH_INITIAL_BPM_OPTIONS,
  WARMUP_MINUTES_OPTIONS,
  type CoolDownMinutes,
  type DurationOption,
  type RatioLabel,
  type SessionSettings,
  type StretchSettings,
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
import { NK_LAST_OM_HOLD_MULTIPLIER, NK_LEAD_MS, NK_OM_SECONDS } from '../hooks/useNKEngine'
import { UI_STRINGS, type UiStrings } from '../content/strings'
import type { PracticeId } from '../storage/practices'
import { BooleanToggle } from './BooleanToggle'
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
  // Phase 31 (NK-02/03/04/06, D-14): the editable Navi Kriya session
  // parameters and their callbacks. The Start/Cancel/End controls live in
  // App.tsx (alongside the MuteToggle) so the NK CTA row matches HRV.
  nkSettings?: NaviKriyaSettings
  onNKSettingsChange?: (this: void, settings: NaviKriyaSettings) => void
  // NK control copy lives at the UiStrings top level, not under settingsForm.
  nkControlsStrings?: UiStrings['nkControls']
  // Phase 34: stretch practice settings and their callback. Mirrors the
  // nkSettings/onNKSettingsChange pattern.
  stretchSettings?: StretchSettings
  onStretchSettingsChange?: (this: void, settings: StretchSettings) => void
}

export function SettingsForm({
  activePractice,
  settings,
  isRunning,
  onChange,
  onExtendDuration,
  strings,
  nkSettings = DEFAULT_NK_SETTINGS,
  onNKSettingsChange = () => undefined,
  nkControlsStrings = UI_STRINGS.en.nkControls,
  stretchSettings = DEFAULT_STRETCH_SETTINGS,
  onStretchSettingsChange = () => undefined,
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

  // D-01: targetBpm is a strictly-down ramp — only BPM values below initialBpm.
  const targetBpmOptions = (BPM_OPTIONS as readonly number[]).filter((v) => v < stretchSettings.initialBpm)
  // The stretch Duration box is read-only: warm-up + ramp + cool-down summed.
  // Note: computeStretchTotalMs returns the snapped segment table's final endMs
  // (since plan 34-06), which is not whole-minute-aligned, so the display rounds.
  const stretchTotalMs = computeStretchTotalMs(stretchSettings)
  const stretchDurationText = stretchTotalMs === null
    ? strings.openEndedLabel
    : `${String(Math.round(stretchTotalMs / 60_000))} ${strings.minutesUnit}`

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

  // Stretch settings helper — mirrors updateSettings but typed to StretchSettings.
  const updateStretchSettings = (next: Partial<StretchSettings>) => {
    onStretchSettingsChange({ ...stretchSettings, ...next })
  }

  // Lowering initialBpm can leave targetBpm at or above it; correct it down to
  // the highest valid option below the new initialBpm (Interaction Contract).
  const updateInitialBpm = (initialBpm: number) => {
    if (stretchSettings.targetBpm >= initialBpm) {
      const validTargets = (BPM_OPTIONS as readonly number[]).filter((v) => v < initialBpm)
      updateStretchSettings({ initialBpm, targetBpm: validTargets[validTargets.length - 1] })
      return
    }
    updateStretchSettings({ initialBpm })
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
  // IN-01: each round has two phases (front + back) and the engine fires an
  // NK_LEAD_MS lead-in at the start of every phase — rounds * 2 lead-ins
  // total — so the estimate must account for that overhead too.
  // Phase 31 UAT: the last OM of each phase holds NK_LAST_OM_HOLD_MULTIPLIER ×
  // omMs, so each round carries an extra 2 × (multiplier − 1) OM-times.
  const nkBackCount = nkSettings.frontCount / 4
  const nkOmMs = NK_OM_SECONDS[nkSettings.omLength] * 1000
  const estimatedMinutes = Math.round(
    (nkSettings.rounds
      * (nkSettings.frontCount + nkBackCount + 2 * (NK_LAST_OM_HOLD_MULTIPLIER - 1))
      * nkOmMs
      + nkSettings.rounds * 2 * NK_LEAD_MS) / 60_000,
  )

  const updateNkSettings = (next: Partial<NaviKriyaSettings>) => {
    onNKSettingsChange({ ...nkSettings, ...next })
  }

  return (
    <div className="grid w-full gap-4" aria-label={strings.ariaLabel}>
      {activePractice === 'resonant' ? (
        <>
          {/* D-01: Standard sessions only — the ModeToggle is retired.
              Resonant practice is standard-only; the Stretch practice is
              its own activePractice branch below. */}
          {!isRunning && (
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
          )}
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
        </>
      ) : activePractice === 'stretch' ? (
        // Phase 34: dedicated stretch branch — ramp steppers + read-only
        // computed duration. All settings operate on StretchSettings, not
        // SessionSettings. The ModeToggle is gone; practice switching is via
        // PracticeToggle (App.tsx).
        // In-session gate: all stretch controls are hidden while a session is
        // running (mirrors how Navi Kriya unmounts the whole form mid-session).
        // The stretch practice has no in-session "extend duration" affordance,
        // so ALL controls are gated — unlike resonant's Duration stepper which
        // stays visible for timed-session extension. `isRunning` is already
        // passed `inSessionView` by App.tsx (flips true for stretch sessions).
        <>
          {!isRunning && (
            <>
              <SettingsStepper
                label={strings.initialBpmLabel}
                value={stretchSettings.initialBpm}
                options={STRETCH_INITIAL_BPM_OPTIONS}
                formatValue={formatBpm}
                onChange={updateInitialBpm}
                strings={strings.stepper}
              />
              <SettingsStepper
                label={strings.targetBpmLabel}
                value={stretchSettings.targetBpm}
                options={targetBpmOptions}
                formatValue={formatBpm}
                onChange={(targetBpm) => { updateStretchSettings({ targetBpm }) }}
                strings={strings.stepper}
              />
              <SettingsStepper<RatioLabel>
                label={strings.ratioLabel}
                value={stretchSettings.ratio}
                options={RATIO_OPTIONS}
                onChange={(ratio) => { updateStretchSettings({ ratio }) }}
                strings={strings.stepper}
              />
              <SettingsStepper<WarmUpMinutes>
                label={strings.holdInitialLabel}
                value={stretchSettings.warmUpMinutes}
                options={WARMUP_MINUTES_OPTIONS}
                formatValue={formatMinutes}
                onChange={(warmUpMinutes) => { updateStretchSettings({ warmUpMinutes }) }}
                strings={strings.stepper}
              />
              <SettingsStepper
                label={strings.rampDurationLabel}
                value={stretchSettings.rampDurationMinutes}
                options={RAMP_DURATION_OPTIONS}
                formatValue={formatMinutes}
                onChange={(rampDurationMinutes) => { updateStretchSettings({ rampDurationMinutes }) }}
                strings={strings.stepper}
              />
              <SettingsStepper<CoolDownMinutes>
                label={strings.holdTargetLabel}
                value={stretchSettings.coolDownMinutes}
                options={COOLDOWN_OPTIONS}
                formatValue={formatCoolDown}
                onChange={(coolDownMinutes) => { updateStretchSettings({ coolDownMinutes }) }}
                strings={strings.stepper}
              />
              {/* Read-only computed duration: warm-up + ramp + cool-down */}
              <SettingsStepper<string>
                label={strings.durationLabel}
                value={stretchDurationText}
                options={[stretchDurationText]}
                readOnly
                onChange={() => undefined}
                strings={strings.stepper}
              />
            </>
          )}
        </>
      ) : (
        // Phase 31 (NK-02/03/04/06, D-14): the real Navi Kriya controls fill
        // the slot the Phase 30 stub held — rounds, front OM count, OM pace, a
        // per-OM tick toggle, and a live duration estimate. The Start button
        // lives in App.tsx (next to the MuteToggle) so the CTA row matches
        // HRV. The practice is named in the app header (App.tsx), not by an
        // inline heading; no resonant knobs render in this branch.
        <>
          {/* WR-04: no disabled gating on the NK steppers — the whole form is
              unmounted by App.tsx while a session is active, so these are
              never reachable mid-session. */}
          <SettingsStepper<number>
            label={nkControlsStrings.roundsLabel}
            value={nkSettings.rounds}
            options={NK_ROUNDS_OPTIONS}
            onChange={(rounds) => { updateNkSettings({ rounds }) }}
            strings={strings.stepper}
          />
          <SettingsStepper<number>
            label={nkControlsStrings.frontCountLabel}
            value={nkSettings.frontCount}
            options={NK_FRONT_COUNT_OPTIONS}
            onChange={(frontCount) => { updateNkSettings({ frontCount }) }}
            strings={strings.stepper}
          />
          <SettingsStepper<OmLength>
            label={nkControlsStrings.omLengthLabel}
            value={nkSettings.omLength}
            options={OM_LENGTH_OPTIONS}
            formatValue={formatOmLength}
            onChange={(omLength) => { updateNkSettings({ omLength }) }}
            strings={strings.stepper}
          />
          {/* D-07: the per-OM tick toggle stays interactive while a session
              runs — the engine reads cueOn from its mutable ref, so a live flip
              is stale-closure-safe. Hence no isNKSessionRunning gating here. */}
          <BooleanToggle
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
        </>
      )}
    </div>
  )
}

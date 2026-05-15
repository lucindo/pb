# Phase 22: BPM Stretch Session - Pattern Map

**Mapped:** 2026-05-15
**Files analyzed:** 9 (7 modified, 2 new)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/domain/settings.ts` | model | CRUD | self (modify) | exact |
| `src/domain/stretchRamp.ts` | utility | transform | `src/domain/sessionMath.ts` | role-match |
| `src/domain/sessionMath.ts` | utility | transform | self (extend types only) | exact |
| `src/domain/sessionController.ts` | service | request-response | self (modify) | exact |
| `src/components/SettingsForm.tsx` | component | request-response | self (modify) | exact |
| `src/components/SessionReadout.tsx` | component | request-response | self (modify) | exact |
| `src/storage/settings.ts` | utility | CRUD | self (modify) | exact |
| `src/content/strings.ts` | config | transform | self (modify) | exact |
| `src/app/App.tsx` | controller | event-driven | self (modify, boundary effect only) | exact |

---

## Pattern Assignments

### `src/domain/settings.ts` (model, CRUD) — modify

**Analog:** `src/domain/settings.ts` (extend in place)

**Existing options/predicate pattern** (lines 10-106):
```typescript
// Pattern for const options array + type guard predicate
export const BPM_OPTIONS = [1, 1.5, 2, ... 7] as const satisfies readonly number[]
export const DURATION_OPTIONS = [5, 10, ..., 60, 'open-ended'] as const satisfies readonly DurationOption[]

export function isValidBpm(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && (BPM_OPTIONS as readonly number[]).includes(v)
}
export function isValidDuration(v: unknown): v is DurationOption {
  if (v === 'open-ended') return true
  return typeof v === 'number'
    && Number.isFinite(v)
    && (DURATION_OPTIONS as readonly DurationOption[]).includes(v)
}
```

**Existing interface + defaults pattern** (lines 4-48):
```typescript
export interface SessionSettings {
  bpm: number
  ratio: RatioLabel
  durationMinutes: DurationOption
}

export const DEFAULT_SETTINGS: SessionSettings = {
  bpm: 5.5,
  ratio: '40:60',
  durationMinutes: 10,
}
```

**validateSettings throw pattern** (lines 108-127):
```typescript
export function validateSettings(settings: SessionSettings): SessionSettings {
  if (!isValidBpm(settings.bpm)) {
    throw new RangeError(`Unsupported BPM: ${String(settings.bpm)}`)
  }
  // ... per-field throw
  return { ...settings }
}
```

**New additions to copy this pattern for:**
- `export type SessionMode = 'standard' | 'stretch'`
- `export const MODE_OPTIONS = ['standard', 'stretch'] as const satisfies readonly SessionMode[]`
- `export const HOLD_SECONDS_OPTIONS = [0, 15, 30, 45, 60] as const satisfies readonly number[]`
- `export type HoldTargetOption = 0 | 15 | 30 | 45 | 60 | 'open-ended'`
- `export const HOLD_TARGET_OPTIONS = [...HOLD_SECONDS_OPTIONS, 'open-ended'] as const`
- `export const RAMP_DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const`
- `export function isValidMode(v: unknown): v is SessionMode` — pattern from `isValidTheme` (line 57-59)
- `export function isValidHoldSeconds(v: unknown): v is HoldSecondsOption` — pattern from `isValidDuration`
- `export function isValidHoldTarget(v: unknown): v is HoldTargetOption` — same pattern with `'open-ended'` sentinel like `isValidDuration`
- `export function isValidRampDuration(v: unknown): v is number` — pattern from `isValidDuration` using RAMP_DURATION_OPTIONS
- Extend `SessionSettings` with optional stretch fields; extend `DEFAULT_SETTINGS` and `validateSettings`

---

### `src/domain/stretchRamp.ts` (utility, transform) — NEW

**Analog:** `src/domain/sessionMath.ts` (pure domain transform function)

**Pure function + interface pattern** (sessionMath.ts lines 1-41):
```typescript
import type { BreathingPlan } from './breathingPlan'

export interface SessionFrame {
  phase: BreathPhase
  elapsedMs: number
  remainingMs: number | null
  cycleIndex: number
  isComplete: boolean
  // ...
}

export function getSessionFrame(plan: BreathingPlan, elapsedMs: number): SessionFrame {
  const safeElapsedMs = Math.max(0, elapsedMs)
  const cycleIndex = Math.floor(safeElapsedMs / plan.cycleMs)
  const cycleElapsedMs = safeElapsedMs % plan.cycleMs
  // ...
  const completionMs =
    plan.totalMs === null
      ? null
      : Math.ceil(plan.totalMs / plan.cycleMs) * plan.cycleMs

  return {
    phase: isInPhase ? 'in' : 'out',
    elapsedMs: safeElapsedMs,
    remainingMs,
    cycleIndex,
    isComplete: completionMs !== null && safeElapsedMs >= completionMs,
  }
}
```

**breathingPlan.ts ratio computation pattern** (lines 15-29):
```typescript
const RATIO_PARTS: Record<RatioLabel, { inhale: number; exhale: number }> = {
  '50:50': { inhale: 50, exhale: 50 },
  '40:60': { inhale: 40, exhale: 60 },
  // ...
}
// cycleMs = MS_PER_MINUTE / bpm
// inhaleMs = cycleMs * (ratio.inhale / 100)
// exhaleMs = cycleMs * (ratio.exhale / 100)
```

**New file structure to follow:**
- `StretchStage` type and `StretchSegment` interface (fields: `startMs`, `endMs`, `bpm`, `cycleMs`, `inhaleMs`, `exhaleMs`, `stage: StretchStage`, `cycleBaseIndex`)
- `buildStretchSegments(settings, ratio): StretchSegment[]` — pure function, no side effects
- `getStretchFrame(segments, totalMs, elapsedMs): StretchSessionFrame` — mirrors `getSessionFrame` signature shape; uses binary search or linear walk on segments; `completionMs` uses last segment's `cycleMs` (Pitfall 3 avoidance)
- `computeStretchTotalMs(settings): number | null` — pure predicate
- `isStretchGateClear(settings): boolean` — pure predicate
- `STRETCH_MIN_TOTAL_MS = 15 * 60_000` constant

---

### `src/domain/sessionMath.ts` (utility, transform) — extend types only

**Analog:** self; `SessionFrame` interface extended with optional stretch fields.

**Existing `SessionFrame` interface** (lines 5-13):
```typescript
export interface SessionFrame {
  phase: BreathPhase
  phaseLabel: 'In' | 'Out'
  elapsedMs: number
  remainingMs: number | null
  phaseProgress: number
  cycleIndex: number
  isComplete: boolean
}
```

**Addition pattern:** Add optional stretch-only fields `cycleStartMs?: number`, `currentCycleMs?: number`, `currentInhaleMs?: number`, `currentExhaleMs?: number`, `currentBpm?: number`, `stage?: StretchStage` — `undefined` for standard sessions, populated for stretch. This keeps the standard path fully backward-compatible and lets `getSessionFrame` remain unchanged.

---

### `src/domain/sessionController.ts` (service, request-response) — modify

**Analog:** self

**`RunningSessionState` shape** (lines 15-22):
```typescript
export interface RunningSessionState {
  status: 'running'
  selectedSettings: SessionSettings
  lockedSettings: SessionSettings
  plan: BreathingPlan
  startedAtMs: number
  lastFrame: SessionFrame
}
```

**Addition:** Add `stretchSegments: StretchSegment[] | null` to `RunningSessionState`. Standard sessions set it `null`.

**`startSession` pattern** (lines 39-51):
```typescript
export function startSession(selectedSettings: SessionSettings, nowMs: number): RunningSessionState {
  const lockedSettings = cloneSettings(selectedSettings)
  const plan = createBreathingPlan(lockedSettings)

  return {
    status: 'running',
    selectedSettings: cloneSettings(selectedSettings),
    lockedSettings,
    plan,
    startedAtMs: nowMs,
    lastFrame: getSessionFrame(plan, 0),
  }
}
```

**`completeIfNeeded` dispatch pattern** (lines 95-117):
```typescript
export function completeIfNeeded(
  state: RunningSessionState,
  nowMs: number,
): RunningSessionState | CompleteSessionState {
  const elapsedMs = nowMs - state.startedAtMs
  const lastFrame = getSessionFrame(state.plan, elapsedMs)  // <-- dispatch here for stretch

  if (!lastFrame.isComplete) {
    return { ...state, lastFrame }
  }
  // ... complete
}
```

**Modification:** In `completeIfNeeded`, branch on `state.stretchSegments !== null` to call `getStretchFrame(state.stretchSegments, totalMs, elapsedMs)` instead of `getSessionFrame`. In `startSession`, when `selectedSettings.mode === 'stretch'`, call `buildStretchSegments(lockedSettings, lockedSettings.ratio)` and set `stretchSegments`.

---

### `src/components/SettingsForm.tsx` (component, request-response) — modify

**Analog:** self (the existing form is the direct host for new pickers)

**`SettingsStepper` wiring pattern** (lines 54-68):
```typescript
<SettingsStepper
  label={strings.bpmLabel}
  value={settings.bpm}
  options={BPM_OPTIONS}
  formatValue={formatBpm}
  onChange={(bpm) => { updateSettings({ bpm }) }}
  strings={strings.stepper}
/>
```

**Generic typed stepper with `DurationOption`** (lines 71-80):
```typescript
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
```

**`updateSettings` helper pattern** (lines 35-37):
```typescript
const updateSettings = (nextSettings: Partial<SessionSettings>) => {
  onChange({ ...settings, ...nextSettings })
}
```

**Conditional render pattern** (lines 52-70):
```typescript
{!isRunning && (
  <>
    <SettingsStepper ... />
    <SettingsStepper<RatioLabel> ... />
  </>
)}
```

**New additions to copy this pattern for:**
- Mode picker: `<SettingsStepper<SessionMode> label={strings.sessionModeLabel} value={settings.mode} options={MODE_OPTIONS} ... disableIncrease={!isStretchGateClear(settings)} strings={strings.stepper} />`
- Conditional stretch fields block: when `settings.mode === 'stretch'` && `!isRunning`, render `initialBpm`, `targetBpm` (filtered options), `holdInitialSeconds`, `holdTargetSeconds`, `rampDurationMinutes` steppers
- Computed total readout: `<p>{strings.totalLabel}: {formatDuration(computeStretchTotalMs(settings) ?? Infinity)}</p>` pattern mirrors the timer chip in `SessionReadout`

---

### `src/components/SessionReadout.tsx` (component, request-response) — modify

**Analog:** self

**Timer chip rendering pattern** (lines 81-92):
```typescript
{showTimeChip ? (
  <div
    aria-live="off"
    className="mt-4 inline-flex items-baseline gap-3 rounded-full bg-[var(--color-breathing-surface)]/80 px-5 py-3 text-[var(--color-breathing-accent-strong)]"
  >
    <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]">
      {timeLabel}
    </span>
    <span className="font-mono text-2xl font-semibold">{timeValue}</span>
  </div>
) : null}
```

**`frame?.remainingMs === null` conditional pattern** (lines 59-60):
```typescript
const timeLabel = frame?.remainingMs === null ? strings.elapsed : strings.remaining
const timeValue = frame ? formatDuration(frame.remainingMs ?? frame.elapsedMs) : '0:00'
```

**Props interface pattern** (lines 6-20):
```typescript
export interface SessionReadoutProps {
  frame: SessionFrame | null
  status: SessionStatus
  showCompletionHeadline?: boolean
  strings: UiStrings['readout']
  isLeadInPlaceholder?: boolean
}
```

**New additions:** Add live BPM chip and stage label using the same `inline-flex items-baseline` chip pattern. Stage label uses the same `text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-breathing-muted)]` class. Only render these when `frame?.currentBpm !== undefined` (stretch session active). The `SessionReadoutProps.strings` type gains new keys for stage labels and BPM unit.

---

### `src/storage/settings.ts` (utility, CRUD) — modify

**Analog:** self

**`coerceSettings` per-field fallback pattern** (lines 18-27):
```typescript
export function coerceSettings(raw: unknown): SessionSettings {
  const r = (raw !== null && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, unknown>
    : {}
  return {
    bpm:             isValidBpm(r.bpm)             ? r.bpm             : DEFAULT_SETTINGS.bpm,
    ratio:           isValidRatio(r.ratio)         ? r.ratio           : DEFAULT_SETTINGS.ratio,
    durationMinutes: isValidDuration(r.durationMinutes) ? r.durationMinutes : DEFAULT_SETTINGS.durationMinutes,
  }
}
```

**New stretch fields follow exact same pattern:**
```typescript
mode:                  isValidMode(r.mode)                  ? r.mode                  : DEFAULT_SETTINGS.mode,
initialBpm:            isValidBpm(r.initialBpm)             ? r.initialBpm            : DEFAULT_STRETCH_SETTINGS.initialBpm,
targetBpm:             isValidBpm(r.targetBpm)              ? r.targetBpm             : DEFAULT_STRETCH_SETTINGS.targetBpm,
holdInitialSeconds:    isValidHoldSeconds(r.holdInitialSeconds) ? r.holdInitialSeconds : 0,
holdTargetSeconds:     isValidHoldTarget(r.holdTargetSeconds)   ? r.holdTargetSeconds  : 0,
rampDurationMinutes:   isValidRampDuration(r.rampDurationMinutes) ? r.rampDurationMinutes : 20,
```

No `STATE_KEY` or `STATE_VERSION` bump — verified in `storage.ts` lines 14-37 that forward-compat read via spread already handles new fields.

---

### `src/content/strings.ts` (config, transform) — modify

**Analog:** self

**`UiStrings` interface extension pattern** (lines 60-73): new keys are added inside the `settingsForm` slice (non-locked per CONTEXT canonical refs):
```typescript
readonly settingsForm: {
  readonly ariaLabel: string
  readonly bpmLabel: string
  readonly ratioLabel: string
  readonly durationLabel: string
  readonly openEndedLabel: string
  readonly bpmUnit: string
  readonly minutesUnit: string
  readonly stepper: { ... }
  // NEW stretch keys added here following same string/fn pattern
}
```

**EN + PT-BR parity pattern** — every new key must appear in both `UI_STRINGS.en` and `UI_STRINGS['pt-BR']`. PT-BR entries carry `// TODO: native-speaker review` comment (see lines 268-279).

**New string keys needed:**
- `settingsForm.sessionModeLabel` — e.g. `'Session Mode'` / `'Modo de Sessão'`
- `settingsForm.modeStandard` — `'Standard'` / `'Padrão'`
- `settingsForm.modeStretch` — `'Stretch'` / `'Relaxamento'`
- `settingsForm.initialBpmLabel` — `'Start BPM'` / `'BPM Inicial'`
- `settingsForm.targetBpmLabel` — `'Target BPM'` / `'BPM Alvo'`
- `settingsForm.holdInitialLabel` — `'Warm-up Hold'` / `'Pausa Inicial'`
- `settingsForm.holdTargetLabel` — `'Cool-down Hold'` / `'Pausa Final'`
- `settingsForm.rampDurationLabel` — `'Ramp Duration'` / `'Duração da Rampa'`
- `settingsForm.totalLabel` — `'Total'` / `'Total'`
- `settingsForm.stretchGateHint` — `'Needs a 15+ min session'` / `'Requer sessão de 15+ min'`
- `readout.currentBpmLabel` — `'BPM'` / `'BPM'`
- `readout.stageHoldInitial` — `'Warm-up'` / `'Aquecimento'`
- `readout.stageRamp` — `'Ramp'` / `'Rampa'`
- `readout.stageHoldTarget` — `'Cool-down'` / `'Resfriamento'`

---

### `src/app/App.tsx` (controller, event-driven) — modify boundary effect only

**Analog:** self (lines 560-619, the `useEffect` boundary effect)

**Existing boundary formula** (lines 597-619):
```typescript
const boundaryStartMs =
  frame.cycleIndex * plan.cycleMs +
  (frame.phase === 'in' ? 0 : plan.inhaleMs)

const audioTime = audioAnchor + boundaryStartMs / 1000
const phaseDurationSec = (frame.phase === 'in' ? plan.inhaleMs : plan.exhaleMs) / 1000

audioNotifyPhaseBoundary({ newPhase: frame.phase, audioTime: clampedAudioTime, phaseDurationSec })
```

**Stretch-aware replacement pattern** (per RESEARCH Pattern 2):
```typescript
// For stretch sessions, frame carries cycleStartMs / currentInhaleMs / currentExhaleMs
const boundaryStartMs = frame.cycleStartMs !== undefined
  ? frame.cycleStartMs + (frame.phase === 'in' ? 0 : (frame.currentInhaleMs ?? plan.inhaleMs))
  : frame.cycleIndex * plan.cycleMs + (frame.phase === 'in' ? 0 : plan.inhaleMs)

const phaseDurationSec = frame.currentInhaleMs !== undefined
  ? (frame.phase === 'in' ? frame.currentInhaleMs : (frame.currentExhaleMs ?? plan.exhaleMs)) / 1000
  : (frame.phase === 'in' ? plan.inhaleMs : plan.exhaleMs) / 1000
```

**Dedup key pattern stays the same** (line 580): `const key = \`${String(frame.cycleIndex)}:${frame.phase}\`` — absolute monotonic `cycleIndex` across segments is the invariant (Pitfall 1).

---

## Test File Patterns

### `src/domain/stretchRamp.test.ts` (NEW — Wave 0)

**Analog:** `src/domain/sessionMath.test.ts`

**Test file structure** (sessionMath.test.ts lines 1-17):
```typescript
import { describe, expect, it } from 'vitest'
import { createBreathingPlan } from './breathingPlan'
import { getSessionFrame, formatDuration } from './sessionMath'

const timedPlan = createBreathingPlan({ bpm: 5, ratio: '40:60', durationMinutes: 10 })

describe('session frame derivation', () => {
  it('starts in the In phase with zero progress and cycle index zero', () => {
    expect(getSessionFrame(timedPlan, 0)).toMatchObject({ ... })
  })
  // boundary tests, completion tests, edge cases
})
```

**Test structure for stretchRamp:**
- Test fixtures: `const settings = { ..., mode: 'stretch', initialBpm: 6, targetBpm: 4, holdInitialSeconds: 0, rampDurationMinutes: 20, holdTargetSeconds: 0 }`
- `describe('buildStretchSegments')` — segment count, step invariant `< 0.5 BPM`, stage tags, monotonic BPM
- `describe('getStretchFrame')` — cycleIndex monotonic across segments, `isComplete` fires at right time, open-ended never completes
- `describe('computeStretchTotalMs / isStretchGateClear')` — gate boundary at exactly 15 min, open-ended always clears

### `src/components/SettingsForm.stretch.test.tsx` (NEW — Wave 0)

**Analog:** `src/components/SettingsDialog.test.tsx` or `src/components/SessionReadout.test.tsx`

**Component test structure** (SessionReadout.test.tsx pattern — check imports):
```typescript
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SettingsForm } from './SettingsForm'
import { UI_STRINGS } from '../content/strings'

const strings = UI_STRINGS.en.settingsForm
```

---

## Shared Patterns

### Options Array + Type Guard Predicate
**Source:** `src/domain/settings.ts` lines 10-106
**Apply to:** All new option types in `settings.ts` (`SessionMode`, `HoldSecondsOption`, `HoldTargetOption`, ramp duration)
```typescript
export const FOO_OPTIONS = [...] as const satisfies readonly FooType[]
export function isValidFoo(v: unknown): v is FooType {
  return typeof v === ... && (FOO_OPTIONS as readonly FooType[]).includes(v)
}
```

### Per-Field Storage Coercion
**Source:** `src/storage/settings.ts` lines 18-27
**Apply to:** All new stretch fields in `coerceSettings`
```typescript
fieldName: isValidFieldName(r.fieldName) ? r.fieldName : DEFAULT_VALUE,
```

### EN + PT-BR String Parity
**Source:** `src/content/strings.ts` lines 115-317 (both locale blocks)
**Apply to:** All new `strings.ts` keys
- Every new key must appear in `UI_STRINGS.en` and `UI_STRINGS['pt-BR']`
- PT-BR entries carry `// TODO: native-speaker review` comment
- Non-constant strings (interpolated) use function types: `readonly myLabel: (n: number) => string`

### SettingsStepper Wiring
**Source:** `src/components/SettingsForm.tsx` lines 54-80 + `src/components/SettingsStepper.tsx` lines 3-13
**Apply to:** All new stretch pickers (mode, initialBpm, targetBpm, holdInitialSeconds, holdTargetSeconds, rampDurationMinutes)
```typescript
<SettingsStepper<T>
  label={strings.fieldLabel}
  value={settings.field}
  options={FIELD_OPTIONS}
  formatValue={(v) => ...}
  onChange={(field) => { updateSettings({ field }) }}
  disableIncrease={...}  // gate use: disableIncrease only, not disabled
  strings={strings.stepper}
/>
```
Note: `disableIncrease` disables only the `+` button; `disabled` disables both. For the mode gate (D-12), use `disableIncrease` to gray only the Stretch direction.

### Pure Domain Function (no side effects)
**Source:** `src/domain/sessionMath.ts` lines 15-41 + `src/domain/breathingPlan.ts` lines 22-41
**Apply to:** `buildStretchSegments`, `getStretchFrame`, `computeStretchTotalMs`, `isStretchGateClear` in `stretchRamp.ts`
- Take settings/data as arguments, return computed value
- No global state, no React hooks, no I/O
- Safe to call in tests with `import { fn } from './stretchRamp'`

### rAF Loop + Ref Pattern
**Source:** `src/hooks/useSessionEngine.ts` lines 79-148
**Apply to:** No new hooks created; existing `completeIfNeeded` dispatch branch handles stretch in the domain layer

---

## No Analog Found

All files in this phase have close analogs in the codebase. `src/domain/stretchRamp.ts` is a new file but follows the existing pure-domain-function pattern in `sessionMath.ts` and `breathingPlan.ts`.

---

## Metadata

**Analog search scope:** `src/domain/`, `src/components/`, `src/storage/`, `src/content/`, `src/hooks/`, `src/app/`
**Files scanned:** 15 source files read directly
**Pattern extraction date:** 2026-05-15

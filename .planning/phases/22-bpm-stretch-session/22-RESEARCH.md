# Phase 22: BPM Stretch Session - Research

**Researched:** 2026-05-15
**Domain:** Ramp engine design on one-clock SessionFrame + stretch settings surface + dual-anchor audio across BPM steps + localStorage schema extension
**Confidence:** HIGH (all findings verified against codebase source)

## Summary

Phase 22 adds a Stretch session mode where breathing rate walks linearly from a warm-up `initialBpm` down to a `targetBpm` in sub-perceptual steps (each step < 0.5 BPM). The session runs on the existing one-clock `SessionFrame` — no second timer. Audio uses the Phase 3 dual-anchor scheduling unchanged. The main design decision left to the planner is how to model a time-varying BPM on a system that today assumes a single fixed `plan.cycleMs` across the session.

The ramp engine's core challenge: `getSessionFrame` computes `cycleIndex = Math.floor(elapsedMs / plan.cycleMs)` and `cycleElapsedMs = elapsedMs % plan.cycleMs` using a single constant `cycleMs`. When BPM changes, the cycle length changes, but the elapsed clock keeps advancing from a single origin. The planner must choose a ramp representation that keeps this one-clock contract and yields the correct per-cycle BPM to the audio boundary scheduler.

The audio boundary effect in `App.tsx` computes cue times as `audioAnchor + boundaryStartMs / 1000` where `boundaryStartMs = cycleIndex * plan.cycleMs + (phase === 'out' ? plan.inhaleMs : 0)`. This formula uses a constant `plan.cycleMs`. For stretch, the formula must account for variable-length cycles; either `planRef.current` must expose a `cycleMs` appropriate for the current cycle, or the boundary effect must compute `boundaryStartMs` by summing actual cycle durations up to `cycleIndex`. This is the central audio scheduling integration point.

**Primary recommendation:** Implement the ramp as a piecewise-constant segment table computed at session start — a sorted array of `{ startMs, endMs, cycleMs, inhaleMs, exhaleMs }` segments, each representing one BPM step. `getSessionFrame` stays unchanged (its `plan` type becomes a segment-aware union), but a new `getStretchFrame` function walks the segment table for elapsed time lookup. The audio boundary effect receives a `cycleMs`-per-cycle lookup function instead of a constant.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ramp step computation (BPM schedule) | Domain (pure function) | — | Pure math; deterministic from settings; testable without React |
| Per-cycle BPM lookup during session | Domain (SessionFrame extension) | rAF loop in hook | Frame is the single source of truth for "what BPM is active now" |
| Stretch settings schema + validation | Domain (settings.ts) | Storage adapter (storage/settings.ts) | Domain owns the contract; storage adapter coerces to it |
| Settings UI (mode picker + stretch fields) | Component (SettingsForm) | SettingsStepper (reused) | Matches existing BPM/ratio/duration stepper pattern |
| Minimum-duration gate | Component (SettingsForm, computed inline) | Domain (pure predicate helper) | Gate is a UI constraint derived from computed total; domain provides the threshold constant |
| Audio boundary time computation | App.tsx (boundary effect) | useAudioCues (notifyPhaseBoundary) | Boundary effect already owns this calculation; needs to be stretch-aware |
| In-session live BPM + stage label | Component (SessionReadout) | Domain (current-stage lookup) | Readout already receives the frame; stage/BPM derived from frame |
| Persistence of stretch settings | Storage adapter (storage/settings.ts) | Envelope (storage.ts) | Settings coercer pattern already handles per-field fallback |

## Standard Stack

### Core (existing — no new deps)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.5 | Component rendering | Already used throughout |
| TypeScript | ~6.0.2 | Type safety | Project-wide |
| Vitest | 4.1.5 | Unit + integration tests | Established test runner |
| Web Audio API | browser-native | Audio scheduling | Phase 3 dual-anchor design built on it |
| localStorage | browser-native | Settings persistence | Phase 4/8 envelope already established |

**Zero net-new runtime deps** [VERIFIED: STATE.md, package.json — project-wide decision locked in v1.1]: Phase 22 must not add any `npm install` packages. All required capabilities exist in the current stack.

**Installation:** No installation step required.

## Architecture Patterns

### System Architecture Diagram

```
SessionSettings (stretch fields added)
        |
        v
buildStretchSegments(settings)     <- new pure function
        |
        v
StretchSegment[] (sorted array)    <- [{startMs, endMs, cycleMs, inhaleMs, exhaleMs, bpm, stage}, ...]
        |
        +-----> getStretchFrame(segments, elapsedMs) -> StretchSessionFrame
        |                                                 (extends SessionFrame with currentBpm, stage)
        |
        v
useSessionEngine (rAF loop)
        |  liveFrame / currentFrame
        |
        +-----> SessionReadout         (receives currentBpm + stage label — D-13/D-14)
        |
        +-----> App.tsx boundary effect
                        |
                        v  (needs per-cycle cycleMs for boundaryStartMs computation)
                useAudioCues.notifyPhaseBoundary
                        |
                        v
                audioEngine.scheduleNextCue (unchanged — dual-anchor holds)
```

Data flow entry: user selects stretch settings → SettingsForm → onChange → SessionSettings.
Processing stages: settings validation → segment table computation → rAF frame lookup per tick → audio boundary scheduling per phase boundary → SessionReadout display.

### Recommended Project Structure

```
src/
├── domain/
│   ├── settings.ts            # SessionSettings + stretch fields + predicates
│   ├── sessionMath.ts         # getSessionFrame (unchanged) + NEW: StretchSessionFrame, getStretchFrame
│   ├── stretchRamp.ts         # NEW: buildStretchSegments, StretchSegment type, ramp math
│   ├── breathingPlan.ts       # createBreathingPlan (unchanged for Standard mode)
│   └── sessionController.ts   # startSession — plan or segments stored on RunningSessionState
├── components/
│   ├── SettingsForm.tsx        # Mode picker + conditional stretch fields + computed total readout
│   └── SessionReadout.tsx      # Live BPM + stage label additions (D-13/D-14)
├── storage/
│   └── settings.ts            # coerceSettings extended for stretch fields
└── content/
    └── strings.ts             # New stretch labels (EN + PT-BR, in settingsForm slice)
```

### Pattern 1: Piecewise-Constant Segment Table for Ramp Engine

**What:** At session start, compute a sorted array of segments, each describing one BPM step. Each segment has a fixed `cycleMs` (one BPM value), start/end wall-clock offsets, and a stage tag.

**When to use:** Every stretch session. Standard sessions bypass this and use the existing `BreathingPlan` path unchanged.

**Ramp step invariant (STRETCH-04):** Each step must be `< 0.5 BPM`. For a ramp from `initialBpm` to `targetBpm` over `rampMs` milliseconds:
- `bpmSpan = initialBpm - targetBpm` (always positive, D-01 enforced)
- Step size is chosen as `min(0.5 - epsilon, bpmSpan / numSteps)` where `numSteps` is tuned so each step is sub-perceptual
- A practical approach: choose step size first, derive number of steps: `numSteps = ceil(bpmSpan / maxStep)` where `maxStep = 0.499` (strictly < 0.5)
- Each step's duration: `stepDurationMs = rampMs / numSteps`
- Each step's BPM: `bpm_i = initialBpm - i * (bpmSpan / numSteps)` for `i = 0..numSteps-1`

**Example segment table:**

```typescript
// Source: derived from CONTEXT.md D-04 (linear ramp) + STRETCH-04 invariant
export interface StretchSegment {
  startMs: number      // elapsed session time when this BPM takes effect
  endMs: number        // elapsed session time when this BPM ends
  bpm: number
  cycleMs: number      // 60000 / bpm
  inhaleMs: number     // cycleMs * ratio.inhale / 100
  exhaleMs: number     // cycleMs * ratio.exhale / 100
  stage: 'hold-initial' | 'ramp' | 'hold-target'
}

export function buildStretchSegments(
  settings: SessionSettings & { mode: 'stretch' },
  ratio: RatioLabel,
): StretchSegment[] {
  // 1. Hold initial: one segment at initialBpm for holdInitialSeconds
  // 2. Ramp: N segments, each < 0.5 BPM apart
  // 3. Hold target: one segment at targetBpm for holdTargetSeconds (or open-ended → totalMs null for that segment)
}
```

**Lookup at elapsed time:**

```typescript
// Source: verified codebase pattern — getSessionFrame uses Math.floor division
// For stretch: find the segment containing elapsedMs, then compute frame within that segment
export function getStretchFrame(
  segments: StretchSegment[],
  totalMs: number | null,  // null = open-ended
  elapsedMs: number,
): StretchSessionFrame {
  const segment = findSegment(segments, elapsedMs)
  // compute cycleIndex and phase offset WITHIN the segment
  // cycleIndex is absolute across all segments (sum of completed cycles in prior segments + cycles in current segment)
  // ...
}
```

**Key insight for `cycleIndex`:** The absolute `cycleIndex` across the session must be monotonically increasing. For segment `k`, the number of cycles completed before it is `sum(completedCycles for segments 0..k-1)`. Cycles within each segment: `Math.floor((elapsedInSegment) / segment.cycleMs)`.

### Pattern 2: Audio Boundary Time Computation for Variable Cycle Lengths

**What:** The App.tsx boundary effect currently computes `boundaryStartMs = cycleIndex * plan.cycleMs + phaseOffset`. With variable cycle lengths, this formula is wrong because past cycles may have had different `cycleMs` values.

**Current code (App.tsx ~line 597-599):**
```typescript
const boundaryStartMs =
  frame.cycleIndex * plan.cycleMs +
  (frame.phase === 'in' ? 0 : plan.inhaleMs)
```

**Required change:** For stretch sessions, `boundaryStartMs` must be the actual start time of that cycle in session-elapsed ms. The `StretchSessionFrame` should carry this as a field — e.g., `cycleStartMs: number` — computed during segment lookup. The boundary effect then uses `cycleStartMs + (phase === 'in' ? 0 : segment.inhaleMs)` instead of the constant-plan formula.

**The frame should expose enough information for the boundary effect to compute audio time without re-querying the segment table.** Recommended: extend `SessionFrame` with optional `cycleStartMs` and `currentCycleMs` fields (null for standard sessions, populated for stretch). The boundary effect uses these when present, falls back to the existing formula for standard sessions.

**Example:**
```typescript
// Source: derived from App.tsx lines 564-619 boundary effect analysis
export interface StretchSessionFrame extends SessionFrame {
  currentBpm: number       // live BPM at this instant (for SessionReadout D-13)
  stage: StretchStage      // 'hold-initial' | 'ramp' | 'hold-target' (for D-14 label)
  cycleStartMs: number     // actual session-elapsed ms when this cycle started
  currentCycleMs: number   // this cycle's duration (for audio boundary formula)
  currentInhaleMs: number  // this cycle's inhale duration (for phaseDurationSec)
  currentExhaleMs: number  // this cycle's exhale duration
}
```

### Pattern 3: Mode Picker as SettingsStepper

**What:** D-05 specifies a `SettingsStepper`-style picker for Standard/Stretch mode. `SettingsStepper<T>` is generic over `T extends string | number`.

**Wiring:**
```typescript
// Source: SettingsStepper.tsx verified
type SessionMode = 'standard' | 'stretch'
const MODE_OPTIONS = ['standard', 'stretch'] as const

<SettingsStepper<SessionMode>
  label={strings.sessionModeLabel}
  value={settings.mode}
  options={MODE_OPTIONS}
  formatValue={(m) => m === 'standard' ? strings.modeStandard : strings.modeStretch}
  onChange={(mode) => { updateSettings({ mode }) }}
  disabled={/* stretch option grayed when below 15-min gate */}
  strings={strings.stepper}
/>
```

**Disabled prop limitation:** `SettingsStepper.disabled` disables BOTH buttons. The gate (D-09/D-12) needs to disable only the "increase" direction (Standard→Stretch). Planner should verify whether `disableIncrease` alone achieves the grayed-Stretch-option semantic, or whether a custom rendering is needed. The `disableIncrease` prop already exists on `SettingsStepper`.

### Pattern 4: targetBpm Picker with Constraint

**What:** D-01 requires `targetBpm < initialBpm`. The `targetBpm` picker must be filtered to values strictly below `initialBpm`.

```typescript
// Source: BPM_OPTIONS from settings.ts, filtered per D-01
const targetBpmOptions = BPM_OPTIONS.filter(v => v < settings.initialBpm)
// When initialBpm is at the minimum (1.0 BPM), targetBpmOptions is empty → targetBpm picker shows empty or is disabled.
// Planner must handle this edge case.
```

**Edge case:** `initialBpm = 1.0` (minimum) leaves `targetBpmOptions` empty. DEFAULT_SETTINGS for stretch should set `initialBpm > DEFAULT targetBpm` so the initial state is valid. Recommended defaults: `initialBpm: 5.5, targetBpm: 4.5` (matching existing DEFAULT_SETTINGS.bpm and a plausible target).

### Pattern 5: Hold Seconds Stepper

Per D-07: `holdInitialSeconds` and `holdTargetSeconds` use `{0, 15, 30, 45, 60}` with an additional `'open-ended'` option on `holdTargetSeconds` only (D-11).

```typescript
// Source: derived from CONTEXT.md D-07 + D-11
export const HOLD_SECONDS_OPTIONS = [0, 15, 30, 45, 60] as const
export type HoldSecondsOption = 0 | 15 | 30 | 45 | 60

export const HOLD_TARGET_OPTIONS = [...HOLD_SECONDS_OPTIONS, 'open-ended'] as const
export type HoldTargetOption = HoldSecondsOption | 'open-ended'

export const RAMP_DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const
// mirrors DURATION_OPTIONS min/max, 5-min steps per D-07
```

### Pattern 6: Storage Coercion for Stretch Fields

**What:** The existing `coerceSettings` in `storage/settings.ts` does per-field validate-and-fallback (non-throwing). New stretch fields follow the same pattern.

**Current pattern:**
```typescript
// Source: src/storage/settings.ts verified
return {
  bpm: isValidBpm(r.bpm) ? r.bpm : DEFAULT_SETTINGS.bpm,
  ratio: isValidRatio(r.ratio) ? r.ratio : DEFAULT_SETTINGS.ratio,
  durationMinutes: isValidDuration(r.durationMinutes) ? r.durationMinutes : DEFAULT_SETTINGS.durationMinutes,
}
```

**Extended for stretch:**
```typescript
return {
  bpm: isValidBpm(r.bpm) ? r.bpm : DEFAULT_SETTINGS.bpm,
  ratio: isValidRatio(r.ratio) ? r.ratio : DEFAULT_SETTINGS.ratio,
  durationMinutes: isValidDuration(r.durationMinutes) ? r.durationMinutes : DEFAULT_SETTINGS.durationMinutes,
  mode: isValidMode(r.mode) ? r.mode : DEFAULT_SETTINGS.mode,
  initialBpm: isValidBpm(r.initialBpm) ? r.initialBpm : DEFAULT_STRETCH_SETTINGS.initialBpm,
  targetBpm: isValidBpm(r.targetBpm) ? r.targetBpm : DEFAULT_STRETCH_SETTINGS.targetBpm,
  holdInitialSeconds: isValidHoldSeconds(r.holdInitialSeconds) ? r.holdInitialSeconds : 0,
  holdTargetSeconds: isValidHoldTarget(r.holdTargetSeconds) ? r.holdTargetSeconds : 0,
  rampDurationMinutes: isValidRampDuration(r.rampDurationMinutes) ? r.rampDurationMinutes : 10,
}
```

**No STATE_KEY or STATE_VERSION bump required** [VERIFIED: storage.ts lines 14-37 — forward-compat read via spread already handles new fields; the existing `coerceSettings` call is the boundary; new fields missing from old storage fall through to defaults].

### Pattern 7: Computed Total and 15-Minute Gate (D-09/D-10)

```typescript
// Source: CONTEXT.md D-09/D-10/D-11 decisions
export function computeStretchTotalMs(settings: StretchSettings): number | null {
  const holdInitialMs = settings.holdInitialSeconds * 1000
  const rampMs = settings.rampDurationMinutes * 60_000
  const holdTargetMs = settings.holdTargetSeconds === 'open-ended' ? Infinity : settings.holdTargetSeconds * 1000
  if (holdTargetMs === Infinity) return null  // open-ended total: always clears gate
  return holdInitialMs + rampMs + holdTargetMs
}

export const STRETCH_MIN_TOTAL_MS = 15 * 60_000  // D-10: 15-minute threshold

export function isStretchGateClear(settings: StretchSettings): boolean {
  const totalMs = computeStretchTotalMs(settings)
  return totalMs === null || totalMs >= STRETCH_MIN_TOTAL_MS  // open-ended always clears
}
```

**Chicken-and-egg resolution** [VERIFIED: CONTEXT.md open consideration]: The planner must ensure default stretch field values yield a total >= 15 min so Stretch mode is reachable from the start. Recommended: `holdInitialSeconds: 0, rampDurationMinutes: 20, holdTargetSeconds: 0` → total = 20 min, gate is clear. The gate then blocks *re-entering* Stretch if user dials fields below 15 min while still in Standard mode — but since the fields only exist when mode is Stretch, the gate primarily applies when the user would try to activate Stretch while the computed-total (from current field values) is too low. The planner should define: if the mode is already `'stretch'` and the user adjusts fields to below 15 min, what happens? Options: (a) allow it but disable Start, (b) revert to Standard automatically. Option (a) is simpler and matches the disable-not-hide principle.

### Anti-Patterns to Avoid

- **Second timer for ramp:** `setInterval` or a second `requestAnimationFrame` loop for BPM stepping. Use the existing one-clock `elapsedMs` to derive current BPM from the segment table.
- **Mutating `plan` mid-session:** The `RunningSessionState.plan` is a locked snapshot. For stretch, use a separate `segments` field alongside `plan` (or instead of it for stretch sessions). Do not swap `plan` reference while running.
- **Using `frame.elapsedMs` in audio boundary time computation:** The boundary effect comment at App.tsx line 564-568 explicitly bans this (Pitfall 2). For stretch, `cycleStartMs` must come from the segment table pre-computation, not from `frame.elapsedMs` at render time.
- **Re-computing segment table per rAF tick:** Build once at session start, store in a ref. The table is deterministic from settings.
- **Standard sessions broken:** Phase 22 must not change `getSessionFrame` behavior for standard sessions. The standard path must remain unchanged.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio scheduling | Custom timing loop | Existing `audioEngine.scheduleNextCue` + `notifyPhaseBoundary` | Dual-anchor already handles BPM-change scheduling (Phase 3 D-13/D-14 design) |
| Per-field storage coercion | Custom JSON parsing | Existing `coerceSettings` pattern in `storage/settings.ts` | Pattern handles missing fields with silent fallback; forward-compat already works |
| Step math precision | Custom float rounding | `Number.isFinite` checks on BPM values + existing `BPM_OPTIONS` array membership | BPM grid is discrete; ramp step BPMs need not be on the grid — only the invariant `< 0.5` matters |
| Stepper UI for mode/holds/ramp | Custom picker component | `SettingsStepper<T>` with appropriate type parameter | Generic over `T extends string | number`; handles all new pickers |

**Key insight:** The dual-anchor scheduling in `audioEngine.scheduleNextCue` was explicitly designed to survive BPM changes (Phase 3 D-13/D-14). The architecture already anticipates mid-session BPM variation — STRETCH-08 is delivered by correctly feeding it the per-cycle `cycleMs` and `phaseDurationSec` values, not by changing the audio engine.

## Common Pitfalls

### Pitfall 1: Absolute `cycleIndex` Discontinuity at Segment Boundary

**What goes wrong:** If `cycleIndex` is computed locally within each segment (reset to 0 at segment start), the boundary effect's dedup key `${cycleIndex}:${phase}` collides between segments. The first cycle of ramp segment 2 has `cycleIndex=0` same as the first cycle of segment 1, causing the boundary cue to be skipped.

**Why it happens:** Per-segment local cycle counting loses the session-global monotonic index.

**How to avoid:** Track cumulative cycle count. For segment `k`, the absolute `cycleIndex` base = `sum of floor(segment_duration_ms / segment_cycleMs)` for all segments 0..k-1. Within segment `k`: `absoluteCycleIndex = base_k + floor(elapsedInSegment / segment.cycleMs)`.

**Warning signs:** Audio cues skip at BPM step boundaries. In tests: `lastBoundaryKeyRef` never changes across segment transitions.

### Pitfall 2: Audio Boundary Formula with Variable cycleMs

**What goes wrong:** The boundary effect uses `frame.cycleIndex * plan.cycleMs` (constant `plan.cycleMs`). With a stretch session where `plan.cycleMs` is the initial BPM's cycle length, ramp cycles that have a shorter `cycleMs` get cues scheduled too late on the audio clock.

**Why it happens:** The formula conflates "cycle number" with "elapsed time" via a constant conversion factor. That factor changes each ramp step.

**How to avoid:** Expose `cycleStartMs` on `StretchSessionFrame`. The boundary effect uses `frame.cycleStartMs + phaseOffset` instead of `frame.cycleIndex * plan.cycleMs`. For standard sessions, `cycleStartMs` would equal `frame.cycleIndex * plan.cycleMs` — backward-compatible.

**Warning signs:** Audio cues drift progressively later relative to the visual phase boundary as the ramp progresses.

### Pitfall 3: isComplete Rounding with Variable Last Cycle

**What goes wrong:** `getSessionFrame` rounds `totalMs` up to the next cycle boundary: `completionMs = Math.ceil(totalMs / plan.cycleMs) * plan.cycleMs`. For stretch, the last cycle (in the hold-target segment) has a different `cycleMs` than `plan.cycleMs`, so the rounding is wrong.

**Why it happens:** The `isComplete` formula uses the plan's constant `cycleMs` for rounding.

**How to avoid:** For `getStretchFrame`, compute `completionMs` using the last segment's `cycleMs`: `Math.ceil(holdTargetRemaining / lastSegment.cycleMs) * lastSegment.cycleMs + lastSegment.startMs`.

**Warning signs:** Session ends one cycle too early or hangs one cycle past the target duration.

### Pitfall 4: targetBpm Picker Empty at Minimum initialBpm

**What goes wrong:** `BPM_OPTIONS.filter(v => v < 1.0)` returns `[]`. The `targetBpm` `SettingsStepper` receives an empty `options` array. `selectedIndex = options.indexOf(settings.targetBpm)` returns `-1`. Stepper renders but both buttons are disabled — user cannot pick anything.

**Why it happens:** The BPM grid starts at 1.0; filtering below it leaves nothing.

**How to avoid:** Either (a) constrain `initialBpm` picker minimum to 1.5 (ensures at least one target option: 1.0), or (b) show the `targetBpm` stepper as disabled with a hint when `initialBpm === 1.0`. Option (a) is simplest. Planner must decide.

**Warning signs:** SettingsStepper with empty options doesn't crash, but both arrows are disabled and the output shows `String(undefined)` = `"undefined"`.

### Pitfall 5: 15-Minute Gate Chicken-and-Egg on First Load

**What goes wrong:** A user who has never used stretch loads the app. Default settings have `mode: 'standard'`. The mode picker shows Standard (with Stretch grayed if defaults yield < 15 min total). If defaults are not carefully set, Stretch mode is unreachable on first visit.

**Why it happens:** The gate reads computed total from stretch field values, but stretch fields only exist once the user is in Stretch mode.

**How to avoid:** Default stretch field values MUST yield a total >= 15 min before the user ever touches them. Recommended: `holdInitialSeconds: 0, rampDurationMinutes: 20, holdTargetSeconds: 0` → total = 20 min. The gate is evaluated against these defaults even when mode is Standard, so Stretch is always reachable.

**Warning signs:** Stretch mode option permanently grayed on first visit.

### Pitfall 6: Open-Ended + isComplete Infinite Loop

**What goes wrong:** An open-ended `holdTargetSeconds` makes `totalMs = null`. The `isComplete` check becomes `completionMs === null` → never fires. The session never ends. This is correct behavior (open-ended), but if the `getStretchFrame` implementation doesn't correctly propagate `totalMs = null` from an open-ended hold-target segment, the session may incorrectly complete.

**Why it happens:** Segment table builder sets `endMs = Infinity` for the open-ended hold-target segment. If the lookup doesn't handle `Infinity` correctly, comparisons fail.

**How to avoid:** Use `null` for `totalMs` (the existing convention) rather than `Infinity` on the session level. The segment table can use `Infinity` for the last segment's `endMs` as a sentinel, but `getStretchFrame` must translate this to `remainingMs = null` on the returned frame.

## Code Examples

### Verified Pattern: getSessionFrame (unchanged for standard sessions)

```typescript
// Source: src/domain/sessionMath.ts (verified)
export function getSessionFrame(plan: BreathingPlan, elapsedMs: number): SessionFrame {
  const safeElapsedMs = Math.max(0, elapsedMs)
  const cycleIndex = Math.floor(safeElapsedMs / plan.cycleMs)
  const cycleElapsedMs = safeElapsedMs % plan.cycleMs
  // ... (see full source)
}
```

### Verified Pattern: Audio Boundary Scheduling (App.tsx)

```typescript
// Source: src/app/App.tsx lines 597-619 (verified)
// For standard sessions today:
const boundaryStartMs =
  frame.cycleIndex * plan.cycleMs +
  (frame.phase === 'in' ? 0 : plan.inhaleMs)
const audioTime = audioAnchor + boundaryStartMs / 1000
// For stretch sessions: replace with frame.cycleStartMs + (frame.phase === 'in' ? 0 : frame.currentInhaleMs)
```

### Verified Pattern: SettingsStepper Generic Usage

```typescript
// Source: src/components/SettingsForm.tsx lines 54-68 (verified)
<SettingsStepper
  label={strings.bpmLabel}
  value={settings.bpm}
  options={BPM_OPTIONS}
  formatValue={formatBpm}
  onChange={(bpm) => { updateSettings({ bpm }) }}
  strings={strings.stepper}
/>
```

### Verified Pattern: coerceSettings Extending

```typescript
// Source: src/storage/settings.ts lines 18-27 (verified)
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
// Pattern: add stretch fields to this return value with matching isValid* predicates
```

### Ramp Step Count Math

```typescript
// Source: [ASSUMED] — derived from STRETCH-04 invariant and CONTEXT.md D-04 linear ramp
// Compute number of ramp steps to guarantee step size < 0.5 BPM
function computeRampStepCount(initialBpm: number, targetBpm: number): number {
  const bpmSpan = initialBpm - targetBpm  // always positive by D-01
  const maxStepSize = 0.4999  // strictly < 0.5
  return Math.ceil(bpmSpan / maxStepSize)
}
// Note: steps need not land on BPM_OPTIONS grid values — they are intermediate float BPMs
// that drive cycleMs = 60000 / bpm. Only initialBpm and targetBpm must be on the grid.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-BPM BreathingPlan only | BreathingPlan stays single-BPM; stretch adds StretchSegment table alongside | Phase 22 (this phase) | Standard sessions unchanged; stretch has its own computation path |
| Constant plan.cycleMs in boundary effect | Per-cycle cycleMs via frame.cycleStartMs / frame.currentCycleMs | Phase 22 (this phase) | Audio boundary formula generalized |

## Open Questions

1. **Is `BreathingPlan` modified or bypassed for stretch?**
   - What we know: `startSession` calls `createBreathingPlan(lockedSettings)` and stores the result as `plan`. Audio engine `scheduleLeadIn(startAudioTime, plan)` uses `plan.inhaleMs` for the first cue duration. `planRef.current` is used in the boundary effect.
   - What's unclear: For stretch, the initial BPM defines the lead-in phase duration; `scheduleLeadIn` only needs `inhaleMs` from the initial segment. `plan` could remain a standard `BreathingPlan` at `initialBpm`, with a separate `segments` array for the ramp. Or `plan` could be abandoned for stretch entirely with a `stretchSegments` field on `RunningSessionState`.
   - Recommendation: Keep `plan` as a `BreathingPlan` at `initialBpm` for the lead-in only. Add `stretchSegments: StretchSegment[] | null` to `RunningSessionState`. The boundary effect checks `stretchSegments !== null` to take the stretch path.

2. **Where does `getStretchFrame` live?**
   - What we know: `getSessionFrame` is in `sessionMath.ts`. `useSessionEngine` calls `completeIfNeeded` which calls `getSessionFrame(state.plan, elapsedMs)`.
   - What's unclear: Whether to extend `sessionMath.ts` or create `stretchRamp.ts` for all ramp logic.
   - Recommendation: Create `stretchRamp.ts` for segment building and `getStretchFrame`, extend `sessionMath.ts` with the `StretchSessionFrame` interface only. Keep `getSessionFrame` and `getStretchFrame` as sibling functions.

3. **How does `useSessionEngine` dispatch to the correct frame function?**
   - What we know: `completeIfNeeded` calls `getSessionFrame(state.plan, elapsedMs)`. For stretch, it should call `getStretchFrame(state.stretchSegments, elapsedMs)`.
   - Recommendation: Add a branch in `completeIfNeeded`: if `state.stretchSegments !== null`, call `getStretchFrame`; else call `getSessionFrame`. `SessionFrame` is extended with optional stretch fields that are `null` for standard sessions and populated for stretch.

4. **Live BPM readout: out-of-scope per REQUIREMENTS.md?**
   - What we know: REQUIREMENTS.md Out of Scope says "Visual indicator of current ramp BPM during session — Ramp must remain sub-perceptual; a visible BPM readout would defeat the purpose." BUT CONTEXT.md D-13 says "Show the live current BPM while a stretch session runs." These appear to contradict.
   - What's unclear: REQUIREMENTS.md is the authoritative contract; CONTEXT.md represents the discussion session. The REQUIREMENTS.md Out-of-Scope statement was written earlier and may have been superseded by the D-13 discussion decision.
   - Recommendation: Planner should confirm with operator. If D-13 stands (live BPM readout), it goes in SessionReadout. If REQUIREMENTS.md out-of-scope stands, D-13 is dropped. Given CONTEXT.md was gathered after REQUIREMENTS.md and is closer to final intent, D-13 likely takes precedence — but this needs explicit planner decision.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — pure TypeScript/React/Web Audio code changes only).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 |
| Config file | vite.config.ts (Vitest config inline) |
| Quick run command | `npx vitest run --reporter=verbose src/domain/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRETCH-01 | Mode picker renders Standard/Stretch options | unit (component) | `npx vitest run src/components/SettingsForm` | ❌ Wave 0 |
| STRETCH-02 | initialBpm/targetBpm pickers use BPM_OPTIONS; targetBpm < initialBpm enforced | unit (domain + component) | `npx vitest run src/domain/settings.test.ts` | ✅ partial (settings.test.ts exists; needs stretch cases) |
| STRETCH-03 | holdInitialSeconds/holdTargetSeconds pickers respect D-07 ranges | unit (domain) | `npx vitest run src/domain/settings.test.ts` | ✅ partial |
| STRETCH-04 | All ramp steps < 0.5 BPM; frame BPM changes monotonically | unit (domain) | `npx vitest run src/domain/stretchRamp.test.ts` | ❌ Wave 0 |
| STRETCH-05 | Total duration = hold + ramp + hold; open-ended hold target works | unit (domain) | `npx vitest run src/domain/stretchRamp.test.ts` | ❌ Wave 0 |
| STRETCH-06 | Gate disables Stretch mode below 15-min total | unit (domain + component) | `npx vitest run src/domain/stretchRamp.test.ts` | ❌ Wave 0 |
| STRETCH-07 | Stretch settings persist and reload via coerceSettings | unit (storage) | `npx vitest run src/storage/settings.test.ts` | ✅ partial (settings.test.ts exists; needs stretch cases) |
| STRETCH-08 | Audio boundary scheduling uses per-cycle cycleMs/inhaleMs | unit (integration) | `npx vitest run src/domain/sessionMath.test.ts` | ✅ partial |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run` (full suite, currently 753 tests in 57 files)
- **Phase gate:** Full suite green + `tsc && lint && build` before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/domain/stretchRamp.test.ts` — covers STRETCH-04, STRETCH-05, STRETCH-06 (segment math, step invariant, gate predicate)
- [ ] `src/components/SettingsForm.stretch.test.tsx` — covers STRETCH-01, STRETCH-02, STRETCH-03 (mode picker rendering, conditional field display, gate graying)

*(Existing test files need new test cases added for stretch fields; they are not Wave 0 creations from scratch.)*

## Security Domain

This phase adds no new network endpoints, no authentication, no cryptography, no user input beyond the existing settings stepper pattern (bounded discrete option arrays), and no new storage keys beyond the existing `hrv:state:v1` envelope. ASVS input validation (V5) is satisfied by the discrete `BPM_OPTIONS` array membership checks (same predicate pattern as `isValidBpm`). No new threat surface introduced.

Security enforcement: not applicable for this phase's scope.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ramp BPM values need not be on the BPM_OPTIONS grid (only initialBpm/targetBpm must be) | Architecture Patterns (Ramp step math example) | If ramp steps must be grid-aligned, max step size is limited by grid granularity (0.5 BPM) and the invariant `< 0.5 BPM` becomes impossible to satisfy without a non-linear approach |
| A2 | `BreathingPlan` can remain unchanged for the lead-in (initial BPM) | Open Questions #1 | If scheduleLeadIn needs segment-aware information, the audio API must be extended |
| A3 | CONTEXT.md D-13 (live BPM readout) supersedes REQUIREMENTS.md Out-of-Scope exclusion of visual BPM readout | Open Questions #4 | If REQUIREMENTS.md governs, D-13 is dropped and SessionReadout shows only the stage label (D-14) |

## Sources

### Primary (HIGH confidence)
- `src/domain/sessionMath.ts` — `getSessionFrame` implementation and `SessionFrame` interface verified in full
- `src/domain/breathingPlan.ts` — `BreathingPlan` + `createBreathingPlan` verified in full
- `src/domain/settings.ts` — `BPM_OPTIONS`, `DURATION_OPTIONS`, predicates, `DEFAULT_SETTINGS` verified in full
- `src/domain/sessionController.ts` — `RunningSessionState`, `startSession`, `completeIfNeeded` verified in full
- `src/hooks/useSessionEngine.ts` — rAF loop, `currentFrame`/`liveFrame`, `runningSnapshotRef` verified in full
- `src/audio/audioEngine.ts` — dual-anchor scheduling, `scheduleLeadIn`, `scheduleNextCue`, `phaseDurationSec` pattern verified in full
- `src/hooks/useAudioCues.ts` — `notifyPhaseBoundary`, `start(plan, timbre)`, re-anchor pattern verified in full
- `src/app/App.tsx` (lines 60-620) — `planRef`, `audioAnchorRef`, boundary effect formula verified in full
- `src/components/SettingsForm.tsx` — current settings surface structure verified
- `src/components/SettingsStepper.tsx` — `SettingsStepperProps<T>`, disabled/disableDecrease/disableIncrease props verified
- `src/components/SessionReadout.tsx` — current readout structure verified
- `src/storage/storage.ts` — `readEnvelope`/`writeEnvelope`, forward-compat read, refuse-downgrade write verified
- `src/storage/settings.ts` — `coerceSettings`/`loadSettings`/`saveSettings` pattern verified
- `src/content/strings.ts` — `UiStrings` interface, `settingsForm` slice, EN + PT-BR catalog verified
- `.planning/phases/22-bpm-stretch-session/22-CONTEXT.md` — all decisions D-01 through D-15 read in full
- `.planning/REQUIREMENTS.md` — STRETCH-01 through STRETCH-08 verified
- `package.json` — dependency list and test scripts verified
- `.planning/config.json` — `nyquist_validation: true`, `commit_docs: true` verified
- `npx vitest run` — 753 tests passing in 57 files confirmed

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — project decisions table confirms "zero net-new runtime deps" and "per-commit green-gate" constraints

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package.json; no new deps needed
- Architecture: HIGH — all integration points read from source; ramp design is the planner's discretion area from CONTEXT.md
- Pitfalls: HIGH — derived from careful reading of actual code paths in App.tsx + sessionMath.ts + audioEngine.ts
- Open questions: MEDIUM — identified from real contradictions and ambiguities in requirements vs context

**Research date:** 2026-05-15
**Valid until:** 2026-06-15 (stable codebase, no external deps)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STRETCH-01 | User can choose a BPM stretch session mode from the session settings surface | SettingsStepper pattern (Pattern 3); mode field on SessionSettings |
| STRETCH-02 | User can pick initialBpm and targetBpm from BPM_OPTIONS grid (1–7 in 0.5 increments) | BPM_OPTIONS verified in settings.ts; targetBpm constraint (Pattern 4) |
| STRETCH-03 | User can pick holdInitialSeconds (warm-up) and holdTargetSeconds (cool-down) | HOLD_SECONDS_OPTIONS + HOLD_TARGET_OPTIONS (Pattern 5) |
| STRETCH-04 | BPM walks from initialBpm to targetBpm in steps strictly < 0.5 BPM on one-clock SessionFrame | Piecewise-constant segment table (Pattern 1); step math example |
| STRETCH-05 | Session total = hold initial + ramp + hold target; open-ended at target hold | computeStretchTotalMs (Pattern 7); StretchSegment endMs = Infinity for open-ended |
| STRETCH-06 | Stretch mode disabled when computed total below 15-minute minimum gate | isStretchGateClear predicate (Pattern 7); D-10 threshold = 15 min |
| STRETCH-07 | Stretch settings persist via localStorage envelope (refuse-downgrade write, forward-compat read) | coerceSettings extension (Pattern 6); no STATE_KEY bump needed |
| STRETCH-08 | Audio cues remain phase-aligned across BPM steps via dual-anchor scheduling | StretchSessionFrame.cycleStartMs solves the boundary formula (Pattern 2 + Pitfall 2) |
</phase_requirements>

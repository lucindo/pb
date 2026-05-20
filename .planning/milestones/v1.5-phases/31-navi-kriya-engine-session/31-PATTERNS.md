# Phase 31: Navi Kriya Engine & Session — Pattern Map

**Mapped:** 2026-05-17
**Files analyzed:** 9 (7 new, 2 edited at significant depth; 2 lightweight edits)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/hooks/useNKEngine.ts` | hook | event-driven (setTimeout chain) | `src/hooks/useSessionEngine.ts` | role-match (rAF→setTimeout) |
| `src/hooks/useNKEngine.test.tsx` | test | — | `src/hooks/useSessionEngine.ts` (test pattern from existing suite) | role-match |
| `src/audio/nkCueSynth.ts` | utility | event-driven | `src/audio/cueSynth.ts` | exact |
| `src/components/NKSessionReadout.tsx` | component | request-response | `src/components/SessionReadout.tsx` | exact |
| `src/components/NKSessionReadout.test.tsx` | test | — | mirrors `NKSessionReadout.tsx` + `SessionReadout.tsx` pattern | exact |
| `src/components/NKShape.tsx` | component | request-response | `src/components/OrbShape.tsx` | exact |
| `src/components/SettingsForm.tsx` | component (edit) | request-response | itself — NK slot already present (line 201–221) | self-analog |
| `src/storage/practices.ts` | service (edit) | CRUD | itself — `recordResonantSession` at lines 128–158 | self-analog |
| `src/content/strings.ts` | config (edit) | — | itself — `UiStrings` interface at lines 12–155 | self-analog |
| `src/app/App.tsx` | controller (edit) | request-response | itself — `onStartClick` handler at lines 411–508 | self-analog |
| `src/storage/stats.ts` | service (edit) | CRUD | itself — `PersistedStats` / `coerceStats` at lines 12–74 | self-analog |

---

## Pattern Assignments

### `src/hooks/useNKEngine.ts` (hook, event-driven)

**Analog:** `src/hooks/useSessionEngine.ts`

**Imports pattern** (lines 1–14 of useSessionEngine.ts):
```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
```
NK engine only needs `useCallback, useEffect, useRef, useState` — no `useMemo`, no `RefObject` export.

**Core architecture** — stale-closure trap pattern (lines 77–159 of useSessionEngine.ts):
```typescript
// CRITICAL: useEffect dep array is [state.status] only — NOT re-created per frame.
// All per-tick values MUST be read from the mutable ref, never from closed-over state.
// This exact discipline applies to useNKEngine's stepOm — read eng.current, not closed state.

const eng   = useRef<NKEngineRecord | null>(null)
const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

// Only display triple goes into React state (causes re-renders):
const [nkPhase,   setNkPhase]   = useState<'idle' | 'front' | 'back' | 'done'>('idle')
const [nkRound,   setNkRound]   = useState(1)
const [nkCount,   setNkCount]   = useState(0)
const [nkRunning, setNkRunning] = useState(false)
```

**Cleanup pattern** (lines 154–158 of useSessionEngine.ts):
```typescript
return () => {
  cancelled = true
  cancelAnimationFrame(animationFrameId)
}
// NK analog: useEffect cleanup must call clearTimeout(timer.current)
// Spike-003 end() calls clearTimeout(timer.current) — same discipline.
```

**Export interface shape** (lines 37–65 of useSessionEngine.ts):
```typescript
// useSessionEngine returns a plain object:
return {
  state,
  currentFrame,
  liveFrame,
  runningSnapshotRef,
  setSelectedSettings,
  start,
  end,
  extendDuration,
}
// NK analog: return { nkPhase, nkRound, nkCount, nkRunning, start, pause, resume, end }
// Audio callbacks injected as NKAudioCallbacks parameter to start() — NOT imported into hook
```

**start() + stepOm() spike-003 pattern** (spike-003 lines 124–144):
```typescript
function start() {
  eng.current = {
    phase: 'front', round: 1, count: 0,
    frontCount, backCount, rounds, omMs: omSec * 1000, cueOn,
  }
  setPhase('front'); setRound(1); setCount(0); setRunning(true)
  audio.current.frontMarker()
  schedule(LEAD_MS)
}

function stepOm() {
  const e = eng.current          // NEVER read closed-over React state here
  e.count += 1
  setCount(e.count)
  if (e.cueOn) audio.current.tick()
  const tgt = e.phase === 'front' ? e.frontCount : e.backCount
  if (e.count < tgt) { schedule(e.omMs); return }
  if (e.phase === 'front') {
    e.phase = 'back'; e.count = 0
    setPhase('back'); setCount(0)
    audio.current.backMarker()
    schedule(LEAD_MS)
  } else if (e.round < e.rounds) {
    e.round += 1; e.phase = 'front'; e.count = 0
    setRound(e.round); setPhase('front'); setCount(0)
    audio.current.frontMarker()
    schedule(LEAD_MS)
  } else {
    e.phase = 'done'
    setPhase('done'); setRunning(false)
    audio.current.endCue()
  }
}
```

**pause / resume / end** (spike-003 lines 138–144):
```typescript
function pause()  { clearTimeout(timer.current); setRunning(false) }
function resume() { setRunning(true); schedule(eng.current.omMs) }
function end()    {
  clearTimeout(timer.current)
  setRunning(false); setPhase('idle'); setCount(0); setRound(1)
}
```

**NKEngineRecord type** (RESEARCH.md Pattern 1):
```typescript
interface NKEngineRecord {
  phase: 'front' | 'back' | 'done'
  round: number
  count: number
  frontCount: number
  backCount: number        // = frontCount / 4 — computed at start(), never re-derived
  rounds: number
  omMs: number             // omLengthMs = NK_OM_SECONDS[omLength] * 1000
  cueOn: boolean           // mirrors perOmCue at start(); mutated by toggleCue()
  startedAtMs: number      // performance.now() at start — for elapsed stats
  completedRounds: number  // incremented at back→front and at practice end
}
```

**OM_SECONDS constants** (RESEARCH.md Pattern 1 + CONTEXT D-09/D-10):
```typescript
// One object — keep adjustable per CONTEXT.md "Claude's Discretion"
const NK_OM_SECONDS: Record<OmLength, number> = {
  fast:   1.75,   // D-10
  medium: 2.16,   // D-09 — Forrest's authentic pace
  slow:   3.0,    // D-10
}
const NK_LEAD_MS   = 700   // D-11 seed — adjustable
const NK_SETTLE_MS = 3500  // D-11 settle before first frontMarker — adjustable (~3–5 s)
```

---

### `src/audio/nkCueSynth.ts` (utility, event-driven)

**Analog:** `src/audio/cueSynth.ts`

**File header / zero-import posture** (cueSynth.ts lines 1–18):
```typescript
// Pure Web Audio synthesis builders. Zero React imports.
import { TIMBRE_PRESETS, type TimbrePreset } from './timbres'
import type { TimbreId } from '../domain/settings'
```
nkCueSynth.ts imports the same two — no import from cueSynth.ts itself.

**CueHandle interface** (cueSynth.ts lines 69–73):
```typescript
export interface CueHandle {
  envelope: GainNode   // exposed for mute fade-out
  scheduledAt: number  // audioCtx.currentTime at strike
  cleanupAt: number    // when nodes can be GC'd
}
```
nkCueSynth.ts imports this type from cueSynth.ts: `import type { CueHandle } from './cueSynth'`

**scheduleTick reference pattern** (cueSynth.ts lines 229–261) — the per-OM tick is modeled after this:
```typescript
export function scheduleTick(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
): CueHandle {
  const osc = audioCtx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = TICK_FUNDAMENTAL_HZ  // 1200 Hz
  const filter = audioCtx.createBiquadFilter()
  // ... envelope: gain.setValueAtTime(peak, when); gain.setTargetAtTime(~0, when+0.001, tau)
  osc.start(when)
  osc.stop(when + TICK_TOTAL_DURATION_SEC)
  return { envelope, scheduledAt: when, cleanupAt: when + ... }
}
```
NK's `scheduleNKTick` is softer/shorter than this (D-07 "barely-there"), but follows identical node graph shape.

**scheduleInCueForTimbre / scheduleOutCueForTimbre dispatch pattern** (cueSynth.ts lines 184–203):
```typescript
export function scheduleInCueForTimbre(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
  phaseDurationSec?: number,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  return scheduleBowlCue(audioCtx, when, destination, preset, 'in', phaseDurationSec)
}
```
NK's four exported functions use the same `(audioCtx, when, destination, timbre) => CueHandle` signature. Each calls an internal private builder that reads `TIMBRE_PRESETS[timbre]`.

**Node graph + cleanup pattern** (cueSynth.ts lines 125–177):
```typescript
// oscillator → partialGain → filter → envelope → destination
// Disconnect via osc.addEventListener('ended', ..., { once: true })
for (let i = 0; i < oscillators.length; i++) {
  const osc = oscillators[i]
  const partialGain = partialGains[i]
  if (osc === undefined || partialGain === undefined) continue
  osc.addEventListener('ended', () => {
    try { osc.disconnect() } catch { /* silent */ }
    try { partialGain.disconnect() } catch { /* silent */ }
  }, { once: true })
}
const lastOsc = oscillators[oscillators.length - 1]
if (lastOsc !== undefined) {
  lastOsc.addEventListener('ended', () => {
    try { filter.disconnect() } catch { /* silent */ }
    try { envelope.disconnect() } catch { /* silent */ }
  }, { once: true })
}
```
All NK cue builders apply this same disconnect discipline.

**Spike-003 cue shapes** (spike-003 lines 53–57) — reference for pitches/durations, NOT the final synthesis:
```javascript
// Do NOT use these ad-hoc tones directly — they are spike prototypes.
// Use as pitch/duration reference only; proper synthesis via TimbrePreset.
tick:        () => tone(660, 0.12, 'sine', 0.12),
frontMarker: () => { tone(392, 0.30, 'triangle', 0.22); tone(523, 0.42, 'triangle', 0.22, 0.30) },
backMarker:  () => { tone(523, 0.30, 'triangle', 0.22); tone(392, 0.42, 'triangle', 0.22, 0.30) },
endCue:      () => { tone(261.6, 1.7, 'sine', 0.16); tone(329.6, 1.7, 'sine', 0.13); tone(392, 1.7, 'sine', 0.10) },
```
Rising two-tone (392→523 Hz) = frontMarker; falling (523→392 Hz) = backMarker; three-note chord = endCue.

---

### `src/components/NKSessionReadout.tsx` (component, request-response)

**Analog:** `src/components/SessionReadout.tsx`

**Imports pattern** (SessionReadout.tsx lines 1–6):
```typescript
import type { UiStrings } from '../content/strings'
// NK version adds: no SessionFrame, no formatDuration, no SessionStatus
// NK version only needs: UiStrings (for nkReadout sub-object)
```

**Outer container class** (SessionReadout.tsx line 47 / line 84) — byte-identical:
```typescript
<section
  aria-label={strings.nkReadout.readoutAriaLabel}
  aria-live="polite"   // NK addition: phase transitions announced
  className="mb-6 rounded-[1.75rem] border border-[var(--color-breathing-muted)] bg-[var(--color-breathing-bg-soft)]/80 p-5 text-center shadow-inner shadow-teal-900/5"
>
```

**Three-cell stretch row** (SessionReadout.tsx lines 100–127) — byte-identical container, three NK cells:
```typescript
<div
  aria-live="off"
  className="mt-4 flex items-stretch rounded-[1.25rem] bg-[var(--color-breathing-surface)]/80 px-2 py-3 text-[var(--color-breathing-accent-strong)]"
>
  {/* Cell 1: Phase */}
  <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)]">
      {strings.nkReadout.phaseLabel}        {/* "Phase" */}
    </span>
    <span className="text-lg font-semibold leading-none">
      {phase === 'front' ? strings.nkReadout.front : strings.nkReadout.back}
    </span>
  </div>
  <span className="w-px self-stretch bg-[var(--color-breathing-muted)]/40" />
  {/* Cell 2: Round */}
  <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)]">
      {strings.nkReadout.roundLabel}        {/* "Round" */}
    </span>
    <span className="text-lg font-semibold leading-none">
      {strings.nkReadout.roundOf(round, totalRounds)}   {/* "2 / 3" */}
    </span>
  </div>
  <span className="w-px self-stretch bg-[var(--color-breathing-muted)]/40" />
  {/* Cell 3: Count (target) */}
  <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-breathing-muted)]">
      {strings.nkReadout.countLabel}        {/* "Count" */}
    </span>
    <span className="text-lg font-semibold leading-none">
      {String(target)}
    </span>
  </div>
</div>
```

**Props interface shape:**
```typescript
export interface NKSessionReadoutProps {
  phase: 'front' | 'back'
  round: number
  totalRounds: number
  target: number         // target OM count for current phase
  strings: UiStrings['nkReadout']
}
```

---

### `src/components/NKShape.tsx` (component, request-response)

**Analog:** `src/components/OrbShape.tsx`

**OrbLeadIn digit rendering** (OrbShape.tsx lines 202–212) — model for NK count number inside orb:
```typescript
<span
  className="relative z-10 text-7xl font-semibold tracking-tight text-[var(--color-breathing-accent-strong)] sm:text-8xl"
  style={{ color: 'var(--color-orb-in-text)' }}
>
  {digit}
</span>
```
NK count: same class + color token, but content is `nkCount` (an integer, not a 1-2-3 digit).
UI-SPEC confirms: `text-7xl sm:text-8xl font-semibold tracking-tight` + `color: var(--color-orb-in-text)`.

**Orb locked at MID_SCALE** (OrbShape.tsx lines 183–190) — NK holds MID_SCALE throughout:
```typescript
import { MIN_SCALE, MAX_SCALE, MID_SCALE } from './shapeConstants'
// ...
transform: `translate3d(0,0,0) scale(${String(MID_SCALE)})`,
// Only orb-layer--in rendered (no layer--out) — NK shape does not crossfade
```

**data-variant attribute** (OrbShape.tsx line 53, OrbLeadIn line 152):
```typescript
data-variant="orb"    // NK: data-variant={variant} where variant is 'orb'|'square'|'diamond'
```

**aria-label** (OrbLeadIn line 150):
```typescript
aria-label={strings.leadInAriaLabel(digit)}
// NK analog: aria-label={`Navi Kriya session: OM ${count}, phase ${phaseLabel}`}
```

**CSS pulse animation** (new, NK-only — UI-SPEC lines 176–190):
```css
@keyframes nk-om-pulse {
  0%   { transform: translate3d(0,0,0) scale(var(--orb-scale-mid)); }
  30%  { transform: translate3d(0,0,0) scale(var(--orb-scale-max)); }
  100% { transform: translate3d(0,0,0) scale(var(--orb-scale-mid)); }
}
.nk-om-pulse {
  animation: nk-om-pulse 500ms ease-out forwards;
}
@media (prefers-reduced-motion: reduce) {
  .nk-om-pulse { animation: none; }
}
```
Added to `src/index.css` or a component CSS module. The `key` prop change on the wrapper triggers remount → animation restart.

**Props interface:**
```typescript
export interface NKShapeProps {
  variant: VisualVariantId       // 'orb' | 'square' | 'diamond'
  count: number                  // live OM count (0 during settle)
  isPaused?: boolean             // dims count to opacity-50 when true
  strings: UiStrings['breathing'] // reuses same breathing aria strings
}
// key={`nk-${String(count)}`} set by App.tsx caller, not inside the component
```

**usePrefersReducedMotion** (OrbShape.tsx line 33):
```typescript
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
// ...
const reducedMotion = usePrefersReducedMotion()
// NK: if reducedMotion → omit .nk-om-pulse class, hold MID_SCALE static
```

---

### `src/components/SettingsForm.tsx` (component edit, request-response)

**Self-analog:** The NK empty slot at lines 201–221 is replaced with real controls.

**NK branch structure** (SettingsForm.tsx lines 201–221 — current stub to replace):
```typescript
) : (
  // Phase 31 fills this slot with real NK controls
  <>
    <div aria-label="Practice controls — coming soon" ...>
      {practiceStrings.naviKriyaControlsPlaceholder}
    </div>
    <button type="button" disabled ...>
      {startSessionLabel}
    </button>
  </>
)}
```

**SettingsStepper usage pattern** (SettingsForm.tsx lines 110–198) — copy for NK steppers:
```typescript
<SettingsStepper
  label={strings.settingsForm.bpmLabel}
  value={settings.bpm}
  options={BPM_OPTIONS}
  formatValue={formatBpm}
  onChange={(bpm) => { updateSettings({ bpm }) }}
  disabled={isRunning}          // NK: all steppers disabled={isRunning} except perOmCue
  strings={strings.settingsForm.stepper}
/>
```

**Start button class** (SettingsForm.tsx lines 214–218 — existing disabled stub):
```typescript
className="mt-6 min-h-11 w-full rounded-full bg-[var(--color-breathing-accent-strong)] px-6 py-4 text-lg font-semibold text-[var(--color-breathing-on-accent)] shadow-lg shadow-teal-900/20 transition hover:bg-[var(--color-breathing-accent)] active:bg-[var(--color-breathing-accent-strong)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
// When active (not disabled): drop `opacity-50 cursor-not-allowed`
```

**Props additions for NK:**
```typescript
// Phase 31 additions to SettingsFormProps:
nkSettings: NaviKriyaSettings
onNKSettingsChange(this: void, settings: NaviKriyaSettings): void
onNKStartClick(this: void): void
isNKSessionRunning: boolean    // disables steppers
```

**Duration estimate line** (UI-SPEC lines 251–255):
```typescript
// Below last stepper, aria-live="polite":
<p
  aria-live="polite"
  className="text-sm text-center text-[var(--color-breathing-muted)]"
>
  {strings.nkControls.estimatedDuration(estimatedMinutes)}
</p>
// estimatedMinutes = Math.round(rounds * (frontCount + frontCount/4) * omMs / 60000)
```

---

### `src/storage/practices.ts` (service edit, CRUD)

**Self-analog:** `recordResonantSession` at lines 128–158 is the direct model.

**recordResonantSession pattern** (practices.ts lines 128–158):
```typescript
export function recordResonantSession(
  elapsedMs: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  const stats = practices.resonant.stats
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) { return stats }
  if (!isComplete && elapsedMs < COUNT_THRESHOLD_MS) { return stats }
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const now = deps.now ?? Date.now
  const next: PersistedStats = {
    totalSessions: stats.totalSessions + 1,
    totalElapsedSeconds: stats.totalElapsedSeconds + elapsedSeconds,
    lastSessionAtMs: now(),
    lastSessionDurationSeconds: elapsedSeconds,
  }
  writeEnvelope(
    { ...env, practices: { ...practices, resonant: { ...practices.resonant, stats: next } } },
    deps,
  )
  return next
}
```

**NK version** adds `roundsCompleted` field (RESEARCH Pattern 4):
```typescript
export function recordNaviKriyaSession(
  elapsedMs: number,
  roundsCompleted: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  // ... same guards, same elapsedSeconds computation ...
  const next: PersistedStats = {
    ...stats,
    totalSessions: stats.totalSessions + 1,
    totalElapsedSeconds: stats.totalElapsedSeconds + elapsedSeconds,
    lastSessionAtMs: now(),
    lastSessionDurationSeconds: elapsedSeconds,
    roundsCompleted: (stats.roundsCompleted ?? 0) + roundsCompleted,  // NK-only field
  }
  writeEnvelope(
    { ...env, practices: { ...practices, naviKriya: { ...practices.naviKriya, stats: next } } },
    deps,
  )
  return next
}
```

---

### `src/storage/stats.ts` (service edit, CRUD)

**Self-analog:** `PersistedStats` interface at lines 12–18 and `coerceStats` at lines 64–74.

**PersistedStats extension** (stats.ts lines 12–18):
```typescript
// Current:
export interface PersistedStats {
  totalSessions: number
  totalElapsedSeconds: number
  lastSessionAtMs: number | null
  lastSessionDurationSeconds: number | null
}
// Phase 31 addition (optional — backward-compatible):
  roundsCompleted?: number    // NK only; resonant always undefined → coerces to 0
```

**coerceStats extension** (stats.ts lines 64–74) — add one line:
```typescript
export function coerceStats(raw: unknown): PersistedStats {
  const r = ...
  return {
    totalSessions:              isFiniteNonNegativeInt(r.totalSessions) ? r.totalSessions : 0,
    totalElapsedSeconds:        isFiniteNonNegativeInt(r.totalElapsedSeconds) ? r.totalElapsedSeconds : 0,
    lastSessionAtMs:            isFiniteNonNegativeNumberOrNull(r.lastSessionAtMs) ? r.lastSessionAtMs : null,
    lastSessionDurationSeconds: isFiniteNonNegativeIntOrNull(r.lastSessionDurationSeconds) ? r.lastSessionDurationSeconds : null,
    // Phase 31 addition:
    roundsCompleted:            isFiniteNonNegativeInt(r.roundsCompleted) ? r.roundsCompleted : undefined,
  }
}
```

**ZERO_STATS** (stats.ts lines 26–31) — no change required; `roundsCompleted` optional so omitting it from ZERO_STATS is valid.

---

### `src/content/strings.ts` (config edit)

**Self-analog:** The `practice` sub-object added in Phase 30 (lines 144–154) is the pattern for adding new sub-objects.

**How to add new sub-object** (strings.ts lines 144–154 pattern):
```typescript
// In UiStrings interface — add after existing `practice`:
readonly nkReadout: {
  readonly readoutAriaLabel: string
  readonly phaseLabel: string
  readonly front: string
  readonly back: string
  readonly roundLabel: string
  readonly countLabel: string
  readonly roundOf: (current: number, total: number) => string
}
readonly nkControls: {
  readonly roundsLabel: string
  readonly frontCountLabel: string
  readonly omLengthLabel: string
  readonly omLengthFast: string
  readonly omLengthMedium: string
  readonly omLengthSlow: string
  readonly perOmCueLabel: string
  readonly perOmCueOn: string
  readonly perOmCueOff: string
  readonly estimatedDuration: (minutes: number) => string
}
readonly nkCompletion: {
  readonly title: string
  readonly roundsCompleted: (n: number, total: number) => string
  readonly sessionDuration: (minutes: number) => string
  readonly close: string
}
```

**EN values pattern** — each `en:` block entry in `UI_STRINGS` mirrors the type shape. PT-BR block must also be extended (as `null`-safe stubs since Phase 32 does the real translation; copy EN values for now to keep PT-BR locale functional).

---

### `src/app/App.tsx` (controller edit, request-response)

**Self-analog:** The resonant `onStartClick` at lines 411–508 is the model for `onNKStartClick`.

**CR-01 fix** (App.tsx line 329 — one-line change):
```typescript
// Before:
const persistedSetSettings = useCallback((next: SessionSettings) => {
  sessionSetSelectedSettings(next)
  saveSettings(next)          // <-- legacy flat write
}, [sessionSetSelectedSettings])

// After:
const persistedSetSettings = useCallback((next: SessionSettings) => {
  sessionSetSelectedSettings(next)
  saveResonantSettings(next)  // CR-01: write to practices.resonant.settings
}, [sessionSetSelectedSettings])
```

**NK session state vars** — add alongside existing resonant state:
```typescript
// Alongside existing: const [resonantStats, setResonantStats] = useState(...)
const [nkSettings, setNkSettings] = useState<NaviKriyaSettings>(
  () => initialPractices.naviKriya.settings
)
// nkEngine return values:
const { nkPhase, nkRound, nkCount, nkRunning, start: nkStart, ... } = useNKEngine()
```

**onNKStartClick** — modeled on `onStartClick` (App.tsx lines 411–508):
```typescript
// Pattern: synchronous AudioContext creation BEFORE any await
const onNKStartClick = useCallback(() => {
  // 1. Create AudioContext synchronously (browser autoplay policy — RESEARCH Pitfall 2)
  const audioCtx = new AudioContext()
  // 2. Capture timbre from prefs (mirrors line 465)
  const capturedTimbre = loadPrefs().timbre
  // 3. Capture variant (mirrors lines 442–443)
  sessionVariantRef.current = liveVariant
  setSessionVariant(liveVariant)
  // 4. Wake lock (mirrors line 454)
  void wakeLockRequest()
  // 5. Settle setTimeout — then frontMarker → LEAD_MS → engine.start()
  const settleTimer = window.setTimeout(() => {
    scheduleNKFrontMarker(audioCtx, audioCtx.currentTime, audioCtx.destination, capturedTimbre)
    window.setTimeout(() => {
      nkStart(nkSettings, {
        frontMarker: () => scheduleNKFrontMarker(audioCtx, audioCtx.currentTime, audioCtx.destination, capturedTimbre),
        backMarker:  () => scheduleNKBackMarker(audioCtx, audioCtx.currentTime, audioCtx.destination, capturedTimbre),
        tick:        () => scheduleNKTick(audioCtx, audioCtx.currentTime, audioCtx.destination, capturedTimbre),
        endCue:      () => scheduleNKEndChord(audioCtx, audioCtx.currentTime, audioCtx.destination, capturedTimbre),
      })
    }, NK_LEAD_MS)
  }, NK_SETTLE_MS)
}, [liveVariant, nkSettings, nkStart, wakeLockRequest, ...])
```

**NK session screen render branch** (App.tsx JSX — follows activePractice guard pattern at line 805):
```typescript
{activePractice === 'naviKriya' && nkPhase !== 'idle' && (
  <>
    <NKShape
      key={`nk-${String(nkCount)}`}    // key change restarts CSS pulse animation per OM
      variant={sessionVariant ?? liveVariant}
      count={nkCount}
      isPaused={!nkRunning}
      strings={uiStrings.breathing}
    />
    <NKSessionReadout
      phase={nkPhase === 'front' || nkPhase === 'back' ? nkPhase : 'front'}
      round={nkRound}
      totalRounds={nkSettings.rounds}
      target={nkPhase === 'front' ? nkSettings.frontCount : nkSettings.frontCount / 4}
      strings={uiStrings.nkReadout}
    />
    <SessionControls
      status={nkRunning ? 'running' : 'idle'}
      onStart={onNKPauseResumeClick}
      onEnd={onNKEndClick}
      strings={uiStrings.controls}
      // ... mute passthrough
    />
  </>
)}
```

**NK stats leave-running effect** — mirrors the resonant leave-running cleanup effect (App.tsx ~lines 600–679):
```typescript
// When nkPhase transitions to 'done' or user ends early:
// recordNaviKriyaSession(elapsedMs, completedRounds, isComplete)
// setNaviKriyaStats(newStats)
// void wakeLockRelease()
// sessionVariantRef.current = null; setSessionVariant(null)
```

---

### `src/components/EndSessionDialog.tsx` (component edit, request-response)

**Self-analog:** The existing `EndSessionDialogProps` interface and JSX (lines 5–99).

**Optional body prop addition** (UI-SPEC §4 option a):
```typescript
// Add to EndSessionDialogProps:
body?: React.ReactNode    // NK completion dialog summary; undefined for early-end dialog

// In JSX, after <h2>:
{props.body ? <div className="text-sm text-[var(--color-breathing-muted)]">{props.body}</div> : null}
```
Natural-completion dialog: passes `body` with rounds/duration summary strings.
Early-end dialog: passes no `body` — behaves identically to today.

---

## Shared Patterns

### useRef + mutable record (stale-closure prevention)
**Source:** `src/hooks/useSessionEngine.ts` lines 77–90
**Apply to:** `src/hooks/useNKEngine.ts`
```typescript
// AH-WR-05 INVARIANT — STALE-CLOSURE TRAP: effect dep array is intentionally
// minimal so the callback is NOT re-created on every state update. Every value
// the callback needs MUST be read from a mutable ref — never from closed-over state.
const eng = useRef<NKEngineRecord | null>(null)
// All values stepOm reads come from eng.current — never from useState-derived vars
```

### AudioContext user-gesture constraint
**Source:** `src/app/App.tsx` line 456 comment ("D-09: AudioContext is constructed inside this user-gesture-derived chain"), `src/audio/audioEngine.ts` (referenced as line 122 comment)
**Apply to:** `src/app/App.tsx` `onNKStartClick`
```typescript
// Create new AudioContext() SYNCHRONOUSLY inside the onClick handler.
// Do NOT defer to setTimeout or async callback — that breaks the gesture chain.
// RESEARCH Pitfall 2 — verified from audioEngine.ts D-09 comment.
```

### CueHandle node graph + AUDIO-04 cleanup
**Source:** `src/audio/cueSynth.ts` lines 150–177
**Apply to:** `src/audio/nkCueSynth.ts` (all four cue builders)
```typescript
// osc.addEventListener('ended', () => { try { osc.disconnect() } catch {} }, { once: true })
// lastOsc.addEventListener('ended', () => { try { filter.disconnect() } catch {} }, { once: true })
```

### coerceStats per-field non-throwing validation
**Source:** `src/storage/stats.ts` lines 64–74
**Apply to:** `src/storage/stats.ts` (roundsCompleted addition) and `src/storage/practices.ts`
```typescript
// Always: typeof v === 'number' && Number.isFinite(v) && v >= 0 && Number.isInteger(v)
// Never throw — a bad field returns the default (0 or null), rest of the record survives.
```

### TimbrePreset dispatch — TIMBRE_PRESETS[timbre] lookup
**Source:** `src/audio/cueSynth.ts` lines 184–193, `src/audio/timbres.ts` lines 29–60
**Apply to:** `src/audio/nkCueSynth.ts`
```typescript
const preset = TIMBRE_PRESETS[timbre]
// preset.fundamentalHzIn / fundamentalHzOut / decayTauIn / decayTauOut / partials
// Use preset.fundamentalHzOut as the lower tone, fundamentalHzIn as the higher tone
// (rising = Out→In; falling = In→Out — D-06 directional pattern)
```

### strings.ts sub-object + PT-BR parity
**Source:** `src/content/strings.ts` lines 144–154 (`practice` sub-object), lines 157+ (en/pt-BR entries)
**Apply to:** `src/content/strings.ts` (three new sub-objects: nkReadout, nkControls, nkCompletion)
```typescript
// Add to UiStrings interface AND to both en: and pt-BR: blocks in UI_STRINGS.
// PT-BR uses EN values as stubs this phase (Phase 32 provides real translations).
```

### SettingsStepper disabled while running
**Source:** `src/components/SettingsForm.tsx` lines 99, 113, 124 (`disableDecrease={isRunning}`, `disabled={isRunning}`)
**Apply to:** `src/components/SettingsForm.tsx` NK branch
```typescript
// All NK steppers: disabled={isNKSessionRunning}
// Exception: perOmCue toggle is NOT disabled during a session — eng.current.cueOn
// is mutated directly (stale-closure-safe). This distinction must be documented.
```

### Wake lock reuse
**Source:** `src/app/App.tsx` lines 319–320, 428, 454
**Apply to:** `src/app/App.tsx` `onNKStartClick` / NK leave-running cleanup
```typescript
const wakeLockRequest = wakeLock.request
const wakeLockRelease = wakeLock.release
// onNKStartClick: void wakeLockRequest()
// NK session end: void wakeLockRelease()
// Idempotent — safe to call even if no lock held
```

---

## No Analog Found

All files have close codebase analogs. No entries.

---

## Metadata

**Analog search scope:** `src/hooks/`, `src/audio/`, `src/components/`, `src/storage/`, `src/content/`, `src/app/`, `.claude/skills/spike-findings-hrv/sources/003-navi-kriya-practice/`
**Files read for pattern extraction:** 15
**Pattern extraction date:** 2026-05-17

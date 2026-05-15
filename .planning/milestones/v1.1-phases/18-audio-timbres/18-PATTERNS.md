# Phase 18: Audio Timbres - Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 13 (NEW/EDIT per CONTEXT.md §Phase Boundary items 1-13)
**Analogs found:** 12 / 13 (1 new with no codebase analog — `src/audio/timbres.ts` is a pure-data module; nearest analog is the module-level constants block in `cueSynth.ts`)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/audio/timbres.ts` (NEW) | pure-data module | n/a (constants only) | `src/audio/cueSynth.ts` lines 11-27 (module-level constants block) | partial — same module style, data shape has no direct match |
| `src/audio/cueSynth.ts` (EDIT) | audio synthesis | event-driven | self (parameterize existing function) | self-edit |
| `src/audio/audioEngine.ts` (EDIT) | audio service | request-response | self (extend `AudioEngineOptions` + two forwarding sites) | self-edit |
| `src/hooks/useAudioCues.ts` (EDIT) | hook | event-driven | self — mirror `mutedRef` at lines 99-102; `reconstructEngine` line 292 | self-edit |
| `src/components/TimbrePicker.tsx` (EDIT) | component | request-response | `src/components/ThemePicker.tsx` (verbatim mirror) | exact |
| `src/hooks/useTimbreChoice.ts` (NEW) | hook | request-response | `src/hooks/useVariantChoice.ts` (verbatim mirror) | exact |
| `src/app/App.tsx` (EDIT) | app shell | request-response | self — lines 328-333 `sessionVariantRef.current = liveVariant` site | self-edit |
| `src/audio/timbres.test.ts` (NEW) | test | n/a | `src/audio/cueSynth.test.ts` (FakeAudioContext + assertion style) | role-match |
| `src/audio/cueSynth.test.ts` (EXTENDED) | test | n/a | self | self-edit |
| `src/audio/audioEngine.test.ts` (EXTENDED) | test | n/a | self | self-edit |
| `src/hooks/useAudioCues.test.tsx` (EXTENDED) | test | n/a | self | self-edit |
| `src/components/TimbrePicker.test.tsx` (EXTENDED) | test | n/a | self | self-edit |
| `src/hooks/useTimbreChoice.test.ts` (NEW) | test | n/a | `src/hooks/useVariantChoice.test.ts` (verbatim mirror) | exact |

---

## Pattern Assignments

### `src/audio/timbres.ts` (NEW — pure-data module)

**Analog:** `src/audio/cueSynth.ts` lines 11-27 (module-level constants — values to migrate verbatim into Bowl preset)

**Module-level constant block to migrate into Bowl preset** (`cueSynth.ts` lines 11-27):
```typescript
const IN_FUNDAMENTAL_HZ = 440 // A4
const OUT_FUNDAMENTAL_HZ = 220 // A3
const PEAK_GAIN = 0.18 // master peak, well below 1.0 for headroom

const PARTIALS: ReadonlyArray<{ ratio: number; gain: number }> = [
  { ratio: 1.0, gain: 1.0 },
  { ratio: 2.76, gain: 0.4 },
  { ratio: 5.4, gain: 0.15 },
]

const IN_DECAY_TIME_CONSTANT = 1.4
const OUT_DECAY_TIME_CONSTANT = 1.8
const FILTER_FREQ_HZ = 3000
const FILTER_Q = 0.5
```

**New file structure to write:**
```typescript
// src/audio/timbres.ts
// Pure data module — zero React imports. Exports TimbrePreset interface and
// TIMBRE_PRESETS record. All DSP recipes live here; cueSynth reads the preset at
// call time. Bowl preset values are the cueSynth.ts module-level constants verbatim
// (TIMBRE-02 byte-identical proof: git diff shows a move, not a change).

import type { TimbreId } from '../domain/settings'
import { TIMBRE_OPTIONS } from '../domain/settings'

export interface TimbrePreset {
  fundamentalHzIn: number
  fundamentalHzOut: number
  partials: ReadonlyArray<{ ratio: number; gain: number }>
  decayTauIn: number
  decayTauOut: number
  filterFreqHz: number
  filterQ: number
  peakGain: number
  oscillatorType: OscillatorType
}

export const TIMBRE_PRESETS: Readonly<Record<TimbreId, TimbrePreset>> = {
  bowl: {
    fundamentalHzIn: 440,     // verbatim IN_FUNDAMENTAL_HZ
    fundamentalHzOut: 220,    // verbatim OUT_FUNDAMENTAL_HZ
    partials: [
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.76, gain: 0.4 },
      { ratio: 5.4, gain: 0.15 },
    ],                        // verbatim PARTIALS
    decayTauIn: 1.4,          // verbatim IN_DECAY_TIME_CONSTANT
    decayTauOut: 1.8,         // verbatim OUT_DECAY_TIME_CONSTANT
    filterFreqHz: 3000,       // verbatim FILTER_FREQ_HZ
    filterQ: 0.5,             // verbatim FILTER_Q
    peakGain: 0.18,           // verbatim PEAK_GAIN
    oscillatorType: 'sine',
  },
  bell: { /* D-03 values */ },
  sine: { /* D-04 values */ },
  chime: { /* D-05 values */ },
} as const
```

**Invariants to preserve:**
- Bowl preset values must be a byte-for-byte copy of the module-level constants being removed from `cueSynth.ts` — TIMBRE-02 proof.
- All four presets: `fundamentalHzIn === 440` and `fundamentalHzOut === 220` — TIMBRE-05. A test in `timbres.test.ts` guards this (D-21).
- `OscillatorType = 'sine'` for all 4 presets — no PeriodicWave (D-14).
- File has zero React imports (mirrors `cueSynth.ts` zero-React posture, line 1 comment).

---

### `src/audio/cueSynth.ts` (EDIT — parameterize `scheduleBowlCue`)

**Analog:** self — the function to be parameterized is already at lines 74-171.

**Current `scheduleBowlCue` signature** (`cueSynth.ts` lines 74-81) — replace loose args with `TimbrePreset`:
```typescript
// CURRENT (to be replaced):
function scheduleBowlCue(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  fundamentalHz: number,
  defaultDecayTau: number,
  phaseDurationSec?: number,
): CueHandle {
```

**Partials loop** (`cueSynth.ts` lines 121-137) — `PARTIALS` becomes `preset.partials`; `fundamentalHz` becomes the in/out value from the preset:
```typescript
  for (const partial of PARTIALS) {          // PARTIALS → preset.partials
    const osc = audioCtx.createOscillator()
    osc.type = 'sine'                         // 'sine' → preset.oscillatorType
    osc.frequency.value = fundamentalHz * partial.ratio

    const partialGain = audioCtx.createGain()
    partialGain.gain.value = partial.gain

    osc.connect(partialGain)
    partialGain.connect(filter)
    osc.start(when)
    osc.stop(stopAt)
    oscillators.push(osc)
    partialGains.push(partialGain)
  }
```

**Filter + envelope instantiation** (`cueSynth.ts` lines 90-100) — `FILTER_FREQ_HZ`, `FILTER_Q`, `PEAK_GAIN`, `defaultDecayTau` become preset fields:
```typescript
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = FILTER_FREQ_HZ    // → preset.filterFreqHz
  filter.Q.value = FILTER_Q                  // → preset.filterQ

  const envelope = audioCtx.createGain()
  envelope.gain.setValueAtTime(PEAK_GAIN, when)  // → preset.peakGain
  const decayTarget = needsSustain ? PEAK_GAIN * SUSTAIN_FLOOR_RATIO : NEAR_SILENCE
  envelope.gain.setTargetAtTime(decayTarget, when + STRIKE_RAMP_OFFSET, defaultDecayTau)
```

**New dispatch functions to add** (after the parameterized `scheduleBowlCue`, replacing or wrapping current `scheduleInCue`/`scheduleOutCue`):
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

export function scheduleOutCueForTimbre(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
  phaseDurationSec?: number,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  return scheduleBowlCue(audioCtx, when, destination, preset, 'out', phaseDurationSec)
}
```

**Existing thin wrappers** (`cueSynth.ts` lines 173-203) — keep as Bowl-only wrappers (option (a) per D-01 — smaller diff, TIMBRE-02 signature-stability proof):
```typescript
export function scheduleInCue(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  phaseDurationSec?: number,
): CueHandle {
  return scheduleInCueForTimbre(audioCtx, when, destination, 'bowl', phaseDurationSec)
}

export function scheduleOutCue(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  phaseDurationSec?: number,
): CueHandle {
  return scheduleOutCueForTimbre(audioCtx, when, destination, 'bowl', phaseDurationSec)
}
```

**`scheduleTick` — unchanged** (`cueSynth.ts` lines 205-236). D-07 hard invariant.

**Sustain-floor module-level constants — unchanged** (`cueSynth.ts` lines 52-56):
```typescript
const PERCEPTUAL_SILENCE_TAU_MULT = 3
const SUSTAIN_FLOOR_RATIO = 0.15
const PHASE_END_FADE_OUT_TAU = 0.05
const PHASE_END_FADE_OUT_LEAD_SEC = 0.2
const NEAR_SILENCE = 0.0001
```
These are shared across all 4 timbres (D-12). Per-timbre sustain threshold auto-derives from `preset.decayTauIn/Out × PERCEPTUAL_SILENCE_TAU_MULT`.

**Invariants to preserve:**
- Module-level `IN_FUNDAMENTAL_HZ`, `OUT_FUNDAMENTAL_HZ`, `PARTIALS`, `IN_DECAY_TIME_CONSTANT`, `OUT_DECAY_TIME_CONSTANT`, `FILTER_FREQ_HZ`, `FILTER_Q`, `PEAK_GAIN` constants are DELETED (moved to `TIMBRE_PRESETS.bowl`). The numeric values themselves are unchanged.
- Sustain-floor constants (`PERCEPTUAL_SILENCE_TAU_MULT` etc.) remain module-level — shared across all timbres.
- `scheduleTick` body is untouched line-by-line.
- `scheduleInCue`/`scheduleOutCue` public signatures are preserved (backward compat for existing callers in `audioEngine.ts` that haven't yet migrated; TIMBRE-02 proof).

---

### `src/audio/audioEngine.ts` (EDIT — add `timbre: TimbreId` to options + two forwarding sites)

**Analog:** self.

**`AudioEngineOptions` extension** (`audioEngine.ts` lines 59-66) — add `timbre`:
```typescript
export interface AudioEngineOptions {
  /** Plan 06 D-36: receives every audioCtx.state transition. */
  onStateChange?: (state: AudioContextState | 'interrupted') => void
  // Phase 18 D-08: timbre captured at session start; engine never re-reads prefs.
  timbre: TimbreId  // NEW — required; caller passes the snapshot from useAudioCues.start()
}
```

**`createAudioEngine` — capture timbre at construction** (add after existing `let muted = false` setup, before the `engine` object literal):
```typescript
// Phase 18 D-08: capture timbre once at construction. No setter exposed.
const sessionTimbre = opts.timbre  // immutable for this engine's lifetime
```

**`scheduleLeadIn` forwarder** (`audioEngine.ts` lines 155-173) — replace `scheduleInCue(...)` with `scheduleInCueForTimbre(...)`:
```typescript
// CURRENT (line 170):
activeCues.add(scheduleInCue(audioCtx, firstInCueTime, audioCtx.destination, firstInPhaseDurationSec))
// REPLACE WITH:
activeCues.add(scheduleInCueForTimbre(audioCtx, firstInCueTime, audioCtx.destination, sessionTimbre, firstInPhaseDurationSec))
```

**`scheduleNextCue` forwarder** (`audioEngine.ts` lines 175-188) — replace `scheduleInCue`/`scheduleOutCue` with timbre-dispatching variants:
```typescript
// CURRENT (lines 183-186):
const cue =
  newPhase === 'in'
    ? scheduleInCue(audioCtx, clampedAudioTime, audioCtx.destination, phaseDurationSec)
    : scheduleOutCue(audioCtx, clampedAudioTime, audioCtx.destination, phaseDurationSec)
// REPLACE WITH:
const cue =
  newPhase === 'in'
    ? scheduleInCueForTimbre(audioCtx, clampedAudioTime, audioCtx.destination, sessionTimbre, phaseDurationSec)
    : scheduleOutCueForTimbre(audioCtx, clampedAudioTime, audioCtx.destination, sessionTimbre, phaseDurationSec)
```

**Import block update** (`audioEngine.ts` line 23) — add new dispatch functions and `TimbreId`:
```typescript
// CURRENT:
import { scheduleInCue, scheduleOutCue, scheduleTick, type CueHandle } from './cueSynth'
// REPLACE WITH:
import { scheduleInCueForTimbre, scheduleOutCueForTimbre, scheduleTick, type CueHandle } from './cueSynth'
import type { TimbreId } from '../domain/settings'
```

**Invariants to preserve:**
- No `setTimbre()` method on `AudioEngine` — capture-at-construction is the only mutation path (D-08/D-10).
- `scheduleTick` call sites (`scheduleLeadIn` lines 162-164) are untouched — tick stays fixed per D-07.
- All other `AudioEngine` interface methods unchanged.

---

### `src/hooks/useAudioCues.ts` (EDIT — add `timbreRef` parallel to `mutedRef`)

**Analog:** self — the `mutedRef` pattern at lines 99-102 is the verbatim template.

**`mutedRef` pattern to clone** (`useAudioCues.ts` lines 99-102):
```typescript
const mutedRef = useRef<boolean>(initialMuted ?? false)
useEffect(() => {
  mutedRef.current = muted
}, [muted])
```

**New `timbreRef` — add immediately after `mutedRef` block** (after line 102):
```typescript
// Phase 18 D-08: mirror of mutedRef — captures the session timbre synchronously
// before any await in start() and reconstructEngine(). Never read by render path.
const timbreRef = useRef<TimbreId>(DEFAULT_TIMBRE)
// No useEffect mirror needed — timbreRef is only ever set synchronously inside start()
// and read synchronously inside reconstructEngine(). Unlike mutedRef, there is no
// React state that drives it; App.tsx passes the snapshot directly to start().
```

**`start` signature change + pre-await capture** (`useAudioCues.ts` lines 203-245) — add `timbre` parameter and capture before first `await`:
```typescript
// CURRENT signature (line 204):
async (plan: BreathingPlan): Promise<number | null> => {
// NEW signature:
async (plan: BreathingPlan, timbre: TimbreId): Promise<number | null> => {

// CURRENT (around line 216, just before createAudioEngine call):
const engine = await createAudioEngine({ onStateChange: handleStateChange })
// NEW — capture timbre synchronously BEFORE the await (mirror of mutedRef pre-await posture):
timbreRef.current = timbre   // ← synchronous, before any await
const engine = await createAudioEngine({ timbre, onStateChange: handleStateChange })
```

**`reconstructEngine` — read `timbreRef.current` synchronously before first await** (`useAudioCues.ts` lines 282-344):

Mirror of `const currentMuted = mutedRef.current` at line 292:
```typescript
// CURRENT (lines 292):
const currentMuted = mutedRef.current
// ADD immediately after (before engineRef.current = null at line 295):
const currentTimbre = timbreRef.current   // D-11: capture session's original timbre before any await

// Then pass to createAudioEngine (line 303):
// CURRENT:
newEngine = await createAudioEngine({ onStateChange: handleStateChange })
// NEW:
newEngine = await createAudioEngine({ timbre: currentTimbre, onStateChange: handleStateChange })
```

**`UseAudioCues` interface update** (`useAudioCues.ts` lines 36-69) — update `start` signature:
```typescript
// CURRENT (line 45):
start(this: void, plan: BreathingPlan): Promise<number | null>
// NEW:
start(this: void, plan: BreathingPlan, timbre: TimbreId): Promise<number | null>
```

**Import additions** (top of file):
```typescript
import type { TimbreId } from '../domain/settings'
import { DEFAULT_TIMBRE } from '../domain/settings'
```

**Invariants to preserve:**
- `timbreRef` follows the EXACT same structural posture as `mutedRef` (lines 99-102): `useRef` initialized with the default, synchronous capture in `start()` before any `await`, synchronous read in `reconstructEngine()` before any `await`.
- Reconstruction NEVER re-reads `loadPrefs()` for timbre — it reads `timbreRef.current` exclusively (D-11).
- Generation-counter logic (`reconstructGenerationRef`) at lines 283-284 is untouched.
- `engineRef.current = null` synchronous-null posture before the `await` (lines 295-299) is untouched.

---

### `src/components/TimbrePicker.tsx` (EDIT — fill stub body, mirror `ThemePicker.tsx`)

**Analog:** `src/components/ThemePicker.tsx` (lines 1-53) — verbatim mirror with `theme` → `timbre`, `THEME_OPTIONS` → `TIMBRE_OPTIONS`, `useThemeChoice` → `useTimbreChoice`, grid-cols adjustment.

**Full `ThemePicker.tsx` body to mirror** (lines 17-53):
```tsx
export function ThemePicker({ disabled }: ThemePickerProps) {
  const { theme, setTheme } = useThemeChoice()

  return (
    <div>
      <p id="theme-picker-label" className="text-sm font-semibold text-[var(--color-breathing-accent-strong)]">Theme</p>
      <div
        role="radiogroup"
        aria-labelledby="theme-picker-label"
        aria-disabled={disabled}
        className="mt-2 grid grid-cols-3 gap-2"
      >
        {THEME_OPTIONS.map((id: ThemeId) => {
          const selected = theme === id
          const label = id.charAt(0).toUpperCase() + id.slice(1)
          const selectedClasses = 'border-2 border-[var(--color-breathing-accent)] bg-[var(--color-breathing-bg-soft)] text-[var(--color-breathing-accent-strong)]'
          const unselectedClasses = 'border border-[var(--color-breathing-accent)] bg-[var(--color-breathing-surface)] text-[var(--color-breathing-accent-strong)] hover:bg-[var(--color-breathing-bg-soft)] active:bg-[var(--color-breathing-bg-soft)]'
          const baseClasses = 'min-h-12 rounded-full px-3 py-2 text-sm font-semibold shadow-sm transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45'

          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => { setTheme(id) }}
              className={`${baseClasses} ${selected ? selectedClasses : unselectedClasses}`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**TimbrePicker substitutions from the mirror:**
- `theme-picker-label` → `timbre-picker-label`
- `Theme` (label text) → `Timbre`
- `THEME_OPTIONS` → `TIMBRE_OPTIONS`; `ThemeId` → `TimbreId`
- `{ theme, setTheme } = useThemeChoice()` → `{ timbre, setTimbre } = useTimbreChoice()`
- `theme === id` (selected check) → `timbre === id`
- `grid-cols-3` → `grid-cols-2` (4 timbres fits a 2×2 grid; planner may choose `grid-cols-4` for 1×4 after smoke test)
- `setTheme(id)` → `setTimbre(id)`
- Capitalization formula `id.charAt(0).toUpperCase() + id.slice(1)` — **copy verbatim** (D-06 mirror, `ThemePicker.tsx` line 31)

**Import block for TimbrePicker:**
```typescript
import { TIMBRE_OPTIONS, type TimbreId } from '../domain/settings'
import { useTimbreChoice } from '../hooks/useTimbreChoice'
```

**Invariants to preserve:**
- All `var(--color-breathing-*)` token references copied without substitution — D-19 THEME-UI-01 guard.
- `aria-checked`, `aria-labelledby`, `aria-disabled`, `role="radiogroup"`, `role="radio"` semantics copied verbatim — D-20 a11y floor.
- `disabled={disabled}` gates click handler AND aria-checked changes — D-17 prop contract.
- No descriptor text, no SVG glyph, no audio preview button — D-06 name-only posture.
- `loadPrefs` import removed (current stub uses it; replaced by `useTimbreChoice`).

---

### `src/hooks/useTimbreChoice.ts` (NEW — verbatim mirror of `useVariantChoice.ts`)

**Analog:** `src/hooks/useVariantChoice.ts` (lines 1-47) — verbatim substitution `variant → timbre`, `VisualVariantId → TimbreId`, `'variant'` key → `'timbre'` key.

**Full `useVariantChoice.ts` as the template** (lines 22-47):
```typescript
import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { VisualVariantId } from '../domain/settings'

export function useVariantChoice(): { variant: VisualVariantId; setVariant: (next: VisualVariantId) => void } {
  const [variant, setVariantState] = useState<VisualVariantId>(() => loadPrefs().variant)

  const setVariant = useCallback((next: VisualVariantId): void => {
    const current = loadPrefs()
    savePrefs({ ...current, variant: next })
    setVariantState(next)
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'variant', value: next } }),
    )
  }, [])

  return { variant, setVariant }
}
```

**`useTimbreChoice.ts` after substitutions:**
```typescript
// src/hooks/useTimbreChoice.ts
//
// Phase 18: Picker-side companion hook for TimbrePicker.tsx.
//
// Mirrors useVariantChoice.ts (Phase 17 Plan 04) with variant → timbre substitutions.
// See useVariantChoice.ts for the detailed rationale (same custom-event contract,
// same optimistic-UI posture, same storage merge pattern).

import { useCallback, useState } from 'react'

import { loadPrefs, savePrefs } from '../storage/prefs'
import type { TimbreId } from '../domain/settings'

export function useTimbreChoice(): { timbre: TimbreId; setTimbre: (next: TimbreId) => void } {
  const [timbre, setTimbreState] = useState<TimbreId>(() => loadPrefs().timbre)

  const setTimbre = useCallback((next: TimbreId): void => {
    // 1. Fresh read of current envelope (do NOT use stale `timbre` closure from mount).
    const current = loadPrefs()
    // 2. Write merged envelope — preserves theme/variant/locale per Phase 14 D-17.
    savePrefs({ ...current, timbre: next })
    // 3. Update local React state for optimistic-UI (picker reflects change immediately).
    setTimbreState(next)
    // 4. Dispatch custom event so sibling pickers/hooks can filter on detail.key === 'timbre'.
    //    No App-side listener consumes this event (D-08 — timbre has no idle-state visual
    //    surface). The dispatch is kept for forward-compat + same-tab SettingsDialog sync.
    window.dispatchEvent(
      new CustomEvent('hrv:prefs-changed', { detail: { key: 'timbre', value: next } }),
    )
  }, [])

  return { timbre, setTimbre }
}
```

**Invariants to preserve:**
- `useCallback` with empty deps `[]` for stable setter identity — mirrors `useVariantChoice.ts` line 32.
- `loadPrefs()` fresh read inside `setTimbre` body (not from closure) — mirrors `useVariantChoice.ts` line 35 comment.
- Spread merge `{ ...current, timbre: next }` preserves all other prefs fields.
- CustomEvent detail shape `{ key: 'timbre', value: next }` — D-18 contract.

---

### `src/app/App.tsx` (EDIT — one `loadPrefs().timbre` read inside `onStartClick`)

**Analog:** self — the `sessionVariantRef.current = liveVariant` capture site at lines 328-333 is the exact model.

**Call-site to mirror** (`App.tsx` lines 328-344):
```typescript
// Phase 17 D-10 site (existing):
sessionVariantRef.current = liveVariant
setSessionVariant(liveVariant)

setAppPhase('lead-in')
setLeadInDigit(3)
void wakeLockRequest()

const plan = createBreathingPlan(state.selectedSettings)
planRef.current = plan
const firstInAudioTime = await audioStart(plan)  // ← CURRENT
```

**Phase 18 addition — immediately before the `await audioStart(...)` line:**
```typescript
// Phase 18 D-09/D-10: read timbre from storage once at session start.
// No sessionTimbreRef needed — timbreRef inside useAudioCues IS the session-scoped capture.
const capturedTimbre = loadPrefs().timbre
const firstInAudioTime = await audioStart(plan, capturedTimbre)  // ← UPDATED
```

**`onStartClick` dep array** (`App.tsx` line 381) — `loadPrefs` is a static import (not a React dep); `capturedTimbre` is a local `const`; no new deps added to the `useCallback` array.

**Invariants to preserve:**
- `loadPrefs().timbre` read is synchronous and happens BEFORE the `await audioStart(...)` call, inside the user-gesture chain.
- No `sessionTimbreRef` or `liveTimbre` React state added to App.tsx — timbre has no idle-state visual surface (D-08/D-09).
- The cancel-during-lead-in branch at lines 305-320 does NOT need a timbre-specific clear (no App-side ref to clear).
- `useCallback` dep array at line 381: `liveVariant` is already present; `loadPrefs` is not a hook value, not added.

---

## Test Pattern Assignments

### `src/audio/timbres.test.ts` (NEW)

**Analog:** `src/audio/cueSynth.test.ts` — same file structure (no `beforeEach` needed for pure data; `describe` + `it` blocks).

**Test structure:**
```typescript
import { describe, expect, it } from 'vitest'
import { TIMBRE_PRESETS } from './timbres'
import { TIMBRE_OPTIONS } from '../domain/settings'

describe('timbres', () => {
  it('exports all 4 TimbreId keys', () => {
    expect(Object.keys(TIMBRE_PRESETS)).toEqual(expect.arrayContaining(TIMBRE_OPTIONS))
    expect(Object.keys(TIMBRE_PRESETS)).toHaveLength(4)
  })

  // D-21 guard — TIMBRE-05 invariant:
  it('every preset uses A4/A3 fundamentals (440 Hz In / 220 Hz Out)', () => {
    for (const preset of Object.values(TIMBRE_PRESETS)) {
      expect(preset.fundamentalHzIn).toBe(440)
      expect(preset.fundamentalHzOut).toBe(220)
    }
  })

  // D-02 TIMBRE-02 — Bowl byte-identical proof:
  it('bowl preset matches verbatim cueSynth constants', () => {
    const bowl = TIMBRE_PRESETS.bowl
    expect(bowl.fundamentalHzIn).toBe(440)
    expect(bowl.fundamentalHzOut).toBe(220)
    expect(bowl.partials).toEqual([
      { ratio: 1.0, gain: 1.0 },
      { ratio: 2.76, gain: 0.4 },
      { ratio: 5.4, gain: 0.15 },
    ])
    expect(bowl.decayTauIn).toBe(1.4)
    expect(bowl.decayTauOut).toBe(1.8)
    expect(bowl.filterFreqHz).toBe(3000)
    expect(bowl.filterQ).toBe(0.5)
    expect(bowl.peakGain).toBe(0.18)
    expect(bowl.oscillatorType).toBe('sine')
  })

  it('partials[0].ratio === 1.0 for all presets', () => {
    for (const preset of Object.values(TIMBRE_PRESETS)) {
      expect(preset.partials[0]?.ratio).toBe(1.0)
    }
  })
})
```

---

### `src/audio/cueSynth.test.ts` (EXTENDED)

**Analog:** self — existing tests at lines 17-end. Add `it.each(TIMBRE_OPTIONS)` blocks after existing Bowl-specific tests.

**Import additions:**
```typescript
import { scheduleInCueForTimbre, scheduleOutCueForTimbre } from './cueSynth'
import { TIMBRE_OPTIONS } from '../domain/settings'
import { TIMBRE_PRESETS } from './timbres'
```

**Parameterized test pattern to add:**
```typescript
// Existing bowl tests MUST remain unchanged (TIMBRE-02 green-gate proof).
// New parameterized blocks:
describe('scheduleInCueForTimbre (all timbres)', () => {
  it.each(TIMBRE_OPTIONS)('%s: oscillator count equals preset.partials.length', (timbre) => {
    const ac = createAc()
    const oscSpy = vi.spyOn(ac, 'createOscillator')
    scheduleInCueForTimbre(ac, 1.0, ac.destination, timbre)
    expect(oscSpy).toHaveBeenCalledTimes(TIMBRE_PRESETS[timbre].partials.length)
  })

  it.each(TIMBRE_OPTIONS)('%s: fundamental frequency matches preset.fundamentalHzIn', (timbre) => {
    const ac = createAc()
    const oscillators: OscillatorNode[] = []
    // ... (mirror of existing scheduleInCue frequency test at lines 28-43)
    const freqs = oscillators.map((o) => o.frequency.value)
    const preset = TIMBRE_PRESETS[timbre]
    expect(freqs[0]).toBeCloseTo(preset.fundamentalHzIn, 5)
  })
})
```

---

### `src/audio/audioEngine.test.ts` (EXTENDED)

**Analog:** self — existing `describe('audioEngine')` block. Add assertions that `timbre` propagates through the engine.

**Pattern for new assertions** (mirror of existing `scheduleLeadIn` tests):
```typescript
it('createAudioEngine({ timbre: "bell" }) passes bell timbre to scheduleInCueForTimbre on first In cue', async () => {
  const spy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
  const engine = await createAudioEngine({ timbre: 'bell', onStateChange: vi.fn() })
  engine.scheduleLeadIn(0, samplePlan)
  expect(spy).toHaveBeenCalledWith(expect.any(Object), expect.any(Number), expect.anything(), 'bell', expect.any(Number))
  await engine.close()
})

it('engine captures timbre once — scheduleNextCue always uses the construction-time timbre', async () => {
  const spy = vi.spyOn(cueSynth, 'scheduleInCueForTimbre')
  const engine = await createAudioEngine({ timbre: 'sine', onStateChange: vi.fn() })
  engine.scheduleNextCue({ newPhase: 'in', audioTime: 1.0, phaseDurationSec: 5 })
  expect(spy).toHaveBeenCalledWith(expect.any(Object), expect.any(Number), expect.anything(), 'sine', 5)
  await engine.close()
})
```

---

### `src/hooks/useAudioCues.test.tsx` (EXTENDED)

**Analog:** self — existing test file. New tests cover `start(plan, timbre)` propagation and reconstruction preservation.

**Key new test pattern** (mirrors existing `start` + `stop` tests):
```typescript
it('start(plan, "bell") constructs engine with timbre="bell"', async () => {
  const spy = vi.spyOn(audioEngineModule, 'createAudioEngine')
  const { result } = renderHook(() => useAudioCues())
  await act(async () => {
    await result.current.start(samplePlan, 'bell')
  })
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ timbre: 'bell' }))
})

it('reconstructEngine reuses timbreRef.current — ignores any subsequent loadPrefs change', async () => {
  // seed prefs with 'bowl', start with 'bell', change prefs to 'chime', reconstruct
  // assert reconstruction calls createAudioEngine({ timbre: 'bell' })
})
```

---

### `src/hooks/useTimbreChoice.test.ts` (NEW)

**Analog:** `src/hooks/useVariantChoice.test.ts` (lines 1-112) — verbatim substitution of `variant → timbre`, `VisualVariantId → TimbreId`, `'variant'` key → `'timbre'` key.

**Substitutions from `useVariantChoice.test.ts`:**
- `useVariantChoice` → `useTimbreChoice`
- `variant: 'orb'` → `timbre: 'bowl'`; `variant: 'square'` → `timbre: 'bell'`; `variant: 'diamond'` → `timbre: 'sine'`
- `setVariant` → `setTimbre`
- `detail.key === 'variant'` → `detail.key === 'timbre'`
- `DEFAULT_FULL_PREFS` stays identical (file imports same `UserPrefs` shape)

**Seeding helper and constant** (copy from `useVariantChoice.test.ts` lines 9-27 verbatim, only variant values change):
```typescript
function seedPrefs(prefs: UserPrefs): void {
  window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 1, prefs }))
}

const DEFAULT_FULL_PREFS: UserPrefs = {
  theme: 'system',
  timbre: 'bowl',
  variant: 'orb',
  locale: 'en',
}
```

---

## Shared Patterns

### `var(--color-breathing-*)` token binding (D-19 THEME-UI-01 guard)
**Source:** `src/components/ThemePicker.tsx` lines 22, 32-34
**Apply to:** `src/components/TimbrePicker.tsx` (all color references)
**Rule:** Zero hardcoded `text-slate-*`, `bg-teal-*`, `text-white`, etc. Every color class must be `[var(--color-breathing-*)]` or a `ring-breathing-accent` Tailwind token. `theme.no-hardcoded-classes.test.ts` auto-verifies.

### `aria-checked` + `aria-labelledby` + `role="radiogroup"` a11y posture (D-20)
**Source:** `src/components/ThemePicker.tsx` lines 25-26, 41-42
**Apply to:** `src/components/TimbrePicker.tsx`
**Rule:** Radiogroup wrapper must carry `aria-labelledby` pointing at the label paragraph's `id`. Each button must carry `role="radio"` and `aria-checked={selected}`. `disabled` is forwarded to the DOM `disabled` attribute (not CSS-only opacity trick).

### `'hrv:prefs-changed'` CustomEvent dispatch contract (D-18)
**Source:** `src/hooks/useVariantChoice.ts` lines 40-43; `src/hooks/useThemeChoice.ts` lines 40-43
**Apply to:** `src/hooks/useTimbreChoice.ts`
**Rule:** `new CustomEvent('hrv:prefs-changed', { detail: { key: 'timbre', value: next } })`. Same event name, different `key` value. Fresh `CustomEvent` instance per dispatch.

### `loadPrefs()` fresh read inside setter (not closure capture)
**Source:** `src/hooks/useVariantChoice.ts` line 35 (`const current = loadPrefs()`)
**Apply to:** `src/hooks/useTimbreChoice.ts`
**Rule:** Always read fresh envelope inside the `setTimbre` callback body. Never capture `timbre` state in the closure for the merge operation.

### Synchronous-pre-await capture pattern (HOOKS-01 / D-08 / D-11)
**Source:** `src/hooks/useAudioCues.ts` line 292 (`const currentMuted = mutedRef.current`)
**Apply to:** `useAudioCues.ts` — `start()` and `reconstructEngine()` for the new `timbreRef`
**Rule:** Capture `timbreRef.current` into a local `const` BEFORE the first `await` in both `start()` and `reconstructEngine()`. This prevents a setTimbre toggle that fires during the `await` from racing the construction. Same structural posture as the `mutedRef` capture.

### FakeAudioContext polyfill (D-14)
**Source:** `vitest.setup.ts` (polyfill); `src/audio/cueSynth.test.ts` lines 11-14 (`function createAc`)
**Apply to:** `src/audio/timbres.test.ts`, `src/audio/cueSynth.test.ts` (extended), `src/audio/audioEngine.test.ts` (extended)
**Rule:** All audio tests use `new AudioContext()` via the polyfill — no real AC. No new `vitest.setup.ts` changes needed.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/audio/timbres.ts` | pure-data module | constants | No pure-data preset-record module exists. Nearest analog is `cueSynth.ts` module-level constant block (lines 11-27) for the Bowl values; the `TimbrePreset` interface + `Readonly<Record<...>>` shape has no codebase precedent but is trivial TypeScript. |

---

## Metadata

**Analog search scope:** `src/audio/`, `src/hooks/`, `src/components/`, `src/app/`, `src/domain/`
**Files read:** 12 source files + 3 test files
**Pattern extraction date:** 2026-05-14

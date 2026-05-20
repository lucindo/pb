# Phase 31: Navi Kriya Engine & Session - Research

**Researched:** 2026-05-17
**Domain:** React hook-based setTimeout engine, Web Audio cue synthesis, per-practice stats, session UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Counting screen visuals**
- D-01: The Navi Kriya session screen reuses the user's chosen visual variant shape (Orb / Square / Diamond) — but instead of breathing, the shape pulses once per OM. The variant picker stays meaningful for both practices.
- D-02: The live OM count number sits centered inside the shape — the slot the In/Out `CueGlyph` occupies for resonant. It is the plain current count, not a "count / target" ratio.
- D-03: A compact readout strip below the shape carries the phase label (FRONT / BACK), the round (N of total), and the phase target count — mirroring where resonant's `SessionReadout` sits.
- D-04: Per-OM visual feedback is a gentle scale pulse only — a soft scale-up-and-settle, no expanding ring. OS `prefers-reduced-motion` gets a static fallback.

**Cue sound design**
- D-05: All four NK cues (front marker, back marker, per-OM tick, end chord) render through the user's selected shared timbre (Bowl / Bell / Sine / Chime).
- D-06: Front marker = a rising two-tone gesture; back marker = a falling two-tone gesture.
- D-07: The per-OM tick is soft and barely-there — a quiet, short tick that anchors the OM rhythm in peripheral hearing. On by default (`perOmCue`), easy to toggle off.
- D-08: The end-of-practice cue is a resolved low multi-note chord that rings out — a clear, restful "practice complete".

**OM tempo values**
- D-09: The medium OM length anchors to Forrest's measured follow-along pace ≈ 2.16 s/OM.
- D-10: Modest tempo spread — fast ≈ 1.75 s / medium ≈ 2.16 s / slow ≈ 3.0 s per OM. All three values live in one easily-adjustable constant.

**Start & end session flow**
- D-11: Start → a brief quiet settle (a few seconds) → front marker → `LEAD_MS ≈ 700 ms` → first OM. No 3,2,1 countdown.
- D-12: A naturally completed session shows an `EndSessionDialog`-style native dialog announcing completion with a short summary.
- D-13: Ending a session early records what was done — increments NK session count, adds fully-completed rounds to "rounds completed", and adds elapsed minutes.
- D-14: The estimated session duration is shown next to the NK settings controls and updates live as the user changes rounds / front count / OM length.

### Claude's Discretion

- Exact settle-delay length (~3–5 s); exact `LEAD_MS` finalization (≈ 700 ms seed).
- Whether Navi Kriya gets its own engine hook (parallel to `useSessionEngine`) or shares structure.
- Paused-state visuals — count freeze + a calm paused indicator; reuse the `SessionControls` pause/resume/end posture.
- Exact cue synthesis parameters within the chosen timbre (D-05–D-08).
- Wake lock during a Navi Kriya session — reuse the existing `useWakeLock` progressive enhancement.

### Deferred Ideas (OUT OF SCOPE)

- Per-practice + shared Learn content and PT-BR localization of all new Navi Kriya / multi-practice copy — Phase 32.
- A third / fourth practice — Future requirement PRACTICE-F1.
- v1.x carry-forward tech debt — remains deferred.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NK-01 | User can start an app-paced Navi Kriya session in which the app counts each OM and auto-advances front → back → next round | `useNKEngine` hook with `useRef` + self-rescheduling `setTimeout` chain; spike-003 pattern |
| NK-02 | User can choose the number of rounds (default 3) | `NaviKriyaSettings.rounds` already in storage; NK controls slot in `SettingsForm` |
| NK-03 | User can choose the OM length — fast, medium, or slow | `NaviKriyaSettings.omLength` already in storage; OM_SECONDS constants in engine |
| NK-04 | User can choose the base front OM count (default 100); back count is fixed at front/4 | `NaviKriyaSettings.frontCount` validated ≥ 1 and multiple-of-4; `coerceNaviKriyaSettings` already enforces this |
| NK-05 | User hears distinct cue sounds marking the start of the front phase, the start of the back phase, and the end of practice | Four NK cue functions in `src/audio/nkCueSynth.ts` routing through `AudioContext` with timbre selection |
| NK-06 | User can turn an audible per-OM cue on or off | `perOmCue` field in `NaviKriyaSettings`; NK controls toggle in settings form |
| NK-07 | User can pause, resume, and end a Navi Kriya session in progress | `useNKEngine` exposes `pause()`/`resume()`/`end()` — maps to `SessionControls` reuse |
| NK-08 | User can see Navi Kriya stats — sessions, rounds, total minutes — tracked separately from Resonant Breathing stats | `recordNaviKriyaSession()` in `practices.ts` writes to `practices.naviKriya.stats` only |
| NK-09 | User sees current OM count, active phase (front/back), and current round on screen throughout a session | Engine mirrors `{phase, round, count}` into React state; `NKSessionReadout` strip below shape |
</phase_requirements>

---

## Summary

Phase 31 fills the empty slots Phase 30 left: it wires a real Navi Kriya counting engine into `App.tsx`, adds the NK controls UI into `SettingsForm`, synthesizes the four cue sounds through the existing audio stack, renders the in-session screen (chosen shape pulsing per OM, count inside, readout strip below), and records NK-specific stats on session end.

The core technical challenge is the NK session engine: unlike resonant's `requestAnimationFrame`-driven clock, the NK engine is a self-rescheduling `setTimeout` chain that advances one OM at a time. Spike-003 (`sources/003-navi-kriya-practice/index.html`) proves the pattern works. The engine record lives in a `useRef` (mutable, not React state), while only the display triple `{phase, round, count}` is mirrored into state — this is the core reason NK gets its own hook parallel to `useSessionEngine`.

Audio is simpler than resonant: NK cues fire at discrete `stepOm()` calls via `AudioContext`, not at rAF-driven boundary events scheduled ahead of time. The four cue roles (front marker, back marker, per-OM tick, end chord) need new synthesis functions that follow the `CueHandle` interface and route through the session-captured `TimbreId`. The carry-forward CR-01 (making `practices.{resonant,naviKriya}.settings` the real write target for both practices) is resolved in this phase as part of the NK settings wiring.

**Primary recommendation:** Implement `useNKEngine` as a new standalone hook (parallel to `useSessionEngine`), add NK cue synthesis as `src/audio/nkCueSynth.ts` (new file, no changes to `cueSynth.ts` or `audioEngine.ts`), and wire NK state into `App.tsx` under the `activePractice === 'naviKriya'` branch.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| OM-counting engine, state machine | Custom hook (`useNKEngine`) | App.tsx wiring | Timer + mutable ref cannot live in a component; hook pattern mirrors `useSessionEngine` |
| NK cue synthesis (front/back/tick/end) | `src/audio/nkCueSynth.ts` | `AudioContext` passed from App | Pure Web Audio; no React; mirrors `cueSynth.ts` structure |
| NK session screen rendering | App.tsx branch + new NK screen components | Reused shape components | Phase 30 D-01: fills existing scaffold slots, does not rebuild the screen |
| NK controls UI (settings knobs) | `SettingsForm.tsx` NK branch | `SettingsStepper`, toggle | Phase 30 D-03: SettingsForm is already practice-aware; NK fills its empty slot |
| NK stats recording | `src/storage/practices.ts` | App.tsx cleanup effect | `recordNaviKriyaSession()` mirrors `recordResonantSession()` already in the file |
| Wake lock | `useWakeLock` (existing) | App.tsx `onNKStartClick` | Reuse exactly as resonant does — hands-off practice |
| CR-01: settings dual-write migration | `App.tsx` + `persistedSetSettings` | `saveResonantSettings()` | Phase 30 carry-forward: resonant settings switch from flat `saveSettings()` to `saveResonantSettings()` |

---

## Standard Stack

### Core (all already in the project — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (hooks) | 19.0.0 | `useNKEngine` hook pattern | Already in project; `useRef` + `useState` are the correct primitives |
| Web Audio API | Browser native | NK cue synthesis | Already used by `audioEngine.ts` / `cueSynth.ts`; no new dep needed |
| Vitest + JSDOM | Project config | Unit testing engine hook | Already configured in `vite.config.ts`; `vi.useFakeTimers()` tests setTimeout chains |
| @testing-library/react | Project config | Hook and component tests | `renderHook` + `act` proven pattern in `useSessionEngine.test.tsx` |

**No new npm dependencies are required for this phase.** [VERIFIED: codebase grep — all needed primitives are in-tree]

---

## Architecture Patterns

### System Architecture Diagram

```
User gesture (Start)
        │
        ▼
App.tsx onNKStartClick
  ├── audioCtx construction (user gesture chain)
  ├── settle setTimeout (3–5 s)
  │        │ fires
  │        ▼
  │   play frontMarker cue
  │   schedule LEAD_MS (≈700 ms)
  │        │ fires
  │        ▼
  │   engine.start() ← sets eng.current = {phase,round,count,...}
  │   schedules first stepOm()
  │        │
  │        ▼ (per OM, self-rescheduling)
  │   stepOm():
  │     count++ → setCount()
  │     if perOmCue → playTick(audioCtx, timbre)
  │     if count < target → schedule(omMs)       [continue phase]
  │     else if phase=front → backMarker, setPhase('back'), schedule(LEAD_MS)
  │     else if round < rounds → frontMarker, round++, schedule(LEAD_MS)
  │     else → endCue, setPhase('done'), record stats
  │
  ├── NK session screen renders (activePractice==='naviKriya' && nkPhase!=='idle')
  │     NKShape: chosen shape variant, pulsing, count number inside
  │     NKSessionReadout: FRONT/BACK, round N/total, target count
  │     SessionControls: Pause / Resume / End (reused)
  │
  └── on end/pause/complete → clearTimeout, update nkStats via recordNaviKriyaSession()
```

### Recommended Project Structure

```
src/
├── hooks/
│   ├── useNKEngine.ts          # NEW: NK OM-counting engine hook
│   └── useNKEngine.test.tsx    # NEW: unit tests for state machine + ratio math
├── audio/
│   └── nkCueSynth.ts           # NEW: NK cue synthesis (frontMarker/backMarker/tick/endChord)
├── components/
│   ├── NKSessionReadout.tsx    # NEW: FRONT/BACK strip, round N/total, target count
│   ├── NKSessionReadout.test.tsx # NEW
│   └── SettingsForm.tsx        # EDIT: fill NK controls slot (rounds, frontCount, omLength, perOmCue, duration estimate)
├── storage/
│   └── practices.ts            # EDIT: add recordNaviKriyaSession()
├── content/
│   └── strings.ts              # EDIT: new NK copy strings (phase labels, readout, completion dialog, duration estimate)
└── app/
    └── App.tsx                 # EDIT: NK engine wiring, NK session screen branch, CR-01 resonant settings fix
```

### Pattern 1: useNKEngine — self-rescheduling setTimeout with useRef

**What:** The engine's mutable record lives in `useRef<NKEngineRecord>` (not React state) to avoid closure-staleness in the `stepOm` callback. Only the display triple is mirrored into state.

**When to use:** Any countdown/metronome pattern where state transitions are driven by elapsed time, not rAF.

```typescript
// Source: spike-003 index.html — adapted to production TypeScript hook
// [VERIFIED: sources/003-navi-kriya-practice/index.html]

interface NKEngineRecord {
  phase: 'front' | 'back' | 'done'
  round: number
  count: number
  frontCount: number
  backCount: number
  rounds: number
  omMs: number
  cueOn: boolean
  startedAtMs: number          // performance.now() at start — for stats elapsed
  completedRounds: number      // fully-completed rounds so far (for early-end stats)
}

// Display state (React state — causes re-renders)
const [nkPhase, setNkPhase] = useState<'idle' | 'front' | 'back' | 'done'>('idle')
const [nkRound, setNkRound]   = useState(1)
const [nkCount, setNkCount]   = useState(0)
const [nkRunning, setNkRunning] = useState(false)

// Mutable engine record — NOT React state (no re-render on mutation)
const eng   = useRef<NKEngineRecord | null>(null)
const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

const schedule = useCallback((delayMs: number) => {
  timer.current = setTimeout(stepOm, delayMs)
}, [stepOm])  // stepOm is stable via useCallback

function stepOm() {
  const e = eng.current
  if (!e) return
  e.count += 1
  setNkCount(e.count)
  // ... phase machine ...
}
```

**Critical:** `stepOm` reads `eng.current` (the ref), never closed-over React state — this is the stale-closure trap prevention. [VERIFIED: useSessionEngine.ts comment at line 86-90]

### Pattern 2: NK cue synthesis — CueHandle interface

**What:** NK needs four new cue functions that return `CueHandle` (for mute-fade compatibility) and accept `AudioContext`, `when` (audio clock time), `destination`, and `timbre`.

**When to use:** Any new audio event in the NK session.

```typescript
// Source: cueSynth.ts CueHandle interface [VERIFIED: src/audio/cueSynth.ts:69-73]
// nkCueSynth.ts — new file, zero imports from cueSynth.ts

export function scheduleNKFrontMarker(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle { /* rising two-tone via TIMBRE_PRESETS[timbre] */ }

export function scheduleNKBackMarker(...): CueHandle { /* falling two-tone */ }
export function scheduleNKTick(...): CueHandle { /* soft short sine */ }
export function scheduleNKEndChord(...): CueHandle { /* low multi-note chord */ }
```

The four functions use `TIMBRE_PRESETS[timbre]` from `timbres.ts` for the timbre-specific fundamental and decay parameters (D-05 compliance). They do NOT import from `cueSynth.ts` — new file, new functions, parallel pattern. [VERIFIED: timbres.ts exports `TIMBRE_PRESETS` as a `Record<TimbreId, TimbrePreset>`]

### Pattern 3: App.tsx NK branch — parallel to resonant

**What:** `App.tsx` gains a parallel NK start/end/pause/resume handler block, a `useNKEngine` call, and renders the NK session screen when `activePractice === 'naviKriya'`.

**The CR-01 fix** belongs here: change `saveSettings(next)` inside `persistedSetSettings` → `saveResonantSettings(next)` from `practices.ts`. `saveResonantSettings` is already implemented in Phase 30. [VERIFIED: src/storage/practices.ts:106-113]

```typescript
// CR-01: resonant settings now write to practices.resonant.settings
const persistedSetSettings = useCallback((next: SessionSettings) => {
  sessionSetSelectedSettings(next)
  saveResonantSettings(next)   // was: saveSettings(next)
}, [sessionSetSelectedSettings])
```

The NK session screen renders inside the existing card, gated on `activePractice === 'naviKriya'`:

```typescript
{activePractice === 'naviKriya' && nkPhase !== 'idle' && (
  <>
    <NKShape variant={sessionVariant ?? liveVariant} count={nkCount} pulse={/*key*/} />
    <NKSessionReadout phase={nkPhase} round={nkRound} totalRounds={nkSettings.rounds}
      target={nkPhase === 'front' ? nkFrontCount : nkBackCount} />
    <SessionControls
      status={nkRunning ? 'running' : 'idle'}
      onStart={onNKPauseResumeClick}
      onEnd={onNKEndClick}
      /* ... */
    />
  </>
)}
```

### Pattern 4: NK stats recording

`recordNaviKriyaSession()` mirrors `recordResonantSession()` already in `practices.ts`. It needs one additional field: `roundsCompleted` is not in `PersistedStats`. **This is the key NK stats difference** — the planner must decide whether to:

(a) Add a `roundsCompleted` field to `PersistedStats` and update `coerceStats` + `ZERO_STATS`, or
(b) Keep NK rounds in a separate field alongside the standard `PersistedStats` shape.

**Recommendation:** Option (a) — extend `PersistedStats` with an optional `roundsCompleted?: number` field (defaults to 0 in `coerceStats`). `StatsFooter` already reads `PersistedStats`; adding an optional field is backward-compatible. NK stats recording writes `completedRounds`; resonant recording writes `undefined` (coerces to 0 on read). [ASSUMED — no existing `roundsCompleted` field verified in stats.ts]

### Anti-Patterns to Avoid

- **Do not use rAF for the NK engine.** rAF runs at ~60 fps and is designed for smooth visual interpolation (resonant). NK needs discrete OM ticks at 1.75–3 s intervals — `setTimeout` is the correct primitive.
- **Do not read React state inside `stepOm`.** The closure is created once and captures stale state. Read `eng.current` (the ref) exclusively. [VERIFIED: useSessionEngine.ts stale-closure warning at lines 86-90]
- **Do not import `audioEngine.ts` into `useNKEngine`.** The NK engine hook is audio-agnostic; audio functions are injected as callbacks from App.tsx (same pattern as resonant's `audioNotifyPhaseBoundary` injection). This keeps the hook testable without a real AudioContext.
- **Do not reuse the spike's ad-hoc Web Audio tones.** [VERIFIED: navi-kriya-practice.md "What to Avoid"]
- **Do not allow non-multiple-of-4 frontCount.** `coerceNaviKriyaSettings` already enforces this; the NK controls UI must offer only multiples of 4.
- **Do not reconstruct the AudioContext inside `stepOm`.** The AudioContext is created once in `onNKStartClick` (user gesture) and lives for the session duration. `stepOm` receives a stable `audioCtx` ref via the engine's closure.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pause/resume controls UI | Custom pause/resume buttons | `SessionControls` | Already has the pause/resume/end posture with mute toggle |
| Session end dialog (natural completion) | Custom dialog | `EndSessionDialog` | Already a native `<dialog>` with the right visual treatment (D-12) |
| Shape pulsing | New shape component | Existing `OrbShape`/`SquareShape`/`DiamondShape` with a `key` prop pulse trigger | Shape already renders with scale; changing `key` on OM count restarts CSS animation |
| Settings steppers | Custom input widgets | `SettingsStepper` | Already handles value/options/format/aria pattern |
| Prefers-reduced-motion check | `window.matchMedia` call | `usePrefersReducedMotion()` hook | Already in project, returns a boolean |
| Wake lock | `navigator.wakeLock` directly | `useWakeLock()` hook | Already handles progressive enhancement, errors, release |
| Stats coercion | Custom validators | Extend `coerceStats` with optional `roundsCompleted` field | Already handles all numeric coercion patterns |

**Key insight:** Phase 30 built the scaffolding specifically for Phase 31 to fill — resist rebuilding what already exists.

---

## Common Pitfalls

### Pitfall 1: Stale closure in stepOm
**What goes wrong:** `stepOm` was created when the component rendered with `cueOn=true`; user toggles it off; `stepOm` still uses the old `cueOn` value.
**Why it happens:** `useCallback` captures closed-over state at creation time.
**How to avoid:** Store `cueOn` in `eng.current` (the mutable ref), not as a closed-over state variable. All values `stepOm` needs must come from `eng.current`.
**Warning signs:** Per-OM cue plays after being disabled, or vice versa.

### Pitfall 2: AudioContext not created in user gesture
**What goes wrong:** AudioContext is auto-suspended; no cues play.
**Why it happens:** Browser autoplay policy requires AudioContext creation inside a synchronous user-gesture handler. If created in a `setTimeout` callback, it is outside the gesture chain.
**How to avoid:** Create `new AudioContext()` in `onNKStartClick` synchronously, before the settle `setTimeout`. Pass it into the engine via a ref. [VERIFIED: audioEngine.ts D-09 comment at line 122]
**Warning signs:** Audio context state is `'suspended'` when the first cue should fire.

### Pitfall 3: Timer drift over a 15+ minute session
**What goes wrong:** Each `setTimeout(stepOm, omMs)` fires slightly late (~1–10 ms); over 375 OMs (3×125) this accumulates to multiple seconds of drift.
**Why it happens:** `setTimeout` guarantees MINIMUM delay, not exact delay. The self-rescheduling pattern compounds each delay.
**How to avoid:** Drift is acceptable for a chanting metronome — the user's chanting also drifts. Document this as expected behavior. If precise drift-correction is needed, capture `performance.now()` at each `stepOm` invocation and correct the next delay: `schedule(omMs - (performance.now() - lastTickAt))`. [ASSUMED — spike-003 does not implement drift correction; acceptable given practice nature]
**Warning signs:** Session ends noticeably earlier or later than the estimated duration.

### Pitfall 4: clearTimeout on unmount
**What goes wrong:** If the user navigates away (reloads, PWA dismissed) mid-session, the `setTimeout` fires into a torn-down component.
**How to avoid:** The `useNKEngine` hook must return a cleanup function from its `useEffect` that calls `clearTimeout(timer.current)`. [VERIFIED: spike-003 `end()` function calls `clearTimeout(timer.current)`]

### Pitfall 5: NK Settings and CR-01 dual-write confusion
**What goes wrong:** After CR-01, `saveSettings()` (the old flat write) is no longer the resonant settings target. If any code path still calls `saveSettings(next)` for resonant, changes may persist to the wrong location or get silently discarded on the next migration read.
**Why it happens:** `saveSettings` still exists in `storage/settings.ts` and the compiler won't warn about it.
**How to avoid:** Change `persistedSetSettings` in `App.tsx` to call `saveResonantSettings()`. Verify by grepping for `saveSettings(` after the change — only `loadSettings()` calls (for the initial load) should remain.

### Pitfall 6: `frontCount` change after session start
**What goes wrong:** User changes `frontCount` in settings while in a paused session (if allowed); engine sees the new value on `resume()`.
**How to avoid:** All NK session parameters (`frontCount`, `backCount`, `rounds`, `omMs`, `cueOn`) are captured into `eng.current` at `start()` and never read from `nkSettings` afterwards. Settings changes during a session only affect the next session.

### Pitfall 7: NKSessionReadout "FRONT" / "BACK" labels must use strings.ts
**What goes wrong:** Hard-coded "FRONT" / "BACK" strings in a component prevents PT-BR localization in Phase 32.
**How to avoid:** Phase 31 adds these strings to `strings.ts` as placeholders even though PT-BR is Phase 32. The `NKSessionReadout` prop receives `strings` from `uiStrings`.

### Pitfall 8: `PersistedStats` extension breaks existing `StatsFooter` rendering
**What goes wrong:** Adding `roundsCompleted` to `PersistedStats` without updating `StatsFooter` to conditionally render it leaves the resonant stats footer showing "0 rounds" or a missing row.
**How to avoid:** `StatsFooter` must conditionally render `roundsCompleted` only when it is nonzero (or only when `activePractice === 'naviKriya'`). The planner should check `StatsFooter.tsx` and `StatsFooter.test.tsx` for the NK-specific display logic.

---

## Code Examples

### NK Engine: start() and stepOm() — spike-003 production-adapted shape

```typescript
// Source: spike-003 index.html [VERIFIED: .claude/skills/spike-findings-hrv/sources/003-navi-kriya-practice/index.html]
// Adapted to TypeScript; audio calls injected as callbacks

const NK_OM_SECONDS: Record<OmLength, number> = {
  fast:   1.75,   // D-10 — adjustable constant
  medium: 2.16,   // D-09 — Forrest's authentic pace
  slow:   3.0,    // D-10 — adjustable constant
}
const NK_LEAD_MS = 700 // LEAD_MS seed — D-11, keep adjustable

function start(settings: NaviKriyaSettings, callbacks: NKAudioCallbacks): void {
  const backCount = settings.frontCount / 4
  eng.current = {
    phase: 'front', round: 1, count: 0,
    frontCount: settings.frontCount,
    backCount,
    rounds: settings.rounds,
    omMs: NK_OM_SECONDS[settings.omLength] * 1000,
    cueOn: settings.perOmCue,
    startedAtMs: performance.now(),
    completedRounds: 0,
  }
  setNkPhase('front'); setNkRound(1); setNkCount(0); setNkRunning(true)
  callbacks.frontMarker()
  schedule(NK_LEAD_MS)
}

function stepOm(): void {
  const e = eng.current
  if (!e) return
  e.count += 1
  setNkCount(e.count)
  if (e.cueOn) callbacks.tick()

  const target = e.phase === 'front' ? e.frontCount : e.backCount
  if (e.count < target) {
    schedule(e.omMs)
    return
  }
  // phase target reached
  if (e.phase === 'front') {
    e.phase = 'back'; e.count = 0
    setNkPhase('back'); setNkCount(0)
    callbacks.backMarker()
    schedule(NK_LEAD_MS)
  } else if (e.round < e.rounds) {
    e.completedRounds += 1
    e.round += 1; e.phase = 'front'; e.count = 0
    setNkRound(e.round); setNkPhase('front'); setNkCount(0)
    callbacks.frontMarker()
    schedule(NK_LEAD_MS)
  } else {
    e.completedRounds += 1
    e.phase = 'done'
    setNkPhase('done'); setNkRunning(false)
    callbacks.endCue()
    // record stats via onComplete callback
    onComplete({ completedRounds: e.completedRounds, elapsedMs: performance.now() - e.startedAtMs })
  }
}
```

### NK Cue Synthesis — frontMarker (rising two-tone)

```typescript
// Source: nkCueSynth.ts (new file) — pattern from spike-003 + cueSynth.ts CueHandle interface
// [VERIFIED: cueSynth.ts CueHandle, timbres.ts TIMBRE_PRESETS]

export function scheduleNKFrontMarker(
  audioCtx: AudioContext,
  when: number,
  destination: AudioNode,
  timbre: TimbreId,
): CueHandle {
  const preset = TIMBRE_PRESETS[timbre]
  // Rising: low → high. Use preset fundamentalHzOut then fundamentalHzIn.
  // Two-tone gesture: tone 1 at `when`, tone 2 at `when + 0.30`
  const tone1 = scheduleNKTone(audioCtx, preset.fundamentalHzOut, 0.30, when, destination, preset)
  const tone2 = scheduleNKTone(audioCtx, preset.fundamentalHzIn,  0.42, when + 0.30, destination, preset)
  // Return the longer-lived envelope for mute fade
  return tone2
}
```

### stats: recordNaviKriyaSession

```typescript
// Source: practices.ts pattern from recordResonantSession [VERIFIED: src/storage/practices.ts:128-158]

export function recordNaviKriyaSession(
  elapsedMs: number,
  roundsCompleted: number,
  isComplete: boolean,
  deps: StorageDeps = {},
): PersistedStats {
  const env = readEnvelope(deps)
  const practices = coercePractices(env.practices)
  const stats = practices.naviKriya.stats
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return stats
  if (!isComplete && elapsedMs < COUNT_THRESHOLD_MS) return stats
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const now = deps.now ?? Date.now
  const next: PersistedStats = {
    ...stats,
    totalSessions: stats.totalSessions + 1,
    totalElapsedSeconds: stats.totalElapsedSeconds + elapsedSeconds,
    lastSessionAtMs: now(),
    lastSessionDurationSeconds: elapsedSeconds,
    roundsCompleted: (stats.roundsCompleted ?? 0) + roundsCompleted,  // NK-specific
  }
  writeEnvelope(
    { ...env, practices: { ...practices, naviKriya: { ...practices.naviKriya, stats: next } } },
    deps,
  )
  return next
}
```

### NK Shape pulse trigger — key prop pattern

```typescript
// Source: spike-003 index.html uses React key prop to restart CSS animation [VERIFIED]
// In production: pass nkCount as the key so React remounts the animated element on each OM

<OrbShape
  key={`nk-${String(nkCount)}`}   // remounts on each OM → CSS animation restarts
  frame={null}                     // NK does not use SessionFrame
  variant={sessionVariant ?? liveVariant}
  nkCount={nkCount}                // new prop: render count number instead of CueGlyph
/>
```

**Note:** The shape components (`OrbShape`, `SquareShape`, `DiamondShape`) need a new rendering branch when `nkCount` is provided. The planner must decide whether to extend existing shape props or create an `NKShape` wrapper. Given D-01 (reuse the variant shape), extending existing props is cleaner.

---

## CR-01 Carry-Forward Resolution

**What it is:** Phase 30 carry-forward — resonant settings still persist via the legacy flat `saveSettings()` path. Phase 31 is the designated point to switch to `saveResonantSettings()`. [VERIFIED: 31-CONTEXT.md code_context Integration Points]

**Files affected:**
1. `src/app/App.tsx` — change `saveSettings(next)` → `saveResonantSettings(next)` in `persistedSetSettings`
2. `src/app/App.tsx` — the initial `loadSettings()` call at mount may also need to migrate to reading from `practices.resonant.settings` via `loadPractices().resonant.settings`. However, `loadSettings()` currently reads the flat `env.settings` path which — after the v1→v2 migration — is populated by the migration coercer from `env.settings`. So `loadSettings()` still works during the migration window. The cleanest fix is to change the initial load to `loadPractices().resonant.settings`.

**Risk:** Low — `saveResonantSettings()` is already implemented and tested in `practices.ts`. The change is a one-line swap.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setInterval` for metronomes | `setTimeout` self-rescheduling | React hook era | `setInterval` doesn't compensate for callback delay; `setTimeout` allows per-tick correction if needed |
| Closure-based timer state | `useRef` engine record + mirrored state | React Concurrent Mode | Avoids stale closure in timer callbacks |
| Hard-coded audio tones | Timbre preset lookup table | Phase 18 | All cues respect user's timbre choice |
| Flat stats in env.stats | Per-practice stats in practices.{resonant,naviKriya}.stats | Phase 30 | Independent per-practice history |

**Deprecated/outdated:**
- `saveSettings()` for resonant settings: replaced by `saveResonantSettings()` as of Phase 30 (CR-01 applies this phase)
- `loadStats()` for any per-practice stats: use `loadPractices().{resonant,naviKriya}.stats` instead

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `PersistedStats` should gain an optional `roundsCompleted?: number` field (option a) | Pattern 4: NK stats recording | If wrong, `StatsFooter` needs a separate type for NK stats; more complex type plumbing |
| A2 | Timer drift over a 15+ minute session is acceptable for a chanting practice and no drift-correction is needed | Common Pitfalls (Pitfall 3) | If wrong, need `performance.now()` drift correction in `stepOm` |
| A3 | `OrbShape`/`SquareShape`/`DiamondShape` will receive a new optional `nkCount` prop to render the count number in place of `CueGlyph` | Code Examples (NK Shape) | If wrong, a separate `NKShape` wrapper component is needed |
| A4 | Settle delay before the first frontMarker uses a `setTimeout` (not a lead-in digit countdown like resonant) | Pattern, D-11 | Low risk — CONTEXT.md D-11 explicitly says "no 3,2,1 countdown"; settle + frontMarker IS the start signal |

---

## Open Questions

1. **`roundsCompleted` in `PersistedStats` vs separate NK stats type**
   - What we know: `PersistedStats` currently has `totalSessions`, `totalElapsedSeconds`, `lastSessionAtMs`, `lastSessionDurationSeconds`. NK-08 requires "rounds completed" which has no equivalent for resonant.
   - What's unclear: Whether to add `roundsCompleted?: number` to the shared type or create a separate NK stats shape.
   - Recommendation: Add optional field to `PersistedStats` (backward-compatible); resonant always writes `undefined`; `coerceStats` adds `roundsCompleted: isFiniteNonNegativeInt(r.roundsCompleted) ? r.roundsCompleted : 0`. `StatsFooter` renders it only when `activePractice === 'naviKriya'`.

2. **NKShape: extend existing shape props vs new NKShape wrapper**
   - What we know: D-01 says reuse the chosen variant shape. Existing shapes render `frame: SessionFrame | null` and `CueGlyph` inside.
   - What's unclear: Whether `OrbShape` should receive a discriminated union `{ mode: 'breathing'; frame: SessionFrame } | { mode: 'nkCount'; count: number }`, or whether `App.tsx` renders a thin `NKShape` wrapper around the existing shape.
   - Recommendation: Create a thin `NKShape.tsx` wrapper that renders the chosen variant shape with `count` as the center element — this avoids adding NK-specific props to the three existing shape components, keeping them focused.

3. **AudioContext lifecycle for NK — shared with resonant or separate?**
   - What we know: Resonant's AC is created in `useAudioCues`, lives in a ref, and has complex resume/reconstruction logic. NK needs an AC too, but has simpler requirements (discrete ticks, no boundary scheduling).
   - What's unclear: Should NK use the same AC (via `useAudioCues`) or create its own?
   - Recommendation: NK creates its own AC inside `onNKStartClick`. This avoids coupling the simple NK audio path to the complex `useAudioCues` reconstruction machinery. The downside is two ACs can exist if the user rapidly switches practices — but `activePractice` switching is locked while a session runs (PRACTICE-03), so the two ACs never coexist.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes only. No new external services, databases, CLIs, or runtimes required. All dependencies are in-tree.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (via `vitest` npm script) |
| Config file | `vite.config.ts` (`test.environment: 'jsdom'`, `setupFiles: './vitest.setup.ts'`) |
| Quick run command | `npx vitest run src/hooks/useNKEngine.test.tsx src/audio/nkCueSynth.test.ts src/components/NKSessionReadout.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NK-01 | Engine auto-advances front→back→next round | unit | `npx vitest run src/hooks/useNKEngine.test.tsx` | ❌ Wave 0 |
| NK-01 | `stepOm` increments count, fires phase transitions | unit | `npx vitest run src/hooks/useNKEngine.test.tsx` | ❌ Wave 0 |
| NK-02 | Rounds setting flows into engine; 3 rounds produces 3 front+back cycles | unit | `npx vitest run src/hooks/useNKEngine.test.tsx` | ❌ Wave 0 |
| NK-03 | OM tempo: `omMs` derived from `OmLength` enum values | unit | `npx vitest run src/hooks/useNKEngine.test.tsx` | ❌ Wave 0 |
| NK-04 | backCount = frontCount / 4; non-multiple-of-4 rejected by coercer | unit | `npx vitest run src/domain/naviKriyaSettings.test.ts` | ✅ exists |
| NK-05 | frontMarker/backMarker/endCue synthesis returns a CueHandle | unit | `npx vitest run src/audio/nkCueSynth.test.ts` | ❌ Wave 0 |
| NK-06 | perOmCue=false: tick not called in stepOm | unit | `npx vitest run src/hooks/useNKEngine.test.tsx` | ❌ Wave 0 |
| NK-07 | pause() clears timer; resume() reschedules; end() resets to idle | unit | `npx vitest run src/hooks/useNKEngine.test.tsx` | ❌ Wave 0 |
| NK-08 | recordNaviKriyaSession writes to practices.naviKriya.stats only | unit | `npx vitest run src/storage/practices.test.ts` | ✅ exists (add NK test cases) |
| NK-08 | Early end records partial rounds | unit | `npx vitest run src/storage/practices.test.ts` | ✅ exists (add NK test cases) |
| NK-08 | Resonant stats unchanged after NK session completes | unit | `npx vitest run src/storage/practices.test.ts` | ✅ exists (add NK test cases) |
| NK-09 | NKSessionReadout renders phase/round/target from props | unit | `npx vitest run src/components/NKSessionReadout.test.tsx` | ❌ Wave 0 |
| NK-01..09 | App-level NK session: start → count → complete → stats updated | integration | `npx vitest run src/app/App.session.test.tsx` | ✅ exists (add NK test cases) |
| CR-01 | saveResonantSettings called instead of saveSettings | unit | `npx vitest run src/app/App.persistence.test.tsx` | ✅ exists (add assertion) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/hooks/useNKEngine.test.tsx src/storage/practices.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/hooks/useNKEngine.test.tsx` — covers NK-01, NK-02, NK-03, NK-06, NK-07
- [ ] `src/audio/nkCueSynth.test.ts` — covers NK-05 (CueHandle returned, cue fires at correct audio time)
- [ ] `src/components/NKSessionReadout.test.tsx` — covers NK-09 display rendering

*(Existing `practices.test.ts`, `App.session.test.tsx`, `App.persistence.test.tsx` need NK-specific test cases added but files already exist.)*

---

## Security Domain

This phase adds no new authentication, session management, access control, cryptography, or network endpoints. The only data-handling change is extending `PersistedStats` with an optional `roundsCompleted` integer field, which goes through the same non-throwing per-field coercion already in `coerceStats`. No new ASVS categories apply beyond what is already covered by the project's storage boundary validation pattern.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | `coerceStats` + `coerceNaviKriyaSettings` (already in place) |
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V6 Cryptography | no | — |

---

## Sources

### Primary (HIGH confidence)
- `.claude/skills/spike-findings-hrv/sources/003-navi-kriya-practice/index.html` — runnable spike: exact engine pattern, audio synthesis, state machine
- `.claude/skills/spike-findings-hrv/references/navi-kriya-practice.md` — authoritative blueprint: `start()`/`onOm()` pseudocode, `LEAD_MS`, tempo, display spec, cue roles, what to avoid
- `src/hooks/useSessionEngine.ts` — stale-closure pattern, `useRef` + mirrored state, cleanup discipline
- `src/audio/cueSynth.ts` — `CueHandle` interface, `scheduleBowlCue` pattern
- `src/audio/timbres.ts` — `TIMBRE_PRESETS` structure, `TimbrePreset` interface
- `src/audio/audioEngine.ts` — AudioContext lifecycle, D-09 user gesture requirement
- `src/storage/practices.ts` — `recordResonantSession` model, `coerceNaviKriyaSettings`, `saveNaviKriyaSettings`
- `src/storage/stats.ts` — `PersistedStats` type, `coerceStats`, `COUNT_THRESHOLD_MS`
- `src/domain/naviKriyaSettings.ts` — `NaviKriyaSettings` type, `DEFAULT_NK_SETTINGS`, validators
- `src/app/App.tsx` — full session lifecycle, CR-01 location, NK scaffold slots
- `src/components/SettingsForm.tsx` — NK empty slot location (activePractice==='naviKriya' branch)
- `.planning/phases/31-navi-kriya-engine-session/31-CONTEXT.md` — all decisions D-01..D-14

### Secondary (MEDIUM confidence)
- `.claude/skills/spike-findings-hrv/references/multi-practice-architecture.md` — practice-above-mode concept
- `.planning/phases/30-multi-practice-architecture-switcher/30-CONTEXT.md` — Phase 30 seam decisions, CR-01 description

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all needed code is in-tree, verified by reading actual files
- Architecture: HIGH — engine pattern verified from spike-003 source; integration points verified from App.tsx
- NK cue synthesis: HIGH — `cueSynth.ts` / `timbres.ts` pattern is clear; new functions are parallel
- NK stats: MEDIUM — `roundsCompleted` field addition is an assumption (A1); the recording pattern itself is HIGH
- Pitfalls: HIGH — stale closure, AC gesture requirement, and timer-ref cleanup are proven patterns from the existing codebase

**Research date:** 2026-05-17
**Valid until:** 2026-06-17 (stable stack, no fast-moving dependencies)

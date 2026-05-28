# Phase 50: SessionClock / scheduler abstraction - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 11 (1 new + 1 new test + 9 modified)
**Analogs found:** 11 / 11 (every file has a strong same-repo analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/audio/sessionClock.ts` (NEW) | audio-service interface + factory | request-response (synchronous facade) | `src/audio/audioEngine.ts` `AudioEngine` interface + `createAudioEngine` factory | exact (role + flow) |
| `src/audio/sessionClock.driftGuard.test.ts` (NEW) | drift-guard fs-scan test | batch / transform (read-files, regex-assert) | `src/content/content.no-review-markers.test.ts` | exact (role + flow); operator memo also cites `src/styles/theme.no-hardcoded-classes.test.ts` |
| `src/audio/audioEngine.ts` (MODIFIED) | audio engine (now also re-exports `SessionClock`; methods become facades over internal `schedule(when, cue)`) | event-driven dispatch | self — refactor in place | n/a (self) |
| `src/audio/cueSynth.ts` (MODIFIED, light) | DSP builders — internal dispatch target for `kind: 'in' \| 'out' \| 'lead-in-tick' \| 'end-chord'` | request-response (pure builder per cue) | self — surface unchanged | n/a (self) |
| `src/audio/nkCueSynth.ts` (MODIFIED, light) | NK DSP builders — internal dispatch target for `kind: 'nk-front' \| 'nk-back' \| 'nk-tick' \| 'countdown-tick'` | request-response (pure builder per cue) | self — surface unchanged | n/a (self) |
| `src/hooks/useSessionEngine.ts` (MODIFIED) | session-state hook; rAF tick reads `clock.now()`; ms→sec rename cascade | event-driven (rAF) | self — internal refactor, callback shape preserved | n/a (self) |
| `src/hooks/useAudioCues.ts` (MODIFIED) | audio-cues hook; migrates `onStateChange` consumer → `clock.onSuspend`/`clock.onResume` subscribers | event-driven (visibility + AC statechange) | self — `AudioStatusFlag` state machine preserved | n/a (self) |
| `src/hooks/useNaviKriyaAudio.ts` (MODIFIED) | NK audio controller; `audioCtx.currentTime` reads route through `createAudioSessionClock(audioCtx)` | request-response (per-cue) | self — AC construction stays in `begin()` | n/a (self) |
| `src/hooks/useNKEngine.ts` (MODIFIED) | NK OM-counting engine; 3 `performance.now()` calls → `clock.now()`; ms→sec rename | event-driven (setTimeout chain) | self — internal refactor | n/a (self) |
| `src/hooks/useAmbientScale.ts` (MODIFIED) | rAF-driven idle ambient scale; `performance.now()` → `wallClock.now()`; math in seconds | event-driven (rAF) | self — rAF cancel-guard idiom preserved | n/a (self) |
| `src/domain/sessionController.ts` (MODIFIED, rename only) | session lifecycle helpers; `nowMs`/`startedAtMs`/`completedAtMs`/`elapsedMs` → seconds-shaped equivalents | request-response (pure function) | self — surface preserved, type-system-rename only | n/a (self) |

## Pattern Assignments

### `src/audio/sessionClock.ts` (NEW — controller-like interface + factory)

**Analog:** `src/audio/audioEngine.ts` (the existing `AudioEngine` interface + `createAudioEngine` factory). This is the closest possible match: same directory, same architectural layer, same "stateful audio service with a typed interface and a single async factory" shape. Several `AudioEngine` members (`now()`, `state`, `resume()`, `close()`) are the literal seed for `SessionClock` members.

**File header / module-doc pattern** (audioEngine.ts L1-20):
```typescript
// Stateful audio service that composes the pure cueSynth module from Plan 01
// into a lifecycle-aware engine. Zero React imports.
//
// Owns:
//   - The single AudioContext (D-09: created from a user-gesture chain only).
//   - The active cue's GainNode envelope (D-08: mute applies a soft fade-out).
//   ...
```
→ Same shape for `sessionClock.ts`: opening comment block listing ownership (the clock source, the subscriber sets for `onSuspend`/`onResume`, the master-gain stub), invariants (D-08 wrap-don't-construct, D-11 wired-real, D-12 stubbed no-op), and "Zero React imports" line.

**Interface signature pattern** (audioEngine.ts L29-63):
```typescript
export type AudioStatus = 'idle' | 'lead-in' | 'failed'

export interface AudioEngine {
  /** Schedule the 3-2-1 lead-in: ticks at startAudioTime + 0/+1/+2 s, ... */
  scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number | null
  scheduleNextCue(args: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void
  playEndChord(): void
  setMuted(muted: boolean): void
  readonly muted: boolean
  now(): number
  close(): Promise<void>
  resume(): Promise<void>
  readonly state: AudioContextState | 'interrupted'
}
```
→ Apply verbatim shape to `SessionClock`: every member typed, JSDoc above each member citing the decision token (D-01, D-04, D-11, D-12) and the seconds-shaped contract (D-01: "returns seconds (float)"). The `readonly state` / `readonly muted` getter pattern is the model for any future `readonly` exposure if needed; `now()` is the literal seed.

**Discriminated-union dispatch payload pattern** (audioEngine.ts L40 — the existing `{ newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }` arg):
```typescript
scheduleNextCue(args: { newPhase: 'in' | 'out'; audioTime: number; phaseDurationSec: number }): void
```
This is the closest in-repo prior art for a typed structural payload threaded into a cue scheduler. Generalize to the D-04 discriminated union:
```typescript
export type Cue =
  | { kind: 'in';              phaseDurationSec: number; timbre: TimbreId }
  | { kind: 'out';             phaseDurationSec: number; timbre: TimbreId }
  | { kind: 'lead-in-tick' }
  | { kind: 'end-chord' }
  | { kind: 'nk-front' }
  | { kind: 'nk-back' }
  | { kind: 'nk-tick' }
  | { kind: 'countdown-tick' }
```
(Exact field set per kind finalized at plan time after re-walking the per-cue builder signatures in `cueSynth.ts` + `nkCueSynth.ts` below — see CONTEXT discretion.)

**Factory pattern — wraps, never constructs** (audioEngine.ts L173-235 — note that `new AudioContext()` happens at L177 INSIDE the factory; for SessionClock the AC is provided as an argument, see D-08):
```typescript
export async function createAudioEngine(opts: AudioEngineOptions): Promise<AudioEngine> {
  // D-09: AudioContext is constructed here, which is invoked synchronously from the
  // Start session click handler in App.tsx (Plan 04). The browser autoplay policy MUST
  // see a fresh user-gesture chain or AC will start in 'suspended'.
  const audioCtx = new AudioContext()
  ...
}
```
→ For Phase 50, two factories, **synchronous, no `await`** (no AC construction inside):
```typescript
export function createAudioSessionClock(audioCtx: AudioContext): SessionClock { ... }
export function createWallSessionClock(): SessionClock { ... }
```
The AC is **passed in** (D-08 — both `audioEngine.ts`'s own AC and `useNaviKriyaAudio.begin()`'s separate AC pass through this factory). Phase 51 swaps the body of `createAudioSessionClock.now()` from `() => performance.now() / 1000` to `() => audioCtx.currentTime` — D-03 / D-10.

**`statechange` listener pattern for `onSuspend` / `onResume` wiring** (audioEngine.ts L237-257 — the canonical pattern in the repo):
```typescript
// AudioContextState widened to include WebKit's 'interrupted' extension
type ExtendedAudioContextState = AudioContextState | 'interrupted'
const readState = (): ExtendedAudioContextState => audioCtx.state as ExtendedAudioContextState

// Plan 06 D-36: single statechange listener — drives the hook's state machine.
// The listener is REMOVED inside close() BEFORE audioCtx.close() to prevent
// a 'closed' event firing after unmount.
const onStateChange = (): void => {
  opts.onStateChange?.(readState())
}
audioCtx.addEventListener('statechange', onStateChange)
```
→ `createAudioSessionClock` owns its own copy of this listener internally and fans the transition out to subscriber sets:
```typescript
const suspendSubscribers = new Set<() => void>()
const resumeSubscribers = new Set<() => void>()
audioCtx.addEventListener('statechange', () => {
  const s = audioCtx.state as AudioContextState | 'interrupted'
  if (s === 'suspended' || s === 'interrupted') suspendSubscribers.forEach((cb) => cb())
  else if (s === 'running') resumeSubscribers.forEach((cb) => cb())
})
// onSuspend / onResume return an unsubscribe function:
onSuspend: (cb) => { suspendSubscribers.add(cb); return () => suspendSubscribers.delete(cb) }
```
The exact return-shape (unsubscribe fn vs object with `.dispose()`) is a plan-time choice; the listener-into-Set fan-out is the locked pattern from audioEngine.ts L257.

**`createWallSessionClock` — no-op `onSuspend`/`onResume`** (CONTEXT D-11 — "wall clock never suspends"):
```typescript
export function createWallSessionClock(): SessionClock {
  return {
    now: () => performance.now() / 1000,
    schedule: (when, cue) => { /* wall clock cannot schedule into a graph — useAmbientScale calls only now() */ },
    setMasterGain: () => undefined,     // D-12 no-op
    onSuspend: () => () => undefined,   // returns the unsubscribe; both no-op
    onResume:  () => () => undefined,
  }
}
```
(`schedule(when, cue)` on the wall clock has no audio graph to write into — `useAmbientScale` only calls `now()`, so plan-time decides whether the wall-clock `schedule` is a typed no-op or omitted via a narrower wall-only interface. Recommend keeping it on the surface for D-04 closed-catalog symmetry.)

**`setMasterGain` — stubbed no-op signature** (CONTEXT D-12): no in-repo prior art; the signature lives, the body is empty. The matching analog is `applyMuteFadeOut` (audioEngine.ts L146-169) for the ramp shape that Phase 53 will land, but Phase 50 itself only types the surface:
```typescript
setMasterGain(value: number, rampSec: number): void
// Phase 50 D-12: stubbed — no master GainNode is inserted into the audio graph.
// Phase 53 lands the GainNode insertion AND the mute call-site swap together.
```

**Subscribed-by-`useAudioCues` migration** (audioEngine.ts L65-71 — the existing surface this replaces):
```typescript
export interface AudioEngineOptions {
  /** Plan 06 D-36: receives every audioCtx.state transition. ... */
  onStateChange?: (state: AudioContextState | 'interrupted') => void
  ...
}
```
→ At Phase 50 the engine still constructs the AC and wraps it in `createAudioSessionClock(audioCtx)` internally (or exposes the clock as a member — exact wiring is plan-time). `useAudioCues` stops passing `onStateChange` and instead does:
```typescript
const unsub1 = clock.onSuspend(() => { /* needs-resume gate (Plan 06 Pitfall 5) */ })
const unsub2 = clock.onResume(() => { setAudioStatus('ok'); ... })
```
The `AudioStatusFlag` machine in `useAudioCues.ts` L153-179 keeps its shape — only the *source* of the transition changes from a callback prop to a subscription.

---

### `src/audio/sessionClock.driftGuard.test.ts` (NEW — fs-scan banned-pattern guard)

**Analog:** `src/content/content.no-review-markers.test.ts` (direct CONTEXT call-out under Claude's Discretion). Also: `src/styles/theme.no-hardcoded-classes.test.ts` is cited in the analog comment of that file (L28) — same pattern at the styles layer.

**Triple-slash `node:fs` reference pattern** (content.no-review-markers.test.ts L30-37):
```typescript
// Reason: node:fs and node:path are available in the Vitest jsdom test environment.
// tsconfig.app.json has types:["vite/client"] which excludes @types/node; the triple-slash
// reference adds Node.js type coverage for this test-only file without altering tsconfig.app.json.
/// <reference types="node" />

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
```
→ Copy verbatim. No new dependencies (DEPS-01).

**Banned-pattern fs-scan structure** (content.no-review-markers.test.ts L126-137):
```typescript
describe('src/content marker-guard (Phase 26 D-12 / I18N-07)', () => {
  it('no "// TODO: native-speaker review" marker remains outside ...', () => {
    const hits: string[] = []
    for (const file of CONTENT_FILES) {
      const text = readFileSync(file, 'utf-8')
      hits.push(...findUnreviewedMarkers(text, file))
    }
    expect(
      hits,
      `Unresolved native-speaker review markers ... in:\n${hits.join('\n')}`,
    ).toEqual([])
  })
})
```
→ Apply to the 5 caller files. Hard-code the file list (not a directory walk — the scope is exactly 5 files per CONTEXT specifics):
```typescript
const CALLER_FILES = [
  resolve(__dirname, '..', 'hooks', 'useSessionEngine.ts'),
  resolve(__dirname, '..', 'hooks', 'useAudioCues.ts'),
  resolve(__dirname, '..', 'hooks', 'useNaviKriyaAudio.ts'),
  resolve(__dirname, '..', 'hooks', 'useNKEngine.ts'),
  resolve(__dirname, '..', 'hooks', 'useAmbientScale.ts'),
] as const
```

**Regex-assert banned patterns** (operator memo + CONTEXT discretion):
```typescript
const BANNED = [
  { name: 'performance.now() direct call',    re: /\bperformance\.now\(/ },
  { name: 'new AudioContext() construction',  re: /\bnew\s+AudioContext\b/ },
  { name: 'raw audioCtx.currentTime read',    re: /\baudioCtx\.currentTime\b/ },
]
```
The exact regex set is plan-time refinable (e.g., `useNaviKriyaAudio.ts` has comments mentioning `new AudioContext()` — the regex matches text, not types, so plan time decides whether to strip comments first via a tokenizer, or scope the regex to source lines via a simple comment-strip pass — same shape as `findUnreviewedMarkers`'s stack walker in content.no-review-markers.test.ts L81-124). See [[use-lsp-for-renames]] memory: regex matches text, not types — defensible only for grep-style absence checks like this.

**Exclusion of the test file itself** (content.no-review-markers.test.ts L39-53 — `collectFiles` excludes `.test.ts`):
```typescript
// Excluding .test.ts files is load-bearing — this guard file itself contains the
// literal marker substring (in the const below) and must not flag itself.
function collectFiles(dir: string, acc: string[] = []): string[] { ... }
```
→ Apply: the drift-guard test file will contain the banned strings (in regex sources and JSDoc); scope to the 5 hard-coded caller files, NOT a directory walk. Avoids the self-match trap by construction.

---

### `src/audio/audioEngine.ts` (MODIFIED — adds `SessionClock` re-export + internal facade refactor)

**Analog:** itself. Surface stays — `scheduleLeadIn`, `scheduleNextCue`, `playEndChord` are *thin facades* over a new internal `schedule(when, cue)` dispatch (D-05).

**Re-export pattern** (ABSTR-02 wording: "`audioEngine.ts` exports the `SessionClock` interface"):
```typescript
export type { SessionClock } from './sessionClock'
// Or: re-export the value/type alongside the existing AudioEngine surface.
```
The re-export is the literal contract satisfier — CONTEXT Claude's Discretion: "`audioEngine.ts` re-exports the `SessionClock` type to literally satisfy ABSTR-02".

**Facade pattern for `scheduleLeadIn`** (audioEngine.ts L297-317 — current implementation that becomes the facade body):
```typescript
scheduleLeadIn(startAudioTime: number, plan: BreathingPlan): number | null {
  const firstInCueTime = startAudioTime + LEAD_IN_DURATION_SEC
  if (closed) return null
  if (muted) return firstInCueTime
  activeCues.add(scheduleCountdownTick(audioCtx, startAudioTime + 0 * LEAD_IN_TICK_INTERVAL_SEC, audioCtx.destination, sessionTimbre))
  activeCues.add(scheduleCountdownTick(audioCtx, startAudioTime + 1 * LEAD_IN_TICK_INTERVAL_SEC, audioCtx.destination, sessionTimbre))
  activeCues.add(scheduleCountdownTick(audioCtx, startAudioTime + 2 * LEAD_IN_TICK_INTERVAL_SEC, audioCtx.destination, sessionTimbre))
  const firstInPhaseDurationSec = plan.inhaleMs / 1000
  activeCues.add(scheduleInCueForTimbre(audioCtx, firstInCueTime, audioCtx.destination, sessionTimbre, firstInPhaseDurationSec))
  return firstInCueTime
}
```
→ Becomes (CONTEXT discretion — "the 4 calls become 4 `schedule()` calls with `kind: 'lead-in-tick'` and `kind: 'in'`"):
```typescript
scheduleLeadIn(startAudioTime, plan) {
  const firstInCueTime = startAudioTime + LEAD_IN_DURATION_SEC
  if (closed) return null
  if (muted) return firstInCueTime
  schedule(startAudioTime + 0 * LEAD_IN_TICK_INTERVAL_SEC, { kind: 'lead-in-tick' })
  schedule(startAudioTime + 1 * LEAD_IN_TICK_INTERVAL_SEC, { kind: 'lead-in-tick' })
  schedule(startAudioTime + 2 * LEAD_IN_TICK_INTERVAL_SEC, { kind: 'lead-in-tick' })
  schedule(firstInCueTime, { kind: 'in', phaseDurationSec: plan.inhaleMs / 1000, timbre: sessionTimbre })
  return firstInCueTime
}
```
The internal `schedule(when, cue)` does the `switch (cue.kind)` dispatch to `scheduleCountdownTick` / `scheduleInCueForTimbre` / `scheduleEndChord` etc. and is the binding point for ABSTR-01's `SessionClock.schedule` member.

**Facade pattern for `scheduleNextCue`** (audioEngine.ts L319-332):
```typescript
scheduleNextCue({ newPhase, audioTime, phaseDurationSec }) {
  if (closed) return
  if (muted) return
  pruneExpiredCues()
  const clampedAudioTime = Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)
  const cue = newPhase === 'in'
    ? scheduleInCueForTimbre(audioCtx, clampedAudioTime, audioCtx.destination, sessionTimbre, phaseDurationSec)
    : scheduleOutCueForTimbre(audioCtx, clampedAudioTime, audioCtx.destination, sessionTimbre, phaseDurationSec)
  activeCues.add(cue)
}
```
→ Becomes:
```typescript
scheduleNextCue({ newPhase, audioTime, phaseDurationSec }) {
  if (closed) return
  if (muted) return
  pruneExpiredCues()
  const clampedAudioTime = Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)
  schedule(clampedAudioTime, { kind: newPhase, phaseDurationSec, timbre: sessionTimbre })
}
```
SAFE_LEAD_SEC clamp logic stays in the facade (audioEngine.ts L143-144 invariant).

**Facade pattern for `playEndChord`** (audioEngine.ts L334-344): same shape — `schedule(when, { kind: 'end-chord' })` with the `endChordTailUntil = Math.max(endChordTailUntil, cue.cleanupAt)` bookkeeping retained around it.

**Mute fade-out preserved** (D-13 — `applyMuteFadeOut` at audioEngine.ts L146-169 is the active mute mechanism through Phase 50, NOT touched).

---

### `src/audio/cueSynth.ts` + `src/audio/nkCueSynth.ts` (MODIFIED, light)

**Analog:** themselves. CONTEXT D-05 — these become "internal dispatch targets". Public exports stay the same (`scheduleInCueForTimbre`, `scheduleOutCueForTimbre`, `scheduleNKFrontMarker`, `scheduleNKBackMarker`, `scheduleNKTick`, `scheduleCountdownTick`, `scheduleEndChord`). The `Cue` payload's per-kind fields are *exactly* what each of these per-cue builders' arg list needs:

| Cue kind | Existing builder signature | Required Cue fields |
|----------|---------------------------|---------------------|
| `'in'` | `scheduleInCueForTimbre(audioCtx, when, destination, timbre, phaseDurationSec?)` | `timbre`, `phaseDurationSec` |
| `'out'` | `scheduleOutCueForTimbre(audioCtx, when, destination, timbre, phaseDurationSec?)` | `timbre`, `phaseDurationSec` |
| `'lead-in-tick'` | `scheduleCountdownTick(audioCtx, when, destination, timbre)` — timbre captured at session start (engine reads `sessionTimbre`, not from cue payload) | (none — engine adds timbre at dispatch from `sessionTimbre`) |
| `'end-chord'` | `scheduleEndChord(audioCtx, when, destination, timbre)` — same posture | (none) |
| `'nk-front'` | `scheduleNKFrontMarker(audioCtx, when, destination, timbre)` — NK is per-session-captured in `useNaviKriyaAudio.begin()` | (none — `timbre` resolved in NK closure) |
| `'nk-back'` | `scheduleNKBackMarker(...)` | (none) |
| `'nk-tick'` | `scheduleNKTick(...)` | (none) |
| `'countdown-tick'` | `scheduleCountdownTick(...)` | (none) |

**Plan-time question** (CONTEXT discretion — "Exact `Cue` payload field set: finalized at plan time"): whether `timbre` belongs on the cue payload or stays captured at the engine-instance level via `sessionTimbre`. The existing capture-at-session-start posture (audioEngine.ts L268 + Phase 18 D-08) strongly suggests **engine captures sessionTimbre once; cue payload omits `timbre` for the kinds where it's redundant**. The `'in'`/`'out'` HRV cues additionally need `phaseDurationSec` per the table above (no other kind reads it). NK kinds carry no payload beyond `kind`.

---

### `src/hooks/useSessionEngine.ts` (MODIFIED — ms→sec rename + `clock.now()` substitution)

**Analog:** itself. The structural patterns are preserved verbatim; only `performance.now()` reads and field names change.

**rAF cancel-guard idiom** (useSessionEngine.ts L117-170 — HOOKS-04 / D-10 stays exactly as is):
```typescript
let animationFrameId = 0
let cancelled = false

const tick = () => {
  // HOOKS-04 / D-10: top-of-tick cancel-guard.
  if (cancelled) return
  setState((currentState) => {
    if (currentState.status !== 'running') return currentState
    runningSnapshotRef.current = { ... }
    return completeIfNeeded(currentState, performance.now())   // ← becomes clock.now()
  })
  if (!cancelled) {
    animationFrameId = requestAnimationFrame(tick)
  }
}
animationFrameId = requestAnimationFrame(tick)
return () => {
  cancelled = true
  cancelAnimationFrame(animationFrameId)
}
```
→ Three call-site changes (4 `performance.now()` per CONTEXT — note this file has 4: L144, L235, L238, L262):
- L144: `completeIfNeeded(currentState, performance.now())` → `completeIfNeeded(currentState, clock.now())`
- L235: `startStretchSession(sSettings, currentState.selectedSettings, performance.now())` → `clock.now()`
- L238: `startSession(currentState.selectedSettings, performance.now())` → `clock.now()`
- L262: `extendTimedSession(currentState, durationMinutes, performance.now())` → `clock.now()`

**Field rename cascade** (D-02 + CONTEXT Claude's Discretion):
| Before (ms) | After (sec) |
|-------------|-------------|
| `startedAtMs: number` (L32, L33, L139, L141) | `startedAtSec: number` |
| `lastElapsedMs: number` (L35) | `lastElapsedSec: number` |
| `RunningSnapshot.key = String(currentState.startedAtMs)` (L138) | `String(currentState.startedAtSec)` |

**Source-of-rename**: per memory [[use-lsp-for-renames]], apply via LSP rename on `RunningSnapshot.startedAtMs` and on `RunningSessionState.startedAtMs` (and `CompleteSessionState.completedAtMs`, `extendTimedSession`'s `nowMs`, `completeIfNeeded`'s `nowMs`, `startSession`'s `nowMs`, `startStretchSession`'s `nowMs`). NEVER sed/perl — multi-file type-aware rename across `useSessionEngine.ts` ↔ `sessionController.ts` ↔ tests.

**Clock plumbing** (plan-time — likely a new hook arg):
```typescript
export function useSessionEngine(
  initialSettings: SessionSettings = DEFAULT_SETTINGS,
  stretchSettings: StretchSettings | null = null,
  clock: SessionClock,   // ← new arg
): SessionEngine
```
Caller (App.tsx) injects either an `AudioSessionClock` (when audio is up) or a `WallSessionClock` fallback. Exact injection shape — hook arg vs context vs `engine.clock` member — is a plan-time call.

---

### `src/hooks/useAudioCues.ts` (MODIFIED — onStateChange → onSuspend/onResume)

**Analog:** itself. The `AudioStatusFlag` machine (useAudioCues.ts L153-179) keeps its shape; the trigger source moves from `AudioEngineOptions.onStateChange` to two subscriber calls.

**Existing `handleStateChange` pattern** (useAudioCues.ts L153-179):
```typescript
const handleStateChange = useCallback(
  (state: AudioContextState | 'interrupted'): void => {
    const engine = engineRef.current
    if (engine === null) return
    void engine
    if (state === 'running') {
      visibilityResumeAttemptedRef.current = false
      setAudioStatus('ok')
    } else if (state === 'closed') {
      setAudioStatus('unavailable')
    } else if (
      (state === 'suspended' || state === 'interrupted') &&
      visibilityResumeAttemptedRef.current
    ) {
      setAudioStatus('needs-resume')
    }
  },
  [],
)
```
→ Refactored into two subscribers via `clock.onResume` + `clock.onSuspend`:
```typescript
const handleResume = useCallback((): void => {
  if (engineRef.current === null) return
  visibilityResumeAttemptedRef.current = false
  setAudioStatus('ok')
}, [])
const handleSuspend = useCallback((): void => {
  if (engineRef.current === null) return
  if (visibilityResumeAttemptedRef.current) {
    setAudioStatus('needs-resume')
  }
}, [])
```
And subscription wiring inside the existing `start()` (after `engine` is constructed):
```typescript
const unsubResume = engine.clock.onResume(handleResume)
const unsubSuspend = engine.clock.onSuspend(handleSuspend)
// Store unsubs alongside engineRef; call on stop() / reconstructEngine().
```
(The 'closed' case is handled separately — D-12 says the clock owns the statechange listener; the `setAudioStatus('unavailable')` path can stay coupled to `engine.close()` invocation paths, OR `'closed'` can be a separate `onClose` subscriber. Plan-time call.)

**`createAudioEngine` opts pattern** (useAudioCues.ts L254): `createAudioEngine({ timbre, onStateChange: handleStateChange, bypassSilentMode })` becomes either `createAudioEngine({ timbre, bypassSilentMode })` (with `clock` exposed on `engine.clock`) or kept on `AudioEngineOptions` and threaded through. The CONTEXT D-11 framing — "migrates from consuming `onStateChange` in `AudioEngineOptions`" — points to removing `onStateChange` from the options.

**Re-anchor + reconstruction preservation** (useAudioCues.ts L326-414): the `reconstructEngine` callback must re-subscribe `handleResume`/`handleSuspend` on the new engine's `clock`. This is the only structural change beyond renames in that path — kitchen-sink iOS gesture-preservation (L313-326 commentary) stays verbatim.

---

### `src/hooks/useNaviKriyaAudio.ts` (MODIFIED — `audioCtx.currentTime` reads through clock)

**Analog:** itself. AC construction stays in `begin()` (D-08).

**Construction-stays-in-begin pattern** (useNaviKriyaAudio.ts L42-49 + L59-61):
```typescript
function createOptionalAudioContext(): AudioContext | null {
  try {
    return new AudioContext()
  } catch {
    return null
  }
}

const begin = useCallback((getTimbre: () => TimbreId): NaviKriyaAudioSession => {
  const audioCtx = createOptionalAudioContext()
  audioCtxRef.current = audioCtx
  ...
}, [])
```
→ Add: immediately after AC construction succeeds, wrap with the factory and store the clock alongside:
```typescript
const begin = useCallback((getTimbre: () => TimbreId): NaviKriyaAudioSession => {
  const audioCtx = createOptionalAudioContext()
  audioCtxRef.current = audioCtx
  if (audioCtx === null) {
    return { callbacks: NOOP_AUDIO_CALLBACKS, countdownTick: () => undefined }
  }
  const clock = createAudioSessionClock(audioCtx)   // ← new
  clockRef.current = clock                          // ← new (stored for close)

  const timbre = getTimbre()
  const cueWhen = (): number => clock.now() + SAFE_LEAD_SEC   // ← was: audioCtx.currentTime + SAFE_LEAD_SEC
  ...
})
```
The 1 `audioCtx.currentTime` read at L75 routes through `clock.now()`. Cue scheduling itself can either continue calling the existing cueSynth functions directly (light migration) OR move through `clock.schedule({ kind: 'nk-front', ... })` (full migration). Plan-time call — the drift-guard only bans the direct `audioCtx.currentTime` read; it doesn't require routing every cue through `clock.schedule` at Phase 50.

---

### `src/hooks/useNKEngine.ts` (MODIFIED — 3 `performance.now()` calls + ms→sec rename)

**Analog:** itself. Pure-internal hook (no React state for time math; `eng.current` is mutable record).

**Hook signature stays + clock as arg** (useNKEngine.ts L71):
```typescript
export function useNKEngine(): NKEngineApi
```
→ likely becomes:
```typescript
export function useNKEngine(clock: SessionClock): NKEngineApi
```
(Plan-time — clock could also come from the parent via the NK audio session pattern. The NK audio path constructs its own clock per session via `createAudioSessionClock`; this hook needs its clock for *elapsed stats*, NOT audio scheduling, so it could equally accept a wall-clock when audio is unavailable. Recommend a wall-clock fallback in the App.tsx call site.)

**Three call sites** (CONTEXT — "3 `performance.now()` calls → `clock.now()`"):
- L132: `const elapsedMs = performance.now() - e.startedAtMs` → `const elapsedSec = clock.now() - e.startedAtSec`
- L187: `startedAtMs: performance.now()` → `startedAtSec: clock.now()`
- L218: `elapsedMs: performance.now() - e.startedAtMs` → `elapsedSec: clock.now() - e.startedAtSec`

**Rename cascade**:
| Before (ms) | After (sec) |
|-------------|-------------|
| `NKEngineRecord.startedAtMs` (L31) | `startedAtSec` |
| `NKEngineRecord.omMs` (L29) | `omSec` (or keep `omMs` if internal-only — plan-time; **all caller-facing time values become seconds per D-02**) |
| `NK_OM_SECONDS[settings.omLength] * 1000` (L185) | `NK_OM_SECONDS[settings.omLength]` (no `* 1000`) |
| `NKOnComplete.elapsedMs` (L54) | `elapsedSec` |
| `NK_LEAD_MS` (L188, 204) | `NK_LEAD_SEC` (cascade into `naviKriyaSession.ts`) |
| `pendingDelayMs` (L36, L91) | `pendingDelaySec` |
| `e.omMs * NK_LAST_OM_HOLD_MULTIPLIER` (L158) | `e.omSec * NK_LAST_OM_HOLD_MULTIPLIER` |

**setTimeout call** (L92):
```typescript
timer.current = setTimeout(() => { stepOmRef.current() }, delayMs)
```
`setTimeout` takes ms. After the rename, the schedule helper either accepts seconds and multiplies by 1000 *at the setTimeout boundary*:
```typescript
timer.current = setTimeout(() => { stepOmRef.current() }, delaySec * 1000)
```
or keeps `delayMs` as the local parameter name (since it's the literal arg-name expected by `setTimeout`) while the engine record carries seconds. Plan-time call — the seconds-shaped value is what's stored on `eng.current`; the conversion lives at the `setTimeout` boundary only.

**Test diff scope** (CONTEXT discretion + D-02): `useNKEngine.test.tsx` re-asserts seconds-shaped values. `naviKriyaSession.test.ts` and `naviKriyaSettings.test.ts` follow the constant rename (`NK_LEAD_MS` → `NK_LEAD_SEC`, etc.).

---

### `src/hooks/useAmbientScale.ts` (MODIFIED — `performance.now()` → `wallClock.now()`)

**Analog:** itself. rAF cancel-guard idiom (HOOKS-04 / D-10) is preserved verbatim.

**rAF + ms math pattern** (useAmbientScale.ts L27-60):
```typescript
const INHALE_MS = 4400
const EXHALE_MS = 6600

export function useAmbientScale(active: boolean): number {
  ...
  useEffect(() => {
    if (!animated) return
    let phase: 'in' | 'out' = 'in'
    let start = performance.now()
    let raf = 0
    let cancelled = false
    const tick = (now: number) => {
      if (cancelled) return
      const phaseMs = phase === 'in' ? INHALE_MS : EXHALE_MS
      const elapsed = now - start
      if (elapsed >= phaseMs) {
        start = now - (elapsed - phaseMs)
        phase = phase === 'in' ? 'out' : 'in'
      }
      const currentPhaseMs = phase === 'in' ? INHALE_MS : EXHALE_MS
      const t = easeInOutSine((now - start) / currentPhaseMs)
      ...
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [animated])
}
```
→ Becomes:
```typescript
const INHALE_SEC = 4.4   // was: INHALE_MS = 4400
const EXHALE_SEC = 6.6   // was: EXHALE_MS = 6600

export function useAmbientScale(active: boolean, wallClock: SessionClock): number {
  ...
  useEffect(() => {
    if (!animated) return
    let phase: 'in' | 'out' = 'in'
    let start = wallClock.now()                       // ← seconds
    let raf = 0
    let cancelled = false
    const tick = () => {                              // ← drop the rAF timestamp arg; read clock.now() instead
      if (cancelled) return
      const now = wallClock.now()
      const phaseSec = phase === 'in' ? INHALE_SEC : EXHALE_SEC
      const elapsed = now - start
      if (elapsed >= phaseSec) {
        start = now - (elapsed - phaseSec)
        phase = phase === 'in' ? 'out' : 'in'
      }
      const currentPhaseSec = phase === 'in' ? INHALE_SEC : EXHALE_SEC
      const t = easeInOutSine((now - start) / currentPhaseSec)
      ...
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [animated, wallClock])
}
```
**Key shape change**: the `now` arg from `requestAnimationFrame(tick)` (a DOMHighResTimeStamp in ms) is dropped — the rAF callback signature is preserved (still a callback), but the body reads `wallClock.now()` instead. This is the *whole* point of the abstraction at Phase 50 (and the seam Phase 51 swaps onto `audioCtx.currentTime` per CLOCK-02).

**Test parity** (CONTEXT — "ambient scale tests re-assert seconds-shaped values"): `useAmbientScale.test.tsx` re-asserts the seconds-shaped INHALE_SEC / EXHALE_SEC constants and the new `wallClock` arg.

---

### `src/domain/sessionController.ts` (MODIFIED — type rename only)

**Analog:** itself. CONTEXT D-02 — "Domain helpers (`startSession`, `extendTimedSession`, `completeIfNeeded`, `startStretchSession`) and their tests follow the same rename".

**Rename cascade** (all in this one file + sessionMath.ts + tests):
| Before (ms) | After (sec) |
|-------------|-------------|
| `RunningSessionState.startedAtMs: number` (L23) | `startedAtSec: number` |
| `CompleteSessionState.completedAtMs: number` (L33) | `completedAtSec: number` |
| `startSession(... nowMs: number)` (L47) | `nowSec: number` |
| `startStretchSession(... nowMs: number)` (L73) | `nowSec: number` |
| `extendTimedSession(... nowMs: number)` (L107) | `nowSec: number` |
| `completeIfNeeded(... nowMs: number)` (L162) | `nowSec: number` |
| `const elapsedMs = nowMs - state.startedAtMs` (L150, L165) | `const elapsedSec = nowSec - state.startedAtSec` |
| `getSessionFrame(plan, elapsedMs)` (L157, L168) | `getSessionFrame(plan, elapsedSec)` |
| `getStretchFrame(stretchSegments, elapsedMs)` (L167) | `getStretchFrame(stretchSegments, elapsedSec)` |

`sessionMath.ts` and `stretchRamp.ts` carry parallel `elapsedMs` arg renames — same pattern; LSP rename propagates. `SessionFrame.elapsedMs` field follows suit.

**No behavior change** — pure type-system rename. Tests in `sessionController.test.ts`, `sessionMath.test.ts`, `stretchRamp.test.ts`, `breathingPlan.test.ts`, `naviKriyaSession.test.ts` re-assert with seconds-shaped values (divide the literal numerals by 1000 where applicable: `10000` → `10`, `5500` → `5.5`, etc.).

---

## Shared Patterns

### `Zero React imports` / pure-service module header
**Source:** `src/audio/audioEngine.ts` L1-20, `src/audio/cueSynth.ts` L1-15
**Apply to:** `src/audio/sessionClock.ts`
Header comment lists ownership, invariants, and the explicit "Zero React imports" line — keeps the layer boundary self-documenting.

### Capture-at-session-start (frozen values in payload)
**Source:** Phase 18 D-08 (audioEngine.ts L268 — `const sessionTimbre: TimbreId = opts.timbre`), Phase 49.1 D-09 (useAudioCues.ts L130 — `bypassSilentModeRef`), useNaviKriyaAudio.ts L74 (`const timbre = getTimbre()` captured into closures)
**Apply to:** `Cue` payloads in `schedule(when, cue)` — the engine carries already-captured values; the dispatch site NEVER re-reads prefs at cue-dispatch time. The `'in'`/`'out'` cues' `timbre` field is the in-engine `sessionTimbre` value, not a live prefs read.

### Decision-token in JSDoc
**Source:** Pervasive across `audioEngine.ts` (D-07, D-08, D-09, D-10, D-11, D-36, D-37, D-38, AUDIO-01, WR-05, WR-06, AH-WR-03 etc.)
**Apply to:** Every JSDoc on `SessionClock` members cites its decision (D-01 for `now()`, D-04 for `schedule`, D-11 for `onSuspend`/`onResume`, D-12 for `setMasterGain`). Downstream readers can trace any invariant back to CONTEXT.md.

### LSP rename for ms→sec cascade
**Source:** [[use-lsp-for-renames]] memory — "symbol/property renames across files: use LSP rename (type-aware), never sed/perl/regex"
**Apply to:** Every field rename in this phase (`startedAtMs` → `startedAtSec`, `elapsedMs` → `elapsedSec`, `nowMs` → `nowSec`, etc.). The renames cross module boundaries (hooks ↔ domain ↔ tests); only the LSP type-aware rename will catch every site without false positives.

### Vitest fs-scan banned-pattern guard (no new deps)
**Source:** `src/content/content.no-review-markers.test.ts` L30-37 (triple-slash `<reference types="node" />` + `node:fs` imports)
**Apply to:** `sessionClock.driftGuard.test.ts`. Same triple-slash pattern, same `readFileSync` usage, same hard-coded file list (or directory walk) → regex assertion. Zero new dependencies (DEPS-01).

### rAF cancel-guard idiom (preserved across renames)
**Source:** `src/hooks/useSessionEngine.ts` L117-170, `src/hooks/useAmbientScale.ts` L32-60 (HOOKS-04 / D-10)
**Apply to:** Any rAF loop touched in Phase 50 — the `let cancelled = false` flag, top-of-tick check, cancel-on-cleanup. Ms→sec rename does NOT change this structure; the same flag/closure pattern survives the migration.

### User-gesture-chain AC construction (factories wrap, never construct)
**Source:** Phase 3 D-09 (audioEngine.ts L177), `useNaviKriyaAudio.ts` L44 (`createOptionalAudioContext`)
**Apply to:** `createAudioSessionClock(audioCtx)` factory — accepts an AC, wraps. NEVER constructs. NK keeps its separate AC at Phase 50 (CONTEXT Deferred — NK AC unification is out of scope).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | | | Every Phase 50 file has a direct or near-direct same-repo analog. |

This is unusually high analog coverage because Phase 50 is a pure structural refactor — every modification site IS its own analog (self-modify), and the one new file (`sessionClock.ts`) is a direct sibling of `audioEngine.ts` in the same directory with the same architectural role. The drift-guard test file is the only file whose analog is in a different directory (`src/content/`), and CONTEXT calls that analog out explicitly.

## Metadata

**Analog search scope:**
- `src/audio/` (all 12 files)
- `src/hooks/` (all 5 target hooks + their tests)
- `src/domain/` (sessionController, sessionMath, naviKriyaSession, naviKriyaSettings)
- `src/content/content.no-review-markers.test.ts` (drift-guard analog)
- `src/styles/theme.no-hardcoded-classes.test.ts` (secondary drift-guard analog, cited via L28 comment of the primary)

**Files scanned:** ~30 (full read on 8 files: audioEngine.ts, cueSynth.ts, nkCueSynth.ts, useSessionEngine.ts, useAmbientScale.ts, useNKEngine.ts, useNaviKriyaAudio.ts, useAudioCues.ts, sessionController.ts, content.no-review-markers.test.ts; Grep across `src/` for `performance.now()`, `new AudioContext`, `audioCtx.currentTime`)

**Pattern extraction date:** 2026-05-27

**Memory rules referenced:**
- [[use-lsp-for-renames]] — for the ms→sec cascade (LSP, never sed)
- [[no-design-locking]] — the discriminated-union catalog is closed at Phase 50 (CONTEXT D-04) — tests must NOT assert exact field shapes that downstream phases will modify; assert on dispatch behavior, not Cue field-tuple identity
- [[propose-step-checklist]] — planner must include Downstream Constraints + Applicable Memory Rules sections in each plan
- [[ack-dont-fix-inline]] — n/a (no live feedback dump in this phase)
- [[design-must-not-touch-logic]] — n/a (Phase 50 is pure logic; no design surface)

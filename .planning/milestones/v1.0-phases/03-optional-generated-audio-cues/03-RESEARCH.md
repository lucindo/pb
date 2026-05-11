# Phase 3: Optional Generated Audio Cues - Research

**Researched:** 2026-05-09
**Domain:** Web Audio API synthesis, scheduling, and React integration for breathing-aligned cue playback
**Confidence:** HIGH for stack/scheduling/lifecycle; MEDIUM for specific bowl frequencies (subjective tuning); MEDIUM-LOW for iOS silent-switch workaround (intentionally NOT applied — see Open Questions).

## Summary

Phase 3 layers a Web Audio cue engine over the existing `SessionFrame` produced by `useSessionEngine`. All locked product decisions (D-01 through D-16) collapse the implementation choice space to a small, well-documented Web Audio pattern: a single `AudioContext` created inside the `Start session` click handler [VERIFIED: MDN autoplay policy], a 1-cue lookahead scheduler driven by `audioCtx.currentTime` plus a 25 ms `setTimeout` watchdog [VERIFIED: web.dev/audio-scheduling — Chris Wilson canonical pattern], short envelope-shaped cues built from `OscillatorNode` + `BiquadFilterNode` + `GainNode`, and an inline mute toggle button colocated with `Start session` / `End session` (D-05).

The single biggest sync risk is well understood: do NOT introduce a parallel timer to drive audio. The scheduler MUST anchor its boundary computation to either (a) `SessionFrame.elapsedMs` snapshots reconciled against `audioCtx.currentTime` at session start, or (b) the breathing plan (`cycleMs`, `inhaleMs`, `exhaleMs`) advanced from a single anchor. The engine state machine is small (`idle → lead-in → running → ended`) and lives outside `useSessionEngine` to preserve SESS-05 (the in-session clock starts at lead-in completion, not at button press).

**Primary recommendation:** Build a single `useAudioCues` hook that owns the AudioContext lifecycle and the lookahead scheduler. The hook accepts (`muted`, `phase`, `cycleStartTimeAudioCtx`, `plan`) and emits scheduled cues. Mute is a value passed each render — the hook reacts via `setTargetAtTime` for the active cue (D-08 fade-out tail) and gates the next-cue scheduling decision (D-08 unmute-waits-for-boundary). Lead-in is a separate small state machine in `App.tsx` that owns the 3-2-1 numerals + tick playback and only calls `useSessionEngine.start()` at t=0.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Sound Design**
- **D-01:** Each phase boundary triggers a single soft mallet-strike cue with natural exponential bowl-like decay across the phase. No sustained drone, no fade-in swell — strike-and-decay only.
- **D-02:** In and Out cues use two distinct pitches (not just two timbres, not the same cue both phases).
- **D-03:** Pitch direction is locked: In = higher pitch, Out = lower pitch.
- **D-04:** Cues are generated entirely in-browser via Web Audio API. No bundled audio files, no external/hosted audio. Reaffirms `PROJECT.md` constraint.

**Mute Toggle**
- **D-05:** The mute control lives inline next to the primary Start/End button, always visible (idle and running). It does NOT live in the settings panel and does NOT float in a corner.
- **D-06:** The icon is a standard speaker (filled = sound on) / speaker-with-slash (muted) pair. Bell metaphor and text-only toggle were considered and rejected for v1.
- **D-07:** First-visit default is audio ON. User mutes if unwanted.
- **D-08:** Mute toggle behavior:
  - Mute mid-cue: applies a soft fade-out tail to the active cue (not an abrupt cut).
  - Unmute mid-phase: waits for the next In/Out boundary to fire the next cue. No mid-phase strike on unmute.

**AudioContext Init & Failure**
- **D-09:** AudioContext is created (or resumed) inside the Start session click handler — always a user-gesture path. Mid-session unmute uses the already-running context. AC is NOT created on first unmute alone or lazily on first scheduled cue.
- **D-10:** If AudioContext creation fails or the browser blocks audio, the session runs visuals-only and the mute icon shows a disabled (struck-through) state. Tooltip / aria description explains audio is unavailable. No inline notice, no error toast.
- **D-11:** AudioContext is closed on session end (manual end, completion, or modal-confirm end). Next Start re-creates a fresh context.

**Sync Model & Lead-In**
- **D-12:** Cues are scheduled on the AudioContext clock using a 1-cue lookahead. On each phase change (and on session start), the next cue is scheduled at its exact `audioCtx.currentTime + Δ` derived from the breathing plan. Sample-accurate next cue, simpler than full pre-schedule, handles `extendTimedSession` and end naturally.
- **D-13:** Phase 3 introduces a 3-2-1 pre-session lead-in: pressing Start triggers a brief lead-in BEFORE the session timing clock starts at t=0. Phase 1 SESS-05 (one accurate continuous in-session clock with no pauses) is preserved — the lead-in is pre-session, not within the session.
- **D-14:** Lead-in copy is locked: large Arabic numerals `3`, `2`, `1` shown one per second in the orb area (where the In/Out phase label normally appears). At t=0, numerals are replaced by the first In phase label and the first In gong fires. No "Begin" word.
- **D-15:** Each countdown numeral is accompanied by a soft tick that is clearly distinguishable from the In/Out bowl cues (e.g., wood-block / muted tap rather than a quieter version of the bowl tone). The tick is part of the audio path and respects the mute toggle.
- **D-16:** End-of-session audio: when a timed session reaches `isComplete`, the last In/Out cue decays naturally and the session falls to silence as the readout switches to `Session complete`. There is NO distinct closing-bell cue. Manual End session also produces no special closing cue.

### Claude's Discretion

The following technical choices are explicitly left to research/planning:
- Specific In and Out frequencies (e.g., A4/A3, exact Hz values).
- Decay curve shape and length, attack envelope, harmonic content / partials of the bowl tone.
- Specific tick timbre (wood-block vs muted tap vs short noise burst) — the lock is only that it is clearly distinct from the bowl cues.
- Mute fade-out duration (target band: short — order of 100–300 ms — but exact value not locked).
- AudioContext options (`sampleRate`, `latencyHint`).
- iOS/Safari quirks handling (webkit-prefixed AC, silent-switch behavior) — handle as needed within D-09/D-10 framing.
- Background-tab behavior (visibilitychange) — not discussed; planner picks consistent with SESS-05 (visual timing keeps running) and a calming experience.

### Deferred Ideas (OUT OF SCOPE)

- **Volume control / cue loudness slider** — tracked as v2 `AUDI-03` in `REQUIREMENTS.md`. Phase 3 ships at one well-tuned default volume.
- **Audio preference persistence across visits** — owned by Phase 4 (`LOCL-01`). Phase 3 keeps the mute state in memory only; refresh resets to default ON.
- **Alternate sound packs / timbres / pitches** — tracked as v2 `CUST-01`. Phase 3 ships one bowl/gong default.
- **Closing-bell at session end** — explicitly rejected for v1 in this phase (D-16). May be revisited later as part of CUST-01 or an end-of-session experience iteration.
- **Lead-in length / "Begin" word / 1-2 second settling pause** — Phase 3 ships locked 3-2-1 with Arabic numerals (D-14). Alternative lead-ins (longer countdown, settling pause, spelled-out numerals) are not in scope.
- **Audio cues respecting `prefers-reduced-motion`** — explicitly NOT linked. Reduced-motion users still get full audio. A future accessibility iteration could add a separate `prefers-reduced-data` or in-app audio-defaults preference if user feedback warrants it.
- **End-session button pressed during lead-in** — not deeply discussed; planner should choose a sensible default (e.g., cancel back to idle, settings restored). Captured here so it is not lost.
- **Background-tab audio behavior** (visibilitychange) — not deeply discussed; planner picks consistent with SESS-05 (timing must not drift) and a calming experience.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDI-01 | User can hear generated soft gong/bowl-like cues aligned to inhale and exhale phase changes. | Standard Stack (Web Audio nodes), Architecture Patterns 1 (lookahead scheduler), 2 (bowl synthesis), Code Examples (cue construction) |
| AUDI-02 | User can mute audio cues and still use the visual guide. | Architecture Patterns 5 (mute toggle + fade), Pitfalls 1/4 (visuals-only fallback), Code Examples (aria-pressed mute button) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The repo-level `./CLAUDE.md` was checked — none exists. The user-level `~/.claude/CLAUDE.md` only includes the RTK CLI proxy convention (a developer-tool CLI hook), which is not relevant to phase planning. No CLAUDE.md directives constrain Phase 3.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Audio synthesis (oscillators, gain, filter graph) | Browser/Client (Web Audio thread) | — | Web Audio runs in a dedicated audio thread on `audioCtx.currentTime`; offloading from the main thread is the whole point [VERIFIED: web.dev/audio-scheduling] |
| Cue scheduling (1-cue lookahead) | Browser/Client (main thread `setTimeout`) | Web Audio thread (`start(when)` consumes the schedule) | Standard Chris Wilson pattern: main-thread watchdog enqueues to sample-accurate audio thread [VERIFIED: web.dev/audio-scheduling] |
| AudioContext lifecycle (create/resume/close) | Browser/Client (React hook in App composition) | — | Must be created inside a user-gesture handler [VERIFIED: MDN Best Practices]. Hook + `useEffect` cleanup is the React-idiomatic shape, mirrored from `useSessionEngine` rAF lifecycle [CITED: src/hooks/useSessionEngine.ts:29-57] |
| Mute toggle state + fade-out | Browser/Client (React state + Web Audio gain ramp) | — | UI-controlled via `aria-pressed` button [VERIFIED: WAI-ARIA Button Pattern]; fade implemented with `gain.setTargetAtTime` on the active cue's gain node [VERIFIED: MDN setTargetAtTime] |
| Lead-in countdown (visual + tick audio) | Browser/Client (React state machine in App.tsx) | Browser/Client (Web Audio for tick) | Pre-session, lives outside `useSessionEngine` to preserve SESS-05 invariant; reuses the orb's in-orb label position (Phase 2 D-03) for numerals and the audio engine for ticks |
| Phase boundary derivation | Domain layer (existing `breathingPlan` + `sessionMath`) | Browser/Client (audio scheduler reads plan) | `cycleMs`, `inhaleMs`, `exhaleMs` already exist [CITED: src/domain/breathingPlan.ts:4-11]; audio scheduler computes boundary times in audio-clock space without forking the timing source |
| Failure surface (AudioContext init failed) | Browser/Client (UI disabled state) | — | D-10 locks: visuals-only fallback, disabled mute icon, tooltip explains. No toast. |

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web Audio API | Native browser | OscillatorNode, GainNode, BiquadFilterNode, AudioContext | The only in-browser tone generator. D-04 forbids bundled audio. [VERIFIED: MDN] |
| React | 19.2.5 (installed) | Hooks (`useEffect`, `useRef`, `useState`, `useCallback`) for AudioContext lifecycle and mute state | Already the project framework. Hook shape mirrors `usePrefersReducedMotion` and `useSessionEngine`. [CITED: package.json] |
| Vitest | 4.1.5 (installed) | Test runner; per-test `vi.stubGlobal('AudioContext', mockClass)` to inject AC stubs | Already the project test framework; jsdom does NOT implement Web Audio [VERIFIED: github.com/jsdom/jsdom#2900] |

**No new npm packages should be added.** Web Audio is native; React, Vitest, jsdom are already in `package.json` [VERIFIED: /Users/lucindo/Code/hrv/package.json]. Tone.js, howler.js, standardized-audio-context-mock, web-audio-test-api are NOT needed and would be over-engineering for two cue voices.

### Supporting (in-tree files Phase 3 will reuse / extend)

| File | Role | Phase 3 Use |
|------|------|-------------|
| `src/hooks/useSessionEngine.ts` | SessionFrame producer, rAF lifecycle | Audio engine subscribes to phase/cycleIndex transitions on the same frame; useEffect lifecycle mirrors lines 29-57 |
| `src/domain/breathingPlan.ts` | `cycleMs`, `inhaleMs`, `exhaleMs`, `totalMs` | Audio scheduler reads plan to compute next boundary in audio-clock seconds |
| `src/domain/sessionMath.ts` | `SessionFrame` (`phase`, `cycleIndex`, `phaseProgress`, `isComplete`) | Boundary detection: a transition between `cycleIndex`/`phase` between consecutive frames is the schedule trigger |
| `src/components/SessionControls.tsx` | Inline button strip (currently single Start/End button) | Extends to host the mute toggle inline (D-05) |
| `src/components/BreathingShape.tsx` | Orb + in-orb large phase label | Accepts a `leadInDigit?: 3 \| 2 \| 1` prop or sibling render to swap the In/Out label for the countdown numeral (D-14); orb stays at MID_SCALE during lead-in |
| `src/app/App.tsx` | Composition root + state machines | Adds `'idle' \| 'lead-in' \| 'running'` orchestration, audio engine instantiation/teardown, mute state, AC-failed flag |
| `vitest.setup.ts` | Test polyfills | Add a minimal `AudioContext` stub (constructor + `currentTime` getter + `createOscillator` / `createGain` / `createBiquadFilter` factories returning method-stub nodes + `resume`/`close`) |
| `src/styles/theme.css` | `@theme` tokens + scoped CSS | Optional: a `--color-mute-disabled` token for the AC-failed disabled icon state |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Web Audio nodes | Tone.js / howler.js | Both add 50–200KB and a synthesis abstraction layer Phase 3 doesn't need — only two cue voices and a tick. Pure Web Audio is the lower-dependency, higher-clarity choice. |
| In-tree `AudioContext` stub in `vitest.setup.ts` | `standardized-audio-context-mock@25.x` | The project's test pattern is "minimal local polyfills" (mirrors the HTMLDialogElement and matchMedia stubs already in `vitest.setup.ts`). A third-party mock adds a dep and behaves differently from the real spec in subtle ways. |
| 1-cue lookahead (D-12) | Pre-schedule entire session | D-12 is locked. Pre-scheduling cannot handle `extendTimedSession` cleanly and binds many oscillators to the audio graph. |
| `setInterval(scheduler, 25)` | `setTimeout` recursion, or a Worker | `setTimeout` recursion is the canonical Chris Wilson pattern (lets each tick re-arm with a fresh `Math.max(0, nextDeadline - now)`). A Worker is overkill for a 25 ms interval that only fires while a session is active. |

**Installation:**
```bash
# No-op. Web Audio is native; React/Vitest/jsdom already installed.
```

**Version verification (npm registry as of 2026-05-09):**
```bash
npm view react version           # 19.2.6 — installed: ^19.2.5 ✓
npm view vitest version          # 4.1.5 — installed: ^4.1.5 ✓
# Mock libraries deliberately not used:
# npm view standardized-audio-context-mock version  # 25.3.77 (NOT installed)
# npm view web-audio-test-api version               # 0.5.2 (NOT installed)
```
[VERIFIED: npm registry, 2026-05-09]

## Architecture Patterns

### System Architecture Diagram

```
                ┌──────────────────────────────────┐
                │  src/app/App.tsx (composition)   │
                │                                   │
   user click → │  appPhase: 'idle' →               │
   Start        │   'lead-in' (3 ticks @ 1 Hz)  →  │
                │   'running' (calls session.start) │
                │                                   │
                │  muted: boolean (default false)   │
                │  audioFailed: boolean             │
                └────┬───────────┬────────┬─────────┘
                     │           │        │
                     ▼           ▼        ▼
       ┌──────────────────┐ ┌─────────┐ ┌─────────────────────┐
       │ useAudioCues()   │ │ useSes- │ │ SessionControls     │
       │   (NEW HOOK)     │ │ sionEng │ │   [Start/End] [🔊]  │
       │                  │ │  (P1)   │ │   onMuteToggle      │
       │ owns AC          │ │ owns    │ │   audioAvailable    │
       │ lifecycle (D-09, │ │ Session │ └─────────────────────┘
       │  D-10, D-11)     │ │ Frame   │            │
       │                  │ └────┬────┘            │
       │ schedules cues   │      │                 │
       │ from plan + AC   │      │  frame          │
       │ clock (D-12)     │      ▼                 │
       │                  │ ┌─────────────────┐    │
       │ exposes:         │ │ BreathingShape  │    │
       │  - playTick()    │ │  (P2 orb +      │    │
       │  - setMuted()    │ │   leadInDigit?) │    │
       │  - status        │ └─────────────────┘    │
       └────┬─────────────┘                        │
            │                                      │
            │ AudioContext (created in onStartClick)
            ▼
       ┌────────────────────────────────────────┐
       │ Web Audio thread (audioCtx.currentTime)│
       │                                         │
       │ For each cue:                           │
       │   OscillatorNode(s) → BiquadFilterNode  │
       │     → GainNode (envelope) → destination │
       │                                         │
       │   start(when), gain ramp via            │
       │   setValueAtTime + setTargetAtTime,     │
       │   stop(when + tail)                     │
       └────────────────────────────────────────┘

Single-frame data flow (Phase 1/2 invariant): SessionFrame is the SOLE timing
authority for the running session. Audio derives boundary times from the same
plan but anchors them to audioCtx.currentTime captured at session t=0 (lead-in
end). No parallel timer drives audio.
```

### Recommended Project Structure

Add a new `src/audio/` directory. Rationale: keeps Web Audio synthesis isolated from React component code, mirrors the existing `src/domain/` split between pure domain math and React glue.

```
src/
├── audio/                     # NEW — Web Audio engine
│   ├── audioEngine.ts         # AudioContext factory + close, supportsAudio() check
│   ├── cueSynth.ts            # Pure functions: scheduleInCue(ctx, when), scheduleOutCue(ctx, when), scheduleTick(ctx, when), all return { gainNode, stopAt } so the caller can fade-out on mute
│   ├── lookaheadScheduler.ts  # Pure scheduler: given (currentTime, nextBoundaryTime, lookaheadSec), decides whether to schedule now
│   └── audioEngine.test.ts    # Tests against the AudioContext stub
├── hooks/
│   ├── useAudioCues.ts        # NEW — wraps audioEngine in a React hook with useEffect cleanup
│   └── useAudioCues.test.tsx  # NEW — tests scheduling behavior with stub AC + mocked SessionFrame
├── components/
│   ├── MuteToggle.tsx         # NEW — speaker / speaker-with-slash button, aria-pressed, disabled-when-AC-failed
│   ├── MuteToggle.test.tsx    # NEW
│   └── SessionControls.tsx    # MODIFY — host MuteToggle inline next to Start/End (D-05)
├── app/
│   └── App.tsx                # MODIFY — appPhase state machine, audio hook wiring, lead-in numeral plumb to BreathingShape
└── components/
    └── BreathingShape.tsx     # MODIFY — accept optional leadInDigit prop; render numeral in place of phaseLabel during lead-in (D-14)
```

### Pattern 1: Lookahead Scheduler (Chris Wilson canonical)

**What:** Combine a coarse `setTimeout` watchdog (25 ms) with sample-accurate `audioCtx.currentTime` lookahead (≥ 100 ms) so cues fire on the audio thread regardless of main-thread jitter.

**Why this matters here:** D-12 locks 1-cue lookahead. The naive alternative — `setTimeout(fireCue, msUntilNextBoundary)` — drifts under main-thread garbage collection / layout pauses and is the #1 cause of audible breathing-app misalignment.

**When to use:** Always, for the boundary-aligned cues. The lead-in ticks can use the same scheduler (simpler) or three independent `start(when)` schedules at lead-in begin.

**Example:**
```ts
// Source: web.dev/audio-scheduling (Chris Wilson) — verified pattern
// File: src/audio/lookaheadScheduler.ts (sketch)
const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_SEC = 0.1

interface SchedulerHandle {
  stop(): void
}

export function startScheduler(
  audioCtx: AudioContext,
  getNextBoundaryAudioTime: () => number | null,  // null = no more cues (session ended/complete)
  scheduleAtTime: (audioTime: number) => void,    // caller knows which cue (in vs out) based on context
): SchedulerHandle {
  let timeoutId: number | undefined

  const tick = () => {
    let next = getNextBoundaryAudioTime()
    while (next !== null && next < audioCtx.currentTime + SCHEDULE_AHEAD_SEC) {
      scheduleAtTime(next)
      next = getNextBoundaryAudioTime()  // advance to subsequent boundary
    }
    timeoutId = window.setTimeout(tick, LOOKAHEAD_MS)
  }

  tick()

  return {
    stop() {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    },
  }
}
```

**Key insight:** D-12's "1-cue lookahead" terminology is consistent with this pattern — at any moment, ONE upcoming boundary is scheduled into the audio graph. The scheduler `while`-loops only because a long main-thread stall could leave several boundaries within the lookahead window; almost always the loop body executes 0 or 1 times.

**Throttling note:** Chrome's intensive setTimeout throttling (1 Hz minimum in inactive tabs) does NOT apply to tabs that have made noise within the last 30 seconds. [VERIFIED: developer.chrome.com/blog/timer-throttling-in-chrome-88]. While a session is producing cues, the scheduler is exempt. This is fortunate: it means the existing `useSessionEngine` rAF (which IS throttled when hidden, dropping to 1 Hz) and the audio scheduler may diverge while the tab is hidden. See Pitfall 6.

### Pattern 2: Strike-and-Decay Bowl Synthesis

**What:** Build a soft, bowl/gong-like cue using 2–3 detuned `OscillatorNode`s mixed through a low-pass `BiquadFilterNode`, gated by a `GainNode` envelope (instant attack → exponential decay). No fade-in, no sustain — pure strike-and-decay (D-01).

**Why this approach:** A single sine oscillator sounds artificial. Real bowl resonators have a fundamental + a small set of inharmonic partials and a beating pattern from two close partials [VERIFIED: ResearchGate "Digital Synthesis of Sound Generated by Tibetan Bowls and Bells"; PMC10298245]. With 2–3 partials and slight detune, the result feels organic without crossing into a full physical-modeled instrument.

**Recommended starting parameters (subjective tuning expected during execution):**

| Cue | Fundamental | Partials (relative to fundamental) | Decay timeConstant | Total length |
|-----|-------------|-------------------------------------|---------------------|---------------|
| In (higher) | A4 = 440 Hz | 1.0× (sine), 2.76× (sine, gain 0.4), 5.40× (sine, gain 0.15) | 1.4 s | ~4 s tail |
| Out (lower) | A3 = 220 Hz | 1.0× (sine), 2.76× (sine, gain 0.4), 5.40× (sine, gain 0.15) | 1.8 s | ~5 s tail |
| Tick (lead-in) | 1200 Hz square→filtered, OR a 6 ms noise burst through a band-pass at 2 kHz | n/a | 0.04 s | 0.08 s |

Partial ratios 2.76 and 5.40 approximate the inharmonic mode pattern of struck circular plates [CITED: ccrma.stanford.edu/~carmenng/250b/icmc2002.pdf — Physical Model Synthesis of Bowl Resonators]. Both In and Out share the same partial ratios so they read as the "same instrument" struck at two pitches (D-02 + D-03).

**A/B candidates worth trying during execution (capture in plan as exploration tasks):**
- A4 = 440 / A3 = 220 (octave separation — most "obvious" pitch direction)
- E5 = 659 / E4 = 329 (slightly brighter, still calm — good if A4 feels too "yoga-cliché")
- F#4 = 370 / F#3 = 185 (slightly warmer than A; common alternative-tuning bowl pitch)

D-03 only locks "In higher than Out". Pitch ratio is execution-time tuning. Recommend the planner schedule a brief synthesis-tuning task with explicit "listen and pick" verification rather than locking Hz upfront.

**Why a tick (D-15), not a quieter bowl tone:** The tick must be perceptually distinct from the bowl cues so the listener can tell "lead-in is happening" vs "first phase has begun". A short noise-burst-through-filter or a brief square-through-low-pass-filter is timbrally orthogonal to a sine-additive bowl — the human ear discriminates them effortlessly. A muted bowl tone at the same pitch as the In cue would be ambiguous.

**Anti-pattern to avoid:** Don't use a pure sine wave with a long fade-in. The user explicitly chose strike-and-decay over swell (D-01); a sine fade-in reads as "siren" rather than "bowl".

**Example envelope (the load-bearing part):**
```ts
// Source: MDN AudioParam.setTargetAtTime + exponentialRampToValueAtTime
// File: src/audio/cueSynth.ts (sketch — In cue)
export function scheduleInCue(audioCtx: AudioContext, when: number, destination: AudioNode): CueHandle {
  const fundamental = 440  // A4
  const partials = [{ ratio: 1.0, gain: 1.0 }, { ratio: 2.76, gain: 0.4 }, { ratio: 5.40, gain: 0.15 }]
  const peakGain = 0.18    // master peak (well below 1.0 to leave headroom)
  const decayTimeConstant = 1.4

  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 3000  // tame any harsh upper edge
  filter.Q.value = 0.5

  const envelope = audioCtx.createGain()
  // Strike envelope: instant attack via setValueAtTime, exponential decay via setTargetAtTime.
  // setTargetAtTime is the right primitive for natural-sounding instrument decay (timeConstant = ~1/3 of audible length).
  envelope.gain.setValueAtTime(peakGain, when)
  envelope.gain.setTargetAtTime(0.0001, when + 0.005, decayTimeConstant)

  const oscillators = partials.map(({ ratio, gain }) => {
    const osc = audioCtx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = fundamental * ratio
    const partialGain = audioCtx.createGain()
    partialGain.gain.value = gain
    osc.connect(partialGain).connect(filter)
    osc.start(when)
    // Stop after ~5x timeConstant (~99% decayed). Adds a small extra tail to avoid clipping the inaudible asymptote.
    osc.stop(when + decayTimeConstant * 5 + 0.1)
    return osc
  })

  filter.connect(envelope).connect(destination)

  return {
    envelope,           // exposed so mute fade-out can ramp it down (D-08)
    scheduledAt: when,
    cleanupAt: when + decayTimeConstant * 5 + 0.2,  // when GC can release the nodes
  }
}
```

### Pattern 3: AudioContext Lifecycle as a React Hook (mirroring `useSessionEngine`)

**What:** A `useAudioCues` hook owns the AudioContext, the scheduler, and exposes a small imperative API. Lifecycle: created on `start()` invocation (D-09), closed in cleanup (D-11).

**When to use:** Phase 3 has exactly one consumer (App.tsx). The hook isolates Web Audio knowledge from the composition root and makes mocking trivial in tests.

**Why hook over class:** Class would force `useRef` boilerplate in App.tsx and would not be unit-testable in isolation. The Phase 1 pattern of `useSessionEngine` is the established shape.

**Example:**
```ts
// File: src/hooks/useAudioCues.ts (sketch)
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BreathingPlan } from '../domain/breathingPlan'
import { createAudioEngine, type AudioEngine } from '../audio/audioEngine'

export type AudioStatus = 'idle' | 'starting' | 'lead-in' | 'running' | 'failed'

export interface UseAudioCues {
  status: AudioStatus
  audioAvailable: boolean
  /** Called from the Start click handler (user gesture). May fail → status becomes 'failed'. */
  start(plan: BreathingPlan): Promise<void>
  /** Called when session ends. Closes AudioContext (D-11). */
  stop(): Promise<void>
  /** Mid-session phase boundary tick from the parent. Schedules next cue if not muted. */
  notifyPhaseBoundary(args: { newPhase: 'in' | 'out'; nowMs: number }): void
  setMuted(muted: boolean): void
  muted: boolean
}

export function useAudioCues(): UseAudioCues {
  const engineRef = useRef<AudioEngine | null>(null)
  const [status, setStatus] = useState<AudioStatus>('idle')
  const [muted, setMutedState] = useState(false)  // D-07: default ON
  const [audioAvailable, setAudioAvailable] = useState<boolean>(true)

  // useEffect cleanup: if the component unmounts mid-session, close the AC.
  // Mirrors useSessionEngine.ts:53-56 (cancelled flag + cleanup).
  useEffect(() => {
    return () => {
      void engineRef.current?.close()
      engineRef.current = null
    }
  }, [])

  const start = useCallback(async (plan: BreathingPlan) => {
    setStatus('starting')
    try {
      const engine = await createAudioEngine()  // throws on AC ctor failure or .resume() failure
      engineRef.current = engine
      engine.setMuted(muted)
      engine.scheduleLeadIn(/* tick at +0s, +1s, +2s; first In cue at +3s */)
      setStatus('lead-in')
    } catch (err) {
      setAudioAvailable(false)        // D-10: visuals-only fallback
      setStatus('failed')
    }
  }, [muted])

  const stop = useCallback(async () => {
    await engineRef.current?.close()
    engineRef.current = null
    setStatus('idle')
  }, [])

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next)
    engineRef.current?.setMuted(next)  // applies fade-out tail to active cue (D-08)
  }, [])

  const notifyPhaseBoundary = useCallback(
    (args: { newPhase: 'in' | 'out'; nowMs: number }) => {
      engineRef.current?.scheduleNextCue(args)
    },
    [],
  )

  return { status, audioAvailable, start, stop, notifyPhaseBoundary, setMuted, muted }
}
```

### Pattern 4: Lead-In State Machine in App.tsx (preserves SESS-05)

**What:** App.tsx tracks an `appPhase` enum (`'idle' | 'lead-in' | 'running'`) that gates whether to call `useSessionEngine.start()`. The lead-in is 3 seconds of pre-session UI; only at lead-in completion does the session clock begin (SESS-05).

**Why this matters:** `useSessionEngine.start(now)` records `startedAtMs = performance.now()` [CITED: src/domain/sessionController.ts:38-50]. If we called `start()` at button-press, the in-session clock would include the 3 s lead-in and `Remaining` would be ~9:57 by the time the first In phase actually begins. D-13 explicitly preserves SESS-05: lead-in is BEFORE t=0.

**Example:**
```tsx
// File: src/app/App.tsx (sketch — relevant excerpts)
type AppPhase = 'idle' | 'lead-in' | 'running'

const [appPhase, setAppPhase] = useState<AppPhase>('idle')
const audio = useAudioCues()

const onStartClick = async () => {
  setAppPhase('lead-in')
  // D-09: AudioContext is created in this user-gesture-derived call chain.
  const plan = createBreathingPlan(state.selectedSettings)
  await audio.start(plan)  // schedules 3 ticks + first In cue inside the audio engine

  // Visual countdown: 3 → 2 → 1 → first In phase. Use refs to avoid stale-closure
  // re-renders, OR drive the digit from the same audio clock so visual + tick stay locked.
  // Recommendation: derive visual digit from audioCtx.currentTime via rAF read while in lead-in.
  // Fallback (audio failed): drive digit from setTimeout chain (visuals-only path, D-10).

  // After 3 s of lead-in, switch to running and call session.start. This is the t=0 moment.
  await waitForLeadInCompletion()  // 3 s tracked from audioCtx.currentTime if available, else setTimeout
  setAppPhase('running')
  session.start()  // SESS-05: clock begins NOW, not at button-press
  // Audio engine has already scheduled the first In cue at audioCtx.currentTime + 3s,
  // i.e. at the same moment session.start() begins. They are co-anchored to the audio clock.
}
```

**Critical co-anchor invariant:** The first In cue MUST be scheduled at the same `audioCtx.currentTime` instant that `session.start()` is called. Both ride from the same anchor; the audio engine's `audioCtx.currentTime` at session start is the t=0 reference for all subsequent boundary computations.

If audio is unavailable (D-10), the lead-in still runs (visuals-only) using a `setTimeout` chain for the 3-2-1 digit transitions, and `session.start()` is called at the same 3 s point. The visuals stay aligned.

### Pattern 5: Mute Toggle with Boundary-Aligned Unmute (D-08)

**What:** Mute is a boolean React state owned by `useAudioCues`. Two behaviors:
1. **Mute mid-cue:** Apply `gain.setTargetAtTime(0.0001, currentTime, 0.05)` to the active cue's envelope GainNode. Time constant ~50 ms gives ~150 ms perceptual fade-out (3× constant ≈ 95% decayed). That sits in the D-08 100–300 ms band.
2. **Unmute mid-phase:** Update the mute state, but do NOT fire a "make-up" cue. The scheduler's pre-cue check reads the current `muted` value when the next boundary's lookahead window opens; if false, the next In/Out cue plays at its naturally scheduled boundary.

**Why this works under the 1-cue lookahead model:** The scheduler runs every 25 ms and checks the lookahead window. Mute is read inside `scheduleAtTime`. Because the lookahead is 100 ms and a single cue is in flight at most, the unmute decision propagates within a few hundred ms of toggling — which is well before the next boundary at typical BPM values (e.g., 5.5 BPM × 60 = 10.9 s cycle, ~5 s phases).

**Example:**
```ts
// File: src/audio/audioEngine.ts (sketch — mute fade)
function applyMuteFadeOut(activeCue: CueHandle, audioCtx: AudioContext) {
  // D-08: soft fade-out tail, NOT abrupt cut.
  // setTargetAtTime is the right primitive — exponentialRampToValueAtTime would
  // require an explicit endTime, while setTargetAtTime decays asymptotically.
  // timeConstant = 0.05 → ~150 ms to perceptual silence (3× = 95%).
  const NOW = audioCtx.currentTime
  // Cancel any pending future scheduled changes on this param so the fade wins.
  activeCue.envelope.gain.cancelAndHoldAtTime(NOW)
  activeCue.envelope.gain.setTargetAtTime(0.0001, NOW, 0.05)
}
```

**Pitfall:** If the active cue is already in deep decay (e.g., 4 s into a 5 s tail), applying a fade-out is functionally a no-op (and harmless). No special-case needed.

### Anti-Patterns to Avoid

- **Don't run a parallel timer for audio.** Audio anchors to `audioCtx.currentTime`; the scheduler's `setTimeout` is a watchdog, not a clock. Using `setInterval(fireCue, msUntilBoundary)` recreates the drift problem the lookahead pattern was invented to solve [VERIFIED: web.dev/audio-scheduling].
- **Don't create the AudioContext on app mount or first render.** D-09 is locked: AC is created in the Start click handler (user gesture). Browsers will create the AC in `suspended` state if the gesture chain is broken, and the first cue will silently no-op. [VERIFIED: MDN Web Audio Best Practices]
- **Don't re-use a closed AudioContext.** D-11: AC is closed on session end and a new one is created on next Start. `AudioContext.close()` returns a Promise that resolves when system audio resources are released; the context is permanently in `'closed'` state and cannot be `resume()`'d. [VERIFIED: MDN AudioContext.close]
- **Don't ramp gain to `0`.** `exponentialRampToValueAtTime(0, ...)` throws. Use `0.0001` and either `setTargetAtTime` (asymptotic, natural decay) or stop the oscillator after the ramp ends. [VERIFIED: MDN AudioParam.exponentialRampToValueAtTime]
- **Don't tie audio to `prefers-reduced-motion`.** Locked in CONTEXT (Deferred): reduced-motion users still get full audio. The orb already disables its motion under `prefers-reduced-motion: reduce` (Phase 2 D-05); audio is independent.
- **Don't add a closing-bell cue.** D-16 is explicit: last phase decays naturally, then silence. The `Session complete` text is the end signal.
- **Don't gate the lead-in numeral visuals behind "audio working".** If AC fails (D-10), the 3-2-1 numerals still render — they're a visual countdown, the tick is just an audio enhancement.
- **Don't reset mute state to ON between sessions in v1.** Phase 4 owns persistence (LOCL-01). For now: mute state is in-memory, defaults to ON on first visit, and survives across sessions within the same page load (since `App` doesn't unmount).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sample-accurate cue scheduling | Custom `setInterval` + `Date.now()` math | `audioCtx.currentTime` + lookahead | Audio thread is independent of main thread; only `currentTime` is sample-accurate [VERIFIED: web.dev/audio-scheduling] |
| Envelope shaping | Custom rAF gain ramp on the main thread | `GainNode.gain.setValueAtTime` + `setTargetAtTime` / `exponentialRampToValueAtTime` | AudioParam scheduling runs in the audio thread, immune to main-thread jitter [VERIFIED: MDN AudioParam] |
| Polyphony / mixing | Manual sample-buffer addition | Connect multiple GainNodes to one destination — Web Audio mixes natively | Free, sample-accurate, allocation-free at playtime |
| Low-pass filter for tone shaping | DSP-from-scratch | `BiquadFilterNode` with `type: 'lowpass'` | Native, hardware-accelerated, well-specified [VERIFIED: MDN BiquadFilterNode] |
| Audio-context state tracking across browsers | Custom polling | `audioCtx.state` + `statechange` event | Spec'd, includes `'interrupted'` state Safari uses [VERIFIED: MDN BaseAudioContext.state] |
| Mute toggle accessibility | Custom CSS-only icon | `<button type="button" aria-pressed={muted}>` with the speaker SVG inside | Standard WAI-ARIA toggle pattern; screen readers announce "Mute, pressed" / "Mute, not pressed" [VERIFIED: WAI-ARIA Button Pattern; testparty.ai/blog/accessible-toggle-buttons-modern-web-apps-complete-guide] |

**Key insight:** Web Audio is a remarkably complete, low-level API. For a two-cue + tick implementation, every primitive needed is either a single Web Audio node (Oscillator, Gain, BiquadFilter) or a single `AudioParam` scheduling method. Bringing in Tone.js or howler.js would be importing 100s of KB of abstraction over what amounts to ~150 lines of direct Web Audio code. The project's existing pattern of "no unnecessary deps, lean on the platform" (visible in the Phase 2 native `<dialog>` choice over a focus-trap library) should be continued here.

## Common Pitfalls

### Pitfall 1: AudioContext Created Outside the User-Gesture Chain
**What goes wrong:** AC starts in `'suspended'` state, the first scheduled cue silently fails to play, no error is thrown, user thinks audio is muted.
**Why it happens:** Calling `new AudioContext()` from `useEffect`, from a setTimeout, from an `await` after the first awaited Promise resolves (which breaks the gesture chain in some browsers), or from app mount.
**How to avoid:** Create the AudioContext synchronously inside the `onClick` handler of `Start session` (D-09). If `audioCtx.state === 'suspended'` after construction (Chrome occasionally does this), call `audioCtx.resume()` immediately — the resume call is also part of the gesture.
**Warning signs:** First cue is silent; subsequent cues work fine; `audioCtx.state` is `'suspended'` not `'running'`.

### Pitfall 2: Drift Between Audio Cues and Visual Orb
**What goes wrong:** Over a 10-minute session, the audio cues drift 100s of ms ahead of (or behind) the visual phase change.
**Why it happens:** Two timing sources. `useSessionEngine` uses `performance.now()`; `audioCtx.currentTime` is its own clock. They are NOT guaranteed to advance at exactly the same rate (small clock skew, ~10s of ppm).
**How to avoid:** At session t=0 (lead-in completion), capture both `performance.now()` and `audioCtx.currentTime` as the dual anchor. Compute the next boundary in the audio clock as `audioStart + (msSinceSessionStart / 1000)`. The visual orb consumes `SessionFrame.phaseProgress` (a derived value, not raw time); as long as the audio scheduler reads the SAME plan to compute boundaries, the perceptual drift over a single session is well below the audible threshold (~5 ms over 10 min at typical clock skew). Document the dual anchor as the load-bearing invariant.
**Warning signs:** Long-session UAT reveals the bowl strike comes during the orb's visible scaling motion rather than at its turning point. If observed: re-anchor every N cycles (e.g., every 10 cycles, recompute the audio anchor from a fresh `performance.now() - sessionStartedAtMs` reading).

### Pitfall 3: AudioContext Not Closed on Session End → Leak
**What goes wrong:** Each Start/End creates a new AudioContext. After ~6 sessions, Chrome refuses to create more (limit is 6 per tab in pre-v66; modern Chrome has higher but finite limit).
**Why it happens:** Forgetting to `await audioCtx.close()` in the end/complete path, or calling `close()` on an AC that has pending scheduled events (the call resolves but holds the AC alive).
**How to avoid:** D-11 is the explicit guard. `useAudioCues.stop()` MUST `await close()` and then null the ref. The hook's `useEffect` cleanup also closes on unmount. Test: rapid Start/End cycles in a Vitest test should observe `close()` calls equal to `start()` calls.
**Warning signs:** `Failed to construct 'AudioContext': maximum number of hardware contexts reached` console error after extended session-cycling testing.

### Pitfall 4: jsdom Has No Web Audio Implementation
**What goes wrong:** All tests of `useAudioCues` and `audioEngine` throw `ReferenceError: AudioContext is not defined` (or pass trivially without exercising real behavior).
**Why it happens:** jsdom does not implement Web Audio (open issue since 2018) [VERIFIED: github.com/jsdom/jsdom/issues/2900].
**How to avoid:** Add a minimal `AudioContext` stub to `vitest.setup.ts` mirroring the existing `HTMLDialogElement` and `matchMedia` polyfills. The stub needs:
- A constructor accepting an options object
- `currentTime` getter (return monotonically increasing number; can be backed by `performance.now() / 1000`)
- `state` getter returning `'running'` after construction (or `'suspended'` followed by a `.resume()` that flips to `'running'`)
- `destination` (a no-op AudioNode stub)
- `createOscillator()`, `createGain()`, `createBiquadFilter()` returning method-stub objects with `connect`, `start(when)`, `stop(when)`, `disconnect`, plus `gain`/`frequency` AudioParam stubs with `setValueAtTime`, `setTargetAtTime`, `exponentialRampToValueAtTime`, `cancelAndHoldAtTime`
- `close()` returning `Promise.resolve()`
- `resume()` returning `Promise.resolve()`
**Test strategy:** Spy on the stub's `start`/`stop` calls with `vi.fn()` to assert "cue X scheduled at audioTime Y". Use a controllable `currentTime` via a `vi.useFakeTimers()`-driven mock or a manual setter in the stub.
**Warning signs:** Any test importing `audioEngine` fails at import time with `AudioContext is not defined`.

### Pitfall 5: Background Tab Throttling Skewing Visual vs Audio
**What goes wrong:** User starts a session, then switches to another tab. After 5 minutes hidden, the rAF in `useSessionEngine` is throttled to ~1 Hz (per browser default). Audio scheduler `setTimeout(25 ms)` is also throttled BUT the audio context is exempt because the page is producing sound. Switching back: the visual orb has fallen behind the audio clock.
**Why it happens:** Different throttling rules for different APIs. rAF throttles aggressively when hidden; setTimeout throttles to 1 s after 5 min hidden + 30 s of silence; AudioContext is unaffected. [VERIFIED: developer.chrome.com/blog/timer-throttling-in-chrome-88]
**How to avoid:** On `document.visibilitychange`:
- When `document.hidden === true`: option A (recommended) — let audio continue (calming experience continues for the user listening through headphones), accept that the visual orb will catch up on return via the next `completeIfNeeded` call (which uses `nowMs - state.startedAtMs` math, so no drift accrues, just a visual freeze + jump).
- When `document.hidden === false`: no-op required — `useSessionEngine`'s `tick()` will re-run on the first un-throttled rAF and recompute `lastFrame` from `performance.now() - startedAtMs`, snapping the orb back to truth.
- Explicit `audioCtx.suspend()` on `hidden` is NOT recommended — it would mute the user's intentional audio session for no UX benefit, and risk the iOS `'interrupted'` state path (Pitfall 6).
**Warning signs:** Tab switch + return shows the orb at the wrong scale momentarily (acceptable; will correct within 1 frame).

### Pitfall 6: iOS Safari `'interrupted'` State
**What goes wrong:** User receives a phone call, opens Camera, or backgrounds the browser briefly. AudioContext silently moves to `'interrupted'` state. On return, audio is silent until manually `.resume()`'d. [VERIFIED: bugs.webkit.org/show_bug.cgi?id=231105; MDN BaseAudioContext.state]
**Why it happens:** iOS treats Web Audio as a system audio resource and pre-empts it for OS-level audio interruptions. Unlike `'suspended'`, the page can't predict when this happens.
**How to avoid:** Listen for `audioCtx.addEventListener('statechange', ...)`. If state becomes `'interrupted'` mid-session, do nothing (audio will resume when iOS releases the interrupt). If state is still `'interrupted'` when the next cue is due, the cue will queue and play late or be dropped. Optional defensive measure: on next user interaction (any in-app click), check `audioCtx.state` and call `resume()` if `'interrupted'`. For a hands-off breathing app where the user isn't interacting, this is a known limitation — document in Open Questions / accept.
**Warning signs:** iOS UAT reports of "session went silent after I picked up a call".

### Pitfall 7: iOS Hardware Mute Switch Mutes Web Audio
**What goes wrong:** iOS user has the physical ringer/mute switch flipped to silent. Web Audio output is muted; HTML5 `<audio>` is not [VERIFIED: bugs.webkit.org/show_bug.cgi?id=237322].
**Why it happens:** iOS routes Web Audio through the ringer channel, not the media channel. This is a longstanding WebKit decision.
**How to avoid (workaround):** Play a 1-frame silent `<audio>` element with a short data URI MP3 just before resuming the AudioContext. This causes iOS to upgrade the page to the media audio channel; subsequent Web Audio respects the volume rocker but ignores the ringer switch [CITED: github.com/swevans/unmute; mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos].
**Recommendation for v1:** Do NOT apply this workaround. Reasons:
1. It introduces a hidden side-effect in the audio path that is hard to test and harder to reason about.
2. The user explicitly chose Phase 3 to deliver a calm, visual-first experience where audio is optional. iOS users with the ringer off are signalling "I want a quiet device" — overriding that breaks user intent.
3. D-10 already covers the failure path: if audio doesn't play, the app remains fully usable visually.
**If user reports this in UAT and wants it fixed:** flag for a discuss-phase decision, since the choice carries privacy/UX tradeoffs.

### Pitfall 8: `extendTimedSession` During an Active Cue
**What goes wrong:** User extends a timed session during the In phase. The audio scheduler had already locked in the next Out cue at the original boundary, but the plan changes mid-flight.
**Why it does NOT actually go wrong (clarification):** `extendTimedSession` only changes `totalMs`, NOT `cycleMs`/`inhaleMs`/`exhaleMs` [VERIFIED: src/domain/sessionController.ts:71-87 — only `durationMinutes` is updated, plan is recreated but with the same BPM and ratio]. Phase boundaries are unchanged. The 1-cue lookahead simply continues; the scheduler will eventually decline to schedule the cue beyond `totalMs` (when computing `getNextBoundaryAudioTime`).
**How to avoid:** `getNextBoundaryAudioTime` should consult `plan.totalMs` and return `null` when the next boundary would land at or beyond session-end. The `useEffect` that watches `state.status === 'complete'` triggers `audio.stop()`, which closes the AC after the in-flight cue's natural decay finishes (or shortly after — D-16 says natural decay, no closing bell, so just `setTimeout(close, decayTailMs)` is sufficient).
**Warning signs:** Extra cue plays after `Session complete` text appears.

### Pitfall 9: `cancelAndHoldAtTime` Browser Support
**What goes wrong:** `AudioParam.cancelAndHoldAtTime()` (used in mute fade-out, Pattern 5) had spotty Safari support historically.
**Why it might happen:** Safari before ~16.4 had bugs with `cancelAndHoldAtTime`.
**How to avoid:** Modern Safari (17+) supports it. For belt-and-suspenders: fall back to `cancelScheduledValues(now)` followed by `setValueAtTime(currentGainValue, now)`. Read `param.value` immediately before to capture the current gain. This achieves the same "freeze and ramp from current" behavior cross-browser.
**Warning signs:** Mute fade-out skips the natural decay value and snaps to a different gain (audible click).

## Code Examples

Verified patterns from official sources:

### Polyfill `AudioContext` in `vitest.setup.ts`

```ts
// Source: jsdom issue #2900 + standardized-audio-context-mock spec; mirrors the
// HTMLDialogElement and matchMedia polyfills already in this file.

if (typeof window !== 'undefined' && !window.AudioContext) {
  class FakeAudioParam {
    value = 0
    setValueAtTime = vi.fn()
    setTargetAtTime = vi.fn()
    exponentialRampToValueAtTime = vi.fn()
    linearRampToValueAtTime = vi.fn()
    cancelScheduledValues = vi.fn()
    cancelAndHoldAtTime = vi.fn()
  }

  class FakeAudioNode {
    connect = vi.fn().mockReturnThis()
    disconnect = vi.fn()
  }

  class FakeOscillatorNode extends FakeAudioNode {
    type: OscillatorType = 'sine'
    frequency = new FakeAudioParam()
    detune = new FakeAudioParam()
    start = vi.fn()
    stop = vi.fn()
  }

  class FakeGainNode extends FakeAudioNode {
    gain = new FakeAudioParam()
  }

  class FakeBiquadFilterNode extends FakeAudioNode {
    type: BiquadFilterType = 'lowpass'
    frequency = new FakeAudioParam()
    Q = new FakeAudioParam()
    gain = new FakeAudioParam()
  }

  class FakeAudioContext {
    state: AudioContextState = 'running'
    sampleRate = 44100
    destination = new FakeAudioNode()
    listeners = new Map<string, Set<EventListener>>()
    private _start = performance.now() / 1000
    get currentTime() {
      return performance.now() / 1000 - this._start
    }
    constructor(_options?: AudioContextOptions) {}
    createOscillator() { return new FakeOscillatorNode() }
    createGain() { return new FakeGainNode() }
    createBiquadFilter() { return new FakeBiquadFilterNode() }
    resume = vi.fn(async () => { this.state = 'running' })
    suspend = vi.fn(async () => { this.state = 'suspended' })
    close = vi.fn(async () => { this.state = 'closed' })
    addEventListener = vi.fn()
    removeEventListener = vi.fn()
  }

  Object.defineProperty(window, 'AudioContext', { writable: true, value: FakeAudioContext })
}
```
[VERIFIED: vitest.dev/guide/mocking — `vi.stubGlobal` and `vi.fn()` patterns; pattern mirrors existing /Users/lucindo/Code/hrv/vitest.setup.ts:6-44]

### Mute Toggle Button (D-05, D-06, D-07)

```tsx
// File: src/components/MuteToggle.tsx (sketch)
// Source: WAI-ARIA Button Pattern; testparty.ai/blog/accessible-toggle-buttons-modern-web-apps-complete-guide

interface MuteToggleProps {
  muted: boolean
  audioAvailable: boolean   // false → AC failed → button disabled (D-10)
  onToggle(): void
}

export function MuteToggle({ muted, audioAvailable, onToggle }: MuteToggleProps) {
  const label = !audioAvailable
    ? 'Audio unavailable in this browser'
    : muted
      ? 'Unmute audio cues'
      : 'Mute audio cues'

  return (
    <button
      type="button"
      aria-pressed={muted}
      aria-label={label}
      title={label}
      disabled={!audioAvailable}
      onClick={onToggle}
      className="grid size-11 place-items-center rounded-full border border-teal-200 bg-white text-teal-800 shadow-sm transition hover:bg-teal-50 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {muted ? <SpeakerSlashIcon aria-hidden="true" /> : <SpeakerIcon aria-hidden="true" />}
    </button>
  )
}
```

Notes on the markup:
- `aria-pressed={muted}` is the canonical toggle-state attribute. Screen readers announce "Mute audio cues, button, pressed" when muted [VERIFIED: WAI-ARIA Button Pattern].
- `aria-label` carries the action verb ("Unmute…" / "Mute…") rather than a static name. The label changing with state is acceptable for icon-only buttons; an alternative pattern keeps the label static ("Mute") and relies on `aria-pressed` alone for state — also acceptable. Recommendation: use action-verb labels because the icon-only nature means the label is the only readable text.
- `disabled={!audioAvailable}` is the D-10 disabled-icon affordance. The 45% opacity (`disabled:opacity-45`) matches Phase 2's existing disabled-stepper pattern from `SettingsStepper.tsx` and `SessionControls.tsx`.
- `size-11` = 44 px (Tailwind v4 token). Matches the Phase 2 D-17 hit-area floor. [CITED: src/components/SettingsStepper.tsx:45 uses `size-12` for steppers; mute icon at `size-11` matches the floor.]
- Speaker SVG icons should be inline SVG (not icon font, no extra dep). Lucide-react or Heroicons would be over-import for two icons; a 24-line inline SVG per icon is sufficient.

### Inline Mute in `SessionControls`

```tsx
// File: src/components/SessionControls.tsx (sketch — D-05 inline placement)
export function SessionControls({ status, onStart, onEnd, muted, audioAvailable, onMuteToggle }: SessionControlsProps) {
  const isRunning = status === 'running'
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        type="button"
        className="min-h-11 flex-1 rounded-full bg-teal-700 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-800 active:bg-teal-900 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-breathing-accent focus-visible:ring-offset-2"
        onClick={isRunning ? onEnd : onStart}
      >
        {isRunning ? 'End session' : 'Start session'}
      </button>
      <MuteToggle muted={muted} audioAvailable={audioAvailable} onToggle={onMuteToggle} />
    </div>
  )
}
```

Notes:
- `flex items-center gap-3` puts the mute button immediately right of the primary action (D-05: "inline next to the primary Start/End button").
- `flex-1` on the primary button preserves its full-width feel; the mute button's `size-11` claims a small fixed slot on the right.
- The mute toggle is rendered in BOTH idle and running states (D-05 "always visible").
- Locked copy `Start session` / `End session` is preserved verbatim (Phase 1 D-11, D-15).

### Lead-In Numeral in `BreathingShape`

```tsx
// File: src/components/BreathingShape.tsx (sketch — additive prop for D-14)

export interface BreathingShapeProps {
  frame: SessionFrame | null
  leadInDigit?: 3 | 2 | 1 | null   // NEW: when set, renders the digit in place of the phaseLabel
}

// Wrapper extension:
export function BreathingShape({ frame, leadInDigit }: BreathingShapeProps) {
  if (frame === null && leadInDigit == null) return null
  if (leadInDigit != null) return <BreathingShapeLeadIn digit={leadInDigit} />
  return <BreathingShapeBody frame={frame!} />
}

function BreathingShapeLeadIn({ digit }: { digit: 1 | 2 | 3 }) {
  // Reuse the orb structure but: (a) no scaling — orb stays at MID_SCALE, (b) display the digit
  // in the same large-display position as the In/Out label.
  return (
    <div
      role="img"
      aria-label={`Lead-in: ${digit}`}
      className="relative mx-auto my-12 grid place-items-center"
      style={{ width: 'var(--orb-size)', height: 'var(--orb-size)' } as CSSProperties}
    >
      <span aria-hidden="true" className="orb-ring--outer absolute inset-0 rounded-full border-solid" />
      <span
        aria-hidden="true"
        className="orb-ring--inner absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-solid"
        style={{ width: '58%', height: '58%' }}
      />
      <div className="orb absolute inset-0 rounded-full" style={{ transform: 'scale(0.79)' }}>
        <span aria-hidden="true" className="orb-layer--in absolute inset-0 rounded-full" />
      </div>
      <span className="relative z-10 text-7xl font-semibold tracking-tight text-slate-900 sm:text-8xl">
        {digit}
      </span>
    </div>
  )
}
```

Notes:
- The orb is locked at `MID_SCALE` (0.79) during lead-in, exactly like reduced-motion mode (Phase 2 D-06). This signals "not yet breathing" — no scale animation.
- The In gradient layer is shown alone (no Out layer crossfade, no `data-phase` attribute). The lead-in is a neutral pre-state.
- The digit uses `text-7xl sm:text-8xl` (one step larger than the `text-5xl sm:text-6xl` In/Out label) so the countdown reads as visually distinct + dominant.
- `aria-label="Lead-in: 3"` (etc.) lets screen-reader users hear the countdown via the live region update.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `webkitAudioContext` prefix in Safari | Unprefixed `AudioContext` | Safari 14.1 (2021) | The prefix is no longer needed in any actively supported browser. Document but don't add a fallback. [VERIFIED: caniuse "Web Audio API"] |
| `audioParam.value = x` for changes | `setValueAtTime(x, when)` + scheduling methods | Web Audio v1 (always preferred) | Direct value assignment is overridden by any subsequent scheduled change. For audio that consumes the AudioParam scheduling timeline, the scheduling methods are the only correct option. [VERIFIED: MDN AudioParam] |
| `addListener` / `removeListener` on MediaQueryList | `addEventListener('change', …)` / `removeEventListener` | DOM Spec ~2016, broad support | Project already uses the modern API in `usePrefersReducedMotion`. Maintain the same convention for any audio-related event listeners. |
| Tone.js / howler.js for any Web Audio work | Direct Web Audio API for narrow scopes | Always for two-cue scopes | Adding a synthesis library for two voices is over-engineering. Reach for it only if Phase 4+ adds 5+ voices or complex scheduling like polyphonic chord cues. |

**Deprecated / outdated (do NOT use):**
- `OscillatorNode.noteOn(when)` / `noteOff(when)` — replaced by `start(when)` / `stop(when)` long ago. Some Stack Overflow answers still show the old API. [VERIFIED: MDN OscillatorNode]
- `ScriptProcessorNode` — replaced by `AudioWorkletNode`. Not relevant here (we don't need custom DSP), but noted because some "Web Audio synthesis" tutorials still reach for it.

## Assumptions Log

> List of claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A4 (440 Hz) for In and A3 (220 Hz) for Out is a calm, ergonomic starting point | Pattern 2 — Strike-and-Decay Bowl Synthesis | Low. D-03 only locks "In higher than Out". Final tuning is execution-time; recommend a tuning task during plan execution. |
| A2 | Partial ratios 2.76 and 5.40 (with main peak at 1.0) approximate a soft bowl timbre adequately for v1 | Pattern 2 | Low. These ratios are from the cited bowl-resonator paper but real bowls vary widely. The planner should schedule a "synthesis tuning" exploration task. |
| A3 | Mute fade-out timeConstant 0.05 → ~150 ms perceptual decay sits well in the D-08 100–300 ms band | Pattern 5 | Low. Within the user-locked band; subjective tuning during execution. |
| A4 | Background-tab behavior: let audio continue, accept brief visual desync on return (preferred over auto-suspend) | Pitfall 5 / Open Question Q3 | Medium. This is a UX call. If user's mental model is "switching tabs = pause", auto-suspend would be more correct. Recommend confirming via a discuss-phase round with the user before locking. |
| A5 | Tick at 1200 Hz square→filtered (or 6 ms noise burst through 2 kHz band-pass) is timbrally distinct from the bowl cues | Pattern 2 | Low. D-15 only locks "clearly distinct from the bowl cues". Final timbre is execution-time. |
| A6 | iOS hardware mute switch workaround should NOT be applied in v1 | Pitfall 7 / Open Question Q5 | Medium. If user expects audio to play when the iOS ringer is off, they will perceive this as a bug. Recommend confirming the "do not override user's quiet-device intent" framing in discuss-phase. |
| A7 | The first In cue is co-anchored to `audioCtx.currentTime` at the moment `session.start()` is called, and subsequent boundaries are computed in audio-clock space from that anchor | Pattern 4 / Pitfall 2 | Low. This is the load-bearing invariant; failing to do this re-creates the drift problem. |
| A8 | Mute state lives only in memory for v1 (resets to ON on each fresh page load) — Phase 4 will own persistence (LOCL-01) | Pattern 5 / "Don't Hand-Roll" / CONTEXT Deferred Ideas | Low. Explicitly deferred in CONTEXT. |

**Confirmation needed before locking:**
- **A4 (background-tab behavior)** and **A6 (iOS silent-switch)** are the two assumptions worth surfacing to the user via discuss-phase. The remaining assumptions are subjective tuning that the planner can leave open for execution-time A/B.

## Open Questions

1. **Specific In/Out frequencies and partial ratios for the bowl timbre** *(CONTEXT Claude's Discretion)*
   - What we know: D-03 locks In > Out; meditation apps commonly use A4/A3, F#4/F#3, or E5/E4 as bowl pitches; bowl partial ratios cluster around 2.76 and 5.40 from the inharmonic mode pattern.
   - What's unclear: which specific pitch pair feels most "calm and trustworthy" for this app's audience (Forrest viewers + general meditators).
   - Recommendation: planner adds a Wave 0 or early Wave 1 synthesis-tuning task that builds A/B/C cue presets and produces a short demo file or live demo for human listening selection. Capture the chosen Hz values + partials in the task summary so they can be locked into `cueSynth.ts`.

2. **End-session button pressed during lead-in** *(CONTEXT Deferred — explicitly flagged for planner)*
   - What we know: The user noted this case wasn't deeply discussed and deferred it to the planner for a sensible default.
   - What's unclear: whether End during lead-in should (a) cancel back to idle with no modal (lead-in hasn't really "started" the session), or (b) open the timed-end modal (the user pressed Start, treat it as a session even pre-t=0).
   - Recommendation: option (a). Lead-in is pre-session; cancellation should be friction-free (single click → back to idle). The timed-end modal exists to defend against accidental loss of an in-progress session; lead-in has produced 0 minutes of session, so the modal is theatre. Implementation: while `appPhase === 'lead-in'`, the `End session` button (which the inline strip already shows because `status === 'idle'` is false-ish — actually `useSessionEngine` is still `idle`, so the button shows `Start session`). A clean approach: during lead-in, the primary button shows `Cancel` (or stays as the spinner / placeholder), and clicking it tears down the lead-in (close audio engine, clear timeouts, return to `appPhase === 'idle'`). Confirm UI copy in plan-check or discuss-phase if the planner is uncertain.

3. **Background-tab behavior (`visibilitychange`)** *(CONTEXT Claude's Discretion)*
   - What we know: SESS-05 says timing must not drift. `useSessionEngine` uses rAF + `performance.now() - startedAtMs` math, which means the underlying timing is preserved; only the rendered frame may pause. The audio context continues unimpeded by tab visibility (Chrome explicitly exempts audio-producing tabs from setTimeout throttling).
   - What's unclear: whether to (a) let audio continue (a user listening through headphones gets uninterrupted breathing cues), or (b) suspend audio on hidden + resume on visible (more conservative; matches "switch tab = pause" mental model some apps use).
   - Recommendation: option (a) — let audio continue. The hands-off framing of the app explicitly assumes the user might not be looking at the screen. Document this in the SUMMARY at execution time so a future change is explicit. Confirm with user in discuss-phase if uncertain.

4. **AudioContext options (`sampleRate`, `latencyHint`)** *(CONTEXT Claude's Discretion)*
   - What we know: Defaults are `latencyHint: 'interactive'` and `sampleRate: device-preferred` (typically 44100 or 48000) [VERIFIED: MDN].
   - What's unclear: nothing important — defaults are exactly right for this use case. `latencyHint: 'playback'` would allow lower CPU at the cost of higher latency (~100–500 ms), but breathing cues' 100 ms scheduling buffer expects `'interactive'` (~10–20 ms). Custom `sampleRate` would force resampling and is a CPU + quality regression for no benefit.
   - Recommendation: omit options entirely; use defaults. Explicitly: `new AudioContext()` with no arguments.

5. **iOS silent switch workaround** *(CONTEXT Claude's Discretion)*
   - What we know: iOS routes Web Audio through the ringer channel, so the hardware mute switch silences cues. A 1-frame silent `<audio>` element trick can promote the page to the media channel.
   - What's unclear: whether the trick is in scope for v1.
   - Recommendation: NOT in v1. See Pitfall 7 + Assumption A6. The user's intent when flipping the ringer to silent is "I want a quiet device" — the breathing app should respect that; if the user wants audio they can flip the switch back. D-10 already covers the visuals-only fallback path. Surface to discuss-phase if the planner wants to challenge this.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Web Audio API | All audio synthesis (AUDI-01) | ✓ (browser-native, all modern browsers) | n/a | D-10 visuals-only path (mute disabled, app fully usable) |
| React | App composition | ✓ | 19.2.5 (installed) | — |
| Vitest | Tests | ✓ | 4.1.5 (installed) | — |
| jsdom | Vitest test environment | ✓ | 29.1.1 (installed) | Local AudioContext stub in `vitest.setup.ts` (jsdom does NOT implement Web Audio) |
| TypeScript | Type checking | ✓ | ~6.0.2 (installed) | — |
| Tailwind v4 | MuteToggle / SessionControls styling | ✓ | 4.3.0 (installed) | — |
| `@testing-library/react` | Component tests | ✓ | 16.3.2 (installed) | — |
| `@testing-library/user-event` | Interaction tests | ✓ | 14.6.1 (installed) | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — every required tool is already in `package.json`. The Web Audio API itself is the only "external" dependency, and it's a browser primitive with the explicit D-10 visuals-only fallback for browsers/contexts where it's unavailable.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 with jsdom environment |
| Config file | `vite.config.ts` (test block); `vitest.setup.ts` for polyfills |
| Quick run command | `npm run test:run -- src/audio src/hooks/useAudioCues src/components/MuteToggle` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDI-01 | Cues fire at phase boundaries (In cue at start of In phase, Out cue at start of Out phase) | unit (audio engine + scheduler) | `npm run test:run -- src/audio/audioEngine.test.ts` | ❌ Wave 0 |
| AUDI-01 | First In cue co-anchored with `session.start()` after lead-in completion | unit (lead-in state machine + audio engine integration) | `npm run test:run -- src/hooks/useAudioCues.test.tsx` | ❌ Wave 0 |
| AUDI-01 | 3-2-1 lead-in numerals render in orb, ticks scheduled at +0/+1/+2 s, first In cue at +3 s | integration (App.tsx) | `npm run test:run -- src/app/App.audio.test.tsx` | ❌ Wave 0 |
| AUDI-01 | AudioContext is created inside the Start click handler (user gesture) | unit (assert constructor call site is reachable from click) | `npm run test:run -- src/app/App.audio.test.tsx` | ❌ Wave 0 |
| AUDI-01 | AudioContext is closed on session end (manual end, complete, modal-confirm end) | unit (assert `close()` called on each end path) | `npm run test:run -- src/app/App.audio.test.tsx` | ❌ Wave 0 |
| AUDI-01 | `extendTimedSession` does not break scheduling (boundaries unchanged) | unit | `npm run test:run -- src/audio/audioEngine.test.ts` | ❌ Wave 0 |
| AUDI-02 | Mute toggle button has `aria-pressed`, accessible name, 44×44 hit area | unit (component test) | `npm run test:run -- src/components/MuteToggle.test.tsx` | ❌ Wave 0 |
| AUDI-02 | Muting mid-cue applies a fade-out (no abrupt cut) | unit (assert `setTargetAtTime` called with timeConstant ≤ 0.1) | `npm run test:run -- src/audio/audioEngine.test.ts` | ❌ Wave 0 |
| AUDI-02 | Unmuting mid-phase does not fire a cue; next cue plays at next boundary | unit | `npm run test:run -- src/audio/audioEngine.test.ts` | ❌ Wave 0 |
| AUDI-02 | App is fully usable when AudioContext construction fails (visuals-only, mute icon disabled) | integration (mock `AudioContext` constructor to throw) | `npm run test:run -- src/app/App.audio.test.tsx` | ❌ Wave 0 |
| AUDI-02 | Mute state defaults to ON (audio playing) on first mount | unit | `npm run test:run -- src/components/MuteToggle.test.tsx` | ❌ Wave 0 |
| Manual UAT | Audio cues feel calm, In > Out pitch is correct, fade-out is not jarring | manual | n/a | n/a |
| Manual UAT (mobile) | iOS Safari behavior: silent-switch effect, interrupted state on phone call | manual | n/a | n/a |

### Sampling Rate

- **Per task commit:** `npm run test:run -- src/audio src/hooks/useAudioCues src/components/MuteToggle` (focused on the new audio surface, ~5–15 s)
- **Per wave merge:** `npm run test:run` (full suite, including Phase 1 and Phase 2 regression)
- **Phase gate:** Full suite green + manual UAT pass before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.setup.ts` — extend with `AudioContext` stub (Pattern: Code Examples → "Polyfill `AudioContext` in `vitest.setup.ts`")
- [ ] `src/audio/audioEngine.test.ts` — covers AUDI-01 scheduling and AUDI-02 mute behavior
- [ ] `src/audio/cueSynth.test.ts` — covers cue construction (oscillator count, frequency values, envelope params asserted on the stub)
- [ ] `src/audio/lookaheadScheduler.test.ts` — covers scheduler tick logic with controllable `currentTime`
- [ ] `src/hooks/useAudioCues.test.tsx` — covers React hook lifecycle, AC failure path, mute prop reactivity
- [ ] `src/components/MuteToggle.test.tsx` — covers `aria-pressed`, disabled-when-AC-failed, click toggles state
- [ ] `src/app/App.audio.test.tsx` — covers integration: lead-in numerals visible, AC created on Start click, AC closed on each end path, end-during-lead-in cancels cleanly

## Security Domain

The `security_enforcement` flag is not explicitly set in `.planning/config.json` — treat as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no accounts in v1, per PROJECT.md) |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | minimal | The mute toggle only takes a boolean from a button click; the BPM/Ratio/Duration steppers (which feed into `breathingPlan`) already validate via `validateSettings` [CITED: src/domain/breathingPlan.ts:23] from prior phases |
| V6 Cryptography | no | — (no crypto used; D-04 forbids external audio assets) |
| V7 Error Handling | yes | AudioContext construction failure must NOT log raw error stacks to the user; D-10 says no toast, just disable the icon. Catch the exception, set `audioAvailable=false`, log to console only |
| V8 Data Protection | no | No user data leaves the page; no telemetry |
| V9 Communications | no | No network calls in Phase 3 (D-04) |
| V12 File Upload | no | — |
| V13 API | no | — |

### Known Threat Patterns for Web Audio + React

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hung AudioContext leaking memory across rapid Start/End cycles | Denial of Service (resource exhaustion) | Always `await audioCtx.close()` in `useAudioCues.stop()` and in `useEffect` cleanup. Test asserts `close` calls match `start` calls across rapid cycling. |
| Audio plays before user gesture (autoplay policy violation) | Spoofing user intent | Create AC inside Start click handler (D-09); resume immediately if `state === 'suspended'`. The browser already enforces this via the autoplay policy — a violation = silent failure, not an exploit. |
| Untrusted Hz value injected into oscillator (unlikely here — Hz values are constants) | Tampering | Hz values are hard-coded constants in `cueSynth.ts`; not user-controlled. No mitigation needed unless v2 `CUST-01` lets users set frequencies. |
| Tab steals audio from another tab via persistent AC | Denial of Service (audio resource) | Browser-managed; close on session end (D-11) and on visibility-hidden + idle (optional, see Pitfall 5). |

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — Web Audio API Best Practices: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices (autoplay policy, AudioParam scheduling precedence, cleanup)
- MDN Web Docs — AudioContext constructor: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext (latencyHint defaults, sampleRate, sinkId)
- MDN Web Docs — AudioParam.exponentialRampToValueAtTime: https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/exponentialRampToValueAtTime (cannot ramp to 0; need setValueAtTime first)
- MDN Web Docs — AudioParam.setTargetAtTime: https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime (timeConstant math, instrument decay pattern, combining with stop)
- MDN Web Docs — BaseAudioContext.state: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state (running/suspended/closed/interrupted, statechange event, iOS interruption pattern)
- web.dev — A Tale of Two Clocks (Chris Wilson): https://web.dev/audio-scheduling (canonical lookahead scheduler pattern, exact constants 25 ms / 100 ms)
- developer.chrome.com — Heavy throttling of chained JS timers in Chrome 88: https://developer.chrome.com/blog/timer-throttling-in-chrome-88 (audio-producing tabs are exempt from intensive throttling)
- WAI-ARIA Button Pattern (W3C APG): https://www.w3.org/WAI/ARIA/apg/patterns/button/ (toggle-button accessibility, aria-pressed)
- bugs.webkit.org #237322 — Web Audio muted when iOS ringer is muted: https://bugs.webkit.org/show_bug.cgi?id=237322 (load-bearing iOS quirk)
- bugs.webkit.org #231105 — AudioContext interrupted state on macOS Safari background: https://bugs.webkit.org/show_bug.cgi?id=231105
- jsdom issue #2900 — Implement Web Audio: https://github.com/jsdom/jsdom/issues/2900 (jsdom does NOT implement Web Audio; necessitates the stub)

### Secondary (MEDIUM confidence)
- ResearchGate — Digital Synthesis of Sound Generated by Tibetan Bowls and Bells: https://www.researchgate.net/publication/296419561 (partial ratios, beating frequencies)
- CCRMA Stanford — Physical Model Synthesis and Performance Mappings of Bowl Resonators (Carmen Ng): https://ccrma.stanford.edu/~carmenng/250b/icmc2002.pdf (modal synthesis approach)
- PMC10298245 — Singing bowl brainwave synchronization study: https://pmc.ncbi.nlm.nih.gov/articles/PMC10298245/ (482.61 Hz fundamental observed in bowl, 6.68 Hz beating, ~50 s decay)
- testparty.ai — Complete Guide to Accessible Toggle Buttons: https://testparty.ai/blog/accessible-toggle-buttons-modern-web-apps-complete-guide (mute button screen reader announcement examples)
- mattmontag.com — Unlock JavaScript Web Audio in Safari: https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos (silent-switch workaround documentation, NOT applied per A6)
- github.com/swevans/unmute: https://github.com/swevans/unmute (silent-switch workaround library, NOT used)

### Tertiary (LOW confidence — flagged for verification at execution)
- Subjective tuning of A4/A3 vs E5/E4 vs F#4/F#3 — recommend A/B during execution
- Subjective tuning of decay timeConstant 1.4 / 1.8 — recommend A/B during execution
- Subjective tuning of mute fade-out timeConstant 0.05 — verify in 100–300 ms band perceptually

### Repo references (HIGH confidence — read directly)
- `/Users/lucindo/Code/hrv/.planning/phases/03-optional-generated-audio-cues/03-CONTEXT.md` (locked decisions)
- `/Users/lucindo/Code/hrv/.planning/REQUIREMENTS.md` (AUDI-01, AUDI-02)
- `/Users/lucindo/Code/hrv/.planning/PROJECT.md` (audio direction + no-bundled-audio constraint)
- `/Users/lucindo/Code/hrv/.planning/ROADMAP.md` (Phase 3 boundary)
- `/Users/lucindo/Code/hrv/.planning/phases/01-configurable-session-timing/01-CONTEXT.md` (SESS-05, copy locks)
- `/Users/lucindo/Code/hrv/.planning/phases/02-visual-guide-accessible-responsive-interface/02-CONTEXT.md` (orb visual contract D-03, reduced-motion D-05/D-06/D-07, focus-visible D-21, 44×44 D-17)
- `/Users/lucindo/Code/hrv/.planning/phases/02-visual-guide-accessible-responsive-interface/02-PATTERNS.md` (existing component pattern map; mirror for Phase 3)
- `/Users/lucindo/Code/hrv/src/hooks/useSessionEngine.ts` (rAF lifecycle pattern to mirror in `useAudioCues`)
- `/Users/lucindo/Code/hrv/src/domain/sessionMath.ts` (SessionFrame shape)
- `/Users/lucindo/Code/hrv/src/domain/breathingPlan.ts` (`cycleMs`, `inhaleMs`, `exhaleMs`)
- `/Users/lucindo/Code/hrv/src/domain/sessionController.ts` (`startSession`, `extendTimedSession`)
- `/Users/lucindo/Code/hrv/src/components/SessionControls.tsx` (inline composition surface for mute)
- `/Users/lucindo/Code/hrv/src/components/BreathingShape.tsx` (orb + in-orb label position)
- `/Users/lucindo/Code/hrv/src/app/App.tsx` (composition root)
- `/Users/lucindo/Code/hrv/vitest.setup.ts` (existing polyfill pattern for HTMLDialogElement and matchMedia)
- `/Users/lucindo/Code/hrv/src/styles/theme.css` (token convention)
- `/Users/lucindo/Code/hrv/src/app/App.dialog.test.tsx` and `App.session.test.tsx` (test idioms for App-level integration)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Web Audio is native, no new deps, all listed libraries are already in `package.json` and verified against npm.
- Architecture: HIGH — All four primary patterns (lookahead scheduler, AC-as-hook, lead-in state machine, mute fade) are well-established. The dual-anchor invariant for visual+audio sync is the load-bearing piece and is correctly identified.
- Pitfalls: HIGH for browser/audio pitfalls (autoplay policy, jsdom gap, iOS interrupted state — all citation-backed). MEDIUM for the iOS silent-switch recommendation (a UX call, not a technical certainty).
- Bowl synthesis: MEDIUM — the partial-ratio approach is well-supported by the research literature, but specific Hz values are subjective tuning that the planner should leave open for execution-time A/B.

**Research date:** 2026-05-09
**Valid until:** 2026-06-08 (30 days — Web Audio is a stable, mature API; iOS quirks evolve slowly)

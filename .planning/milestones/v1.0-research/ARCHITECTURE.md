# Architecture Research

**Domain:** HRV breathing / guided breathing web app  
**Researched:** 2026-05-08  
**Confidence:** HIGH for browser architecture primitives; MEDIUM for domain-specific product structure because “HRV breathing app” conventions are inferred from common guided-session app patterns rather than a single formal standard.

## Standard Architecture

### System Overview

For v1, structure the app as a local-only, client-side application with one authoritative session clock. Do **not** split timing across independent UI timers, CSS-only animations, and audio timers. The safest structure is: settings produce a breathing plan; the session engine derives current phase from elapsed monotonic time; visuals and audio subscribe to that derived phase.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              UI Layer                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ SettingsForm │  │ SessionScreen│  │ StatsPanel   │  │ ResourceLinks│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                 │                 │                            │
├─────────┴─────────────────┴─────────────────┴────────────────────────────┤
│                         Application State Layer                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐ │
│  │ Settings Store  │ │ Session Store   │ │ Local Stats Store           │ │
│  │ BPM, ratio, etc │ │ idle/running... │ │ completed minutes/sessions  │ │
│  └────────┬────────┘ └────────┬────────┘ └─────────────┬───────────────┘ │
├───────────┴───────────────────┴────────────────────────┴─────────────────┤
│                              Domain Layer                                 │
│  ┌──────────────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │ Breathing Plan       │  │ Session Engine     │  │ Completion Rules  │ │
│  │ BPM→cycle durations  │  │ elapsed→phase      │  │ save stats/end    │ │
│  └──────────┬───────────┘  └─────────┬──────────┘  └───────────────────┘ │
├─────────────┴────────────────────────┴────────────────────────────────────┤
│                          Browser Services Layer                           │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────┐ │
│  │ Animation Loop │ │ Audio Scheduler│ │ Persistence    │ │ Wake Lock  │ │
│  │ requestAnim... │ │ Web Audio API  │ │ localStorage   │ │ optional   │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `SettingsForm` | Validates and edits BPM, inhale/exhale ratio, session duration, mute, and future display preferences. | Controlled UI bound to a typed settings model; writes only through settings actions. |
| `BreathingPlan` | Converts user settings into deterministic cycle math: cycle length, inhale length, exhale length, total target duration, and cue times. | Pure functions with unit tests; no DOM, audio, or storage access. |
| `SessionEngine` | Owns session lifecycle and derives `elapsedMs`, `cycleIndex`, `phase`, `phaseProgress`, and remaining time from a monotonic start timestamp. | Hook/service using `requestAnimationFrame`; timestamp-based, not interval-count-based. |
| `BreathingAnimation` | Renders calm inhale/exhale guidance from derived phase progress. | SVG/CSS transforms or Canvas driven by engine state; should be replaceable without changing timing logic. |
| `AudioCueService` | Produces optional soft gong/bowl-like cues at phase boundaries. | Web Audio API graph: oscillator/noise/buffer source → gain envelope/filter/reverb-ish shaping → destination. |
| `PersistenceService` | Saves settings and local stats. | Small `localStorage` adapter with schema versioning and safe fallback if storage fails. |
| `StatsService` | Records completed sessions/minutes locally; ignores partial sessions unless product explicitly decides otherwise. | Pure stats update functions plus persistence adapter. |
| `WakeLockService` | Best-effort screen-awake support during active sessions. | Feature-detected Screen Wake Lock API; release on stop; reacquire on visibility return when possible. |
| `ForrestLinks` | Presents prominent external links without entangling session logic. | Static content/config module; avoid remote scripts or embedded trackers in v1. |

## Recommended Project Structure

```text
src/
├── app/                  # App shell, routing-free layout, providers
│   └── App.tsx
├── components/           # Presentational UI components
│   ├── BreathingAnimation.tsx
│   ├── SessionControls.tsx
│   ├── SettingsForm.tsx
│   ├── StatsPanel.tsx
│   └── ResourceLinks.tsx
├── domain/               # Pure breathing/session/stat rules
│   ├── breathingPlan.ts
│   ├── sessionMath.ts
│   ├── settings.ts
│   └── stats.ts
├── hooks/                # UI-facing orchestration hooks
│   ├── useSessionEngine.ts
│   ├── useSettings.ts
│   └── useWakeLock.ts
├── services/             # Browser API wrappers
│   ├── audioCueService.ts
│   ├── persistenceService.ts
│   └── wakeLockService.ts
├── styles/               # Global tokens, responsive layout, animation styling
│   └── theme.css
└── tests/                # Domain-heavy tests first; browser-service tests with mocks
    ├── breathingPlan.test.ts
    └── sessionMath.test.ts
```

### Structure Rationale

- **`domain/`:** Keep timing and ratio math pure. This is the highest-risk area because subtle drift or rounding errors directly break the core promise of accurate guidance.
- **`services/`:** Browser APIs have quirks: Web Audio requires user activation in many autoplay contexts; wake lock can be rejected or released; localStorage can block and may be cleared in private mode. Isolating adapters makes failure handling explicit.
- **`hooks/`:** The app needs a thin orchestration layer between pure math and UI rendering. Hooks can start/stop sessions, subscribe to animation frames, call audio cues, and persist completions without polluting components.
- **`components/`:** Keep UI calm and replaceable. Animation design can iterate independently if it only consumes `{ phase, phaseProgress, cycleIndex }`.

## Architectural Patterns

### Pattern 1: Single Authoritative Session Clock

**What:** Store `startedAt`, `pausedAccumulatedMs`, and `now`/`elapsedMs`; derive all current breathing state from elapsed time and the breathing plan.

**When to use:** Always for session guidance. This prevents separate intervals from drifting apart.

**Trade-offs:** Slightly more math up front, but far easier to test and correct than mutable phase counters.

**Example:**

```typescript
type Phase = "inhale" | "exhale";

type Plan = {
  cycleMs: number;
  inhaleMs: number;
  exhaleMs: number;
};

export function getSessionFrame(elapsedMs: number, plan: Plan) {
  const cyclePosition = elapsedMs % plan.cycleMs;
  const cycleIndex = Math.floor(elapsedMs / plan.cycleMs);
  const phase: Phase = cyclePosition < plan.inhaleMs ? "inhale" : "exhale";
  const phaseElapsed = phase === "inhale"
    ? cyclePosition
    : cyclePosition - plan.inhaleMs;
  const phaseDuration = phase === "inhale" ? plan.inhaleMs : plan.exhaleMs;

  return {
    cycleIndex,
    phase,
    phaseProgress: Math.min(1, phaseElapsed / phaseDuration),
    cycleProgress: cyclePosition / plan.cycleMs,
  };
}
```

### Pattern 2: Timestamp-Based Animation Loop

**What:** Use `requestAnimationFrame` for visual updates, and calculate progress from the callback timestamp or `performance.now()` delta rather than incrementing by a fixed frame amount.

**When to use:** For the breathing animation and visible countdown.

**Trade-offs:** `requestAnimationFrame` can pause in background tabs, but this is acceptable because state is recomputed from elapsed time when visible again. Audio scheduling should not depend on every animation frame firing.

**Example:**

```typescript
function startLoop(startedAt: number, onFrame: (elapsedMs: number) => void) {
  let rafId: number | null = null;

  const tick = (timestamp: DOMHighResTimeStamp) => {
    onFrame(timestamp - startedAt);
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
  return () => rafId !== null && cancelAnimationFrame(rafId);
}
```

### Pattern 3: Evented Boundary Cues, Not Continuous Audio


**What:** Trigger generated audio cues only at inhale/exhale/session boundaries. Keep breathing guidance primarily visual, with audio optional and muted by default or clearly toggleable.

**When to use:** For soft gongs/bowls without licensed assets.

**Trade-offs:** Generated synthesis avoids asset licensing and downloads, but realistic bowl sounds require careful envelopes/filters. If v1 synthesis feels poor, use simpler pleasant chimes rather than over-engineering with sample libraries.

**Example:**

```typescript
function playCue(context: AudioContext, when = context.currentTime) {
  const osc = new OscillatorNode(context, { type: "sine", frequency: 432 });
  const gain = new GainNode(context, { gain: 0 });
  const filter = new BiquadFilterNode(context, { type: "lowpass", frequency: 1400 });

  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(0.08, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 2.5);

  osc.connect(filter).connect(gain).connect(context.destination);
  osc.start(when);
  osc.stop(when + 2.6);
}
```

### Pattern 4: Best-Effort Capability Adapters

**What:** Treat audio, wake lock, and storage as optional browser capabilities with explicit failure states.

**When to use:** Mobile browser app where uninterrupted hands-off sessions matter, but APIs may be unavailable or blocked.

**Trade-offs:** More fallback UI, but fewer broken sessions.

## Data Flow

### Session Setup Flow

```text
[User edits settings]
    ↓
[SettingsForm]
    ↓ validates and normalizes
[Settings Store]
    ├──→ [PersistenceService] → [localStorage]
    └──→ [BreathingPlan] → derived cycle/phase durations preview
```

### Active Session Flow

```text
[User taps Start]
    ↓
[SessionControls]
    ↓
[Session Store: running + startedAt]
    ├──→ [WakeLockService request]
    ├──→ [AudioCueService unlock/resume if sound enabled]
    └──→ [SessionEngine requestAnimationFrame loop]
              ↓ elapsed time
          [sessionMath.getSessionFrame]
              ↓ derived phase state
          ┌───────────────┬────────────────┬───────────────────┐
          ↓               ↓                ↓
 [BreathingAnimation] [Countdown/Labels] [Boundary Cue Detector]
                                           ↓
                                     [AudioCueService]
```

### Completion Flow

```text
[SessionEngine detects elapsed >= configured duration]
    ↓
[Session Store: completed]
    ├──→ [StatsService update completed sessions/minutes]
    │       ↓
    │   [PersistenceService] → [localStorage]
    ├──→ [AudioCueService optional final cue]
    └──→ [WakeLockService release]
```

### State Management

```text
[Settings Store] ─────┐
                      ├──→ [Derived BreathingPlan] ──→ [SessionEngine]
[Session Store] ──────┘                                  ↓
          ↑                                       [Derived Frame State]
          │                                              ↓
    [UI Actions] ←────────────────────── [UI Components + Audio/Wake effects]

[Stats Store] ←── [Completion Event only] ── [SessionEngine]
```

### Key Data Flows

1. **Settings persistence:** UI change → validation → settings store → localStorage. Settings should be persisted immediately but safely; invalid values never reach the store.
2. **Timing derivation:** session start timestamp + plan → elapsed time → phase/progress. No component should independently decide when inhale/exhale starts.
3. **Audio cueing:** derived phase boundary crossing → cue event → Web Audio graph. Audio service should not own breathing state.
4. **Stats recording:** completion event → stats update → localStorage. Avoid recording continuously every frame.
5. **Wake lock lifecycle:** start → request; visibility change → possibly reacquire; stop/complete → release.

## Suggested Build Order

1. **Domain timing model first**
   - Build `settings`, `breathingPlan`, and `sessionMath` with tests for BPM 1-7, 0.5 increments, ratios, finite durations, and unlimited mode.
   - Dependency: none. This unlocks every later component.
2. **Basic session engine without polish**
   - Implement start/pause/resume/stop/complete using timestamp-based elapsed time.
   - Dependency: domain timing model.
3. **Minimal visual guidance**
   - Render text labels and a simple shape using derived `phaseProgress`.
   - Dependency: session engine. Do this before advanced animation so timing can be user-tested early.
4. **Settings UI + persistence**
   - Connect controls to validated settings and localStorage schema.
   - Dependency: domain settings model; can proceed in parallel with basic visuals after timing math is stable.
5. **Generated audio cues**
   - Add Web Audio service and boundary detector; handle mute and audio unlock on user gesture.
   - Dependency: session engine phase boundary events.
6. **Local stats**
   - Record only completed sessions/minutes; display basic totals/streak-like local summaries only if they stay claim-free.
   - Dependency: completion event.
7. **Polish, responsive layout, and wake lock**
   - Improve animation, mobile ergonomics, reduced-motion handling, and best-effort wake lock.
   - Dependency: stable session UX. Wake lock should not be on the critical path because support/rejection varies.
8. **Resource links and content/legal review**
   - Add Forrest Knutson links and claim-safe language.
   - Dependency: static content; can happen late, but legal/product wording should be reviewed before launch.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Static client app hosted on a CDN or simple static host. No backend, no accounts, no analytics required. |
| 1k-100k users | Add service worker/offline caching only if reliability demand emerges. Keep stats local. Monitor bundle size and mobile performance. |
| 100k+ users | Still no backend needed for core product. Consider optional privacy-preserving telemetry only with explicit product decision; avoid undermining local-only promise. |

### Scaling Priorities

1. **First bottleneck:** Mobile UX/performance, not server load. Optimize animation compositing and reduce main-thread work during sessions.
2. **Second bottleneck:** Audio consistency across browsers. Keep the audio graph simple and degrade gracefully to no sound.
3. **Third bottleneck:** Product complexity. Adding accounts, cloud stats, wearable HRV sensors, or medical-style outcomes would change architecture and regulatory/privacy risk; defer.

## Anti-Patterns

### Anti-Pattern 1: Multiple Competing Timers

**What people do:** Use `setInterval` for countdown, CSS animation durations for visuals, and separate timeouts for sounds.  
**Why it's wrong:** Small drift accumulates; pause/resume becomes inconsistent; users notice when sound and visual breath cues disagree.  
**Do this instead:** Derive all session state from a single elapsed-time model and let UI/audio subscribe to phase boundary events.

### Anti-Pattern 2: Frame-Counting Instead of Timestamp Math

**What people do:** Increment progress by `1 / 60` or assume every animation frame arrives at 60Hz.  
**Why it's wrong:** Modern displays commonly use 75/120/144Hz; browsers pause animation frames in background tabs; high-refresh screens make fixed increments run too fast.  
**Do this instead:** Use `requestAnimationFrame` timestamps or `performance.now()` deltas.

### Anti-Pattern 3: Browser APIs Embedded Directly in Components

**What people do:** Call `localStorage`, `AudioContext`, and `navigator.wakeLock` directly from UI components.  
**Why it's wrong:** Error handling becomes scattered, tests become brittle, and unsupported-browser behavior is inconsistent.  
**Do this instead:** Wrap each API in a small service with feature detection and typed return states.

### Anti-Pattern 4: Overbuilding Biofeedback Architecture in v1

**What people do:** Add camera pulse detection, wearable integrations, cloud accounts, or HRV scoring before the guided session loop is excellent.  
**Why it's wrong:** The stated v1 value is hands-off guided breathing; sensors/accounts introduce privacy, accuracy, support, and possible medical-claims complexity.  
**Do this instead:** Build a precise, local-only breathing session app. Leave sensor integrations as a future architecture spike.

### Anti-Pattern 5: Medicalized Copy or Stats Coupled to Health Claims

**What people do:** Name stats “HRV improvement,” “therapy minutes,” or imply diagnosis/treatment.  
**Why it's wrong:** It conflicts with the project constraint to avoid medical claims and raises user-trust/regulatory risk.  
**Do this instead:** Keep stats descriptive: sessions completed, minutes practiced, preferred settings.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Forrest Knutson content | Static external links opened normally | Prefer simple links over embedded third-party widgets; avoids tracking/scripts and asset licensing issues. |
| Hosting/CDN | Static app deployment | Core app has no server dependency. HTTPS is required for wake lock and generally expected for modern browser capabilities. |

### Browser APIs

| API | Integration Pattern | Notes |
|-----|---------------------|-------|
| `requestAnimationFrame` | Animation loop service/hook | Official MDN docs note callbacks generally match display refresh and may pause in background tabs; use timestamp math. |
| Web Audio API | Audio service | Official MDN docs describe modular audio graphs and precise scheduling; use `AudioContext`, oscillator/source nodes, filters, and gain envelopes. |
| Web Storage API / `localStorage` | Persistence adapter | MDN notes localStorage persists by origin but is synchronous and private-mode data may be cleared at close. Keep payloads tiny. |
| Screen Wake Lock API | Optional capability adapter | MDN marks it Baseline 2025 and secure-context only; requests can be rejected or released, so UI must tolerate absence. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ Domain | Function calls and typed view models | Domain remains pure and framework-independent. |
| SessionEngine ↔ Animation | Derived frame state subscription | Animation never mutates timing state. |
| SessionEngine ↔ AudioCueService | Boundary events (`inhaleStart`, `exhaleStart`, `sessionEnd`) | Audio does not run the session. |
| SessionEngine ↔ StatsService | Completion event | Prevent duplicate writes with idempotent completion handling. |
| Stores ↔ PersistenceService | Serialized schema with version | Enables migration if future i18n/preferences expand settings. |
| Session lifecycle ↔ WakeLockService | Start/stop/visibility events | Wake lock is best-effort; session must continue if unavailable. |

## Sources

- MDN, `Window.requestAnimationFrame()` — Baseline widely available; callbacks generally match display refresh; paused in background tabs; timestamp should be used to avoid high-refresh speed errors. Last modified 2025-12-26. https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN, Web Audio API — Baseline widely available; audio operations happen inside an `AudioContext` with modular audio-node routing; supports precise timing/scheduling. Last modified 2026-05-06. https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- MDN, Web Storage API — Baseline widely available; `localStorage` persists by origin; operations are synchronous; private browsing treats localStorage like sessionStorage. Last modified 2025-02-22. https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- MDN, Screen Wake Lock API — Baseline 2025; secure-context only; requests may be rejected or automatically released; reacquire on visibility changes if needed. Last modified 2025-07-03. https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API

---
*Architecture research for: HRV breathing / guided breathing web app*  
*Researched: 2026-05-08*

# Requirements: HRV Breathing WebApp — v2.2 Audio Sync

**Defined:** 2026-05-27
**Core Value:** Users can start a hands-off Forrest Knutson practice — HRV breathing, Stretch, or Navi Kriya — and comfortably follow accurate, uninterrupted guidance through synchronized visuals and optional sound.
**Milestone goal:** Fix every audio-stack bug currently on file (iOS speaker route, three-clocks drift, background-tab audio death, mute-as-teardown) and land a `SessionClock` / scheduler abstraction so a future library swap (Tone.js etc.) becomes a single-implementation change.

**Scope inputs:**
- `.planning/notes/audio-clock-milestone-proposal.md` — authoritative five-phase scope, per-phase deliverables, success criteria, risks.
- `.planning/notes/audio-animation-three-clocks-diagnosis.md` — diagnosis (three-clocks divergence), code citations, why no library swap, HRV envelope continuity finding.
- `.planning/todos/2026-05-27-ios-speaker-route-audio-element-fix.md` — canonical Phase 49 (iOS speaker route fix) implementation spec.

## v2.2 Requirements

Requirements for the v2.2 release. Each maps to one phase in the v2.2 roadmap (Phases 49, 49.1, 50–53 — continuing v2.1's last phase 48). Cross-cutting requirements (DEPS-01, QUAL-01) are verified per-phase.

### iOS Audio Routing (Phase 49 — iOS speaker route fix)

- [x] **IOS-01**: User on iOS Safari with silent switch ON and no headphones hears app audio through the device speaker.
- [x] **IOS-02**: User on iOS Safari with headphones connected continues to route audio through headphones (no regression).
- [x] **IOS-03**: User on iOS Safari with silent switch OFF hears audio normally (no regression).
- [x] **IOS-04**: User on non-iOS platforms experiences no audible regression and no measurable performance regression from the silent-loop element.
- [x] **IOS-05**: The silent `<audio playsInline>` element starts only via the same user-gesture chain that constructs the `AudioContext` (no autoplay on page load) and is torn down on `AudioContext` close.

### Advanced Settings + Bypass Silent Mode (Phase 49.1 — user toggle on Phase 49 silent-loop)

- [x] **ADV-01**: App Settings → trailing chevron navigates to a page titled "Advanced" (EN) / "Avançado" (PT-BR). The strings "Appearance" / "Aparência" no longer appear anywhere in `src/content/strings.ts`.
- [x] **ADV-02**: The Behavior section on the Advanced page has the header "Behavior" (EN) / "Comportamento" (PT-BR). The strings-tree key is `advanced.sections.behavior`; the old `appearance.sections.visual` key is absent.
- [x] **ADV-03**: A "Bypass silent mode" / "Ignorar modo silencioso" toggle is visible below the two existing Behavior toggles; defaults ON for a fresh storage state; persists across reloads via the Phase 48 `featureFlags` persistence path (no `STATE_VERSION` bump).
- [x] **ADV-04**: When the toggle is OFF and the user starts a session, `createAudioEngine()` does NOT construct a silent-loop `<audio>` element (the global `Audio` constructor is never called for the silent loop). When ON or unset, the silent-loop wiring is identical to Phase 49 v3.
- [x] **ADV-05**: `?bypassSilentMode=false` overrides persisted storage for the current page-load lifecycle via the Phase 48 2-arg `readFeatureFlags(search, persisted)` precedence chain (query > persisted > default).

### Audio Abstraction (Phase 50 — SessionClock / scheduler interface)

- [x] **ABSTR-01**: A `SessionClock` interface exists with `now()`, `schedule(when, cue)`, `setMasterGain(value, rampSec)`, `onSuspend`, and `onResume` members.
- [x] **ABSTR-02**: `audioEngine.ts` exports the `SessionClock` interface and delegates to its existing internals — zero end-user behavior change at Phase 50 close.
- [x] **ABSTR-03**: All session/audio/animation callers (`useSessionEngine`, `useAudioCues`, `useNaviKriyaAudio`, `useNKEngine`, `useAmbientScale`) consume the `SessionClock` interface; none import `AudioContext` or call `performance.now()` directly (locked by an import-graph drift-guard).
- [x] **ABSTR-04**: All existing audio/session/animation tests pass at full parity after the refactor (1283 → 1283 baseline maintained on Phase 50 close).

### Master Clock (Phase 51 — clock unification onto audioCtx.currentTime)

- [ ] **CLOCK-01**: Session elapsed time in `useSessionEngine` derives from `SessionClock.now() − sessionStartCtxTime` (not `performance.now() − startedAtMs`).
- [ ] **CLOCK-02**: Ambient scale (`useAmbientScale`) reads elapsed time from the audio clock (not `performance.now()`).
- [ ] **CLOCK-03**: Animation phase progress is derived from the audio clock each rAF tick — no independent time source remains in the animation path.
- [ ] **CLOCK-04**: User locks an iOS device mid-session and unlocks it: audio and animation remain in phase on resume — no visible burst, no audible drift (closes diagnosis #1).
- [ ] **CLOCK-05**: Foreground mid-session run without lock/background events produces no observable audio/animation sync drift (closes diagnosis #2 — eliminates the two-clock divergence path).

### Scheduling (Phase 52 — visibility-resume clamp + lookahead)

- [ ] **SCHED-01**: A per-tick elapsed-delta clamp suppresses catch-up bursts on the first rAF after a long hidden window (closes diagnosis #4).
- [ ] **SCHED-02**: Cue scheduling uses a 5–10s lookahead window — N cues ahead are queued into the WebAudio graph; the rAF tick is no longer the bottleneck for audio continuity.
- [ ] **SCHED-03**: User backgrounds the tab for ≤ lookahead-window seconds: audio continues to play; on foreground the animation does not race (closes diagnosis #5 partial).
- [ ] **SCHED-04**: User backgrounds the tab indefinitely: audio plays through the lookahead window, then stops cleanly with no garbled output (closes diagnosis #5 full).
- [ ] **SCHED-05**: User changes BPM or timbre mid-session: queued cues in the lookahead window are cancelled and rescheduled cleanly — no stale cues with the old settings fire.

### Mute UX (Phase 53 — master-gain mute)

- [ ] **MUTE-01**: A master `GainNode` sits between every cue chain and the audio `destination`.
- [ ] **MUTE-02**: Mute applies `linearRampToValueAtTime(0, now + 0.05)`; unmute applies the inverse — audible attenuation lands within ~50 ms.
- [ ] **MUTE-03**: Mute/unmute does not teardown or reconstruct the audio engine — the engine-reconstruction path is removed from the mute flow (kept available for the existing iOS Phase 5.1 recovery affordance).
- [ ] **MUTE-04**: User mutes mid-HRV / Stretch session and unmutes: audio resumes immediately at the cue's current sustain-floor level — no perceptual wait for the next phase boundary (closes diagnosis #3a).

### Cross-Cutting (verified per-phase)

- [ ] **DEPS-01**: No new runtime dependencies added across the milestone — `dependencies` in `package.json` stays `react` + `react-dom`.
- [ ] **QUAL-01**: Per-commit green-gate (`tsc && lint && build && test`) holds through every commit on `main` for the duration of the milestone (the v1.0.1 D-09/D-15 invariant).

## Future Requirements

Deferred items tracked but not in the v2.2 roadmap.

### Forward-Looking

- **AMBIENT-F1**: Continuous ambient layer under cues — seed at `.planning/seeds/continuous-ambient-layer.md`. Trigger conditions: aesthetic direction shifts toward an atmospheric bed, OR sample-based content is added.

## Out of Scope

Explicitly excluded for v2.2. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Continuous ambient layer (synth drone / sample loop under cues) | Not required to fix #3 — HRV cue envelope already provides perceptual continuity via the non-zero sustain floor (`cueSynth.ts:89-95`). Captured as forward-looking seed (AMBIENT-F1). |
| Library migration (Tone.js / Howler / etc.) | The `SessionClock` abstraction (Phase 50) keeps the swap available as a single-implementation change later. No external dependency added in this milestone. |
| iOS Safari phone-call interrupted state | v1.x carry-forward — not addressed by this milestone's clock unification or lookahead work. Defer to a future audio milestone with real-device UAT. |
| S2 Android Chrome wake-lock real-device UAT | Wake-lock domain, not audio. Carried over from v1.0 — physical device still unavailable. |
| iOS standalone-PWA Wake Lock < 18.4 detect-and-warn | Wake-lock domain, not audio. Product decision still pending. |
| Pause / resume on any practice | Excluded per v1.5 NK-07 end-only amendment — mirrors HRV's no-pause flow. |
| Engine reconstruction path removal | Existing Phase 5.1 reconstruction stays in place for the iOS audio-recovery affordance. Phase 53 only removes the engine-rebuild path from the mute flow (not the iOS-recovery affordance). |

## Traceability

Which phases cover which requirements. Roadmapper will populate the Phase column at roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IOS-01 | Phase 49 | Complete |
| IOS-02 | Phase 49 | Complete |
| IOS-03 | Phase 49 | Complete |
| IOS-04 | Phase 49 | Complete |
| IOS-05 | Phase 49 | Complete |
| ADV-01 | Phase 49.1 | Complete |
| ADV-02 | Phase 49.1 | Complete |
| ADV-03 | Phase 49.1 | Complete |
| ADV-04 | Phase 49.1 | Complete |
| ADV-05 | Phase 49.1 | Complete |
| ABSTR-01 | Phase 50 | Complete |
| ABSTR-02 | Phase 50 | Complete |
| ABSTR-03 | Phase 50 | Complete |
| ABSTR-04 | Phase 50 | Complete |
| CLOCK-01 | Phase 51 | Pending |
| CLOCK-02 | Phase 51 | Pending |
| CLOCK-03 | Phase 51 | Pending |
| CLOCK-04 | Phase 51 | Pending |
| CLOCK-05 | Phase 51 | Pending |
| SCHED-01 | Phase 52 | Pending |
| SCHED-02 | Phase 52 | Pending |
| SCHED-03 | Phase 52 | Pending |
| SCHED-04 | Phase 52 | Pending |
| SCHED-05 | Phase 52 | Pending |
| MUTE-01 | Phase 53 | Pending |
| MUTE-02 | Phase 53 | Pending |
| MUTE-03 | Phase 53 | Pending |
| MUTE-04 | Phase 53 | Pending |
| DEPS-01 | all (per-phase) | Pending |
| QUAL-01 | all (per-phase) | Pending |

**Coverage:**
- v2.2 requirements: 24 total (22 phase-specific + 2 cross-cutting verified per-phase)
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-27*
*Last updated: 2026-05-27 after v2.2 milestone init*

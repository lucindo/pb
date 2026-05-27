# Roadmap: HRV Breathing WebApp

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 + 5.1 (shipped 2026-05-11)
- ✅ **v1.0.1 Code Review Patch** — Phases 7–12 (shipped 2026-05-12)
- ✅ **v1.1 Customization** — Phases 13–19 (shipped 2026-05-15)
- ✅ **v1.2 BPM Stretch** — Phases 20–22 (shipped 2026-05-15)
- ✅ **v1.3 Release Polish** — Phases 23–27 (shipped 2026-05-16)
- ✅ **v1.4 Install Helper** — Phases 28–29 (shipped 2026-05-16)
- ✅ **v1.5 Multi-Practice** — Phases 30–35 (shipped 2026-05-19)
- ✅ **v2.0 New Design** — Phases 36–41, 44, 45 (shipped 2026-05-25)
- ✅ **v2.1 Kuthasta and Settings Switches** — Phases 46–48 (shipped 2026-05-26)
- 🚧 **v2.2 Audio Sync** — Phases 49, 49.1, 50–53 (in progress, started 2026-05-27)

## Phases

### v2.2 Audio Sync (Phases 49, 49.1, 50–53)

- [x] **Phase 49: iOS speaker route fix** — Silent looping `<audio playsInline>` on the user-gesture chain coerces iOS Safari from "ambient" to "playback" audio session category so audio plays through the speaker even with the silent switch ON (completed 2026-05-27)
- [ ] **Phase 49.1: Advanced Settings + "Bypass silent mode" toggle** — Renames the Appearance page to **Advanced** (its "Visual" section becomes "Behavior") and surfaces the Phase 49 silent-loop as a user-toggleable behavior preference. Default on (preserves Phase 49 shipped behavior); query-string parity (`?bypassSilentMode=false`) on the Phase 48 `readFeatureFlags(search, persisted)` resolver. When OFF, `createAudioEngine()` skips silent-loop construction entirely. EN + PT-BR strings native-validated by operator (no `// TODO: native-speaker review` markers).
- [ ] **Phase 50: SessionClock / scheduler abstraction** — Pure structural refactor introducing the `SessionClock` interface (`now`/`schedule`/`setMasterGain`/`onSuspend`/`onResume`); all callers consume the interface instead of touching `AudioContext` or `performance.now()` directly; zero behavior change at close
- [ ] **Phase 51: Master clock unification** — Session elapsed + animation phase progress + ambient scale all derive from `audioCtx.currentTime` via the new `SessionClock`; closes the three-clocks divergence underlying lock/unlock drift
- [ ] **Phase 52: Visibility-resume clamp + lookahead scheduling** — Per-tick elapsed-delta clamp suppresses catch-up bursts on the first rAF back; 5–10s lookahead window queues N cues ahead in the WebAudio graph so backgrounded tabs keep playing
- [ ] **Phase 53: Master-gain mute** — Master `GainNode` between cue chains and `destination` with `linearRampToValueAtTime(0|1, now+0.05)` replaces the engine teardown/rebuild path from the mute flow; iOS Phase 5.1 recovery affordance stays in place

<details>
<summary>✅ v2.1 Kuthasta and Settings Switches (Phases 46–48) — SHIPPED 2026-05-26</summary>

- [x] Phase 46: Kuthasta orb variant (3/3 plans) — completed 2026-05-26
- [x] Phase 47: Persistable feature-flag preferences (4/4 plans) — completed 2026-05-26
- [x] Phase 48: Appearance page + i18n (4/4 plans) — completed 2026-05-26

Full detail: `.planning/milestones/v2.1-ROADMAP.md`
</details>

<details>
<summary>✅ v2.0 New Design (Phases 36, 37, 38, 39, 40, 41, 44, 45) — SHIPPED 2026-05-25</summary>

- [x] Phase 36: Housekeeping bookkeeping reset (9/9 plans) — completed 2026-05-20
- [x] Phase 37: Stats UI removal (3/3 plans) — completed 2026-05-21
- [x] Phase 38: Variant removal (4/4 plans) — completed 2026-05-21
- [x] Phase 39: Theme simplification (5/5 plans) — completed 2026-05-21
- [x] Phase 40: Timbre preview cue (4/4 plans) — completed 2026-05-21 (4 empirical UAT items operator-confirmed at milestone close 2026-05-25)
- [x] Phase 41: Spike 010 Mono Zen — full implementation (spike-loop J1–J18; absorbed planned Phases 42 + 43) — completed 2026-05-25 at `d2b886b`
- [x] Phase 44: Final polish (7/7 plans) — completed 2026-05-25
- [x] Phase 45: Ring progress-cue toggle (3/3 plans, post-Phase-44 add-on; default flipped to `progress-arc` post-UAT) — completed 2026-05-25

Numbering gaps (42/43) are intentional: those originally-planned phases were absorbed into Phase 41 via the spike-loop format. Full detail: `.planning/milestones/v2.0-ROADMAP.md`.
</details>

<details>
<summary>✅ v1.5 Multi-Practice (Phases 30–35) — SHIPPED 2026-05-19</summary>

- [x] Phase 30: Multi-Practice Architecture & Switcher (4/4 plans)
- [x] Phase 31: Navi Kriya Engine & Session (6/6 plans)
- [x] Phase 32: Learn & Localization (3/3 plans)
- [x] Phase 33: Close gap — PRACTICE-02 resonant settings persistence (1/1 plans)
- [x] Phase 34: Stretch as a Distinct Practice (11/11 plans)
- [x] Phase 35: Flute Cue Timbre (2/2 plans)

Full detail: `.planning/milestones/v1.5-ROADMAP.md`
</details>

<details>
<summary>✅ v1.4 Install Helper (Phases 28–29) — SHIPPED 2026-05-16</summary>

- [x] Phase 28: Phone Install Banner (3/3 plans)
- [x] Phase 29: Settings Install Entry & Localization (3/3 plans)

Full detail: `.planning/milestones/v1.4-ROADMAP.md`
</details>

<details>
<summary>✅ v1.3 Release Polish (Phases 23–27) — SHIPPED 2026-05-16</summary>

- [x] Phase 23: License & README (1/1 plans)
- [x] Phase 24: Forrest Native-App Links (1/1 plans)
- [x] Phase 25: Labels-vs-Icons Cue Toggle (5/5 plans)
- [x] Phase 26: PT-BR Native-Speaker Review (1/1 plans)
- [x] Phase 27: PWA Install & Offline (3/3 plans)

Full detail: `.planning/milestones/v1.3-ROADMAP.md`
</details>

Earlier milestones (v1.0 → v1.2) are archived under `.planning/milestones/` — see `v1.0-ROADMAP.md`, `v1.0.1-ROADMAP.md`, `v1.1-ROADMAP.md`, `v1.2-ROADMAP.md` and the matching `*-REQUIREMENTS.md`.

## Phase Details

### Phase 49: iOS speaker route fix
**Goal**: User on iOS Safari with the silent switch ON and no headphones connected hears app audio through the device speaker — closing the long-standing iOS routing quirk (#6) — without regressing iOS headphone routing, non-silent-switch behavior, or any non-iOS platform.
**Depends on**: Nothing (independent of Phases 50–53 — operator-designated fast-shipping opener; lives in this milestone because it is the same audio-stack domain)
**Requirements**: IOS-01, IOS-02, IOS-03, IOS-04, IOS-05
**Cross-cutting verification**: DEPS-01 (no new runtime deps — `dependencies` stays `react` + `react-dom`), QUAL-01 (per-commit green-gate `tsc && lint && build && test` holds on every commit)
**Success Criteria** (what must be TRUE):
  1. User on iOS Safari with the silent switch ON and no headphones connected starts a session and hears the cue audio through the device speaker.
  2. User on iOS Safari with headphones connected continues to route audio through headphones, and user on iOS Safari with the silent switch OFF hears audio normally — no regression in either case.
  3. User on non-iOS platforms (Android Chrome, desktop Chrome / Firefox / Safari) hears no audible regression and the silent-loop element adds no measurable performance regression.
  4. User loading the page does not trigger any audio playback before the first user gesture — the silent `<audio playsInline>` element starts only via the same user-gesture chain that constructs the `AudioContext`, and is torn down on `AudioContext` close.
  5. iOS background + lock-screen behavior remains unchanged after the fix — the existing `'interrupted'` / `needs-resume` flow is not regressed by the new element.
**Plans**: 2 plans
- [x] 49-01-PLAN.md — Wire silent-loop <audio> element + tests inside createAudioEngine() (autonomous, single-file surgery on audioEngine.ts + audioEngine.test.ts)
- [x] 49-02-PLAN.md — Device validation checkpoint covering IOS-01..IOS-04 + ROADMAP criterion #5 (manual, autonomous: false)
**UI hint**: no

### Phase 49.1: Advanced Settings page + "Bypass silent mode" toggle
**Goal**: Surface the Phase 49 iOS silent-loop element as a user-toggleable behavior preference (default on — preserves Phase 49 shipped posture) so users who prefer the iOS silent switch to actually silence the app can disable the bypass; reframes the existing Appearance page as **Advanced** to accommodate non-visual behavior preferences alongside the existing visual toggles.
**Depends on**: Phase 49 (silent-loop element wiring exists in `createAudioEngine()`), Phase 48 (Appearance page + `readFeatureFlags(search, persisted)` resolver + `SettingsToggleRow` primitive — full infrastructure reuse).
**Requirements**: ADV-01, ADV-02, ADV-03, ADV-04, ADV-05
**Cross-cutting verification**: DEPS-01 (no new runtime deps), QUAL-01 (per-commit green-gate)
**Success Criteria** (what must be TRUE — operator native-validated EN + PT-BR copy):
  1. App Settings → trailing chevron lands on a page titled "Advanced" (EN) / "Avançado" (PT-BR). The strings "Appearance" / "Aparência" no longer appear in `src/content/strings.ts`.
  2. The Behavior section on the Advanced page has the header "Behavior" (EN) / "Comportamento" (PT-BR). The string-tree key for the section is `advanced.sections.behavior` (the old `appearance.sections.visual` key is gone).
  3. A "Bypass silent mode" / "Ignorar modo silencioso" toggle is visible below the two existing Behavior toggles, defaults ON for a fresh storage state, and persists across reloads.
  4. When the toggle is OFF and the user starts a new session, `createAudioEngine()` does NOT construct a silent-loop `<audio>` element (verifiable by stubbing global `Audio` and asserting the constructor is never called). When ON or unset, the silent-loop wiring is identical to Phase 49 v3.
  5. `?bypassSilentMode=false` query-string overrides persisted storage for the current page load via the existing Phase 48 2-arg `readFeatureFlags(search, persisted)` precedence chain.
**Plans**: TBD — produced by `/gsd:plan-phase 49.1`
**UI hint**: yes (page rename, section rename, new toggle, EN + PT-BR strings)

### Phase 50: SessionClock / scheduler abstraction
**Goal**: Carve out a `SessionClock` / scheduler abstraction so the runtime audio + session + animation callers consume one interface instead of touching `AudioContext` and `performance.now()` directly — pure structural refactor with full test parity, zero end-user behavior change. This is the foundation Phases 51–53 build on, and the seam that keeps a future library swap (Tone.js etc.) a single-implementation change.
**Depends on**: Nothing (independent of Phase 49 — foundational refactor for Phases 51–53; can ship in parallel with or before Phase 49)
**Requirements**: ABSTR-01, ABSTR-02, ABSTR-03, ABSTR-04
**Cross-cutting verification**: DEPS-01 (no new runtime deps), QUAL-01 (per-commit green-gate holds)
**Success Criteria** (what must be TRUE):
  1. `audioEngine.ts` exports a `SessionClock` interface with `now()`, `schedule(when, cue)`, `setMasterGain(value, rampSec)`, `onSuspend`, and `onResume` members — every member typed and documented.
  2. Every session / audio / animation caller (`useSessionEngine`, `useAudioCues`, `useNaviKriyaAudio`, `useNKEngine`, `useAmbientScale`) consumes the `SessionClock` interface; an import-graph drift-guard test fails if any of those callers re-imports `AudioContext` or calls `performance.now()` directly.
  3. End-user behavior is byte-identical to the pre-refactor state at Phase 50 close — a returning user cannot observe the refactor in any practice surface, audio cue, animation, mute behavior, or storage round-trip.
  4. The existing test suite passes at full parity at Phase 50 close (the 1283-test baseline from v2.1 close is maintained — no regressions, no skipped tests, no behavior-change-disguised-as-test-update).
**Plans**: TBD
**UI hint**: no

### Phase 51: Master clock unification
**Goal**: Rebase session timing, ambient scale, and animation phase progress onto `audioCtx.currentTime` via the Phase 50 `SessionClock` interface — eliminating the three-clocks divergence so audio and animation pause and resume together on iOS lock/unlock and drift-free during normal foreground operation. Closes diagnosis #1 (lock/unlock sync) and #2 (intermittent foreground drift).
**Depends on**: Phase 50 (callers must consume the `SessionClock` interface before the clock source can be rebased)
**Requirements**: CLOCK-01, CLOCK-02, CLOCK-03, CLOCK-04, CLOCK-05
**Cross-cutting verification**: DEPS-01 (no new runtime deps), QUAL-01 (per-commit green-gate holds)
**Success Criteria** (what must be TRUE):
  1. User locks an iOS device mid-session and unlocks it after any duration: audio and the breathing animation remain in phase on resume — no visible animation burst, no audible audio drift, no perceptual mismatch between the orb and the cue tone (closes diagnosis #1).
  2. User runs a foreground mid-session session without lock or background events and observes no audio/animation sync drift — the two-clock divergence path is eliminated because both surfaces now derive elapsed time from a single source (closes diagnosis #2).
  3. Session elapsed time in `useSessionEngine` is derived from `SessionClock.now() − sessionStartCtxTime` (not `performance.now() − startedAtMs`); the ambient scale in `useAmbientScale` reads from the same source; the animation tick computes phase progress *from* the audio clock each rAF rather than from any independent time source.
  4. No regression in foreground session accuracy — BPM cadence, ratio splits (50:50 / 40:60 / 30:70 / 20:80), and total-duration completion all match v2.1 baseline behavior across all three practices (HRV / Stretch / Navi).
**Plans**: TBD
**UI hint**: no

### Phase 52: Visibility-resume clamp + lookahead scheduling
**Goal**: Add a per-tick elapsed-delta clamp so a long hidden window cannot trigger a catch-up burst on the first rAF after foreground, and replace boundary-driven cue scheduling with a lookahead window (target range 5–10s; exact value picked at plan time) so background tabs keep playing cues already queued into the WebAudio graph. Closes diagnosis #4 (catch-up burst) and #5 (audio dies on tab switch).
**Depends on**: Phase 50 (uses the `SessionClock.schedule()` interface) + Phase 51 (clamp behavior is clearer once both clocks are unified; the lookahead window queues against `audioCtx.currentTime`)
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05
**Cross-cutting verification**: DEPS-01 (no new runtime deps), QUAL-01 (per-commit green-gate holds)
**Success Criteria** (what must be TRUE):
  1. User backgrounds a tab mid-session for a duration shorter than the lookahead window and returns: audio has continued to play through the hidden window, and on foreground the breathing animation does not race to catch up — the per-tick elapsed-delta clamp suppresses the catch-up burst (closes diagnosis #4 + #5 partial).
  2. User backgrounds a tab mid-session indefinitely: audio plays cleanly through the lookahead window, then stops cleanly with no garbled or partial output once the window is exhausted (closes diagnosis #5 full).
  3. User changes BPM or timbre mid-session: queued cues already scheduled in the lookahead window are cancelled and rescheduled cleanly — no stale cues with the old settings fire after the change.
  4. Cue scheduling is no longer driven by per-tick rAF boundary detection — the scheduler queues N cues ahead into the WebAudio graph, and the rAF tick is not the bottleneck for audio continuity.
  5. Foreground session behavior across all three practices (HRV / Stretch / Navi) remains accurate — BPM cadence, ratio splits, and timed-completion all match v2.1 baseline; the dual-anchor scheduling invariant established in Phase 3 D-13/D-14 is preserved through the lookahead model.
**Plans**: TBD
**UI hint**: no

### Phase 53: Master-gain mute
**Goal**: Insert a master `GainNode` between every cue chain and the audio `destination`, and replace the engine-teardown/rebuild path in the current mute flow with a `linearRampToValueAtTime(0|1, now + 0.05)` ramp on the master gain. Closes diagnosis #3a — mute/unmute mid-session is now perceptually instant and unmute lands on the cue's current sustain-floor level without waiting for the next phase boundary. The standalone iOS Phase 5.1 audio-recovery affordance (engine reconstruction triggered by the morphing `MuteToggle`) stays in place — only the mute flow loses the engine-rebuild path.
**Depends on**: Phase 50 (uses `SessionClock.setMasterGain(value, rampSec)`) — independent of Phases 51 and 52 and could be parallelized with them after Phase 50 lands
**Requirements**: MUTE-01, MUTE-02, MUTE-03, MUTE-04
**Cross-cutting verification**: DEPS-01 (no new runtime deps), QUAL-01 (per-commit green-gate holds)
**Success Criteria** (what must be TRUE):
  1. User mutes mid-HRV / Stretch / Navi session and unmutes: audio resumes immediately at the cue's current sustain-floor level — no perceptual wait for the next phase boundary, no engine teardown/rebuild, audible attenuation lands within roughly 50 ms (closes diagnosis #3a).
  2. A master `GainNode` sits between every cue chain and the audio `destination` — mute applies `linearRampToValueAtTime(0, now + 0.05)`, unmute applies the inverse ramp, and no engine reconstruction occurs on toggle.
  3. The engine-reconstruction path is removed from the mute flow only — the standalone iOS Phase 5.1 audio-recovery affordance (morphing `MuteToggle` triggered by `audioStatus === 'interrupted'` / `'needs-resume'`) remains operational and continues to reconstruct the engine when invoked.
  4. HRV cue envelope continuity through mute/unmute is preserved — the existing non-zero sustain-floor design in `cueSynth.ts` keeps cues audible at the floor level during phase sustain, so an unmute mid-phase lands the user back into an audible cue immediately.
**Plans**: TBD
**UI hint**: no

## Progress

| Milestone | Phase Range | Plans | Status | Completed |
| --------- | ----------- | ----- | ------ | --------- |
| v1.0 MVP | 1–6 + 5.1 | 30 | Complete | 2026-05-11 |
| v1.0.1 Code Review Patch | 7–12 | 12 | Complete | 2026-05-12 |
| v1.1 Customization | 13–19 | 47 | Complete | 2026-05-15 |
| v1.2 BPM Stretch | 20–22 | 8 | Complete | 2026-05-15 |
| v1.3 Release Polish | 23–27 | 11 | Complete | 2026-05-16 |
| v1.4 Install Helper | 28–29 | 6 | Complete | 2026-05-16 |
| v1.5 Multi-Practice | 30–35 | 27 | Complete | 2026-05-19 |
| v2.0 New Design | 36–41, 44, 45 | 35 + 18 spike-loop items | Complete | 2026-05-25 |
| v2.1 Kuthasta and Settings Switches | 46–48 | 11 | Complete | 2026-05-26 |
| v2.2 Audio Sync | 49–53 | 0/TBD | In progress | — |

### v2.2 Phase Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 49. iOS speaker route fix | 2/2 | Complete    | 2026-05-27 |
| 50. SessionClock / scheduler abstraction | 0/TBD | Not started | — |
| 51. Master clock unification | 0/TBD | Not started | — |
| 52. Visibility-resume clamp + lookahead scheduling | 0/TBD | Not started | — |
| 53. Master-gain mute | 0/TBD | Not started | — |

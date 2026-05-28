# Phase 52: Visibility-resume clamp + lookahead scheduling - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace boundary-driven cue scheduling with a 5–10s lookahead window that pre-queues N cues into the WebAudio graph so backgrounded tabs keep playing the queued audio. Add a per-tick elapsed-delta clamp on the rAF tick so a long hidden window cannot trigger a catch-up burst on the first frame back. Closes diagnosis #4 (catch-up burst) and #5 (audio dies on tab switch). Sits on the Phase 50 `SessionClock.schedule(when, cue)` seam and the Phase 51 audio-clock-backed `clock.now()`.

**Locked by ROADMAP / REQUIREMENTS (SCHED-01..05):**
- SCHED-01: Per-tick elapsed-delta clamp suppresses catch-up bursts on the first rAF after a long hidden window (closes diagnosis #4).
- SCHED-02: Cue scheduling uses a 5–10s lookahead window — N cues ahead are queued into the WebAudio graph; the rAF tick is no longer the bottleneck for audio continuity.
- SCHED-03: User backgrounds the tab for ≤ lookahead-window seconds: audio continues to play; on foreground the animation does not race (closes diagnosis #5 partial).
- SCHED-04: User backgrounds the tab indefinitely: audio plays through the lookahead window, then stops cleanly with no garbled output (closes diagnosis #5 full).
- SCHED-05: User changes BPM or timbre mid-session: queued cues in the lookahead window are cancelled and rescheduled cleanly — no stale cues with the old settings fire.
- Cross-cutting: DEPS-01 (no new runtime deps), QUAL-01 (per-commit green-gate holds).

**Locked by Phase 50 CONTEXT (do not re-decide):**
- `SessionClock.schedule(when, cue)` is the dispatch surface; the `Cue` discriminated union is CLOSED (D-04). Phase 52 dispatches existing kinds (`'in'`, `'out'`, `'lead-in-tick'`, `'end-chord'`) — no new cue kinds.
- Engine's internal `schedule()` switch (audioEngine.ts:341-377) is the dispatch target; each per-cue arm adds to `activeCues` (D-05).
- `setMasterGain` stays a stubbed no-op (D-12). Master-gain mute is Phase 53; Phase 52 keeps per-cue mute via `applyMuteFadeOut` (D-13) AND adds future-cue cancellation (this phase D-10 below).

**Locked by Phase 51 CONTEXT (do not re-decide):**
- `clock.now()` returns `audioCtx.currentTime` (D-03 resolved). On AC suspend → elapsed freezes (D-07 practice-time semantics).
- `sessionStartCtxTime` (on disk: `startedAtSec`) captured at session start; `elapsed = clock.now() − sessionStartCtxTime`.
- Reanchor flow (D-10/D-11): on AC reconstruction (Phase 5.1 path), `onSessionClockReanchored(newClockNow)` fires BEFORE `onAudioReanchorRequired`; `useSessionEngine.reanchorSessionClock` recomputes `sessionStartCtxTime = newClockNow − elapsedSecAtReanchor`.
- Stats recorded `elapsedMs` is AC-time-based (D-08); hidden time is excluded from session duration (practice-time semantics). Phase 52 extends this to desktop tab-hide via the clamp (D-07 below).
- NK cadence stays on setTimeout (D-01 stats-only NK rebase). NK is OUT of Phase 52 scope (this phase D-13 below).

**Out of scope (deferred):**
- Master-gain mute and master GainNode insertion (Phase 53).
- NK lookahead / NK rebase onto schedule() (would require its own phase).
- iOS Phase A speaker route — already shipped in Phase 49.
- Library swap (Tone.js / Howler) — milestone-level deferred (PROJECT.md).

</domain>

<decisions>
## Implementation Decisions

### Lookahead window sizing
- **D-01:** Hybrid window shape. Queue any cue whose `audioTime ≤ clock.now() + LOOKAHEAD_WINDOW_SEC`, but always keep at least `LOOKAHEAD_MIN_CUES` cues queued regardless of seconds. At 1 BPM (60s/breath), the floor takes over; at 7 BPM (~9s/breath), the seconds window holds the next cue and the floor is already satisfied.
- **D-02:** `LOOKAHEAD_WINDOW_SEC = 6` (middle of the ROADMAP 5–10s band). Survives a brief tab-switch at any BPM ≥3 from the seconds budget alone; the floor handles the low-BPM tail.
- **D-03:** `LOOKAHEAD_MIN_CUES = 2`. Always queue next-cue + cue-after. At 1 BPM the floor pre-schedules ~60s of audio (one inhale + one exhale); cancel cost on settings change = at most 2 oscillator stops + node disconnects. Honors SCHED-03 ("audio continues through the hidden window") at every BPM.
- **D-04:** Top-up trigger lives on the existing rAF tick in `useSessionEngine.ts:163`. Every tick checks queue depth and tops up if below target. Paused while tab hidden (rAF suspends); queued audio plays out; on foreground rAF resumes and the first tick re-fills. Additionally subscribe to `clock.onResume` so AC reconstruction / iOS unlock triggers a force-top-up synchronously — covers the case where the rAF tick hasn't fired yet after `onResume`.

### Per-tick clamp
- **D-05:** Always-cap clamp on every rAF tick: `delta = min(clock.now() − lastClockNow, MAX_TICK_DELTA_SEC)`. No edge-trigger on `visibilitychange`, no threshold gate. Foreground frames at ~16ms pass through unchanged; only post-hidden-window first-frame is affected. Simplest, most testable.
- **D-06:** `MAX_TICK_DELTA_SEC = 0.1` (100 ms). Tight enough that even a 60→6fps drop passes through (100ms = 6×16.67ms). Catches anything beyond as a hidden-window resumption.
- **D-07:** Clamp semantics — REBASE `sessionStartCtxTime` forward by `(raw_delta − MAX_TICK_DELTA_SEC)` when the clamp fires. `elapsed = clock.now() − sessionStartCtxTime` stays consistent across the boundary. Hidden time is NOT counted toward session duration — extends Phase 51 D-07/D-08 practice-time semantics from iOS lock to desktop tab-hide. A 10-min HRV session that was hidden for 5 mins records as ~10 mins of attention time, NOT 15 wall-clock minutes.
- **D-08:** On `reanchorSessionClock(newClockNow)` (Phase 51 D-10/D-11 AC-reconstruction path), reset `lastClockNow = newClockNow` synchronously inside `reanchorSessionClock`. Next rAF tick computes delta against the new clock base — clamp sees a small delta and passes through. No special-case in the clamp code itself.

### Cancel + reschedule
- **D-09:** Extend the existing `activeCues: Set<ActiveCue>` (audioEngine.ts:269) with `stop()` + `disconnect()` cancel handles on each cue's oscillator/gain nodes. Cancel iterates `activeCues` with `startTime > now()` and stops them. Existing `pruneExpiredCues` keeps its `cleanupAt`-based eviction. Per-cue mute fade (`applyMuteFadeOut`) still applies to in-flight cues (Phase 18 D-08 + Phase 50 D-13 preserved).
- **D-10:** `setMuted(true)` runs `applyMuteFadeOut` on cues currently playing (preserves today's D-08 behavior) AND calls the cancel path on every cue with `startTime > now()` — future-queued cues are stop()+disconnect()'d. Unmute waits for next boundary (D-08 unmute-waits-for-boundary); the next top-up re-queues from the new anchor. User-perceptually instant mute.
- **D-11:** Stretch lookahead walks `buildStretchSegments(stretchSettings)` from `currentCycle` to `currentCycle + N` for each top-up. Each queued cue carries its own correct `phaseDurationSec` in the `Cue` payload (the closed catalog already supports this per Phase 50 D-04). Honors Phase 22 STRETCH-08 ramp accuracy through the lookahead window.

### Background indefinite tail
- **D-12:** Session state stays `'running'` through indefinite hidden window. No auto-end, no hard-stop on `visibilitychange`. On foreground return, rAF resumes → clamp + top-up handle the transition (D-05/D-07 + D-04). Resumption hears a fresh first cue ~SAFE_LEAD_SEC after return. Each queued cue's envelope self-terminates with hard-fade at `phaseDurationSec` (cueSynth.ts:89-95) — "clean stop when lookahead exhausts" is automatic at the audio layer; no manual fade-tail scheduling needed.
- **D-13:** NK is OUT of Phase 52 scope. Per-tick clamp doesn't apply to NK (NK cadence is setTimeout, not rAF). Lookahead does not apply to NK. NK's setTimeout already throttles on hidden tab and resumes cleanly on foreground; behavior is acceptable today. Adding NK lookahead would require moving NK cadence onto `schedule()` (much bigger refactor — its own phase).
- **D-14:** Top-up trims the lookahead window to `(sessionStartCtxTime + targetSec)` for timed sessions — never queues a cue whose start exceeds the target. Queued cues already past their start play out their envelopes; `useBreathingSessionController` plays the end-chord (existing flow at L283). Open-ended sessions queue freely up to LOOKAHEAD_WINDOW_SEC / LOOKAHEAD_MIN_CUES.

### Claude's Discretion
- **Lookahead state location:** Probably extend `audioEngine.ts` — `activeCues` Set is already there, `pruneExpiredCues` already runs, `schedule()` is already the dispatch. The "top-up" caller logic likely lives in `useSessionEngine` (next to the rAF tick) or in `useBreathingSessionController` (replaces the boundary-detection effect at L325-364). Plan time decides; the seam from Phase 50 makes both options viable.
- **`ActiveCue` interface shape:** Add `cancel(): void` (oscillator `stop()` + `disconnect()`) alongside the existing `cleanupAt`. The interface lives in `audioEngine.ts` near the Set declaration; per-cue `scheduleXxxForTimbre` helpers return values carrying the cancel handle.
- **Force-top-up on `clock.onResume`:** Probably wire a force-top-up method exposed on the audio controller (parallel to `notifyPhaseBoundary`) and subscribe to it from `useAudioCues` via `clock.onResume`. Plan time decides exact callback shape.
- **Test mock strategy:** Vitest fake AudioContext + fake `performance.now()` + manual rAF stepping via `requestAnimationFrame` polyfill. Hidden-window simulation = advance clock by N seconds without firing rAF, then fire rAF + assert clamp clipped delta to 100ms AND `sessionStartCtxTime` rebased forward by `(N − 0.1)`. Lookahead-empty simulation = AC time advances past last queued cue → assert silence + assert next top-up re-fills.
- **Drift-guard expansion:** Phase 50's fs-scan banned `performance.now()` reads in 5 caller files. Phase 52's lookahead code lives inside the engine (already inside drift-guard scope by being outside the 5 caller files) — no new expansion needed. The clamp lives in `useSessionEngine` which IS one of the 5 caller files; clamp uses `clock.now()` not `performance.now()`, so drift-guard stays clean by construction.
- **Reconstruction interaction with queued cues:** When `useAudioCues.reconstructEngine` runs, the old AC closes and ALL queued cues vanish with the old graph. The Phase 51 D-10/D-11 reanchor fires; `reanchorSessionClock(newClockNow)` resets `lastClockNow` (D-08); next rAF tick's top-up sees queue depth = 0 and queues N cues from the new anchor. No special handling needed — the existing pieces compose.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 52 requirements + scope
- `.planning/ROADMAP.md` §"Phase 52: Visibility-resume clamp + lookahead scheduling" — goal, depends-on (Phase 50 + 51), 5 success criteria, cross-cutting verification.
- `.planning/REQUIREMENTS.md` §"Scheduling" — SCHED-01..05 with full text; DEPS-01 (no new runtime deps); QUAL-01 (per-commit green-gate).
- `.planning/PROJECT.md` §"Current Milestone: v2.2 Audio Sync" — milestone goal, target-features paragraph naming the lookahead + clamp work, library-swap rationale.

### Architectural diagnosis driving the milestone
- `.planning/notes/audio-animation-three-clocks-diagnosis.md` — three-clocks divergence diagnosis (§"How each bug falls out" for #4 + #5 mapping), "Fix shape (no external deps)" points 2 (clamp) + 3 (lookahead), HRV cue envelope continuity finding (§"HRV cue envelope already provides continuity" — load-bearing for D-12's automatic-clean-stop).

### Upstream phase context (carry-forward constraints — read these — they LOCK most of the implementation)
- `.planning/phases/50-sessionclock-scheduler-abstraction/50-CONTEXT.md` — full Phase 50 context. **D-04 (closed Cue catalog), D-05 (internal dispatch via `schedule()`), D-08 (wrap-don't-construct), D-11 (wired-real onSuspend/onResume/onClose), D-12 (stubbed setMasterGain), D-13 (preserve per-cue mute fade)** are all load-bearing for Phase 52.
- `.planning/phases/51-master-clock-unification/51-CONTEXT.md` — full Phase 51 context. **D-03 (swappableSessionClock proxy + setSource), D-04 (subscription forwarding survives source swap), D-07 (AC-suspend freezes elapsed), D-08 (AC-time-based stats), D-10/D-11 (reanchor flow with `onSessionClockReanchored` firing before `onAudioReanchorRequired`)** are all load-bearing.
- `.planning/phases/49-ios-speaker-route-fix/49-CONTEXT.md` D-03 — silent-loop `<audio>` element preserved; not part of Phase 52 surface.
- `.planning/phases/49.1-bypass-silent-mode-toggle/49.1-CONTEXT.md` D-07/D-09 — `bypassSilentMode` captured at engine construction; preserved.
- Phase 3 D-09 / D-13 / D-14 — user-gesture-chain AC construction; dual-anchor scheduling. Phase 52 preserves both — top-up reads `clock.now()` which already encodes the audio anchor; the session anchor (sessionStartCtxTime) is preserved through the clamp rebase (D-07) and reanchor (D-08).
- Phase 5.1 + Plan 06 D-34..D-38 — iOS audio recovery, `AudioStatusFlag` state machine, `'interrupted'` WebKit extension, engine reconstruction. Phase 52's force-top-up on `clock.onResume` (D-04) lives downstream of this machine.
- Phase 18 D-08 — timbre captured-at-start; preserved. The `Cue` payload's `timbre` field carries the captured value (Phase 50 D-04 already enforces this posture).
- Phase 22 STRETCH-08 — dual-anchor ramp accuracy across the cycle-aligned segment table. Phase 52 D-11 walks `buildStretchSegments` per top-up to preserve this.
- Phase 10 HOOKS-04 (cancel-guard idiom) + HOOKS-02/03 (running-snapshot ref pattern) — preserved through Phase 52's rAF tick extension.

### Phase 50 + 51 implementation artifacts to read alongside CONTEXT.md
- `src/audio/sessionClock.ts` — `SessionClock` interface (`now`, `schedule`, `setMasterGain`, `onSuspend`, `onResume`, `onClose`), `createAudioSessionClock` (with statechange listener + 4 subscriber Sets), `createWallSessionClock`. The closed `Cue` union (D-04).
- `src/audio/swappableSessionClock.ts` — proxy primitive with `setSource`; preserves subscription forwarding across source swaps. Used by both `useAudioCues` and `useNaviKriyaAudio`.
- `src/audio/audioEngine.ts` — `activeCues` Set (L269), `pruneExpiredCues` (L317), `schedule()` switch (L341-377), `scheduleNextCue` facade (L432-444) → replaced/extended by Phase 52's top-up. `applyMuteFadeOut` integration (L464-471) — Phase 52 D-10 keeps this and adds the future-cue cancel path.
- `src/audio/cueSynth.ts` L89-95, L110, L130-131 — envelope sustain-floor + hard-fade-out math. The self-termination at `phaseDurationSec` is what makes D-12's "clean stop on lookahead exhaustion" automatic.
- `src/hooks/useSessionEngine.ts` L145-214 — rAF tick. Phase 52 extends with clamp (D-05/D-06/D-07) + reanchor reset (D-08). May also host top-up trigger (D-04 — plan-time placement).
- `src/hooks/useBreathingSessionController.ts` L325-364 — current boundary-detection effect. Phase 52 likely replaces this with a top-up trigger (or moves it into useSessionEngine).
- `src/hooks/useAudioCues.ts` L289-298 — visibilitychange handler. Already wired; Phase 52 D-04's force-top-up subscribes to `clock.onResume` here.

### Forward-looking context (Phase 53)
- `.planning/ROADMAP.md` §"Phase 53: Master-gain mute" — independent of Phase 52; Phase 53's master GainNode does NOT replace Phase 52 D-10's future-cue cancellation (different paths: master gain handles in-flight attenuation; future-cue cancel handles graph nodes not yet started). Both compose.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `activeCues: Set<ActiveCue>` (audioEngine.ts:269) + `pruneExpiredCues` (L317) — extend with cancel handles on `ActiveCue` for D-09. Existing cleanup-after-expiration pattern stays.
- `schedule(when, cue)` switch (audioEngine.ts:341-377) — already the dispatch surface; Phase 52 top-up calls into this with `kind: 'in' | 'out'` + `phaseDurationSec` + `timbre`.
- `applyMuteFadeOut` (audioEngine.ts:464-471) — in-flight mute fade; Phase 52 D-10 keeps this and adds the future-cue cancel path next to it.
- `clock.onResume` subscriber (Phase 50/51) — Phase 52 D-04 force-top-up subscribes here. The proxy's subscription-forwarding (Phase 51 D-04) means subscriptions survive AC reconstruction.
- `reanchorSessionClock(newClockNow)` method (Phase 51 D-10/D-11) — Phase 52 D-08 extends it to reset `lastClockNow` synchronously.
- `buildStretchSegments(stretchSettings)` + `getStretchFrame` (domain/stretchRamp.ts) — segment table walk for D-11.
- `computeBoundaryAudioOffsets(frame, plan)` (domain/sessionAudio.ts) — currently used by useBreathingSessionController boundary effect; can be reused by the top-up to compute future cue audioTimes (or replaced by a "walk N cues from anchor" helper, plan-time decision).

### Established Patterns
- **Dual-anchor scheduling** (Phase 3 D-13/D-14): audio anchor (`audioAnchorRef`) + session anchor (`sessionStartCtxTime`) co-anchored at start. Phase 52 preserves both — top-up reads `clock.now()` (= audio time, which IS the audio anchor since Phase 51) and the session anchor is preserved through clamp rebase (D-07) + reanchor (D-08).
- **Capture-at-session-start** (Phase 18 D-08, Phase 49.1 D-09): timbre + bypassSilentMode frozen at start. Phase 52 reads sessionTimbre from engine closure (Phase 50 D-04 already enforces this — `'in'`/`'out'` cue payload carries sessionTimbre at dispatch).
- **rAF cancel-guard idiom** (HOOKS-04 / Plan 06 D-10): top-of-tick `cancelled` check; Phase 52 extends the tick body but preserves the guard structure.
- **Stable-ref dep pattern** (Phase 10 HOOKS-02/03): the proxy clock's stable identity is preserved through Phase 52 — top-up callbacks live on stable refs.
- **Closed-catalog enforcement** (Phase 50 D-04): the `Cue` union does not expand at Phase 52. All lookahead cues use existing kinds (`'in'`, `'out'`, `'lead-in-tick'`, `'end-chord'`).

### Integration Points
- `src/audio/audioEngine.ts` — `ActiveCue` interface gains `cancel(): void`; `schedule()` per-cue arms attach cancel handles to the added ActiveCue; new `cancelFutureCues()` helper for D-10. The engine likely exposes a `topUpLookahead({anchor, plan, targetSec?, currentCycle, ...})` method or the lookahead logic lives at the hook layer reading through `engine.schedule`.
- `src/audio/cueSynth.ts` + `nkCueSynth.ts` — per-cue helpers (`scheduleInCueForTimbre` etc.) gain `cancel()` on their return values for D-09. NK helpers unchanged (D-13 NK out of scope).
- `src/hooks/useSessionEngine.ts` — rAF tick extension: clamp delta to 100ms (D-05/D-06), rebase `sessionStartCtxTime` on overage (D-07), reset `lastClockNow` inside `reanchorSessionClock` (D-08). Top-up trigger may live here or in the controller.
- `src/hooks/useBreathingSessionController.ts` — boundary effect at L325-364 replaced by top-up trigger. The audioAnchorRef + planRef + lastBoundaryKeyRef pattern likely simplifies to a top-up tick that reads anchor + plan and queues forward.
- `src/hooks/useAudioCues.ts` — `clock.onResume` subscriber added for force-top-up (D-04); existing visibilitychange handler at L289 + Phase 5.1 reconstruction flow at L404-453 stay; mute path at L582-586 extends with the future-cue cancel (D-10).
- `src/domain/sessionAudio.ts` or new helper — walk N cues from a given anchor + plan (HRV) or anchor + segment table (Stretch); returns `[{audioTime, phaseDurationSec, kind}, ...]` for the top-up to dispatch.
- Tests — new behavioral tests for clamp (D-05/D-06/D-07/D-08), lookahead queue depth (D-01/D-02/D-03), mute cancels future (D-10), Stretch segment-walk fidelity (D-11), session stays running through hidden window (D-12), completion trim (D-14). NK tests untouched.

</code_context>

<specifics>
## Specific Ideas

- "Audio playing while my tab is hidden" is the user-facing win — a meditation user backgrounded to read a related article should hear at least ~one full breath (6s + 2 cue floor) of continued audio at any BPM ≥1. The hybrid sizing was chosen specifically so 1 BPM (60s/breath) doesn't degenerate to "0 cues queued at the top of the seconds window".
- Practice-time semantics extends cleanly from iOS lock (Phase 51 D-07) to desktop tab-hide (Phase 52 D-07) — both surfaces treat hidden time as "not attention time". Stats record attention time, not wall time, consistently across platforms.
- The "automatic clean stop" finding (cue envelope self-terminates at `phaseDurationSec` via the cueSynth.ts:89-95 hard-fade-out) is a load-bearing detail from the diagnosis note. Phase 52's tail logic doesn't need to schedule a fade-tail manually — each queued cue's envelope already terminates on its own.
- Each top-up reading `clock.now()` means the lookahead is always anchored to live AC time, not a stale captured anchor. This makes the iOS reanchor path (Phase 51 D-10/D-11) compose naturally: post-reanchor, `clock.now()` returns the new AC's time, and the next top-up queues from there without special handling.
- Mute cancelling future-queued cues (D-10) is the visible interaction with Phase 52's deeper queue. With boundary-driven scheduling (today) only 1 cue is queued, so mute's perceptual lag is at most "until next boundary". With lookahead, the queue is up to 6s deep — without cancel, the user would hear up to 6s of audio after pressing mute. D-10 closes this gap.

</specifics>

<deferred>
## Deferred Ideas

- **NK lookahead / NK rebase onto schedule()** — Phase 51 D-01 locked NK on setTimeout. Adding lookahead to NK requires moving cadence onto `schedule()` — its own phase if real-world background-tab NK sync becomes a complaint.
- **Master GainNode wholesale cancel** — Phase 53 lands the master GainNode for mute. Phase 52's per-cue cancel (D-09/D-10) and Phase 53's master gain compose: master gain handles in-flight attenuation; future-cue cancel handles graph nodes not yet started. Both stay relevant after Phase 53 lands.
- **Auto-end after N seconds of silence** — explicitly rejected in D-12. Conflicts with practice-time semantics from Phase 51 D-07/D-08.
- **Hard-stop on `visibilitychange`** — explicitly rejected in D-12. Conflicts with SCHED-03's "audio continues through the hidden window" framing.
- **Mid-session BPM/timbre change UI** — SettingsDialog is disabled in-session (Phase 14 `inSessionView` contract). SCHED-05 is defensive; the cancel paths from D-09/D-10 cover the cross-tab / future-feature surface area without a user-facing settings-during-session affordance being added.
- **Drift-guard expansion to lookahead code** — the Phase 50 fs-scan covers the 5 caller files; Phase 52's lookahead code in the engine is outside that scope by construction. Clamp lives in useSessionEngine (one of the 5 files) and uses `clock.now()`, not `performance.now()` — drift-guard stays clean.
- **Sub-second clamp granularity tunability** — `MAX_TICK_DELTA_SEC = 0.1` is hard-coded (D-06). A "clamp tightness" user setting was not considered necessary; if frame-rate dips on slow devices surface as an issue, revisit by widening to 250ms before adding a knob.
- **Mid-window mute-flicker prevention** — if user mutes then unmutes within a single phase, D-10's cancel-future + D-08's unmute-waits-for-boundary together produce a silent gap until next boundary. Considered acceptable; matches today's UX.

</deferred>

---

*Phase: 52-visibility-resume-clamp-lookahead-scheduling*
*Context gathered: 2026-05-28*

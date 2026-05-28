# Phase 51: Master clock unification - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Rebase session timing onto `audioCtx.currentTime` via the Phase 50 `SessionClock` interface, eliminating the three-clocks divergence so audio and animation pause/resume together on iOS lock/unlock and stop drifting during foreground operation. Closes diagnosis #1 (lock/unlock sync) and #2 (foreground drift). Stats-only NK rebase included so success criterion #4 ("no regression across HRV/Stretch/Navi") holds with a consistent stats semantic.

**Locked by ROADMAP / REQUIREMENTS (CLOCK-01..05):**
- CLOCK-01: `useSessionEngine` elapsed derives from `SessionClock.now() − sessionStartCtxTime` (not `performance.now() − startedAtMs`).
- CLOCK-02: `useAmbientScale` elapsed reads from the audio clock — satisfied by construction: `useAmbientScale` is idle-only (used inside `OrbIdle` in `OrbShape.tsx:273`), there is no in-session ambient path, and no `performance.now()` cascade reaches an in-session animation surface (D-04 below).
- CLOCK-03: Animation phase progress derived from the audio clock each rAF tick — no independent time source remains in the animation path.
- CLOCK-04: iOS lock/unlock mid-session → audio + animation in phase on resume, no burst, no drift.
- CLOCK-05: Foreground mid-session run → no observable audio/animation sync drift.

**Locked by Phase 50 CONTEXT (do not re-decide):**
- `createAudioSessionClock.now()` already returns `audioCtx.currentTime` (Phase 50 D-03 resolved). No factory-body swap in Phase 51 — the work is caller-level.
- Phase 51 caller-level work = `useSessionEngine` captures `sessionStartCtxTime` at start and computes `elapsed = clock.now() − sessionStartCtxTime` (Phase 50 D-10 resolved).
- `onSuspend` / `onResume` / `onClose` are already wired real through `engine.clock` at Phase 50 (D-11). External consumers already subscribe via `engine.clock.on*` (e.g., `useAudioCues.ts:296-298`).
- `Cue` catalog is closed; no new cue kinds at Phase 51.
- `useAmbientScale` continues using `createWallSessionClock()` for idle ambient — Phase 50 D-10 resolved (no AC available during idle).

**Out of scope (deferred):**
- Full NK cadence rebase onto AC clock (still setTimeout-driven — only `startedAtSec` swaps).
- Per-tick elapsed-delta clamp + lookahead scheduling (Phase 52).
- Master-gain mute (Phase 53).
- NK AudioContext unification with HRV's (still independent per Phase 50 D-08 deferred).

</domain>

<decisions>
## Implementation Decisions

### NK rebase scope (Area A)
- **D-01:** Stats-only rebase. `useNKEngine` consumes NK's audio clock (from `useNaviKriyaAudio`) for `startedAtSec` capture and `elapsedSec` computation. Per-OM cadence (setTimeout in `useNKEngine.ts:99-105`) is untouched — `setTimeout(stepOm, delaySec * 1000)` remains as-is. Rationale: NK uses setTimeout (not rAF), so the rAF-vs-AC divergence pattern from diagnosis #1/#2 doesn't apply to NK cadence; only the stats-semantic question matters, and stats-on-AC keeps recorded elapsed consistent across all three practices (success criterion #4).
- **D-02:** `useNaviKriyaSessionController.ts:62` change from `createWallSessionClock()` to threading `naviAudio.clock` (the audio-clock proxy exposed by `useNaviKriyaAudio`, per D-06 below) into `useNKEngine`. Wall clock instance at L62 is removed.

### Audio-clock wiring (Area B)
- **D-03:** Stable proxy `SessionClock` lives inside each audio hook (`useAudioCues` for HRV, `useNaviKriyaAudio` for NK). The proxy is a single stable object whose internal source is swappable: before AC construction it delegates to a wall clock; after AC construction (after `useAudioCues.start()` / `useNaviKriyaAudio.begin()` creates the AC) it delegates to `engine.clock` / NK's `createAudioSessionClock(audioCtx)`. The proxy identity NEVER changes — useSessionEngine's `clock` dep at `useSessionEngine.ts:186` and useNKEngine's `clock` dep at `useNKEngine.ts:174` stay stable across the swap. No re-mount of the rAF / stepOm loops on AC construction.
- **D-04:** Proxy primitive shape (finalized at plan time): a small factory that returns `{ clock: SessionClock; setSource(SessionClock): void }`. The `clock` is the externally-visible stable reference; `setSource` is internal to the audio hook. `clock.now()` returns the current source's `now()`. `clock.onSuspend/onResume/onClose` subscribe through to whichever source is current at subscribe time AND any future source (subscriptions survive a source swap — failing to do this would silently drop the iOS recovery subscriptions on AC reconstruction; the existing `useAudioCues` subscription pattern at `useAudioCues.ts:296-299` expects subscriptions to follow the engine lifecycle). Exact subscription-forwarding mechanism finalized at plan time (likely: proxy maintains its own subscriber Sets and re-subscribes them on the new source whenever `setSource` is called).
- **D-05:** Swap moment for HRV: at the resolution of `audioStart()` inside `useAudioCues.start()`. By that moment `engineRef.current` is populated; `setSource(engineRef.current.clock)` is called synchronously before the function returns. The session's first `clock.now()` read happens at `session.start()` after lead-in completion — at which point the swap has already occurred. Means lead-in itself runs on wall clock; lead-in cadence is `setTimeout`-driven (`scheduleLeadInTimeouts`) so this is consistent with current behavior.
- **D-06:** Swap moment for NK: at the start of `useNaviKriyaAudio.begin()` immediately after `createAudioSessionClock(audioCtx)` is constructed (currently `useNaviKriyaAudio.ts:79`). `useNaviKriyaAudio` adds a stable `clock: SessionClock` member to its return type; the proxy lives across `begin()` / `close()` cycles (so subsequent NK sessions get a fresh source via `setSource` rather than a new proxy instance). On `close()`, `setSource` reverts to a wall clock so any post-end reads return a sensible value rather than reading from a closed AC.

### AC-suspension semantics (Area C)
- **D-07:** Practice-time semantics confirmed. When AC suspends (iOS lock), `clock.now()` freezes, so session elapsed freezes. A 10-min HRV timed session takes 10 min of unlocked attention, not 10 wall-clock minutes from press-Start. Timed completion (`completeIfNeeded`) fires when `clock.now() − sessionStartCtxTime ≥ targetSec`, regardless of wall time.
- **D-08:** Stats recorded `elapsedMs` (still ms-shaped at the storage boundary per Phase 50 D-02) becomes AC-time-based for HRV / Stretch / Navi. A session that was locked for 2 minutes records as `practice_time − 0 = practice_time` (excludes the lock duration). This is a deliberate semantic change from v2.1; documented in PROJECT.md follow-up (handled by next milestone summary, not Phase 51).
- **D-09:** Stretch ramp pauses + resumes with AC. The ramp position is preserved exactly through any lock/unlock — `lastFrame` is computed from `clock.now() − sessionStartCtxTime`, and the segment table is keyed by the same elapsed value. No special ramp-pause handling needed at the domain layer; `stretchRamp.ts` math is agnostic to clock source.

### iOS reanchor + Phase 5.1 interaction (Area D)
- **D-10:** Session-clock reanchor mirrors the existing audio-anchor reanchor. When `useAudioCues.reconstructEngine` creates a fresh AC (Phase 5.1 recovery path), the proxy's `setSource` swaps to the new `engine.clock` (whose `currentTime` starts at ~0). The reanchor callback fires a new `onSessionClockReanchored(newClockNow: number)` to `useSessionEngine`; the engine recomputes `sessionStartCtxTime = newClockNow − elapsedSecAtReanchor` so `elapsed = clock.now() − sessionStartCtxTime` preserves the pre-recovery elapsed value across the AC swap. Exact callback signature finalized at plan time; likely an exposure parallel to `onAudioReanchorRequired` at `useBreathingSessionController.ts:105-110`.
- **D-11:** Reanchor flow ordering: (1) `useAudioCues.reconstructEngine` builds new engine; (2) proxy's `setSource` swaps to `newEngine.clock` synchronously after construction (extending the existing reconstruction sequence at `useAudioCues.ts:404-453`); (3) fire `onSessionClockReanchored(newEngine.clock.now())` BEFORE the existing `onAudioReanchorRequired(firstInAudioTime)` so the session-clock reanchor lands before any boundary-scheduling math runs against the new audio anchor.
- **D-12:** NK reanchor: NK does not have a Phase-5.1-style reconstruction path (NK uses `naviAudio.close()` / `naviAudio.begin()` lifecycle, not in-session reconstruction). On NK `close()`, the proxy reverts to wall (D-06). No NK reanchor callback needed.

### Claude's Discretion
- Exact placement of the proxy primitive: likely a new tiny module `src/audio/swappableSessionClock.ts` exporting `createSwappableSessionClock(initialSource): { clock; setSource }` — keeps the swap logic in one place even though each audio hook owns its own instance (D-03 locks the hook-adjacent ownership; this is just file layout). Plan time can decide to inline into one of the existing audio files instead if smaller.
- Field-name rename: `startedAtSec` already captures session-start time in `SessionState` (Phase 50 D-02). Phase 51 does NOT rename this to `sessionStartCtxTime` — the field is the same; the semantic change is the clock source, not the storage location. ROADMAP success #3's `sessionStartCtxTime` is the *conceptual* name; on disk it's `startedAtSec`.
- Drift-guard test: Phase 50's fs-scan ban on `performance.now()` reads in the 5 caller files (Phase 50 Claude's discretion bullet) already prevents wall-clock regression. No new drift-guard added at Phase 51.
- Tests for AC-suspension behavior: Vitest can mock the SessionClock and assert that elapsed freezes when `clock.now()` is held constant. New behavioral tests for D-07 (timed completion fires on AC-time) and D-10 (reanchor preserves elapsed) are expected; existing 1283 tests should pass with minimal change (the wiring change at useBreathingSessionController.ts:83 replaces the wall-clock instance with the audio-hook-supplied proxy clock).
- Real-device iOS UAT: closes CLOCK-04 (lock/unlock sync). Foreground drift test (CLOCK-05) is harder to deterministically reproduce; rely on the architectural argument that two-clock divergence is eliminated by single-source unification, plus a long-session smoke run.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 51 requirements + scope
- `.planning/ROADMAP.md` §"Phase 51: Master clock unification" — goal, depends-on, requirements list, 4 success criteria, cross-cutting verification.
- `.planning/REQUIREMENTS.md` — CLOCK-01..05 with full text; DEPS-01 (no new runtime deps); QUAL-01 (per-commit green-gate).
- `.planning/PROJECT.md` §"Current Milestone: v2.2 Audio Sync" — milestone goal, three-clocks context, library-swap rationale.

### Architectural diagnosis driving the milestone
- `.planning/notes/audio-animation-three-clocks-diagnosis.md` — three-clocks divergence diagnosis (§"How each bug falls out" for #1 + #2 mapping to Phase 51), "Fix shape (no external deps)" point 1 (master clock = audioCtx.currentTime).

### Upstream phase context (carry-forward constraints — read these — they LOCK most of the implementation)
- `.planning/phases/50-sessionclock-scheduler-abstraction/50-CONTEXT.md` — full Phase 50 context. **D-03 resolved + D-10 resolved are load-bearing for Phase 51.** D-04 (closed Cue catalog), D-08 (wrap-don't-construct), D-11 (suspend/resume wired real) all preserved.
- `.planning/phases/49-ios-speaker-route-fix/49-CONTEXT.md` D-03 — silent-loop `<audio>` element preserved at Phase 51 (not part of the clock surface).
- `.planning/phases/49.1-bypass-silent-mode-toggle/49.1-CONTEXT.md` D-07/D-09 — `bypassSilentMode` captured at engine construction; preserved at Phase 51.
- Phase 3 D-09 / D-13 / D-14 — AudioContext user-gesture-chain construction; dual-anchor (audio + session) at session start. Phase 51 unifies the dual anchors onto a single clock source but preserves the user-gesture-chain construction site (`useAudioCues.start()` / `useNaviKriyaAudio.begin()`).
- Phase 5.1 + Plan 06 D-34..D-38 — iOS audio recovery, `AudioStatusFlag` state machine, `needs-resume` flow, `'interrupted'` WebKit extension, engine reconstruction. D-10/D-11 extend this with a session-clock reanchor.
- Phase 10 HOOKS-04 (cancel-guard idiom) + HOOKS-02/03 (running-snapshot ref pattern) — preserved at Phase 51.

### Phase 50 implementation artifacts to read alongside CONTEXT.md
- `src/audio/sessionClock.ts` — `SessionClock` interface, `createAudioSessionClock`, `createWallSessionClock`. The proxy primitive (D-04) returns a value of type `SessionClock` so any consumer typed against this interface accepts it.
- `src/audio/audioEngine.ts` — `engine.clock` member (L84); statechange wiring (L249-256 / fanSuspend/fanResume/fanClose).
- `src/hooks/useAudioCues.ts` L289-299 — existing `engine.clock.on*` subscription pattern (the proxy's subscription-forwarding in D-04 must preserve this).
- `src/hooks/useNaviKriyaAudio.ts` L79 — existing `createAudioSessionClock(audioCtx)` site (the swap site for D-06).
- `src/hooks/useBreathingSessionController.ts` L83 — wall clock currently passed to useSessionEngine; this is the site to replace with `audio.clock` (D-03).
- `src/hooks/useNaviKriyaSessionController.ts` L62 — wall clock currently passed to useNKEngine; this is the site to replace with `naviAudio.clock` (D-02).

### Forward-looking context (Phases 52–53)
- `.planning/ROADMAP.md` §"Phase 52: Visibility-resume clamp + lookahead scheduling" — Phase 52's clamp depends on the unified clock being in place (clamp is a per-tick delta cap on `clock.now() − previousClockNow`).
- `.planning/ROADMAP.md` §"Phase 53: Master-gain mute" — independent of clock unification; can land in parallel with Phase 52 after Phase 51.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `engine.clock` member on AudioEngine (`audioEngine.ts:84`) — already a public `SessionClock`. The proxy's audio-source assignment (D-05) just does `setSource(engine.clock)`.
- NK's `createAudioSessionClock(audioCtx)` call at `useNaviKriyaAudio.ts:79` — already constructs the audio clock; D-06 just exposes it via the proxy.
- `useAudioCues.ts:296-299` existing clock-subscription pattern — proxy's subscription-forwarding (D-04) mirrors this.
- `onAudioReanchorRequired` callback at `useBreathingSessionController.ts:105-110` — pattern + signature for the new `onSessionClockReanchored` callback (D-10).
- `useAudioCues.ts:404-453` engine-reconstruction sequence — extension point for D-11 swap ordering.
- `completeIfNeeded(state, clock.now())` at `useSessionEngine.ts:159` — already calls `clock.now()` inside the rAF tick; CLOCK-03 (animation phase progress derived from audio clock each rAF) is satisfied automatically once the proxy is audio-backed.

### Established Patterns
- **User-gesture-chain AC construction** (Phase 3 D-09): AC born inside `useAudioCues.start()` / `useNaviKriyaAudio.begin()`. The proxy lives across this lifecycle event — born wall, swapped to AC on AC creation.
- **Capture-at-session-start** (Phase 18 D-08): timbre captured into closures. `sessionStartCtxTime` follows the same posture — captured into `SessionState.startedAtSec` at `startSession()` / `startStretchSession()` from a SINGLE `clock.now()` read.
- **rAF cancel-guard idiom** (HOOKS-04 / Plan 06 D-10): the existing rAF in `useSessionEngine` is preserved; only the clock source changes underneath.
- **Stable-ref dep pattern** (Phase 10): the proxy's stable identity (D-03) preserves the existing dep stability that the rAF effect at `useSessionEngine.ts:186` relies on.

### Integration Points
- `src/hooks/useAudioCues.ts` — adds a stable `clock: SessionClock` member to the returned controller (proxy from D-03); internally calls `setSource(newEngine.clock)` on AC construction (D-05) AND on AC reconstruction (D-11).
- `src/hooks/useNaviKriyaAudio.ts` — adds a stable `clock: SessionClock` member; internally calls `setSource(audioClock)` in `begin()` (D-06) and reverts to wall in `close()` (D-06).
- `src/hooks/useBreathingSessionController.ts` — L83 wall-clock instance deleted; `audio.clock` (the proxy from useAudioCues) is threaded into `useSessionEngine`. Adds wiring for `onSessionClockReanchored` (D-10).
- `src/hooks/useNaviKriyaSessionController.ts` — L62 wall-clock instance deleted; `naviAudio.clock` (the proxy from useNaviKriyaAudio) is threaded into `useNKEngine`.
- `src/hooks/useSessionEngine.ts` — gains an optional `onSessionClockReanchored` callback or new method (D-10) the controller can call to recompute `startedAtSec`. Existing rAF tick body and `startSession`/`startStretchSession` call sites unchanged.
- `src/audio/` — new tiny module for the proxy primitive (Claude's discretion; could inline). Zero changes to `sessionClock.ts` itself (the interface stays the same).
- Domain layer (`sessionMath`, `sessionController`, `stretchRamp`, `naviKriyaSession`) — NO changes. Same time-base math; only the source of `clock.now()` shifts.
- Tests — new behavioral tests for D-07 (AC-pause freezes elapsed), D-10 (reanchor preserves elapsed), and stats-on-AC-time. Existing 1283 tests adjusted only at wiring sites (controllers pass proxy instead of wall clock).

</code_context>

<specifics>
## Specific Ideas

- The Phase 50 CONTEXT pre-resolved most of the high-risk decisions: `createAudioSessionClock` already returns `audioCtx.currentTime`, subscriptions are already wired through `engine.clock`, and the field-naming concern (`startedAtSec` vs `sessionStartCtxTime`) is purely conceptual. Phase 51 is the smallest possible structural change to flip the clock source under the existing seam.
- The stable-proxy approach (D-03) is the natural way to bridge the lazy-AC-construction lifecycle vs. the early-hook-construction lifecycle. Putting the proxy adjacent to the audio hooks (D-04 locus) keeps the swap event next to the AC creation event — they're co-located logically.
- Practice-time semantics (D-07) is the user-visible behavior change: "session duration" becomes "session attention time". This is more honest to Forrest's hands-off practice framing but is a v2.1→v2.2 stats behavioral change worth surfacing in the milestone summary.
- The reanchor flow (D-10/D-11) is the most subtle piece: when the AC is reconstructed mid-session (Phase 5.1 path), the session clock's time-base resets to ~0, and `sessionStartCtxTime` must be rewritten to preserve `elapsed`. This MUST happen before the audio-anchor rewrite that already fires through `onAudioReanchorRequired`.

</specifics>

<deferred>
## Deferred Ideas

- **NK cadence rebase** — moving `useNKEngine`'s setTimeout-driven OM stepping onto the AC clock. Out of Phase 51 scope; would change core NK timing semantics. Reconsider only if a real-world NK sync bug emerges.
- **NK AudioContext unification with HRV's** — already deferred at Phase 50 D-08; remains out of scope here.
- **Per-tick elapsed-delta clamp** — Phase 52. Phase 51 deliberately does NOT clamp; the foreground-drift fix is "single source" not "delta cap".
- **Lookahead scheduling** — Phase 52. Phase 51 keeps boundary-driven scheduling; only the boundary detection's clock source changes.
- **Master-gain mute** — Phase 53. `setMasterGain` stays a no-op stub (Phase 50 D-12).
- **Drift-guard expansion** — the Phase 50 fs-scan already covers the 5 caller files. No expansion at Phase 51.
- **CLOCK-02 strict reading** — REQ text says "useAmbientScale reads from the audio clock"; idle ambient has no AC, so we satisfy CLOCK-02 by construction (no in-session ambient surface exists). If a future phase introduces in-session ambient scaling, that phase will feed it the session's audio-backed proxy clock.

</deferred>

---

*Phase: 51-master-clock-unification*
*Context gathered: 2026-05-28*

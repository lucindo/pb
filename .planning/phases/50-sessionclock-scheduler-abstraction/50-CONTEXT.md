# Phase 50: SessionClock / scheduler abstraction - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Carve out a `SessionClock` / scheduler interface so the 5 runtime callers (`useSessionEngine`, `useAudioCues`, `useNaviKriyaAudio`, `useNKEngine`, `useAmbientScale`) stop touching `AudioContext` and `performance.now()` directly. Pure structural refactor with byte-identical end-user behavior and 1283-test parity at phase close. Phase 50 is the *seam*; Phase 51 rebases the clock source onto `audioCtx.currentTime` through that seam; Phases 52/53 use the same seam for lookahead scheduling + master-gain mute.

Locked by ROADMAP / REQUIREMENTS (ABSTR-01..04):
- Interface members exposed: `now()`, `schedule(when, cue)`, `setMasterGain(value, rampSec)`, `onSuspend`, `onResume`.
- `audioEngine.ts` exports the `SessionClock` interface and delegates to its existing internals.
- All 5 callers consume `SessionClock`; import-graph drift-guard test fails on direct `AudioContext` or `performance.now()` use in those files.
- Zero new runtime deps (DEPS-01); per-commit green-gate holds (QUAL-01).

</domain>

<decisions>
## Implementation Decisions

### Clock unit + base (Area A)
- **D-01:** `SessionClock.now()` returns **seconds** (float, audio-natural — matches `audioCtx.currentTime` convention).
- **D-02:** Phase 50 also converts caller-internal time math from ms→sec in `useSessionEngine`, `useNKEngine`, and `useAmbientScale` so all caller-side time arithmetic is consistent. Domain helpers (`startSession`, `extendTimedSession`, `completeIfNeeded`, `startStretchSession`) and their tests follow the same rename.
- **D-03:** Phase 51's clock-source swap becomes a one-line implementation change inside `createAudioSessionClock` — `() => audioCtx.currentTime` replaces `() => performance.now() / 1000`. No caller changes required for the swap.

### `schedule(when, cue)` cue shape (Area B)
- **D-04:** `cue` is a **typed discriminated union** (closed catalog at Phase 50):
  ```
  type Cue =
    | { kind: 'in';              phaseDurationSec: number; timbre: TimbreId }
    | { kind: 'out';             phaseDurationSec: number; timbre: TimbreId }
    | { kind: 'lead-in-tick' }
    | { kind: 'end-chord' }
    | { kind: 'nk-front' }
    | { kind: 'nk-back' }
    | { kind: 'nk-tick' }
    | { kind: 'countdown-tick' }
  ```
  Exact field set finalized at plan time after the engine's per-cue helpers are re-walked; payload only what the dispatch needs.
- **D-05:** The engine has internal dispatch from `cue.kind` to the existing per-cue schedulers (`scheduleInCueForTimbre`, `scheduleOutCueForTimbre`, `scheduleNKFrontMarker`, etc.). Existing engine methods (`scheduleLeadIn`, `scheduleNextCue`, `playEndChord`) and NK schedulers become **thin facades** that build a `Cue` value and call `schedule()`.
- **D-06:** Phase 52's lookahead window pre-schedules typed `Cue` values directly into the WebAudio graph (background-tab survival), which is why the catalog is closed at Phase 50 — adding a new cue kind is an interface change visible to the scheduler.

### Instance topology — NK + ambient (Area C)
- **D-07:** One `SessionClock` interface, **two factory functions**:
  - `createAudioSessionClock(audioCtx: AudioContext): SessionClock` — wraps an AudioContext. Used by `audioEngine.ts` (HRV) AND by `useNaviKriyaAudio` (NK keeps its own separate AC at Phase 50; unification is explicitly NOT in scope).
  - `createWallSessionClock(): SessionClock` — backed by `performance.now() / 1000`. Used by `useAmbientScale`.
- **D-08:** NK's AudioContext ownership stays with `useNaviKriyaAudio.begin()` (still `new AudioContext()` inside `begin()`, preserves D-09 user-gesture-chain semantics). The factory wraps; it does NOT construct the AC.
- **D-09:** All 5 callers consume the `SessionClock` interface; `performance.now()` and `new AudioContext()` appear only inside the two factory implementations. The drift-guard passes by construction.
- **D-10:** Phase 51 swap path: `createAudioSessionClock.now()` becomes `() => audioCtx.currentTime`; `createWallSessionClock` stays untouched (idle ambient has no AC and no Phase 51 work).

### Phase 50 wiring scope (Area D)
- **D-11:** `onSuspend` / `onResume` are **wired real** at Phase 50. `createAudioSessionClock` owns the audioCtx `'statechange'` listener; subscribers register via `clock.onSuspend(cb)` / `clock.onResume(cb)`. `useAudioCues` migrates from consuming `onStateChange` in `AudioEngineOptions` to subscribing through the SessionClock surface — but the existing AudioStatusFlag state machine (`needs-resume` flow, gesture-recovery seam) keeps its shape. `createWallSessionClock` exposes `onSuspend`/`onResume` as no-op subscribers (wall clock never suspends).
- **D-12:** `setMasterGain` is a **stubbed no-op** at Phase 50. No master GainNode is inserted into the audio graph. The interface method exists (ABSTR-01 completeness) and accepts the documented signature, but the body is a no-op. Phase 53 adds both the GainNode insertion AND the mute call-site swap to `setMasterGain(0|1, 0.05)` together — paired with the actual mute behavior change.
- **D-13:** Existing per-cue mute fade (`applyMuteFadeOut`) stays as the active mute mechanism through Phase 50 — byte-identical to today.

### Claude's Discretion
- File layout: new `src/audio/sessionClock.ts` carries the `SessionClock` type + both factory functions; `audioEngine.ts` re-exports the `SessionClock` type to literally satisfy ABSTR-02 ("`audioEngine.ts` exports the `SessionClock` interface").
- Drift-guard test mechanism: Vitest file under `src/audio/` that fs-reads the 5 caller files and regex-asserts no `performance.now(`, no `new AudioContext(`, no raw `audioCtx.currentTime` reads. Mirrors the `content.no-review-markers.test.ts` fs-scan drift-guard pattern. No new deps.
- Caller field/variable renames from ms→sec (D-02 cascade): `startedAtMs` → `startedAtSec`, `elapsedMs` → `elapsedSec`, etc. — applied via LSP rename per [[use-lsp-for-renames]] memory.
- Exact `Cue` payload field set: finalized at plan time after re-walking each existing per-cue helper's signature; payload carries only what dispatch needs.
- `scheduleLeadIn` 3-2-1 + first In cue (4 schedule calls) implementation strategy: stays inside the engine's facade method; the 4 calls become 4 `schedule()` calls with `kind: 'lead-in-tick'` and `kind: 'in'`.
- Test diff scope from D-02: domain test files (`session.test.ts`, `breathingPlan.test.ts`, NK domain tests, ambient scale tests) re-assert seconds-shaped time values. Test parity at 1283 is preserved through renames, not test count changes (no skipped, no new tests beyond the drift-guard).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 50 requirements + scope
- `.planning/ROADMAP.md` §"Phase 50: SessionClock / scheduler abstraction" — goal, depends-on, requirements list, 4 success criteria, cross-cutting verification.
- `.planning/REQUIREMENTS.md` — ABSTR-01..04 with full text; DEPS-01 (no new runtime deps); QUAL-01 (per-commit green-gate).
- `.planning/PROJECT.md` §"Current Milestone: v2.2 Audio Sync" — milestone goal, target features, key context paragraph.

### Architectural diagnosis driving the milestone
- `.planning/notes/audio-animation-three-clocks-diagnosis.md` — three-clocks divergence diagnosis, "Fix shape (no external deps)" section with the SessionClock sketch (point 5), HRV envelope continuity finding, library-swap rationale.

### Upstream phase context (carry-forward constraints)
- `.planning/phases/49-ios-speaker-route-fix/49-CONTEXT.md` D-03 — silent-loop `<audio>` element wired into engine lifecycle (preserved at Phase 50; not part of SessionClock surface).
- `.planning/phases/49.1-bypass-silent-mode-toggle/49.1-CONTEXT.md` D-07/D-09 — `bypassSilentMode` captured into `createAudioEngine({ bypassSilentMode })` at construction (preserved; not part of SessionClock surface).
- Phase 3 D-09 / D-13 / D-14 — AudioContext is constructed from a user-gesture chain only; dual-anchor (audio + session) at session start. Phase 50 must preserve.
- Phase 18 D-08 — timbre captured at session start, never re-read mid-session. The `Cue` payload's `timbre` field follows this posture (passed at schedule-time from the engine's per-session captured value, not re-read from prefs).
- Plan 06 D-34..D-38 (`useAudioCues`) — `AudioStatusFlag` state machine, `needs-resume` flow, gesture-recovery seam, WebKit `'interrupted'` extension. D-11 (Area D) folds the `onStateChange` consumer through `onSuspend`/`onResume` without reshaping this machine.

### Forward-looking context (Phases 51–53)
- `.planning/ROADMAP.md` §"Phase 51: Master clock unification" — uses `SessionClock.now()` as the seam to rebase onto `audioCtx.currentTime`; reads `SessionClock.now() − sessionStartCtxTime` (seconds-shaped math, see D-01).
- `.planning/ROADMAP.md` §"Phase 52: Visibility-resume clamp + lookahead scheduling" — uses `SessionClock.schedule()` to pre-stage cues 5–10s ahead in the WebAudio graph (see D-04, D-06).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/audio/audioEngine.ts` — `AudioEngine` interface already has `now()` (returns `audioCtx.currentTime`), `state`, `resume()`, `close()`, `setMuted()`. Several methods are close to the `SessionClock` shape and become the natural backing for `createAudioSessionClock`.
- `src/audio/cueSynth.ts` — `scheduleInCueForTimbre`, `scheduleOutCueForTimbre` are the targets the engine's internal `kind: 'in' | 'out'` dispatch routes to (D-05).
- `src/audio/nkCueSynth.ts` — `scheduleNKFrontMarker`, `scheduleNKBackMarker`, `scheduleNKTick`, `scheduleCountdownTick`, `scheduleEndChord` are the targets for the NK + countdown + end-chord cue kinds.
- `src/audio/timbres.ts` + `TimbreId` — `Cue` union's `timbre` field reuses the existing type (D-04).
- `src/content/`'s `content.no-review-markers.test.ts` fs-scan pattern — direct template for the drift-guard Vitest file (Claude's discretion).

### Established Patterns
- **User-gesture-chain AC construction** (Phase 3 D-09): `new AudioContext()` happens synchronously inside `createAudioEngine` and inside `useNaviKriyaAudio.begin()`. SessionClock factories WRAP an AC; they do NOT construct one (D-08).
- **Capture-at-session-start** (Phase 18 D-08, Phase 49.1 D-09): timbre, bypassSilentMode are frozen at start. Cue payloads in `schedule(when, cue)` carry already-captured values; the engine never re-reads prefs at dispatch time.
- **rAF cancel-guard idiom** (HOOKS-04 / Plan 06 D-10): `cancelled` flag + top-of-tick check + cancel-on-cleanup. `useAmbientScale`'s rAF loop already follows this pattern; the ms→sec rename (D-02) doesn't change the structure.
- **Drift-guard via fs-scan** (Phase 26 `content.no-review-markers.test.ts`): walk specific files with `fs.readFileSync`, regex-assert absence of disallowed patterns, fail at the test layer for fast CI feedback.

### Integration Points
- `audioEngine.ts` — gets a new export (`SessionClock` type re-export) AND internal refactor (`scheduleLeadIn`, `scheduleNextCue`, `playEndChord` become facades over `schedule()`).
- `useAudioCues.ts` — consumes `SessionClock` (via `engine.clock` or similar); `engine.now()` calls become `clock.now()`; `engine.scheduleLeadIn` / `engine.scheduleNextCue` / `engine.playEndChord` are unchanged externally (facades preserve the existing API surface).
- `useSessionEngine.ts` — receives a `SessionClock` (probably via a hook arg or context); 4 `performance.now()` call sites become `clock.now()`; session-state math becomes seconds-shaped (D-02 rename cascade).
- `useNaviKriyaAudio.ts` — `new AudioContext()` survives at the construction site; `audioCtx.currentTime` reads route through `createAudioSessionClock(audioCtx)`; the rest of NK audio is unchanged.
- `useNKEngine.ts` — 3 `performance.now()` call sites become `clock.now()`; `startedAtMs` → `startedAtSec`; elapsed math in seconds.
- `useAmbientScale.ts` — `performance.now()` becomes `wallClock.now()`; rAF loop math stays the same but in seconds; the rest of the hook is unchanged.

</code_context>

<specifics>
## Specific Ideas

- The split decision in Area D (D-11/D-12) is deliberate risk shaping — `onSuspend`/`onResume` are mostly bookkeeping and worth landing now; `setMasterGain` requires inserting a node into the audio graph and is genuinely risky to land without the matching mute swap, so it pairs with Phase 53.
- The Cue catalog is **closed** at Phase 50 (D-04). Adding a new cue kind in a later phase is an interface change visible to both the engine dispatch AND the Phase 52 lookahead — that's intentional, it forces the conversation when the surface area grows.
- Drift-guard test scope is exactly the 5 caller files. Other files in `src/hooks/`, `src/audio/`, `src/components/` are unaffected — the drift-guard is about the abstraction boundary, not a project-wide ban.

</specifics>

<deferred>
## Deferred Ideas

- **NK AudioContext unification** — folding NK into the main `audioEngine` AC. Considered but explicitly out of scope at Phase 50 (would risk byte-identical behavior at this phase). Candidate for a later refactor phase if Phase 52/53 lookahead + master-gain semantics make a single-AC story more attractive.
- **Continuous ambient layer** — seed at `.planning/seeds/continuous-ambient-layer.md`. Independent of SessionClock; awaiting an aesthetic / sample-content trigger.
- **Library swap (Tone.js / Howler)** — `SessionClock` is explicitly the abstraction that keeps this a single-implementation change. Not in v2.2 scope.
- **Drift-guard expansion to other `src/hooks` files** — could lock the abstraction more broadly; not needed for Phase 50 success criteria.

</deferred>

---

*Phase: 50-sessionclock-scheduler-abstraction*
*Context gathered: 2026-05-27*

# Phase 50: SessionClock / scheduler abstraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in 50-CONTEXT.md — this log preserves the discussion.

**Date:** 2026-05-27
**Phase:** 50-sessionclock-scheduler-abstraction
**Mode:** discuss (default)
**Areas selected:** Clock unit + base; schedule(when, cue) cue shape; Instance topology — NK + ambient; Phase 50 wiring scope

---

## Area A — Clock unit + base

**Context presented:**
- `audioEngine.now()` already returns seconds (`audioCtx.currentTime`).
- `useSessionEngine` / `useAmbientScale` / `useNKEngine` work in ms internally (`startedAtMs`, `elapsedMs`).
- Phase 51 success criterion #3 uses seconds-shaped math (`SessionClock.now() − sessionStartCtxTime`).

**Question:** What unit does `SessionClock.now()` return at Phase 50?

**Options presented:**
1. **Seconds (audio-natural)** — Phase 50 also converts the three ms-using callers' internal math to seconds. Cleanest Phase 51 swap (one-line implementation change). More files touched at Phase 50.
2. Milliseconds (caller-current) — Phase 50 wraps `() => performance.now()`. Phase 51 swap becomes `() => audioCtx.currentTime * 1000`. Contract mismatches WebAudio's natural unit.
3. Mixed — interface in seconds; callers carry ms internally and convert at the boundary. SI fence in every caller.

**Selection:** **(1) Seconds (audio-natural)**.

**Implication:** D-01, D-02, D-03 in CONTEXT.md. ms→sec rename cascade in three caller files + their domain helpers + their tests. Tracked under Claude's Discretion for plan time.

---

## Area B — `schedule(when, cue)` cue shape

**Context presented:**
- Phase 52's lookahead needs cues pre-staged in the WebAudio graph (not callback closures fired by rAF) so they survive a hidden tab.
- Today's scheduling is per-cue-type: `scheduleLeadIn`, `scheduleNextCue({ newPhase, audioTime, phaseDurationSec })`, `playEndChord` + NK markers + tick + countdown + end-chord.

**Question:** What is the shape of the `cue` parameter?

**Options presented:**
1. **Typed discriminated union (closed catalog)** — 8 known cue kinds; engine has internal dispatch; existing per-cue helpers become facades. Phase 52 lookahead pre-schedules typed `Cue` values directly into WebAudio graph.
2. Generic `(audioTime: number) => void` callback — maximum flexibility, weaker background-tab survival (cues only enter WebAudio when the closure runs).
3. Hybrid — typed CueRequest + callback escape. Two code paths.

**Selection:** **(1) Typed discriminated union (closed catalog)**.

**Implication:** D-04, D-05, D-06 in CONTEXT.md. Catalog of 8 cue kinds; engine internal dispatch; existing methods become facades over `schedule()`. Catalog is closed at Phase 50 — adding a new cue kind in a later phase is an interface change.

---

## Area C — Instance topology — NK + ambient

**Context presented:**
- ABSTR-03 requires ALL 5 callers consume `SessionClock`, including `useAmbientScale` (which has no session and no AC).
- Today: HRV's AC lives in `audioEngine.ts`; NK's AC is inline in `useNaviKriyaAudio`; ambient uses `performance.now()` with no AC.
- Phase 50 is byte-identical — folding NK into the audioEngine AC carries behavior-change risk.

**Question:** Which topology fits Phase 50?

**Options presented:**
1. **Two factories, one interface** — `createAudioSessionClock(audioCtx)` for HRV + NK (each keeps own AC); `createWallSessionClock()` for ambient. All 5 callers consume `SessionClock`; drift-guard passes because `performance.now()` / `AudioContext` appear only in factories.
2. Unify NK into audioEngine — one AC. Cleaner long-term; risk to ABSTR-02 byte-identical at Phase 50.
3. Two factories + exempt useAmbientScale from drift-guard. Allowlist that may decay.

**Selection:** **(1) Two factories, one interface**.

**Implication:** D-07, D-08, D-09, D-10 in CONTEXT.md. NK keeps its own AC (deferred unification listed in Deferred Ideas). Factories wrap AC; they do not construct it (preserves D-09 user-gesture-chain semantics).

---

## Area D — Phase 50 wiring scope

**Context presented:**
- The interface has 5 members per ABSTR-01. `now()`, `schedule()`, `onSuspend`, `onResume` map onto existing primitives. `setMasterGain` introduces a new audio-graph topology element (master GainNode between cue chains and destination).
- Phase 50 is "zero end-user behavior change" — any audio-graph topology change must prove byte-identical.

**Question:** How much real audio-graph plumbing lands at Phase 50?

**Options presented:**
1. **Split — wire onSuspend/onResume now, defer setMasterGain** — listener consolidation is bookkeeping (low risk); GainNode insertion deferred to Phase 53 where it pairs with the mute call-site swap.
2. Full wiring at Phase 50 — GainNode inserted now at default gain 1.0; existing per-cue mute fade stays. Bigger Phase 50, smallest Phase 53. Risk to byte-identical.
3. Interface-only — stub everything new. Smallest Phase 50; biggest Phase 53.

**Selection:** **(1) Split**.

**Implication:** D-11, D-12, D-13 in CONTEXT.md. `onSuspend` / `onResume` are wired real (factory owns audioCtx `'statechange'` listener; subscribers via `clock.onSuspend(cb)` / `clock.onResume(cb)`; `useAudioCues` migrates from `onStateChange` consumption). `setMasterGain` is a stubbed no-op at Phase 50; Phase 53 lands GainNode insertion + mute call-site swap together.

---

## Claude's Discretion items surfaced (not asked)

These were presented to the user after the four area questions; the user said to continue without overriding:

1. **Interface file layout** — new `src/audio/sessionClock.ts` carries the type + both factories; `audioEngine.ts` re-exports the type to literally satisfy ABSTR-02's "audioEngine.ts exports the SessionClock interface".
2. **Drift-guard test mechanism** — Vitest fs-scan of the 5 caller files, regex-asserting no `performance.now(` / `new AudioContext(` / raw `audioCtx.currentTime`. Mirrors `content.no-review-markers.test.ts`. No new deps.
3. **Field/variable renames from ms→sec** — `startedAtMs` → `startedAtSec`, `elapsedMs` → `elapsedSec` in the three callers + their domain helpers + their tests. LSP rename per [[use-lsp-for-renames]] memory.
4. **NK AudioContext ownership** — `useNaviKriyaAudio.begin()` still calls `new AudioContext()` (preserves D-09 gesture-chain). Factory wraps; does not construct.
5. **Cue catalog payload finalization** — exact field set for each `kind` finalized at plan time after re-walking each per-cue helper's signature.

---

## Deferred Ideas captured

- **NK AudioContext unification** — folding NK into the main `audioEngine` AC. Out of scope at Phase 50; candidate for a later refactor phase.
- **Continuous ambient layer** — seed at `.planning/seeds/continuous-ambient-layer.md`. Independent of SessionClock.
- **Library swap (Tone.js / Howler)** — explicitly the abstraction's value proposition; not in v2.2 scope.
- **Drift-guard expansion to broader `src/hooks` files** — locks the abstraction more broadly; not needed for Phase 50 success.

---

*End of discussion log.*

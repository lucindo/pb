# Phase 51: Master clock unification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in 51-CONTEXT.md — this log preserves the discussion.

**Date:** 2026-05-28
**Phase:** 51-master-clock-unification
**Mode:** discuss (default)
**Areas analyzed:** NK rebase scope, Audio-clock wiring path, AC-suspension semantics, iOS reanchor + Phase 5.1 interaction

## Areas Selected

User selected all four gray areas surfaced from phase analysis.

## Area A — NK rebase scope

**Question:** What NK rebase scope for Phase 51?

| Option | Selected | Rationale |
|--------|:--------:|-----------|
| Stats only — swap NK's clock to NK audio clock | ✅ | NK uses setTimeout (not rAF); rAF-vs-AC divergence (diagnosis #1/#2) doesn't apply to NK cadence. Stats-on-AC keeps recorded elapsed consistent across all three practices (success criterion #4). |
| Leave NK on wall clock |  | Smaller blast radius but introduces inconsistent stats semantics across practices. |
| Full NK rebase — cadence on AC clock too |  | Largest blast radius; not justified by any current diagnosis. |

**→ Captured as D-01, D-02 in CONTEXT.**

## Area B — Audio-clock wiring path

**Question 1:** How should the audio clock reach useSessionEngine (and useNKEngine)?

| Option | Selected | Rationale |
|--------|:--------:|-----------|
| Stable proxy clock owned by the controller (audio-hook adjacent) | ✅ | Proxy identity stays stable across AC creation; useSessionEngine's dep on clock at L186 never thrashes. Clean dep semantics. |
| Expose clock-getter (function ref) |  | Avoids proxy object but indirects every call through an extra fn; looser type contract. |
| Restructure: thread clock through session.start() arg |  | Biggest API surface change; touches domain helpers + tests. |

**Question 2:** Where does the proxy live, and when does it swap?

| Option | Selected | Rationale |
|--------|:--------:|-----------|
| Inside useAudioCues / useNaviKriyaAudio (engine-adjacent) | ✅ | Encapsulates the swap event next to the AC-creation event. Controllers stay clean. |
| Owned by each session controller |  | More wiring code in controllers; risk of drift between HRV/NK. |
| Shared helper in src/audio/ |  | Most centralized; ceremony for what is a small piece of logic. |

**→ Captured as D-03, D-04, D-05, D-06 in CONTEXT. Proxy primitive shape (`{ clock; setSource }`) and subscription-forwarding semantics left to plan time but framed.**

## Area C — AC-suspension semantics

**Question:** Confirm AC-suspension semantics for timed sessions and stats?

| Option | Selected | Rationale |
|--------|:--------:|-----------|
| Yes — 'practice time' | ✅ | Literal interpretation of success criterion #1 ("audio + animation in phase on resume"). Matches Forrest's hands-off practice framing — a 10-min session = 10 min of unlocked attention. |
| Hybrid — cap pause at e.g. 60s |  | Not in scope of any CLOCK-0X requirement; complicates the change. |
| Wall-clock for total-elapsed, AC for phase math |  | Re-introduces a two-clock divergence the phase is supposed to eliminate. |

**→ Captured as D-07, D-08, D-09 in CONTEXT. Documented as a deliberate v2.1→v2.2 stats behavioral change.**

## Area D — iOS reanchor + Phase 5.1 interaction

**Question:** How should the session clock survive AC reconstruction (Phase 5.1 reanchor)?

| Option | Selected | Rationale |
|--------|:--------:|-----------|
| Rebase sessionStartCtxTime alongside the audio reanchor | ✅ | Mirrors the existing onAudioReanchorRequired pattern; preserves pre-recovery elapsed through AC swap. Preserves Phase 5.1's "user can recover mid-session" UX. |
| End the session on AC reconstruction |  | Regression vs Phase 5.1's whole point. |
| Keep wall-clock fallback during reanchor window |  | Re-introduces divergence in exactly the failure scenario the milestone is supposed to fix. |

**→ Captured as D-10, D-11, D-12 in CONTEXT.**

## Auto-Resolved Interpretations

### CLOCK-02 strict reading
The REQ text says "useAmbientScale reads from the audio clock", but useAmbientScale is idle-only (used inside `OrbIdle` in `OrbShape.tsx:273`), and idle has no AC. Phase 50 D-10 already resolved this. Captured as an explicit interpretation in CONTEXT `<domain>` and `<deferred>` sections — Phase 51 satisfies CLOCK-02 by construction (no in-session ambient surface exists; no `performance.now()` cascade reaches an in-session animation path).

## External Research

None — all questions resolved against existing CONTEXT 50, ROADMAP, REQUIREMENTS, and direct code inspection of:
- `src/hooks/useSessionEngine.ts`
- `src/hooks/useAmbientScale.ts`
- `src/hooks/useNKEngine.ts`
- `src/hooks/useAudioCues.ts`
- `src/hooks/useBreathingSessionController.ts`
- `src/hooks/useNaviKriyaSessionController.ts`
- `src/hooks/useNaviKriyaAudio.ts`
- `src/audio/audioEngine.ts`
- `src/audio/sessionClock.ts`
- `src/components/OrbShape.tsx`
- `.planning/notes/audio-animation-three-clocks-diagnosis.md`
- `.planning/phases/50-sessionclock-scheduler-abstraction/50-CONTEXT.md`

## Deferred Ideas

No new deferred ideas surfaced from discussion (already captured in CONTEXT `<deferred>`).

## Scope Creep Redirected

None — discussion stayed within Phase 51 boundary throughout.

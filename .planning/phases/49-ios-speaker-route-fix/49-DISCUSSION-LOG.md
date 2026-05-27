# Phase 49: iOS speaker route fix — Discussion Log

> **Audit trail only.** Decisions captured in CONTEXT.md; this log preserves the discussion that produced them.

**Date:** 2026-05-27
**Phase:** 49-ios-speaker-route-fix
**Mode:** discuss (interactive, four-area focused)

## Pre-discussion analysis

- Canonical spec at `.planning/todos/2026-05-27-ios-speaker-route-audio-element-fix.md` already locks the technique (silent looping `<audio playsInline>`, gesture-chain start, programmatic buffer, near-zero non-zero volume, real decodable WAV, teardown on AC close).
- Diagnosis at `.planning/notes/audio-animation-three-clocks-diagnosis.md` issue #6 confirms standard iOS workaround.
- No prior CONTEXT.md (first phase of v2.2 Audio Sync milestone; v2.1 just shipped).
- No blocking anti-patterns. No existing SPEC.md. No discuss-checkpoint.
- Code scout confirmed `createAudioEngine` is the sole user-gesture chain entry and the engine is "Zero React imports" by design.

## Gray areas presented

Four discrete decisions remained after the spec lock:
1. Element ownership / where it lives
2. iOS gating strategy
3. Silent buffer source
4. Phase 5.1 reconstruction interaction

Operator selected all four for discussion.

## Discussion turns

### Area 1 — Element ownership

**Options presented:**
1. Engine-internal (Recommended) — `createAudioEngine` constructs `new Audio()` after `new AudioContext()`; mirrors engine lifecycle; preserves React-free engine
2. Hook-level in `useAudioCues.start` — engine stays pure cue scheduler; two parallel close paths
3. JSX `<audio>` in App rendered conditionally — declarative, but still needs imperative `.play()` from click handler

**Decision:** Engine-internal. (D-01 in CONTEXT.md)

### Area 2 — iOS gating strategy

**Options presented:**
1. Always-on cross-platform (Recommended) — zero UA sniffing, simpler code, Howler.js posture, "measure first" hint resolved by deferring optimization to validation
2. UA-gate to iOS Safari only — zero non-iOS overhead but fragile detection + maintenance burden
3. Always-on, gate on WebKit detection — middle ground but still UA-shaped

**Decision:** Always-on cross-platform. (D-02 in CONTEXT.md)

### Area 3 — Silent buffer source

**Options presented:**
1. Inline base64 data URL of tiny WAV (Recommended) — bundle-only, deterministic, no asset, no runtime cost; Howler posture
2. OfflineAudioContext-rendered WAV at runtime — no base64 in source but more code + runtime cost
3. Static `.wav` file under `public/` — simplest wiring but breaks "no extra asset" spec constraint

**Decision:** Inline base64 data URL. (D-03 in CONTEXT.md)

### Area 4 — Phase 5.1 reconstruction interaction

**Options presented:**
1. Mirror engine lifecycle exactly (Recommended) — new element per engine, torn down on close; brief category-drop window during reconstruct accepted (ms-scale)
2. Single shared element across reconstructions — element survives close/recreate cycle; better category preservation but second teardown owner
3. Mirror generally, preserve on reconstruct only — hybrid, more invariants

**Decision:** Mirror engine lifecycle exactly. (D-04 in CONTEXT.md)

## Locked by spec (not discussed — flowed directly into D-05..D-08)

From `.planning/todos/2026-05-27-ios-speaker-route-audio-element-fix.md`:
- Silent looping `<audio playsInline>` technique
- Element starts on same user-gesture chain that constructs `AudioContext`
- Programmatically-generated silent buffer (no extra asset)
- `playsInline=true`, `loop=true`, `muted=false`, `volume` near-zero but non-zero
- Source must be real decodable WAV/MP3 (not empty / not pure silence)
- Tear down element on `AudioContext.close()`
- No autoplay on page load

## Failure-mode posture (Claude's discretion, confirmed against existing patterns)

Silent absorb on `.play()` rejection, mirroring existing patterns (`audioEngine.ts:139-143`, `useAudioCues.ts:257-269`). Captured as D-09; not raised as a gray area because the existing posture obviously applies.

## Deferred ideas

- Continuous ambient layer (AMBIENT-F1) — `.planning/seeds/continuous-ambient-layer.md`.
- UA-based re-gating as a fallback if IOS-04 validation measures regression.
- Phases 50–53 (SessionClock + clock unification + lookahead + master-gain mute) — separate v2.2 phases.

## Cross-cutting verification carry-over

DEPS-01 (no new runtime deps) and QUAL-01 (per-commit green-gate) apply. Recorded in CONTEXT.md `<specifics>` for the planner.

---
phase: 09-audio-wake-lock-lifecycle-hardening
session: 2026-05-11
mode: discuss (default)
---

# Phase 09 Discussion Log

Reference-only audit trail. Downstream agents read CONTEXT.md, not this file.

## Areas Selected by User

User chose all 4 presented gray areas:
1. AUDIO-02 clamp site & SAFE_LEAD value
2. AUDIO-05 handleStateChange race fix
3. AUDIO-06 `'starting'` status removal
4. Plan packaging shape

## Area 1 — AUDIO-02 clamp site

**Q1: where should the past-time clamp live?**
- options: Callee (engine.scheduleNextCue) — Recommended | Caller (App.tsx) | Both — belt + suspenders
- selection: **Both — belt + suspenders** → D-01
- notes: User chose dual-site over the recommended single-callee placement. Trade-off accepted: tests must lock both sites; symmetry between App's explicit timing math and engine's self-defense.

**Q2: how is SAFE_LEAD_SEC defined?**
- options: Named export from audioEngine.ts — Recommended | Private engine constant + duplicated literal | Literal 0.005 at both sites
- selection: **Named export `SAFE_LEAD_SEC = 0.005` from audioEngine.ts** → D-03
- notes: Matches the recommended option. Single source of truth complements the dual-site clamp (Q1) — both sites read the same symbol.

## Area 2 — AUDIO-05 handleStateChange race fix

**Q1: which strategy lands?**
- options: (a) Null-safe end-to-end — Recommended | (b) Defer addEventListener('statechange') until after WR-06 | Hybrid — (a) now + flag (b) as v1.x follow-up
- selection: **Hybrid — (a) now + flag (b) as v1.x follow-up** → D-04, D-05
- notes: User picked the hybrid path to keep the phase surgical without losing the cleaner contract option. Captured (b) in `<deferred>` per the philosophy of "preserve, don't lose, don't act."

## Area 3 — AUDIO-06 `'starting'` removal

**Q1: 'starting' fate?**
- options: Remove entirely — Recommended | Surface to UI | Rename to 'connecting'
- selection: **Remove entirely** → D-07..D-10
- notes: Matches the recommended option. IN-03 explicit: state is never observed by any render. Drop type member, drop setStatus call, rewrite docstring. UI surfacing option flagged as scope creep before user pick.

## Area 4 — Plan packaging

**Q1: how to slice waves?**
- options: Two plans, two waves — Recommended | Three plans, three waves | Single big plan | Two plans, parallel wave
- selection: **Two plans, two waves (engine-layer → hook+App-layer)** → D-11..D-14
- notes: Matches the recommended option. Plan 02 depends on Plan 01 because the hook layer consumes the new `SAFE_LEAD_SEC` export and tightened `AudioStatus` union. Parallel option (two plans in Wave 1) rejected by user — implicit preference for explicit sequencing over wall-clock speed.

## Deferred Ideas Surfaced

- AUDIO-05 option (b) — defer-attach `statechange` listener — captured in `<deferred>` per D-05.
- `'starting'` UI surfacing — captured in `<deferred>` per AUDIO-06 Q1 option rejection.

## Claude's Discretion (not asked of user)

- Generation-counter implementation shape (number vs symbol vs WeakRef) — deferred to research.
- `onended` listener cleanup semantics (does removeEventListener / `{ once: true }` matter?) — deferred to research.
- Whether `useWakeLock` in-flight ref is `useRef<Promise<WakeLockSentinel | null> | null>` or just a boolean lock — deferred to plan; researcher confirms.
- Exact placement of `SAFE_LEAD_SEC` in `audioEngine.ts` (top of file with other constants, or near `scheduleNextCue`?) — planner decides; minor.

## No Scope Creep Detected

User stayed strictly inside Phase 9 REQ-ID scope. Phase 10 (HOOKS-*) coupling acknowledged in `<deferred>` but not pursued.

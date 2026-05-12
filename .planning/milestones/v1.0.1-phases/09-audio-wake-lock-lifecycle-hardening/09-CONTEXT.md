---
phase: 09-audio-wake-lock-lifecycle-hardening
created: 2026-05-11
milestone: v1.0.1
requirements:
  - AUDIO-01
  - AUDIO-02
  - AUDIO-03
  - AUDIO-04
  - AUDIO-05
  - AUDIO-06
  - WAKELOCK-01
---

# Phase 09 Context: Audio + Wake Lock Lifecycle Hardening

<domain>
Close the imperative-resource races and defensive gaps in audio engine reconstruction, boundary cue scheduling, lead-in projection, oscillator graph cleanup, statechange handler, and wake-lock acquisition. Fix-only patch — no user-facing behavior changes. Lives entirely in `src/audio/`, `src/hooks/use{AudioCues,WakeLock}.ts`, and one boundary site in `src/app/App.tsx`.
</domain>

<decisions>

### Clamp site & SAFE_LEAD constant (AUDIO-02)

- **D-01:** Past-time clamp lands at BOTH sites — belt-and-suspenders. (a) Inside `audioEngine.scheduleNextCue` (callee-side) so the engine API is self-defending for any current or future caller; (b) at the App.tsx boundary effect just before `audioNotifyPhaseBoundary({ ..., audioTime })` (caller-side) so the App's explicit timing math (anchor + `boundaryStartMs / 1000`) cannot ship a past-time value into the engine. Vitest locks BOTH clamp sites — the engine-side via `audioEngine.test.ts` (mocked `currentTime`), the caller-side via `App.audio.test.tsx` (or new co-located case asserting the clamped value reaches `notifyPhaseBoundary`).

- **D-02:** Clamp formula at both sites: `Math.max(audioTime, engine.now() + SAFE_LEAD_SEC)`. Apply BEFORE any further engine math; do not subtract or transform after.

- **D-03:** `SAFE_LEAD_SEC` is a named export from `src/audio/audioEngine.ts`: `export const SAFE_LEAD_SEC = 0.005` (5 ms, per REQUIREMENTS.md "≈ 5 ms"). App.tsx imports the symbol for the caller-side clamp. Single source of truth across both clamp sites; tests assert the constant. No duplicated literals.

### handleStateChange race fix (AUDIO-05)

- **D-04:** Land option (a) — null-safe end-to-end this phase. Every branch in `handleStateChange` (`useAudioCues.ts:116-150`) that needs `engineRef.current` reads it into a local `const engine = engineRef.current; if (engine === null) return` at the top of the relevant scope. No other refs / setState calls mutated without that gate. Matches the existing Plan 06 WR-06 pattern documented at `useAudioCues.ts:156-158`.

- **D-05:** Defer the larger reshape — moving `addEventListener('statechange')` later in the engine lifecycle (option b) — to v1.x. Add a `<deferred>` note here and a JSDoc cross-ref at the top of the new null-safe handler. Goal: keep this phase surgical; do not destabilize the Plan 06 D-35 resume path.

- **D-06:** The defensive gate covers ANY future branch that reads `engineRef.current` — the helper local is at the top of the function body, not duplicated per branch. Tests for AUDIO-05: simulate a `statechange` firing AFTER `stop()` synchronously nulled `engineRef`, assert no setState calls fire and no throw. Use `vi.useFakeTimers()` + manual dispatch on a mocked AC, matching existing test geography in `useAudioCues.test.tsx`.

### 'starting' status removal (AUDIO-06)

- **D-07:** Remove `'starting'` entirely from the `AudioStatus` union in `src/audio/audioEngine.ts:25`. New union: `export type AudioStatus = 'idle' | 'lead-in' | 'failed'`.

- **D-08:** Delete the `setStatus('starting')` call at `useAudioCues.ts:192`. The transition goes `'idle' → 'lead-in'` (success) or `'idle' → 'failed'` directly. No intermediate render observes the deleted transient.

- **D-09:** Rewrite the state-machine docstring at `useAudioCues.ts:5-7` to: `// State machine: 'idle' → 'lead-in' (success) | 'failed' (D-10 Plan 06).` Drop the dead-state explanation entirely.

- **D-10:** Lock the tightened union with a Vitest case in `useAudioCues.test.tsx` (or a TypeScript-level assertion) — any future `setStatus('starting')` reintroduction must fail to compile or fail a test.

### Plan packaging (waves)

- **D-11:** Two plans, two waves. Wave 1 is the engine-layer plan (engine self-protections + cueSynth cleanup + wake-lock fix); Wave 2 is the hook-and-App-layer plan (consumes the wave-1 API + adds the caller-side clamp).

- **D-12:** **Plan 01 (Wave 1)** — `09-01-PLAN.md`: AUDIO-02 engine-side clamp + `SAFE_LEAD_SEC` export, AUDIO-03 (`scheduleLeadIn` returns `null` when engine `closed`), AUDIO-04 (cueSynth oscillator-onended partial-chain disconnect), AUDIO-06 (`AudioStatus` union tightening), WAKELOCK-01 (`useWakeLock.request` in-flight ref + release-during-await cleanup). Files modified: `src/audio/audioEngine.ts`, `src/audio/audioEngine.test.ts`, `src/audio/cueSynth.ts`, `src/audio/cueSynth.test.ts`, `src/hooks/useWakeLock.ts`, `src/hooks/useWakeLock.test.tsx`. No coupling to the hook layer — Plan 01 ships a tightened API without touching consumers.

- **D-13:** **Plan 02 (Wave 2)** — `09-02-PLAN.md`: AUDIO-01 (`reconstructEngine` generation counter + bail-and-close on mismatch; `stop()` and unmount bump same counter), AUDIO-05 (`handleStateChange` null-safe end-to-end per D-04), AUDIO-03 hook-side null propagation (`useAudioCues.start` returns `number | null`), AUDIO-06 hook-side cleanup (drop `setStatus('starting')` + rewrite docstring per D-08/D-09), AUDIO-02 caller-side clamp at `App.tsx:504` (import `SAFE_LEAD_SEC` from `audioEngine`). Files modified: `src/hooks/useAudioCues.ts`, `src/hooks/useAudioCues.test.tsx`, `src/app/App.tsx`, `src/app/App.audio.test.tsx` (or add cases to existing App-side test). `depends_on: ['01']`.

- **D-14:** Tests follow Phase 8 / prior-phase geography: co-locate new contract assertions in each file's existing `*.test.{ts,tsx}` neighbor — no new test files unless an existing file would exceed reasonable size or the assertion has no natural home.

</decisions>

<canonical_refs>

**REQUIREMENTS / specs:**
- `.planning/REQUIREMENTS.md` §"Audio" + §"Wake Lock" (lines for AUDIO-01..06, WAKELOCK-01) — REQ-ID source-of-truth, includes CR-/WR-/IN- traceability to v1.0 review.
- `REVIEW.md` (repo root, v1.0 full-codebase review) — §CR-03 (reconstructEngine race), §CR-04 (wake-lock concurrent request), §WR-02 (boundary clamp), §WR-10 (scheduleLeadIn null), §WR-11 (cueSynth node disconnect), §WR-12 (handleStateChange null-safety), §IN-03 (`'starting'` dead state).

**Carry-forward CONTEXT files:**
- `.planning/phases/07-strict-type-lint-baseline/07-CONTEXT.md` — strict TS + `strictTypeChecked` ESLint baseline contract every Phase 9 commit must respect.
- `.planning/phases/08-storage-forward-compat-cross-tab-ui-sync/08-CONTEXT.md` — silent-fallback posture (D-03 "no console.warn in prod") and test-geography precedent ("co-locate contracts in existing `*.test.*` neighbors").

**Project-level:**
- `.planning/PROJECT.md` §"Current Milestone: v1.0.1 Code Review Patch" — "tests pass at v1.0 close — patch must not regress" invariant; "no user-facing features" constraint.
- `.planning/ROADMAP.md` §"Phase 9" — success criteria 1..6.
- `.planning/STATE.md` — phase 9 entry & v1.0.1 sequencing.

**Source under edit:**
- `src/audio/audioEngine.ts` (lines 25 `AudioStatus`, 149 `scheduleLeadIn`, 169 `scheduleNextCue`, internal `cues` graph @ 131) — where AUDIO-02/03/06 land.
- `src/audio/cueSynth.ts` — `scheduleBowlCue` partial-chain construction; AUDIO-04 osc.onended disconnect site.
- `src/hooks/useAudioCues.ts` — `handleStateChange` (116-150), `start` (188-218), `reconstructEngine` (254-299), `setStatus('starting')` call (192); AUDIO-01/05/06 land here.
- `src/hooks/useWakeLock.ts` (line 90 already documents the unmount-cleanup race) — WAKELOCK-01 in-flight ref + freshly-acquired-sentinel cleanup.
- `src/app/App.tsx` boundary effect at 504-514 — AUDIO-02 caller-side clamp.

**Reference patterns already in the codebase:**
- `useAudioCues.ts:222-230` — Pattern B "synchronously null engineRef BEFORE awaiting close" — AUDIO-01's generation counter overlays on top, not replaces.
- `useAudioCues.ts:156-158` — Plan 06 WR-06 single-gate-on-engineRef comment — D-04 / D-06 follow this style verbatim for AUDIO-05.
- `useWakeLock.ts:90` — existing Pitfall 6 comment about in-flight-vs-unmount race — WAKELOCK-01 formalizes this with an explicit ref.

</canonical_refs>

<code_context>

**Reusable assets:**
- `engine.now()` accessor (`audioEngine.ts` API + `useAudioCues.ts:334` proxy `audio.now()`) — already in place; powers both D-01 clamps. No new accessor required.
- `engineRef.current` synchronous-null pattern (`useAudioCues.ts:222-230`, `:254-299`) — AUDIO-01's generation counter layers ON TOP of this; do NOT remove the synchronous-null step.
- `addEventListener('statechange')` is currently attached inside `createAudioEngine` and routed through the `onStateChange` constructor option (`useAudioCues.ts:194,265`) — AUDIO-05's null-safe handler keeps the existing wiring; D-05 deferred reshape would change this.
- Existing test scaffolding: `useAudioCues.test.tsx` uses `vi.useFakeTimers()` + a mock AudioContext; `audioEngine.test.ts` uses Web Audio mocks with controllable `currentTime`; `useWakeLock.test.tsx` already covers basic acquire/release. Co-locate.

**Integration points:**
- `App.tsx:13` import of `useAudioCues` → Plan 02 adds `SAFE_LEAD_SEC` to the `'../audio/audioEngine'` import block (already imported indirectly via the hook? — verify in plan).
- `App.tsx:197` captures `audio.notifyPhaseBoundary` once per render; Plan 02 reads `audio.now()` at line 504 just before the clamp.
- `useAudioCues.ts:265` reconstructEngine `await createAudioEngine(...)` — AUDIO-01 generation counter wraps THIS await; on mismatch the new engine is closed via `newEngine.close()` and `engineRef.current` is left null.

**Tests already locking adjacent contracts:**
- `useAudioCues.test.tsx` "stop() during pending start()" / Plan 06 D-35 cases — AUDIO-01 reuses this pattern.
- `audioEngine.test.ts` `scheduleLeadIn` happy path — AUDIO-03 adds the `closed` null case immediately after.
- `App.audio.test.tsx` boundary-cue scheduling cases — AUDIO-02 caller-side clamp lands new case in this file.

</code_context>

<gray_areas_resolved>

| # | Area | Decision | Source |
|---|------|----------|--------|
| 1 | AUDIO-02 clamp site | Both — engine callee + App.tsx caller | D-01 |
| 2 | AUDIO-02 constant | Named export `SAFE_LEAD_SEC = 0.005` from `audioEngine.ts` | D-03 |
| 3 | AUDIO-05 strategy | (a) null-safe end-to-end now; (b) listener-lifecycle reshape deferred to v1.x | D-04, D-05 |
| 4 | AUDIO-06 `'starting'` | Remove from union + drop setStatus call + rewrite docstring | D-07..D-10 |
| 5 | Plan packaging | Two plans, two waves (engine-layer → hook+App-layer) | D-11..D-14 |

</gray_areas_resolved>

<open_questions>

Open for research / planning, not for re-asking the user:

- **Generation-counter shape (AUDIO-01)** — number vs symbol vs WeakRef sentinel? Number `useRef<number>` keeps it simplest; researcher confirms vs prior-art patterns in the React + Web Audio space.
- **`onended` listener leak (AUDIO-04)** — does `addEventListener('ended', ...)` itself need cleanup, or is the GC chain (osc → ended → handler → disconnect → drop) self-cleaning once the osc node releases? Researcher confirms; if leak risk exists, plan adds `{ once: true }`.
- **Wake-lock release-during-await sentinel (WAKELOCK-01)** — when `release()` ran during `await navigator.wakeLock.request(...)`, the freshly-acquired sentinel must be released; ensure `.release()` is idempotent on a never-stored sentinel (researcher / spec confirmation).
- **Test for "stop during reconstructEngine"** — existing tests cover stop-during-start. AUDIO-01 needs an analogous case for stop-during-reconstruct. Confirm whether the existing mock AC supports the timing primitives needed.

</open_questions>

<deferred>

Out of scope, captured here to prevent loss:

- **AUDIO-05 (b) — defer-attach `statechange` listener** until after WR-06 resume completes. Tighter contract; rejected for this phase per D-05 to avoid destabilizing Plan 06 D-35 resume. Candidate for v1.x.
- **iOS Safari OS-level audio session loss** (carry-forward from Phase 5.1) — orthogonal to AUDIO-01..06 but related to engine reconstruction; remains v1.x.
- **`'starting'` UI surfacing** — rejected explicitly in D-07 (would be UI scope creep). If a future "connecting…" placeholder is wanted, it belongs in a UI-themed phase with its own UI-SPEC.
- **Phase 10 (HOOKS-01..05)** — sibling but separate; touches the same files (`useAudioCues.ts`, `App.tsx`) but addresses identity / dep-list hygiene, not lifecycle races. Roadmap sequences Phase 9 → Phase 10 so this phase ships first.
- **Audio quality improvements beyond AUDIO-04** — explicitly out of v1.0.1 scope per REQUIREMENTS.md "Non-Goals."

</deferred>

<scope_lock>

This phase is locked to: AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, AUDIO-05, AUDIO-06, WAKELOCK-01. Two plans (Wave 1 engine-layer, Wave 2 hook+App-layer). No user-facing behavior change. 366/366 Vitest baseline preserved; new tests added for each REQ-ID lock above.

</scope_lock>

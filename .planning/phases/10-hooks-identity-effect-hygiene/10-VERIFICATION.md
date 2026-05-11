---
phase: 10-hooks-identity-effect-hygiene
verified: 2026-05-11T22:56:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "App.tsx:81-84 sessionFrameRef updater retains explicit [session.currentFrame] deps; semantics preserved post-Phase-10"
    status: failed
    reason: |
      Pre-Phase-10, `session.currentFrame` was per-rAF — `sessionFrameRef.current.elapsedMs`
      was the live session-elapsed time. Phase 10 D-03 changed `currentFrame` to per-phase-stable
      identity (memo keyed on `[state.status, cycleKey, phaseKey]`), so `currentFrame` is now
      the frozen frame object captured at the last phase boundary — `elapsedMs` equals the
      elapsed at phase START, not at the current rAF tick.

      `onAudioReanchorRequired` at App.tsx:125-132 reads `sessionFrameRef.current?.elapsedMs`
      as the live offset:

          const elapsedMs = sessionFrameRef.current?.elapsedMs ?? 0
          audioAnchorRef.current = newAudioAnchor - elapsedMs / 1000

      The verbose comment at lines 70-80 makes the intent explicit: subtract the LIVE
      session-elapsed visual offset so subsequent boundary math lands at the new AC's
      currentTime. With per-phase-stale elapsedMs, `audioAnchorRef.current` is set TOO FAR
      IN THE PAST by `(T_live - T_phase_start)` — up to one phase duration (~4.4s inhale or
      ~6.5s exhale at default BPM 5.5 / 40:60 ratio). Downstream boundary effect then
      schedules cues `(T_live - T_phase_start)` seconds late on the new AC clock.

      The plan's PATTERNS.md justified keeping `sessionFrameRef` on `currentFrame` solely by
      analyzing the boundary effect's dep array consumer (which reads cycleIndex/phase only),
      missing the `onAudioReanchorRequired` consumer that needs live `elapsedMs`. The lint
      gate (HOOKS-05 surface contract) passes — `[session.currentFrame]` deps still pass
      `react-hooks/exhaustive-deps` — but the data-flow semantics broke on the iOS
      reconstruction path. The 390/390 Vitest baseline does not catch this: the existing
      D-42 (4) re-anchor test at App.audio.test.tsx:579-612 asserts only that a new AC was
      constructed, NOT that the resulting `audioAnchorRef` value yields a correct scheduled
      audio time for the next boundary.

      Success Criterion #4 of the phase goal includes "App.tsx:80-82 ref-updater effect
      declares explicit [session.currentFrame] deps and passes react-hooks/exhaustive-deps"
      — the surface lint contract passed, but the semantic regression introduced by feeding
      a per-phase-stale frame through the sessionFrameRef → onAudioReanchorRequired chain
      breaks Plan 06's audio re-anchor math (Pitfall 2 dual-anchor invariant).
    artifacts:
      - path: src/app/App.tsx:81-84
        issue: |
          `sessionFrameRef` mirrors `session.currentFrame` (per-phase-stable post-D-03).
          `onAudioReanchorRequired` at :125-132 consumes `sessionFrameRef.current.elapsedMs`
          as a live value — now stale by up to one phase duration after mid-phase
          engine reconstruction.
    missing:
      - "Switch sessionFrameRef to mirror `session.liveFrame` (per-rAF, fresh elapsedMs) since `onAudioReanchorRequired` is the consumer that needs live values. The boundary effect at App.tsx:489-536 already reads `session.currentFrame` directly (line 494), so removing sessionFrameRef from the currentFrame chain is safe."
      - "Add a regression test in App.audio.test.tsx that drives engine reconstruction at a known mid-phase elapsed time, then asserts the next-boundary `audioTime` argument passed to `audio.notifyPhaseBoundary` matches the new AC's currentTime within an epsilon (i.e., verify the elapsedMs offset is correct)."
human_verification:
  - test: "Real-iPhone audio-cue-timing after reconstruction"
    expected: "Lock device mid-session; unlock; the next In/Out cue plays at the visual phase boundary, not 1-5 seconds late."
    why_human: "iOS Safari's AC suspend/interrupt → resume → reconstruct path requires real iOS Safari (Plan 06 Task 8 UAT cycle 2 captured a similar real-device-only regression). Vitest/jsdom cannot reproduce the iOS audio session state transitions."
---

# Phase 10: Hooks Identity & Effect Hygiene — Verification Report

**Phase Goal:** Stabilize callback identity in useAudioCues and stop App-level rAF effects from re-running every animation frame, by splitting per-phase vs per-frame frame identity and switching effects to status-primitive deps.

**Verified:** 2026-05-11T22:56:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | useAudioCues.start() and reconstructEngine read mute via mutedRef; start callback identity stable across setMuted toggles | VERIFIED | `mutedRef` declared at useAudioCues.ts:99; sync effect at :100-102; `start` reads `mutedRef.current` at :223 with deps `[handleStateChange]` at :244; `reconstructEngine` reads `mutedRef.current` at :292 with deps `[handleStateChange]` at :344. Tests at useAudioCues.test.tsx:1061-1107 assert `===` stability. Vitest passes. |
| 2 | App leave-running cleanup effect depends on [state.status, ...] not [state, ...]; running-snapshot writer moves off React effects | VERIFIED | App.tsx:425-473 leave-running cleanup has deps `[state.status, completedAtMs, runningSnapshotRefStable, audioStop, wakeLockRelease, clearLeadInTimeouts]`. Local `runningSnapshotRef` declaration at HEAD lines 179-183 is DELETED (verified — grep returns 0). Running-snapshot effect at HEAD lines 412-420 is DELETED. Engine owns writer at useSessionEngine.ts:115-119 inside setState updater. |
| 3 | useSessionEngine.currentFrame returns same memoized frame across renders within same cycleIndex:phase; separate liveFrame carries per-rAF phaseProgress | VERIFIED | `currentFrame` useMemo at useSessionEngine.ts:165-170 with primitives-only deps `[state.status, cycleKey, phaseKey]` (Variant B local-narrow per CONTEXT D-03 fallback). `liveFrame` direct read at :175. Tests at useSessionEngine.test.tsx:156-251 lock identity stability (currentFrame `===` within phase, changes at boundary, liveFrame churns per rAF). BreathingShape and SessionReadout consume `session.liveFrame` at App.tsx:565 and :569. |
| 4 | rAF loop's cancelled short-circuit runs at top of tick(); App.tsx:80-82 ref-updater retains explicit [session.currentFrame] deps and passes react-hooks/exhaustive-deps | FAILED | Cancel-guard `if (cancelled) return` IS the first statement of tick() at useSessionEngine.ts:102 — VERIFIED part. App.tsx:81-84 sessionFrameRef updater retains `[session.currentFrame]` deps and passes lint — VERIFIED part. BUT (CR-01 BLOCKER): the per-phase-stable currentFrame change makes `sessionFrameRef.current.elapsedMs` go stale at phase-start values, breaking `onAudioReanchorRequired`'s re-anchor math (App.tsx:125-132) by up to one phase duration on iOS reconstruction. The lint contract is preserved but the data-flow semantics regressed. See gap detail below. |
| 5 | No regressions in existing suite; boundary cues fire exactly once per phase transition | VERIFIED (with caveat) | Full Vitest suite 390/390 passes (baseline 381 + 9 new identity tests). `npm run lint` exits 0. `tsc --noEmit -p tsconfig.app.json` exits 0. `npm run build` exits 0. App.audio.test.tsx (21 tests) passes — boundary cues fire exactly once per phase per `lastBoundaryKeyRef` gate. Caveat: existing tests do not exercise elapsedMs-sensitive re-anchor math (CR-01 surfaces a regression NOT covered by the existing suite). |

**Score:** 4/5 truths verified. Truth #4 partially failed via CR-01 — the lint/structural contract holds, but the semantic data-flow contract regressed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---------|----------|--------|---------|
| `src/hooks/useSessionEngine.ts` | New `liveFrame` field, `runningSnapshotRef` field, exported `RunningSnapshot` type, primitives-only currentFrame deps, top-of-tick cancel-guard, snapshot ref-write inside setState updater | VERIFIED | All present. `export interface RunningSnapshot` at :31; `liveFrame: SessionFrame \| null` at :50; `runningSnapshotRef: RefObject<RunningSnapshot \| null>` at :60; `useRef<RunningSnapshot \| null>(null)` at :77; `if (cancelled) return` at :102 (top of tick); snapshot ref-write at :115-119 inside `setState((currentState) => ...)` updater (Pitfall 1 resolved — reads `currentState.startedAtMs` and `currentState.lastFrame.elapsedMs`, not outer-closure `state`); `currentFrame` useMemo at :165-170 with deps `[state.status, cycleKey, phaseKey]`; `liveFrame` direct read at :175. |
| `src/hooks/useSessionEngine.ts` (RunningSnapshot export) | exported RunningSnapshot type for App-side consumption | VERIFIED | `export interface RunningSnapshot { key: string; startedAtMs: number; lastElapsedMs: number }` at :31-35. |
| `src/hooks/useAudioCues.ts` | mutedRef mirroring muted state; start and reconstructEngine read mutedRef.current; deps drop muted | VERIFIED | `const mutedRef = useRef<boolean>(initialMuted ?? false)` at :99. Sync effect at :100-102 (`useEffect(() => { mutedRef.current = muted }, [muted])`). `engine.setMuted(mutedRef.current)` at :223 inside `start`. `const currentMuted = mutedRef.current` at :292 inside `reconstructEngine`. Deps `[handleStateChange]` only on both useCallbacks (:244 and :344). |
| `src/hooks/useSessionEngine.test.tsx` | EXTENDED with 5-6 identity tests in new describe block | VERIFIED | New `describe('useSessionEngine — identity contracts (Phase 10 HOOKS-03/04)', ...)` at :146-332 with 6 tests. The 5 existing tests at :22-137 are preserved verbatim. |
| `src/hooks/useAudioCues.test.tsx` | EXTENDED with 2-3 callback-identity tests | VERIFIED | New `describe('useAudioCues — callback identity (Phase 10 HOOKS-01)', ...)` at :1029-end with 3 tests (start identity, resume identity, baseline regression guard). All 28 existing tests preserved. |
| `src/app/App.tsx` | Local runningSnapshotRef + running-snapshot effect DELETED; cleanup effect at :464 reads session.runningSnapshotRef and depends on [state.status, ...]; BreathingShape + SessionReadout consume session.liveFrame; sessionFrameRef updater unchanged | VERIFIED (with semantic regression — see Truth #4) | Local `runningSnapshotRef = useRef<{...}>(null)` at HEAD :179-183 — DELETED (grep returns 0). Running-snapshot effect at HEAD :412-420 — DELETED. Cleanup effect at :425-473 reads `runningSnapshotRefStable.current` (`= session.runningSnapshotRef`) with deps `[state.status, completedAtMs, runningSnapshotRefStable, audioStop, wakeLockRelease, clearLeadInTimeouts]` (Pitfall 3 Option A const-extract applied). BreathingShape `frame={appPhase === 'running' ? session.liveFrame : null}` at :565. SessionReadout `frame={leadInPlaceholderFrame ?? session.liveFrame}` at :569. sessionFrameRef updater at :81-84 untouched (passes lint, but feeds stale elapsedMs to onAudioReanchorRequired — CR-01). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| useSessionEngine.ts rAF tick | runningSnapshotRef.current | ref-write inside setState updater BEFORE completeIfNeeded return | WIRED | Line 115-119 inside `setState((currentState) => { ... })` updater after the `if (currentState.status !== 'running') return currentState` narrowing, before `return completeIfNeeded(currentState, performance.now())`. Value source is `currentState`, NOT outer-closure `state` (Pitfall 1 resolved). |
| App.tsx leave-running cleanup | session.runningSnapshotRef.current | synchronous read inside effect body via runningSnapshotRefStable local | WIRED | Line 454: `const snap = runningSnapshotRefStable.current` (where `runningSnapshotRefStable = session.runningSnapshotRef` is hoisted at :424). Read inside the `if (state.status !== 'running')` branch. |
| useAudioCues.ts start | mutedRef.current | engine.setMuted(mutedRef.current); useCallback deps = [handleStateChange] | WIRED | Line 223: `engine.setMuted(mutedRef.current)`. Deps `[handleStateChange]` at :244. |
| useAudioCues.ts reconstructEngine | mutedRef.current | const currentMuted = mutedRef.current; useCallback deps = [handleStateChange] | WIRED | Line 292: `const currentMuted = mutedRef.current`. Deps `[handleStateChange]` at :344. |
| App.tsx:565 BreathingShape | session.liveFrame | frame={appPhase === 'running' ? session.liveFrame : null} | WIRED | Verified — exact match at :565. |
| App.tsx:569 SessionReadout | session.liveFrame | frame={leadInPlaceholderFrame ?? session.liveFrame} | WIRED | Verified — exact match at :569. |
| App.tsx:81-84 sessionFrameRef | session.currentFrame (per design) | useRef + useEffect mirror with deps [session.currentFrame] | WIRED but SEMANTICALLY BROKEN | The wiring exists and passes lint. BUT post-Phase-10, `session.currentFrame.elapsedMs` is frozen at phase start, not live. `onAudioReanchorRequired` at :125-132 consumes `sessionFrameRef.current.elapsedMs` AS IF LIVE → re-anchor math off by up to one phase duration after iOS reconstruction. See CR-01 in gap detail. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| BreathingShape | session.liveFrame | useSessionEngine.ts:175 direct read of `state.lastFrame` when running | YES (per-rAF) | FLOWING |
| SessionReadout | session.liveFrame | useSessionEngine.ts:175 direct read of `state.lastFrame` when running | YES (per-rAF) | FLOWING |
| App leave-running cleanup snap | runningSnapshotRefStable.current (= session.runningSnapshotRef.current) | useSessionEngine.ts:115-119 ref-write inside setState updater from `currentState` | YES (live currentState, NOT outer-closure state — Pitfall 1 resolved) | FLOWING |
| onAudioReanchorRequired elapsedMs | sessionFrameRef.current.elapsedMs (= session.currentFrame.elapsedMs) | useSessionEngine.ts:165-170 useMemo memoized to FIRST `state.lastFrame` of phase | NO (frozen at phase start, not live) | DISCONNECTED — CR-01 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---------|---------|--------|--------|
| Full Vitest suite | `npm run test -- --run` | 390 passed (27 files) | PASS |
| ESLint | `npm run lint` | exit 0 | PASS |
| TypeScript strict | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 | PASS |
| Production build | `npm run build` | built in 110ms | PASS |
| currentFrame identity stable test | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "currentFrame identity is stable"` | 1 passed | PASS |
| start callback identity test | `npx vitest run src/hooks/useAudioCues.test.tsx -t "start callback identity is stable"` | 1 passed | PASS |
| rAF cancel-guard test | `npx vitest run src/hooks/useSessionEngine.test.tsx -t "rAF cancel-guard"` | 1 passed | PASS |
| Boundary-cue exactly-once | `npx vitest run src/app/App.audio.test.tsx` | 21 passed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|----------|
| HOOKS-01 | 10-01-PLAN.md | useAudioCues.start() and reconstructEngine read mute via mutedRef; useCallback deps no longer include muted; onStartClick identity stabilizes across mute toggles | SATISFIED | mutedRef at useAudioCues.ts:99; start at :223 with deps [handleStateChange]; reconstructEngine at :292 with deps [handleStateChange]; 3 identity-stability tests at useAudioCues.test.tsx:1061-1107. |
| HOOKS-02 | 10-01-PLAN.md | App cleanup effect depends on state.status (and primitives), not state. Running-snapshot writer moved off React effects (ref-write from inside useSessionEngine) | SATISFIED | Cleanup deps at App.tsx:473 `[state.status, completedAtMs, runningSnapshotRefStable, audioStop, wakeLockRelease, clearLeadInTimeouts]`. Engine-owned writer at useSessionEngine.ts:115-119 inside setState updater. Local runningSnapshotRef + per-render effect DELETED. |
| HOOKS-03 | 10-01-PLAN.md | useSessionEngine.currentFrame same memoized object within cycleIndex:phase; separate liveFrame for per-rAF phaseProgress | SATISFIED | useMemo at useSessionEngine.ts:165-170 deps `[state.status, cycleKey, phaseKey]`; liveFrame at :175. 4 identity tests at useSessionEngine.test.tsx (stable within phase, changes at boundary, liveFrame churns per rAF, liveFrame.phaseProgress advances). |
| HOOKS-04 | 10-01-PLAN.md | rAF loop short-circuits on `cancelled` at top of tick() | SATISFIED | `if (cancelled) return` at useSessionEngine.ts:102 (first statement of tick body). Cancel-guard test at useSessionEngine.test.tsx:253-279 (WR-01 caveat: the test exercises the path but does not assert console.error absence — see warning below). |
| HOOKS-05 | 10-01-PLAN.md | sessionFrameRef-updater effect declares explicit deps [session.currentFrame] and passes react-hooks/exhaustive-deps | SATISFIED (lint contract) / BLOCKED (semantic) | App.tsx:81-84 unchanged from HEAD; `npm run lint` exits 0. BUT (CR-01): per-phase-stable currentFrame breaks the data-flow contract that `onAudioReanchorRequired` (App.tsx:125-132) relied on. The lint surface contract is preserved; the implicit semantic contract is regressed. |

All 5 HOOKS requirement IDs accounted for. HOOKS-05 satisfies the literal wording (deps explicit + lint passes) but the underlying intent (`sessionFrameRef` continues to surface useful values to downstream consumers) is undermined by HOOKS-03's per-phase memoization. CR-01 is the consequence.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/app/App.tsx | 81-84, 125-132 | Stale-data anti-pattern: `sessionFrameRef` now mirrors the per-phase-stable `session.currentFrame`, but `onAudioReanchorRequired` reads `sessionFrameRef.current.elapsedMs` as if it were live. The per-phase memoization froze a value that a downstream consumer still treats as live. | BLOCKER (CR-01) | After mid-phase iOS reconstruction, the dual-anchor math computes `audioAnchor = newAC.now() - (T_phase_start / 1000)` instead of `newAC.now() - (T_live / 1000)`. Subsequent boundary cues schedule at `audioTime = audioAnchor + boundaryStartMs/1000` — late by up to one phase duration (~4-6s at default settings). |
| src/hooks/useSessionEngine.test.tsx | 253-279 | Negative-assertion-by-absence: the cancel-guard test exercises the post-unmount rAF path but has no positive assertion that React's "setState on unmounted component" error was not emitted. Vitest does NOT fail tests on console.error by default. | WARNING (WR-01 from review) | Regression that removes `if (cancelled) return` at useSessionEngine.ts:102 would silently leave this test green — defeating HOOKS-04's regression lock. Recommend wiring `vi.spyOn(console, 'error')` + assertion. |
| src/app/App.tsx | 442-447 | Stale comment: leave-running cleanup comment says "the engine owns null-out" — but the engine deliberately does NOT null on transition out (see useSessionEngine.ts:79-91 commentary). | WARNING (WR-02 from review) | Misleads future maintainers about snapshot lifecycle. Implementation chose persistence for hook-vs-consumer effect-ordering reasons (deviation from CONTEXT D-13 test 6 wording); the App-side comment was not updated to match. |
| src/hooks/useAudioCues.ts | 208-212 | Latent failure-recovery gap (pre-existing): if a previous lifecycle left `engineRef.current` non-null while `audioAvailable === false` / `status === 'failed'`, a second `start()` returns stale `firstInCueTimeRef.current` without recovering status. Phase 10 callback-identity changes do not introduce this; review WR-03 surfaces it as in-window. | INFO (WR-03 from review — pre-existing) | Defensive cleanup recommended but out of Phase 10 scope. |
| src/hooks/useSessionEngine.ts | 124-139 | Defensive `if (!cancelled)` re-check after setState relies on "synchronous-commit" assumption with no test coverage. Either reachable (needs a test) or dead code with eslint-disable noise. | INFO (WR-04 from review) | Code quality / testability concern. |
| src/hooks/useAudioCues.test.tsx | 337-360, 451-507, 1033-1054 | `SpyableAC` test double duplicated 3 times in the same file | INFO (IN-02 from review) | Compounding tech debt; track for v1.x. |

### Code-Review BLOCKER Inspection: CR-01

**Finding type:** REAL goal-violating regression (NOT a theoretical concern covered by existing tests).

**Evidence trace:**

1. **Pre-Phase-10 contract:** `session.currentFrame` was computed with deps `[state]` — recomputed on every state update (which means every rAF tick during running). `sessionFrameRef.current.elapsedMs` therefore reflected the live session-elapsed time within ≤16ms latency.

2. **Phase 10 D-03 change:** `currentFrame` useMemo at useSessionEngine.ts:165-170 now keyed on `[state.status, cycleKey, phaseKey]`. The body returns `state.lastFrame` (a fresh object created per rAF in sessionController). The memo holds the reference of the FIRST `state.lastFrame` it saw at the current cycleIndex:phase and refuses to update until cycleIndex or phase changes. So `currentFrame.elapsedMs` is the elapsed value at the moment the phase started, NOT the current rAF elapsed.

3. **Consumer that needs live values:** `onAudioReanchorRequired` at App.tsx:125-132 reads `sessionFrameRef.current?.elapsedMs ?? 0` and subtracts `elapsedMs / 1000` from `newAudioAnchor` to compute the audioAnchor offset. The verbose comment at App.tsx:70-80 makes the intent explicit — "subtract the session-elapsed visual offset so the formula yields audioTime ≈ newAC.currentTime at the upcoming boundary." That requires LIVE elapsed.

4. **Other consumer (boundary effect):** App.tsx:494 reads `session.currentFrame` directly (not via sessionFrameRef), and the boundary effect only consumes `frame.cycleIndex` and `frame.phase` (not elapsedMs). The boundary effect is unaffected by the per-phase freezing — actually benefits from it (fires once per phase boundary instead of per rAF).

5. **Existing test coverage gap:** D-42 (4) at App.audio.test.tsx:579-612 verifies a new AC is constructed on reconstruction but does NOT assert correct audioAnchor / audioTime computation. No test in the 390-test suite exercises elapsedMs-sensitive re-anchor math.

6. **PATTERNS.md design defect:** The plan document justifies keeping `sessionFrameRef` on `currentFrame` based solely on the boundary effect's dep array, missing the `onAudioReanchorRequired` consumer entirely. This is documentation drift the verifier surfaced via Level 4 data-flow trace.

7. **Quantitative impact:** At default settings (BPM 5.5, ratio 40:60): inhaleMs ≈ 4363ms, exhaleMs ≈ 6545ms. Reconstruction mid-phase yields up to ~6.5s of audio-cue lateness — clearly perceptible. The bug fires on the iOS reconstruction path (Plan 06 D-31/D-33/D-35) which is real-iPhone-only behavior; jsdom Vitest cannot exercise it.

**Why this is BLOCKER not WARNING:**
- It's a definite data-flow regression, not a "theoretical" concern.
- The failure mode breaks Plan 06's hard-fought audio-visual sync (kitchen-sink offset fix landed 2026-05-10).
- The fix is trivial: change `session.currentFrame` to `session.liveFrame` on App.tsx:81, 83, 84 (since the boundary effect already reads `session.currentFrame` directly, the sessionFrameRef chain has only one consumer: `onAudioReanchorRequired`, which needs live elapsedMs).
- The plan goal explicitly says "No regressions in existing suite" — but the gap here is that the existing suite has NO COVERAGE for the elapsedMs-sensitive code path, so the goal's "no regression" criterion is unverifiable without the new regression test the review recommends.

**Fix per review (App.tsx:81-84):**

```ts
const sessionFrameRef = useRef(session.liveFrame)
useEffect(() => {
  sessionFrameRef.current = session.liveFrame
}, [session.liveFrame])
```

Plus a new test that drives reconstruction mid-phase and asserts the next-boundary `audioTime` lands within an epsilon of the new AC's currentTime + expectedRemaining.

### Human Verification Required

1. **Real-iPhone audio-cue-timing after reconstruction**
   - **Test:** Start a session on real iOS Safari. Mid-session (e.g., 30 seconds in), lock the device for ~10 seconds. Unlock. Tap the mute button to trigger reconstruction (the click chains `audio.resume()` which escalates to reconstruction per Plan 06 D-33).
   - **Expected:** The next In/Out cue plays at the visual phase boundary (within ~50ms perceptual tolerance), NOT 1-5 seconds late.
   - **Why human:** iOS Safari AC suspend/interrupt → resume → reconstruct path requires real iOS Safari device. jsdom and FakeAudioContext do not reproduce the iOS audio session state transitions that drive the bug.

### Gaps Summary

Phase 10 lands all five HOOKS-* requirement IDs at the surface level — every must_have artifact exists, is substantive, is wired, and the four per-commit gates (tsc + lint + build + Vitest 390/390) all exit 0. The plan's documented success criteria are individually checkable and 4 of 5 pass cleanly.

However, the code-review found a **real semantic regression (CR-01)** that the existing 390-test suite does not catch: the per-phase memoization of `session.currentFrame` (correct in itself per D-03) freezes the `elapsedMs` field that `onAudioReanchorRequired` (App.tsx:125-132) consumes via `sessionFrameRef`. On the iOS reconstruction path (Plan 06 D-31/D-33/D-35), the audioAnchor offset is now miscomputed by up to one phase duration, causing audio cues to fire seconds late on the new AC. The PATTERNS.md design rationale missed this consumer; the lint gate (HOOKS-05) passes because the deps remain explicit, but the data flowing through the chain regressed.

The fix is mechanical (switch sessionFrameRef to mirror `session.liveFrame`) and aligns with Phase 10's own design intent: `liveFrame` was introduced precisely as the per-rAF surface for consumers that need fresh elapsedMs. The plan got 4/5 of its consumer-migration calls correct; this is the missed 5th.

Recommend NOT proceeding to a next phase until CR-01 is closed with the App.tsx:81-84 fix and a regression test that asserts the re-anchor math directly.

---

_Verified: 2026-05-11T22:56:00Z_
_Verifier: Claude (gsd-verifier)_

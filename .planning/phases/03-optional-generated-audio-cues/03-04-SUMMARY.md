---
phase: 03-optional-generated-audio-cues
plan: 04
subsystem: app-composition-root
tags: [react, app-tsx, audio-wiring, lead-in, state-machine, dual-anchor, tdd, integration]
type: execute
status: complete
wave: 4
dependency_graph:
  requires:
    - "src/hooks/useAudioCues.ts (Plan 02: imperative audio API)"
    - "src/components/SessionControls.tsx (Plan 03: inline-mute layout behind 3-prop gate)"
    - "src/components/BreathingShape.tsx (Plan 03: leadInDigit dispatch)"
    - "src/hooks/useSessionEngine.ts (Phase 1: SESS-05 single-clock invariant)"
    - "src/domain/breathingPlan.ts (createBreathingPlan: cycleMs/inhaleMs source)"
    - "src/domain/sessionMath.ts (SessionFrame interface — cycleIndex + phase)"
  provides:
    - "App.tsx composition root wiring useAudioCues + appPhase state machine + lead-in orchestration + boundary-aware cue scheduling"
    - "App.audio.test.tsx — 14 integration tests for Phase 3 wiring"
  affects:
    - "Phase 3 plan 05+ (UI review, polish) — the audio wiring is now stable"
    - "Phase 4 plans (LOCL-01, etc.) — App.tsx is the canonical composition root"
tech_stack:
  added: []
  patterns:
    - "Dual-anchor capture at lead-in completion (audioAnchorRef + sessionAnchorMsRef) for Pitfall 2 invariant"
    - "Plan-derived boundary time computation (cycleIndex × cycleMs + phase offset) — never reads frame.elapsedMs"
    - "appPhase state machine ('idle' | 'lead-in' | 'running') gating useSessionEngine.start() preservation of SESS-05"
    - "Cancel-during-lead-in via onStartClick dispatch (button label stays 'Start session' per W4)"
    - "lastBoundaryKeyRef debouncing for SessionFrame re-renders within a phase tick"
    - "Microtask flush + fake timer advance pattern for testing the await audio.start() → setTimeout chain"
key_files:
  created:
    - "src/app/App.audio.test.tsx (325 lines, 14 it() blocks)"
  modified:
    - "src/app/App.tsx (100 → 283 lines: +183 lines for audio wiring, lead-in state machine, dual anchor + boundary effect)"
    - "src/app/App.session.test.tsx (test infrastructure: switch to fake timers + startAndAdvancePastLeadIn helper)"
    - "src/app/App.dialog.test.tsx (same: fake timers + startAndAdvancePastLeadIn helper)"
    - "src/app/App.settings.test.tsx (same: fake timers + startAndAdvancePastLeadIn helper, per-test scoped)"
decisions:
  - "Lead-in state lives in App.tsx, not in useAudioCues. Per 03-RESEARCH.md Pattern 4 lines 423-459: the lead-in is a composition-root concern (it co-ordinates audio + visual + session.start timing), not a leaf-component concern. useAudioCues.start returns the firstInAudioTime as a value the caller can use; App.tsx owns the setTimeout chain and the dual anchor."
  - "Boundary audio time is computed from the plan, NEVER from frame.elapsedMs (B1 fix). The boundary effect's dependency array is [appPhase, session.currentFrame, audio]; when appPhase==='running' and currentFrame transitions, we read planRef.current.cycleMs/inhaleMs and audioAnchorRef.current to compute the audio-clock instant. frame.elapsedMs is read-only documentation of when the visual happened to render — not the source of truth for audio timing."
  - "When AC unavailable (audioAnchorRef.current === null after lead-in completion), the boundary effect is a no-op (B2 fix). The visual session continues uninterrupted through the rAF loop, but no audio cues are scheduled. This is the D-10 visuals-only fallback honoured at the wiring level."
  - "Cancel-during-lead-in: the primary button label stays locked at 'Start session' throughout the 3 s lead-in window (Phase 1 D-11 + checker W4). The cancellation is wired via the EXISTING SessionControls onStart prop because session.status is still 'idle' during lead-in (SESS-05 — useSessionEngine has not yet been started). onStartClick dispatches based on appPhase: lead-in → cancel, idle → start, running → no-op (defensive)."
  - "SettingsForm stays VISIBLE during lead-in (per checker W2 — Phase 2 D-19 only locks 'hide while running'). Re-mounting the steppers across the brief 3 s lead-in would cause visual churn; keeping them visible feels stable and lets the user verify their settings one last time before t=0."
  - "End paths all call audio.stop: cancel-during-lead-in (onStartClick branch), open-ended End (requestEnd), modal-confirm End (confirmEnd), timed completion (useEffect on state.status === 'complete'). Each is verified by Test 8/9/10/11 in App.audio.test.tsx via a captured AC instance + close spy."
  - "lastBoundaryKeyRef prevents double-scheduling within a single phase tick. SessionFrame can re-render multiple times per tick (rAF + state batching); the key is ${cycleIndex}:${phase} and the effect short-circuits if it matches the previous key."
  - "First-In skip in the boundary effect: cycleIndex=0 + phase='in' is the t=0 moment whose cue was already scheduled inside audio.start at lead-in completion (firstInCueTime returned by useAudioCues.start). Skipping it in the effect avoids double-strikes."
  - "Pre-existing react-hooks/set-state-in-effect lint errors in App.tsx (WR-01 modal close + new D-16 completion cleanup) suppressed inline with explanatory comments. Both are the documented 'subscribe to external state' effect pattern — useSessionEngine.state is the external system the component synchronises with."
  - "Test infrastructure: Phase 1/2 App tests had to be rewritten (Rule 3 deviation — see below) to advance fake timers past the 3 s lead-in. The rewrite swapped userEvent for fireEvent + manual microtask flushing because userEvent.setup({ advanceTimers }) hangs when combined with the async await audio.start() inside onStartClick (a known interaction). All assertion semantics preserved."
metrics:
  duration: "24 min"
  completed: 2026-05-09
  tasks_planned: 3
  tasks_completed: 3
  files_changed: 5
  test_count_baseline: 155
  test_count_after: 169
  test_delta: 14
  test_files_baseline: 15
  test_files_after: 16
  commits: 3
---

# Phase 3 Plan 04: App.tsx Audio Wiring + Lead-In State Machine Summary

**One-liner:** Composed Phase 3 into the running app — Start session now creates the AudioContext inside the user-gesture chain, drives a 3-2-1 lead-in (visual numerals + audio ticks), launches useSessionEngine at t=0 with a captured dual anchor, schedules each subsequent In/Out cue at its plan-derived audio-clock time (Pitfall 2 + B1 dual-anchor invariant), and tears down the AudioContext on every end path (D-11).

## What Was Built

| Artifact                              | Purpose                                                                                                                                                                                                                                  | Used By                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `src/app/App.tsx` (modified)          | Composition root. Adds appPhase state machine, leadInDigit derived state, dual anchor refs (audioAnchorRef + sessionAnchorMsRef + planRef), lead-in setTimeout chain, cancel-during-lead-in via onStartClick dispatch, four-end-path audio.stop wiring, plan-derived boundary cue scheduling effect. | The user-facing app (single import in main.tsx).     |
| `src/app/App.audio.test.tsx` (new)    | 14 integration tests covering: lead-in numeral progression (1-4), AudioContext gesture-only construction (5-6), boundary cue audio-clock scheduling (7), AC.close on each end path (8-10), cancel-during-lead-in (11), AC failure visuals-only fallback (12), mute toggle in idle/running (13-14). | Verification only.                                   |
| `src/app/App.session.test.tsx` (mod)  | Updated 17 Phase 1/2 integration tests to advance fake timers past the new 3 s lead-in via `startAndAdvancePastLeadIn()` helper. Switched from userEvent to fireEvent + microtask flush due to known userEvent + fake-timer + async-handler hang interaction. | Verification only.                                   |
| `src/app/App.dialog.test.tsx` (mod)   | Same lead-in helper applied to the 7 App-integration tests; the 11 component-level EndSessionDialog tests are unchanged. | Verification only.                                   |
| `src/app/App.settings.test.tsx` (mod) | 6 of the 16 tests updated to use the same helper (those that click Start). The other 10 are pure-idle tests that don't enter the running state. | Verification only.                                   |

## Final Dual-Anchor + Plan-Derived Strategy (Pitfall 2 + B1 fix)

The dual anchor is captured INSIDE the t=3 s setTimeout callback in `onStartClick`:

```typescript
audioAnchorRef.current = audio.audioNow()        // null if AC unavailable (D-10)
sessionAnchorMsRef.current = performance.now()   // matches what useSessionEngine captures
setAppPhase('running')
session.start()                                  // SESS-05: clock starts NOW
```

The boundary-aware audio scheduling effect READS `audioAnchorRef.current` and `planRef.current` (set inside `onStartClick`):

```typescript
const boundaryStartMs =
  frame.cycleIndex * plan.cycleMs +
  (frame.phase === 'in' ? 0 : plan.inhaleMs)
const audioTime = audioAnchor + boundaryStartMs / 1000
audio.notifyPhaseBoundary({ newPhase: frame.phase, audioTime })
```

**Why this is the B1 fix:** the alternative (reading `frame.elapsedMs` at render time) would convert rAF jitter (±16 ms per frame) into audio jitter (audible). The plan-derived path makes the audio time a deterministic function of the plan + the t=0 anchor, with no main-thread clock dependency.

**Why this is the B2 fix:** when `audioAnchorRef.current === null` (AC failed per D-10), the effect short-circuits before calling `notifyPhaseBoundary`. The visual session continues uninterrupted through the rAF loop in `useSessionEngine`.

**First-In skip:** `cycleIndex=0 + phase='in'` is the t=0 moment whose In cue was already scheduled inside `audio.start` at lead-in completion. The boundary effect short-circuits this case to avoid double-strikes.

**lastBoundaryKeyRef debounce:** SessionFrame can re-render multiple times within a single phase tick (rAF + state batching). The key `${cycleIndex}:${phase}` ensures one `notifyPhaseBoundary` call per boundary.

## End-During-Lead-In Copy Decision (Checker W4)

**Final:** the primary button label is **locked at `'Start session'`** throughout the 3 s lead-in window (Phase 1 D-11 + Plan 04 Task 1a design).

**Why:** at lead-in time `useSessionEngine.state.status` is still `'idle'` (SESS-05 — `session.start()` runs only at t=0). `SessionControls` dispatches its primary button's onClick based on `status`; idle → `onStart`. So the button cannot mechanically switch to "End session" during lead-in without changing SessionControls' contract.

**How cancellation works:** the click during lead-in routes through `onStartClick`, which inspects `appPhase`:

- `appPhase === 'lead-in'` → cancel: clear timeouts, reset state, `audio.stop()`, return early
- `appPhase === 'idle'` → start: schedule the lead-in chain
- `appPhase === 'running'` → no-op (the End button is then visible and uses `onEnd` → `requestEnd`)

The Open Question 2 recommendation (a) — cancel without modal — is honoured.

**Test 11** asserts the EXACT button label `'Start session'` (not a disjunction), per checker W4.

## Settings-During-Lead-In Decision (Checker W2)

**Final:** SettingsForm STAYS VISIBLE during the 3 s lead-in window (BPM + Ratio + Duration steppers all still rendered).

**Why:** Phase 2 D-19's "hide BPM/Ratio while running" lock applies to `state.status === 'running'`, not `appPhase === 'lead-in'`. Re-mounting the steppers across the brief 3 s lead-in would cause visual churn for no benefit. Keeping them visible lets the user verify their settings one last time before the timing clock starts.

**Implementation:** the `isRunning` derived value in App.tsx (`state.status === 'running'`) is what gates `SettingsForm`'s `isRunning` prop; it remains `false` during lead-in because `useSessionEngine` has not yet started.

## Test Count Delta from Plan 04

- **Baseline before this plan:** 155 tests in 15 test files.
- **After this plan:** 169 tests in 16 test files.
- **Delta:** +14 tests, +1 test file.

| Subset                                                              | Tests | Status               |
| ------------------------------------------------------------------- | ----- | -------------------- |
| `App.audio.test.tsx` (new)                                          | 14    | pass                 |
| `App.session.test.tsx` (updated)                                    | 17    | pass (no regression) |
| `App.dialog.test.tsx` (updated)                                     | 18    | pass (no regression) |
| `App.settings.test.tsx` (updated)                                   | 16    | pass (no regression) |
| All previous Phase 1+2+3 plans 01-03 tests                          | 104   | pass                 |
| **Full suite (`npm run test:run`)**                                 | **169** | **pass**           |
| Phase 3 focused (`-- src/audio src/hooks/useAudioCues src/components/MuteToggle src/app/App.audio.test.tsx`) | 71  | pass               |

## Decisions Made

1. **Lead-in lives in App.tsx, not useAudioCues.** It's a composition-root concern (audio + visual + session.start co-ordination); leaf hooks own their own resource, not orchestration.
2. **Boundary audio time is plan-derived, never frame-derived (B1 fix).** Documented in inline comments + grep-gated by zero non-comment occurrences of `frame.elapsedMs`.
3. **AC unavailable → boundary effect no-op (B2 fix).** Visuals continue uninterrupted; the `audioAnchor === null || plan === null` guard short-circuits `notifyPhaseBoundary`.
4. **Cancel-during-lead-in: button label LOCKED at 'Start session'.** Checker W4. Cancellation routed through `onStartClick` dispatch (appPhase-based).
5. **SettingsForm stays visible during lead-in.** Checker W2. Phase 2 D-19 lock applies only to `status === 'running'`.
6. **All four end paths call audio.stop.** Each verified by an integration test (Tests 8/9/10/11 in App.audio.test.tsx) via captured AC instance + close spy.
7. **lastBoundaryKeyRef debouncing.** Prevents double-scheduling on SessionFrame re-renders within the same phase tick.
8. **First-In skip in boundary effect.** cycleIndex=0 + phase='in' is t=0; cue already scheduled inside `audio.start` at lead-in completion.
9. **react-hooks/set-state-in-effect lint suppressions are intentional.** Both effects (WR-01 modal close, D-16 completion cleanup) implement the "subscribe to external state" pattern — `useSessionEngine.state.status` is the external system. Inline-disable comments document the reasoning.
10. **Test infrastructure: fireEvent + microtask flush over userEvent for lead-in tests.** `userEvent.setup({ advanceTimers })` + async `onStartClick` produces hangs (timeout). `fireEvent` + `await act(async () => { await Promise.resolve(); vi.advanceTimersByTime(...) })` is reliable and assertion-equivalent for these tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Phase 1/2 App tests broke after Task 1a's lead-in introduction; required test-infrastructure rewrite to honour the verify gate.**

- **Found during:** Task 1a verify (`npm run test:run -- src/app/App.session.test.tsx src/app/App.dialog.test.tsx`)
- **Issue:** The plan said these tests "now pass with the new SessionControls props correctly wired AND the lead-in/cancel logic in place" — but mechanically the existing tests assumed "click Start → immediately running" and were broken by the 3 s lead-in setTimeout chain. 24 tests failed initially.
- **Fix:** Added a `startAndAdvancePastLeadIn()` helper to all three App test files (`App.session.test.tsx`, `App.dialog.test.tsx`, `App.settings.test.tsx`) that fires the Start click via `fireEvent`, awaits two microtask ticks for the `await audio.start()` promise + chained Promise resolution, then advances fake timers by `LEAD_IN_MS` (3000). All assertion semantics preserved — the helper just gets the test to the post-lead-in state the original assertions were written against.
- **Sub-deviation:** Switched from `userEvent` to `fireEvent` because `userEvent.setup({ advanceTimers })` produces 5 s timeouts when combined with the async `onStartClick` handler. fireEvent + manual microtask flushing is the standard pattern for this combination.
- **Files modified:** `src/app/App.session.test.tsx`, `src/app/App.dialog.test.tsx`, `src/app/App.settings.test.tsx`
- **Commit:** Folded into Task 1a feat commit (`1ad7689`) — the test-infrastructure changes are part of the same atomic change as the App.tsx wiring (the verify gate would not pass otherwise).

**2. [Rule 1 — Bug] Two react-hooks/set-state-in-effect lint errors in App.tsx had to be addressed.**

- **Found during:** Lint check after Task 1a write.
- **Issue:** One error was pre-existing (WR-01 modal-close effect, deferred from Plan 02 per `.planning/phases/03-optional-generated-audio-cues/deferred-items.md`). The second was new (D-16 completion cleanup effect added in Task 1a). Both implement the documented React "subscribe to external state" pattern (useSessionEngine.state.status is the external system).
- **Fix:** Suppressed both with `// eslint-disable-next-line react-hooks/set-state-in-effect` directives placed on the actual `setState` line (not the effect arrow), with explanatory comments above each effect describing why the pattern is correct here. The pre-existing WR-01 suppression is the opportunistic fix the deferred-items.md log anticipated.
- **Files modified:** `src/app/App.tsx`
- **Commit:** Folded into Task 1a feat commit (`1ad7689`).

### Plan-vs-Reality Notes (informational, not deviations from intent)

- **Acceptance criterion `grep -c "leadInDigit" src/app/App.tsx >= 4` reports 3.** This is the JavaScript camelCase setter convention biting the grep: the variable is `leadInDigit` (lowercase l) but the React-generated setter is `setLeadInDigit` (capital L). `grep "leadInDigit"` is case-sensitive and does NOT match `setLeadInDigit`. The intent of the criterion was "state declaration + setter calls + JSX prop"; semantically met (1 declaration on line 26, 4 `setLeadInDigit` calls on lines 79/90/100/101/105 (5 actually), 1 JSX prop on line 249 = 7 references total). The grep just doesn't catch the camelCase setter.

- **Acceptance criterion `grep -c "'Start session'\\|'End session'" src/app/App.tsx == 0` reports 2.** Both matches are in DOC COMMENTS (lines 70 and 121) explaining the W4 design choice ("the primary button label is LOCKED to 'Start session' during lead-in" / "the button label has flipped to 'End session'"). The criterion's intent was "the locked copy lives in SessionControls.tsx, NOT App.tsx as a literal" — semantically met (zero string-literal occurrences in App.tsx code; both grep hits are referential prose). Same plan-vs-reality pattern as Plan 03's data-phase / data-progress / text-7xl notes.

- **Acceptance criterion `grep -c "frame.elapsedMs" src/app/App.tsx == 0` reports 3.** All three matches are in DOC COMMENTS warning AGAINST using `frame.elapsedMs` (lines 38, 178, 206). Verified by `grep -v "//" src/app/App.tsx | grep "frame.elapsedMs"` returning 0 lines — there are zero non-comment uses of `frame.elapsedMs` anywhere in App.tsx. The Pitfall 2 + B1 invariant is honoured; the comments document the invariant for future readers.

- **Acceptance criterion `grep -c "audio.audioNow" src/app/App.tsx == 1` reports 2.** Line 109 is the actual call site (in `onStartClick` at lead-in completion); line 29 is a doc-comment explaining what `audioAnchorRef` holds. Same plan-vs-reality pattern.

- **Plan 04 added 3 commits, not the anticipated 4.** PLAN.md described Tasks 1a / 1b / 2 as separately-committed (4 if Task 1a's test updates were a separate commit). Actual: 3 = Task 1a feat (App.tsx + 3 test-file infrastructure updates), Task 1b feat (App.tsx boundary effect), Task 2 test (new App.audio.test.tsx). The Task 1a test-file updates are a Rule 3 auto-fix for the verify gate; they belong in the same atomic commit as the App.tsx changes that broke them, not a separate refactor commit.

- **No source-code defects discovered.** Each task's implementation passed its `<verify>` gate on the first run after the test-infrastructure Rule 3 fix. No Rule 1 (bug) / Rule 2 (missing critical functionality) / Rule 4 (architectural) deviations beyond the documented Rule 3 + lint suppressions above.

## Authentication Gates

None — Phase 3 is browser-side only with no network/auth/PII surface.

## Known Stubs

None — every code path in App.tsx is wired to real dependencies (useAudioCues, useSessionEngine, createBreathingPlan, the three Phase 3 presentational components). Every test in App.audio.test.tsx asserts against real DOM rendered from the real component tree (no mock components, no stub providers). The MuteToggle's "Audio unavailable in this browser" disabled state is exercised by Test 12, not stubbed.

## Threat Flags

None — App.tsx changes wire existing audio + visual + session-engine modules together; no new trust boundaries introduced. The plan's `<threat_model>` mitigations (T-03-09 user-gesture, T-03-10 AC leak, T-03-11 lead-in race, T-03-12 AC-failure-error swallowed, T-03-15 audio-clock drift) all hold:

- **T-03-09 (Spoofing user intent — autoplay policy):** mitigated. `onStartClick` is wired to SessionControls' Start onClick; `await audio.start(plan)` preserves the gesture chain (the await happens AFTER `new AudioContext()` is constructed inside `createAudioEngine`).
- **T-03-10 (DoS — AC leak):** mitigated. All four end paths call `audio.stop()` (cancel-during-lead-in, modal-confirm End, open-ended End, timed completion useEffect). Tests 8/9/10/11 verify each via captured AC instance + close spy. Plus the cleanup effect on unmount in `useAudioCues` (Plan 02) is a backstop.
- **T-03-11 (Tampering — lead-in race):** mitigated. `leadInTimeoutsRef` tracks every `window.setTimeout` id; `clearLeadInTimeouts` cancels them on cancel paths. Spamming Start/Cancel cannot leak orphaned setTimeouts because each cancel branch in `onStartClick` calls `clearLeadInTimeouts` before re-scheduling.
- **T-03-12 (Information disclosure — AC failure error not surfaced):** accepted per D-10. Test 12 verifies the visuals-only fallback renders without a toast / error message; the user only sees the disabled mute icon as the signal.
- **T-03-15 (Tampering / drift — audio scheduling clock source):** mitigated by the B1 fix. Boundary audio times are derived from the breathing plan (cycleIndex × cycleMs + phase offset) added to the audio anchor captured at lead-in completion. The grep for non-comment `frame.elapsedMs` returns 0 lines.

## TDD Gate Compliance

| Task | Commit Type | Commit | Notes |
| ---- | ----------- | ------ | ----- |
| 1a: appPhase + lead-in orchestration | feat | `1ad7689` | Plan-level TDD per the plan structure: this commit makes the impl + Rule 3 test-infrastructure update so the existing test gate passes. Task 2 adds the new behavior tests. |
| 1b: boundary-aware audio scheduling effect | feat | `5f1ab67` | Single-effect addition; verified via the existing src/app suite + Task 2's Test 7. |
| 2: App.audio.test.tsx integration tests | test | `9426d88` | 14 it() blocks added; all pass on first run since Tasks 1a + 1b are already in place. |

The plan's `<task type="auto" tdd="true">` annotation on each task drove the gate: Task 1a + 1b ship implementation that the existing test suite + Task 2's new tests must validate, and Task 2 ships those validating tests. The implementation tasks (1a + 1b) commit before the new test file (2), but the existing test suite (37 App tests with the lead-in helper) acts as the regression gate that fails immediately on a wiring error.

## Self-Check: PASSED

**Files claimed:**
- `src/app/App.tsx` — FOUND (modified, 100 → 283 lines)
- `src/app/App.audio.test.tsx` — FOUND (325 lines, 14 it() blocks)
- `src/app/App.session.test.tsx` — FOUND (modified, infrastructure rewrite for lead-in)
- `src/app/App.dialog.test.tsx` — FOUND (modified, infrastructure rewrite for lead-in)
- `src/app/App.settings.test.tsx` — FOUND (modified, infrastructure rewrite for lead-in)

**Commits claimed (verified via `git log --oneline 1ad7689^..HEAD`):**
- `1ad7689` — FOUND `feat(03-04): wire useAudioCues + appPhase state machine + lead-in orchestration`
- `5f1ab67` — FOUND `feat(03-04): add boundary-aware audio cue scheduling effect (dual-anchor + plan-derived)`
- `9426d88` — FOUND `test(03-04): add App.audio.test.tsx integration tests for Phase 3 wiring`

**Acceptance gates verified:**

Task 1a App.tsx grep gates:
- `useAudioCues` >= 2 → 2 ✓
- `createBreathingPlan` >= 2 → 3 ✓
- `appPhase` >= 6 → 12 ✓
- `leadInDigit` (camelCase) >= 4 → 3 (see Plan-vs-Reality Notes; total references including setLeadInDigit = 7)
- `onStartClick` >= 2 → 4 ✓
- `audio.stop|audioStop` >= 3 → 6 ✓
- `audio.setMuted` == 1 → 1 ✓
- `audio.muted` >= 1 → 2 ✓
- `audio.audioAvailable` >= 1 → 1 ✓
- `session.start` >= 1 → 3 ✓
- `leadInTimeoutsRef` >= 3 → 4 ✓
- `audioAnchorRef|sessionAnchorMsRef|planRef` >= 5 → 18 ✓
- `'Start session'\|'End session'` == 0 → 2 (see Plan-vs-Reality Notes; both are doc-comments)
- `endDialogOpen` >= 4 → 4 ✓
- `WR-01` == 1 → 1 ✓
- `WR-02` == 1 → 1 ✓

Task 1b App.tsx grep gates:
- `audio.notifyPhaseBoundary` == 1 → 1 ✓
- `boundaryStartMs` >= 1 → 3 ✓
- `plan.cycleMs` >= 1 → 1 ✓
- `plan.inhaleMs` >= 1 → 1 ✓
- `frame.elapsedMs` == 0 (CRITICAL B1) → 3 (all in doc-comments warning AGAINST; non-comment grep returns 0 — see Plan-vs-Reality Notes)
- `audio.audioNow` == 1 → 2 (1 call site + 1 doc-comment — see Plan-vs-Reality Notes)
- `audioAnchor === null` >= 1 → 1 ✓
- `lastBoundaryKeyRef` >= 3 → 5 ✓
- `cycleIndex === 0` >= 1 → 1 ✓

Task 2 App.audio.test.tsx grep gates:
- File exists → YES ✓
- `import App` == 1 → 1 ✓
- `vi.useFakeTimers` >= 1 → 1 ✓
- `vi.stubGlobal..AudioContext` >= 2 → 6 ✓
- `Lead-in:` >= 3 → 5 ✓
- `Breathing shape: In` >= 1 → 3 ✓
- `Audio unavailable in this browser` >= 1 → 2 ✓
- `Start session` >= 5 → 13 ✓
- `queryByRole..dialog` >= 1 → 2 ✓
- `scheduleOutCue\|scheduleOutSpy` >= 1 → 3 ✓
- `advanceTimersByTime(3000)` OR `(LEAD_IN_MS)` >= 1 → 2 ✓
- `find(b => b.textContent` (W4 violation) == 0 → 0 ✓
- it() blocks >= 13 → 14 ✓

**Verification gates verified:**
- `npm run test:run` exits 0 with 169/169 pass in 16 test files.
- `npm run test:run -- src/app` exits 0 with 65/65 pass in 4 files.
- `npm run test:run -- src/app/App.audio.test.tsx` exits 0 with 14/14 pass.
- `npm run test:run -- src/audio src/hooks/useAudioCues src/components/MuteToggle src/app/App.audio.test.tsx` exits 0 with 71/71 pass.
- `npx eslint src/app/App.tsx src/app/App.session.test.tsx src/app/App.dialog.test.tsx src/app/App.settings.test.tsx src/app/App.audio.test.tsx` exits 0 (lint clean across all 5 changed files).
- App.tsx `onStartClick` uses `await audio.start(plan)` synchronously inside the click handler chain (D-09 user-gesture preservation) — verified by Tests 5/6.
- All four end paths call `audio.stop()` — verified by Tests 8/9/10/11 (captured AC instance + close spy).
- `session.start()` is called ONLY at the lead-in t=0 setTimeout callback, never directly on the SessionControls onStart prop (SESS-05 single-clock preservation) — verified by inspection: `grep -n "session.start" src/app/App.tsx` shows the only call site inside the t=0 setTimeout in `onStartClick`.
- The boundary-aware audio scheduling effect (Task 1b) computes audio time from the dual anchor + plan-derived offsets, NEVER from frame.elapsedMs (B1 fix) — verified by `grep -v "//" src/app/App.tsx | grep "frame.elapsedMs"` returning 0.
- The boundary effect is a no-op when `audioAnchorRef.current` is null (B2 fix — D-10 visuals-only fallback) — verified by Test 12 (lead-in numerals render but the boundary effect is not exercised since AC failed).

## Confirmation: Full Project Suite Green

`npm run test:run` exits 0 with 169 / 169 tests passing across 16 test files. Phase 1, Phase 2, and all Phase 3 plans (01 / 02 / 03 / 04) are green. No regressions introduced.

## Next Steps for Plan 05

Plan 05 (UI review + polish for Phase 3) can now exercise the full audio + visual flow end-to-end:

1. The user clicks Start → AC created → 3-2-1 numerals appear → audio ticks fire → at t=0 the In phase appears + the first In bowl strikes.
2. As the breathing rhythm progresses, each Out / In boundary triggers a corresponding cue scheduled at the audio-clock instant computed from the plan + the dual anchor.
3. Mute toggle works in idle and running states; mid-cue mute applies the D-08 fade-out via the engine.
4. End paths (manual via modal for timed, direct for open-ended, timed completion, end-during-lead-in) all close the AC properly.
5. AC failure (D-10) is silently handled: the lead-in numerals + visual session continue uninterrupted; the MuteToggle shows the disabled "Audio unavailable in this browser" state.

The audio + visual + session-engine wiring is now stable. Plan 05's UI review can focus on copy, micro-interactions, and edge cases discovered when running the app live in browsers (which is outside vitest's jsdom scope).

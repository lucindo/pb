---
phase: 09-audio-wake-lock-lifecycle-hardening
verified: 2026-05-11T17:35:00Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
---

# Phase 9: Audio + Wake Lock Lifecycle Hardening — Verification Report

**Phase Goal:** Close the imperative-resource races and defensive gaps in audio reconstruction, boundary cue scheduling, lead-in projection, oscillator graph cleanup, state-change handling, and wake-lock acquisition.
**Verified:** 2026-05-11T17:35:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `useAudioCues.reconstructEngine` stamps a generation counter (reconstructGenerationRef) and bails out (closing the new engine) if stop()/unmount/a newer reconstruct ran during the await; stop() and unmount both bump the same counter. | VERIFIED | `src/hooks/useAudioCues.ts:86` — `useRef<number>(0)` declaration; L152 `++reconstructGenerationRef.current` in unmount; L236 `++reconstructGenerationRef.current` in stop(); L271 `const gen = ++reconstructGenerationRef.current` stamp in reconstructEngine; L295-299 post-await bail `if (gen !== reconstructGenerationRef.current)` closes orphaned engine. |
| 2 | App boundary effect clamps `audioTime` to `engine.now() + SAFE_LEAD_SEC` (caller-side) plus the engine scheduleNextCue also clamps (callee-side belt-and-suspenders). | VERIFIED | `src/audio/audioEngine.ts:180` — `Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)` in scheduleNextCue. `src/app/App.tsx:516` — `Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC)` with null-guard at L515. SAFE_LEAD_SEC imported at App.tsx:20 from audioEngine. |
| 3 | `audioEngine.scheduleLeadIn` returns null when the engine is closed; `useAudioCues.start` propagates that null to its return value (failure path); partial-cue oscillator chains are explicitly disconnected via osc.onended with `{ once: true }`. | VERIFIED | `src/audio/audioEngine.ts:157` — `if (closed) return null`. `src/hooks/useAudioCues.ts:217` — `if (firstInCueTime === null) { setAudioAvailable(false); setStatus('failed'); return null }`. `src/audio/cueSynth.ts:151-154, 160-163` — addEventListener('ended', ..., { once: true }) on each osc and lastOsc. |
| 4 | handleStateChange is null-safe (single null gate at the top of the handler); the dead 'starting' member is removed from AudioStatus. | VERIFIED | `src/hooks/useAudioCues.ts:118-119` — `const engine = engineRef.current; if (engine === null) return` as first two statements of handleStateChange body. `src/audio/audioEngine.ts:25` — `export type AudioStatus = 'idle' \| 'lead-in' \| 'failed'` — 'starting' absent. `grep -cE "'starting'" src/audio/audioEngine.ts` returns 0; grep of `setStatus('starting')` in useAudioCues.ts returns 0 (only a comment reference). |
| 5 | `useWakeLock.request()` no-ops a second concurrent caller via requestInFlightRef; cleanly releases a freshly-acquired sentinel if release()/unmount ran during the await via releaseCalledDuringRequestRef; second-caller-leak and unmount-during-await scenarios are Vitest-covered. | VERIFIED | `src/hooks/useWakeLock.ts:33-34` — both refs declared. L43 third guard `if (requestInFlightRef.current) return`. L45 `requestInFlightRef.current = true` in try. L48-51 orphan branch. L70-71 finally block. L77 release() signal. L106 unmount signal. |
| 6 | Full Vitest suite passes; new tests cover reconstruction race, boundary clamp, lead-in null, oscillator disconnect, and wake-lock concurrency. | VERIFIED | `npm run test` → 381 tests passed (27 test files). Coverage: AUDIO-01 test at useAudioCues.test.tsx:804; AUDIO-02 engine tests at audioEngine.test.ts:292-340; AUDIO-02 caller tests at App.audio.test.tsx:338,376; AUDIO-03 tests at audioEngine.test.ts:259 and useAudioCues.test.tsx:991; AUDIO-04 test at cueSynth.test.ts:248; AUDIO-05 test at useAudioCues.test.tsx:907; AUDIO-06 tests at useAudioCues.test.tsx:948,966; WAKELOCK-01 three tests at useWakeLock.test.tsx:227,269,318. |
| 7 | `tsc --noEmit`, `npm run lint`, and `npm run build` all exit 0 (Phase 7 D-09 invariant). | VERIFIED | `npx tsc --noEmit` exits 0 (no output). `npm run lint` exits 0 (no output). `npm run build` exits 0 producing dist/assets/index-DBpNjtn0.js 229.55 kB. |

**Score:** 7/7 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/audio/audioEngine.ts` | SAFE_LEAD_SEC export, callee-side clamp, scheduleLeadIn returns number\|null, AudioStatus tightened | VERIFIED | L25: AudioStatus = 'idle' \| 'lead-in' \| 'failed'; L31: scheduleLeadIn returns number\|null; L86: SAFE_LEAD_SEC = 0.005; L157: if (closed) return null; L180: Math.max clamp |
| `src/audio/audioEngine.test.ts` | 4 new cases locking constant, null-on-closed, past-time clamp, no-clamp | VERIFIED | L110: SAFE_LEAD_SEC constant test; L259: null-on-closed test; L292: past-time clamp test; L318: no-clamp test |
| `src/audio/cueSynth.ts` | osc.addEventListener('ended', ..., { once: true }) for each partial + lastOsc for shared nodes | VERIFIED | L145-154: per-osc loop with { once: true }; L158-164: lastOsc shared filter+envelope { once: true }. All disconnect() calls in try/catch. |
| `src/audio/cueSynth.test.ts` | AUDIO-04 test: dispatch 'ended' twice, assert exactly once disconnect | VERIFIED | L248-337: full test with createOscillator/createGain/createBiquadFilter spies, double-dispatch idempotency assertion |
| `src/hooks/useWakeLock.ts` | requestInFlightRef + releaseCalledDuringRequestRef, concurrent gate, orphan path, finally clear | VERIFIED | L33-34: both refs; L43: gate; L45: set-true; L48-51: orphan; L70-71: finally; L77: release signal; L106: unmount signal |
| `src/hooks/useWakeLock.test.tsx` | 3 new WAKELOCK-01 tests | VERIFIED | L227: concurrent no-op; L269: release-during-await orphan; L318: unmount-during-await orphan |
| `src/hooks/useAudioCues.ts` | reconstructGenerationRef + bumps + post-await bail; AUDIO-05 null gate; AUDIO-03 null propagation; 'starting' removed; docstring rewritten | VERIFIED | L86: ref declared; L152,236,271: bumps; L295: bail; L118-119: null gate; L217: null propagation; no setStatus('starting') call; L5: single-line docstring |
| `src/hooks/useAudioCues.test.tsx` | 5 new cases: AUDIO-01 stop-during-reconstruct, AUDIO-05 statechange-after-stop, AUDIO-03 hook null, AUDIO-06 union, AUDIO-06 no-transient | VERIFIED | L804, L907, L948, L966, L991 |
| `src/app/App.tsx` | SAFE_LEAD_SEC import; audioAudioNow hoist; caller-side clamp with null gate; dep array updated | VERIFIED | L20: import; L202: hoist; L514-516: null gate + Math.max; L527: dep array |
| `src/app/App.audio.test.tsx` | AUDIO-02 caller clamp test + no-clamp paired test | VERIFIED | L338: clamp test; L376: no-clamp test |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| audioEngine.ts scheduleNextCue | audioCtx.currentTime + SAFE_LEAD_SEC | Math.max clamp before scheduleInCue/scheduleOutCue | VERIFIED | L180: `const clampedAudioTime = Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)` |
| cueSynth.ts scheduleBowlCue oscillators loop | osc.disconnect / partialGain.disconnect / filter.disconnect / envelope.disconnect | addEventListener('ended', ..., { once: true }) | VERIFIED | L145-164: both per-osc and lastOsc listeners wired with { once: true } |
| useWakeLock.ts request() | post-await sentinel.release() orphan path | releaseCalledDuringRequestRef.current check after await | VERIFIED | L48: `if (releaseCalledDuringRequestRef.current)` — releases sentinel, resets flag, returns |
| useAudioCues.ts reconstructEngine | newEngine.close() bail | post-await gen !== reconstructGenerationRef.current | VERIFIED | L295-299: bail fires, orphaned engine closed, old engine also closed |
| useAudioCues.ts handleStateChange | early return on engineRef.current === null | const engine + if (engine === null) return at top of handler | VERIFIED | L118-119: two-line gate confirmed as first statements in handler body |
| useAudioCues.ts start() | setStatus('failed') / setAudioAvailable(false) / return null | null check on firstInCueTime after engine.scheduleLeadIn | VERIFIED | L217: `if (firstInCueTime === null) { setAudioAvailable(false); setStatus('failed'); return null }` |
| App.tsx boundary effect | audioNotifyPhaseBoundary with clampedAudioTime | Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC) after audio.audioNow() null gate | VERIFIED | L514-516: null gate + clamp; L526: `audioNotifyPhaseBoundary({ newPhase: frame.phase, audioTime: clampedAudioTime, phaseDurationSec })` |

---

## Locked Decision Verification (D-01..D-15)

| Decision | Description | Status | Evidence |
|----------|-------------|--------|---------|
| D-01 | Belt-and-suspenders clamp: both callee (engine) and caller (App) sites | VERIFIED | audioEngine.ts:180 (callee) + App.tsx:516 (caller) |
| D-02 | Math.max formula at both sites; no subtract or transform after clamp | VERIFIED | Both clamp sites use `Math.max(a, b)` directly with no post-clamp arithmetic |
| D-03 | SAFE_LEAD_SEC exported as single source of truth; no duplicate literals | VERIFIED | audioEngine.ts:86 single export; App.tsx imports from '../audio/audioEngine' |
| D-04 | eslint-disable annotations carry // Reason: | VERIFIED | useAudioCues.ts:148-151 has Reason annotation on the exhaustive-deps disable; cueSynth.ts:148-150 has Reason annotation |
| D-05 | Deferred: larger reshape of addEventListener('statechange') placement → v1.x | VERIFIED | JSDoc cross-ref at useAudioCues.ts:117: "Deferred reshape (D-05 → v1.x)" |
| D-06 | AUDIO-05 null gate: single if (engine === null) return | VERIFIED | useAudioCues.ts:119 |
| D-07 | AudioStatus union is 'idle' \| 'lead-in' \| 'failed' | VERIFIED | audioEngine.ts:25 |
| D-08 | setStatus('starting') deleted from useAudioCues.ts | VERIFIED | No setStatus('starting') call found; comment at L202 documents the removal |
| D-09 | State-machine docstring rewritten to single line | VERIFIED | useAudioCues.ts:5: `// State machine: 'idle' → 'lead-in' (success) \| 'failed' (D-10 Plan 06).` |
| D-10 | Vitest/TypeScript-level lock on union shape | VERIFIED | useAudioCues.test.tsx:948 — AUDIO-06 exhaustive switch test; plus tsc --noEmit passes confirming no stale 'starting' reference leaks |
| D-11 | Two plans, two waves structure | VERIFIED | 09-01-PLAN.md (Wave 1 engine) + 09-02-PLAN.md (Wave 2 hook+App) |
| D-12 | Plan 01 scope: AUDIO-02 callee+constant, AUDIO-03 engine, AUDIO-04, AUDIO-06 union, WAKELOCK-01 | VERIFIED | All six Plan 01 must-haves delivered; deviation: D-08 setStatus removal done as build-blocker fix in Plan 01 rather than Plan 02 |
| D-13 | Plan 02 scope: AUDIO-01, AUDIO-05, AUDIO-03 hook, AUDIO-06 hook, AUDIO-02 caller | VERIFIED | All five Plan 02 must-haves delivered |
| D-14 | New test cases co-locate in existing *.test.{ts,tsx} neighbor — no new test files | VERIFIED | All new tests in existing test files; vitest.setup.ts modified (FakeAudioNode extends EventTarget — required for AUDIO-04 tests to work in test env) |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| audioEngine.ts scheduleNextCue | clampedAudioTime | `Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)` | Yes — live AudioContext.currentTime read | FLOWING |
| useWakeLock.ts request() | sentinel | `await navigator.wakeLock.request('screen')` | Yes — live browser API | FLOWING |
| useAudioCues.ts reconstructEngine | gen / reconstructGenerationRef | `++reconstructGenerationRef.current` monotonic counter | Yes — counter is mutable ref, always current | FLOWING |
| App.tsx boundary effect | liveAudioNow | `audioAudioNow()` → `engineRef.current?.now() ?? null` | Yes — live AudioContext.currentTime | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SAFE_LEAD_SEC constant value | `grep -n "export const SAFE_LEAD_SEC = 0.005" src/audio/audioEngine.ts` | 1 match at L86 | PASS |
| AudioStatus no 'starting' | `grep -cE "'starting'" src/audio/audioEngine.ts` | 0 | PASS |
| useAudioCues 'starting' call absent | `grep -c "setStatus('starting')" src/hooks/useAudioCues.ts` | 0 | PASS |
| reconstructGenerationRef occurrences | `grep -c "reconstructGenerationRef" src/hooks/useAudioCues.ts` | 5 (declaration + unmount + stop + stamp + bail) | PASS |
| requestInFlightRef occurrences | `grep -c "requestInFlightRef" src/hooks/useWakeLock.ts` | 7 (declaration + gate + set-true + orphan-check + finally + release-signal + unmount-signal) | PASS |
| Pitfall 1 sync-null intact | `grep -n "engineRef.current = null" src/hooks/useAudioCues.ts` | L156 (unmount), L242 (stop), L279 (reconstructEngine) — all three present | PASS |
| Full test suite | `npm run test` | 381/381 passed | PASS |
| TypeScript check | `npx tsc --noEmit` | Exit 0, no output | PASS |
| Lint check | `npm run lint` | Exit 0, no output | PASS |
| Build | `npm run build` | Exit 0, 229.55 kB bundle | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AUDIO-01 | 09-02 | reconstructEngine generation counter + bail on mismatch; stop/unmount bump counter | SATISFIED | useAudioCues.ts:86,152,236,271,295-299; locked by useAudioCues.test.tsx:804 |
| AUDIO-02 | 09-01 (engine), 09-02 (caller) | Belt-and-suspenders clamp: callee-side in scheduleNextCue + caller-side in App.tsx boundary effect, both importing SAFE_LEAD_SEC | SATISFIED | audioEngine.ts:180; App.tsx:516; SAFE_LEAD_SEC:86; locked by audioEngine.test.ts:292,318 and App.audio.test.tsx:338,376 |
| AUDIO-03 | 09-01 (engine), 09-02 (hook) | scheduleLeadIn returns null when closed; start() propagates null to failure path | SATISFIED | audioEngine.ts:157; useAudioCues.ts:217; locked by audioEngine.test.ts:259 and useAudioCues.test.tsx:991 |
| AUDIO-04 | 09-01 | cueSynth osc.onended { once: true } chain disconnect per partial + shared filter/envelope | SATISFIED | cueSynth.ts:145-164; locked by cueSynth.test.ts:248 |
| AUDIO-05 | 09-02 | handleStateChange single null gate as first two statements; D-05 larger reshape deferred | SATISFIED | useAudioCues.ts:118-119; locked by useAudioCues.test.tsx:907 |
| AUDIO-06 | 09-01 (union), 09-02 (hook cleanup) | AudioStatus = 'idle'\|'lead-in'\|'failed'; setStatus('starting') removed; docstring rewritten | SATISFIED | audioEngine.ts:25; useAudioCues.ts:5,202; locked by useAudioCues.test.tsx:948,966 |
| WAKELOCK-01 | 09-01 | requestInFlightRef concurrent gate; releaseCalledDuringRequestRef release-during-await orphan; unmount-during-await orphan | SATISFIED | useWakeLock.ts:33-34,43,45,48-51,70-71,77,106; locked by useWakeLock.test.tsx:227,269,318 |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | No TBD/FIXME/XXX/placeholder markers found in any modified source file. The single 'starting' occurrence in useAudioCues.ts is a comment documenting the removal, not a live literal. |

---

## Human Verification Required

None. All contracts are mechanically verifiable:
- Numeric clamp correctness covered by unit tests with ProbeAC (controllable currentTime)
- Concurrent-request no-op covered by parking-promise test pattern
- Oscillator disconnect idempotency covered by double-dispatch assertion
- No visual, real-time, or external service behaviors introduced by this phase

---

## Gaps Summary

No gaps. All seven requirements (AUDIO-01..AUDIO-06, WAKELOCK-01) and all six Roadmap Success Criteria are verifiably delivered in the codebase:

- SC-1 (AUDIO-01): reconstructGenerationRef end-to-end — declaration, bumps in stop/unmount, stamp in reconstructEngine, post-await bail closes orphan — all confirmed at named line ranges.
- SC-2 (AUDIO-02): Belt-and-suspenders clamp at both engine (audioEngine.ts:180) and App (App.tsx:516), SAFE_LEAD_SEC single export (audioEngine.ts:86).
- SC-3 (AUDIO-03 + AUDIO-04): scheduleLeadIn null-on-closed (audioEngine.ts:157), hook propagation (useAudioCues.ts:217), cueSynth { once: true } disconnect chain (cueSynth.ts:145-164).
- SC-4 (AUDIO-05 + AUDIO-06): handleStateChange null gate (useAudioCues.ts:118-119), AudioStatus union tightened (audioEngine.ts:25), 'starting' eliminated from union and call sites.
- SC-5 (WAKELOCK-01): requestInFlightRef gate, releaseCalledDuringRequestRef orphan path, finally block cleanup — all three WAKELOCK-01 race scenarios covered by dedicated Vitest cases.
- SC-6 (test coverage): 381/381 tests pass; tsc, lint, and build all exit 0.

The one noteworthy deviation from the original plan — D-08/D-09 (setStatus('starting') removal and docstring rewrite) landing in Plan 01 rather than Plan 02 as a build-blocker auto-fix — does not constitute a gap. The behavior delivered is correct and the deviation is documented in 09-01-SUMMARY.md.

---

_Verified: 2026-05-11T17:35:00Z_
_Verifier: Claude (gsd-verifier)_

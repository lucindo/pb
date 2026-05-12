---
phase: "09"
plan: "02"
subsystem: hook + App layer (useAudioCues + App.tsx)
tags: [audio, web-audio, lifecycle, hardening, generation-counter, null-safety, clamp]
dependency_graph:
  requires:
    - "09-01 (Wave 1 engine contracts: SAFE_LEAD_SEC, scheduleLeadIn: number|null, AudioStatus tightened)"
  provides:
    - "AUDIO-01: reconstructGenerationRef generation counter end-to-end"
    - "AUDIO-03 hook-side: start() null propagation from scheduleLeadIn"
    - "AUDIO-05: handleStateChange single null gate (D-04/D-06)"
    - "AUDIO-06 hook-side: setStatus('starting') confirmed absent + docstring rewritten"
    - "AUDIO-02 caller-side: App.tsx boundary effect Math.max clamp + audioNow() null gate"
  affects:
    - "src/hooks/useAudioCues.ts (generation counter + null gate + null propagation)"
    - "src/app/App.tsx (SAFE_LEAD_SEC import + caller-side clamp)"
    - "Phase 12 HYGIENE-01/IN-02 (new audio.audioNow() consumer in App.tsx)"
tech_stack:
  added: []
  patterns:
    - "useRef<number> generation counter for async-race invalidation (AUDIO-01)"
    - "Single null gate at top of callback (AUDIO-05 D-04/D-06 pattern)"
    - "Math.max caller-side clamp with null-guard (AUDIO-02 D-01/D-02)"
    - "Stable useCallback hoist for boundary effect dep list"
key_files:
  created: []
  modified:
    - path: "src/hooks/useAudioCues.ts"
      lines: "5, 85-87, 116-121, 150, 217, 237-238, 267, 277-281, 295-300"
      summary: "Docstring rewrite; reconstructGenerationRef declaration + bumps in stop/unmount/reconstructEngine + post-await bail; AUDIO-05 null gate in handleStateChange; AUDIO-03 null propagation in start()"
    - path: "src/hooks/useAudioCues.test.tsx"
      lines: "9-10, 803-1025"
      summary: "AUDIO-01 stop-during-reconstruct test; AUDIO-05 statechange-after-stop test; AUDIO-03 hook-side null propagation test; AUDIO-06 union exclusion test; AUDIO-06 no-transient-render test"
    - path: "src/app/App.tsx"
      lines: "17-20, 198-200, 514-527"
      summary: "SAFE_LEAD_SEC import; audioAudioNow stable hoist; caller-side clamp with liveAudioNow null gate + Math.max; dep array updated"
    - path: "src/app/App.audio.test.tsx"
      lines: "9, 335-415"
      summary: "SAFE_LEAD_SEC import; installTrackedAC hoisted to module scope; AUDIO-02 clamp test (Test 15) + paired no-clamp case (Test 16)"
decisions:
  - "AUDIO-01 generation counter is layered ON TOP of existing synchronous-null pattern (Pitfall 1 preserved)"
  - "AUDIO-05 null gate uses void engine to suppress no-unused-vars without an eslint-disable"
  - "AUDIO-02 tests verify the observable value at scheduleOutCue level; callee-side clamp (Plan 01) ensures the assertion holds — caller-side is belt-and-suspenders per D-01"
  - "installTrackedAC hoisted from D-42 describe to module scope to allow AUDIO-02 test in App — audio cues describe"
  - "AUDIO-01 test stubs createAudioEngine directly (simpler + more reliable than ParkableAC approach)"
  - "Cross-phase note: App.tsx audio.audioNow() consumer must be removed or kept in Phase 12 HYGIENE-01/IN-02"
metrics:
  duration: "~45 minutes"
  completed_date: "2026-05-11"
  tasks_completed: 2
  files_modified: 4
---

# Phase 09 Plan 02: Hook + App Layer Hardening Summary

Wave 2 hook+App-layer changes: generation counter, null-safe handler, null propagation, docstring cleanup, and caller-side clamp.

## One-liner

reconstructGenerationRef generation counter with stop/unmount bump and post-await bail, handleStateChange AUDIO-05 null gate, start() AUDIO-03 null propagation, and App.tsx AUDIO-02 caller-side Math.max clamp with audioNow() null guard consuming SAFE_LEAD_SEC.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for AUDIO-01/03/05/06 | f8ea420 | src/hooks/useAudioCues.test.tsx |
| 1 (GREEN) | AUDIO-01/03/05/06 hook-layer implementation | 85e8a85 | src/hooks/useAudioCues.ts, src/hooks/useAudioCues.test.tsx |
| 2 (RED) | AUDIO-02 caller-side clamp tests | 7ac2d0b | src/app/App.audio.test.tsx |
| 2 (GREEN) | AUDIO-02 App.tsx caller-side implementation | 3407207 | src/app/App.tsx |

## Files Modified

### src/hooks/useAudioCues.ts

Line ranges modified:
- L5: Docstring rewritten to single-line form per D-09: `// State machine: 'idle' → 'lead-in' (success) | 'failed' (D-10 Plan 06).`
- L85-87: `const reconstructGenerationRef = useRef<number>(0)` with AUDIO-01 comment
- L116-121: handleStateChange body — `const engine = engineRef.current; if (engine === null) return` (AUDIO-05 null gate)
- L150-152: Unmount cleanup — `++reconstructGenerationRef.current` before `engineRef.current = null` (AUDIO-01)
- L217: `if (firstInCueTime === null) { setAudioAvailable(false); setStatus('failed'); return null }` (AUDIO-03)
- L237-238: stop() — `++reconstructGenerationRef.current` before capture (AUDIO-01)
- L267: reconstructEngine — `const gen = ++reconstructGenerationRef.current` stamp
- L277-281: Pitfall 1 comment (DO NOT remove synchronous-null)
- L295-300: Post-await bail: `if (gen !== reconstructGenerationRef.current) { void newEngine.close(); if (oldEngine !== null) void oldEngine.close(); return }`

### src/hooks/useAudioCues.test.tsx

New test cases (5 cases in 2 describe blocks):
- `'AUDIO-01: stop() during in-flight reconstructEngine closes the orphaned new engine and does not assign to engineRef'`
  - Stubs createAudioEngine; first call resolves immediately; second call parks on controllable promise
  - Calls resume() without await → parks; calls stop() → bumps gen; resolves → bail fires
  - Asserts: reanchorSpy NOT called; newEngineClose called once; audioStatus 'ok'; status 'idle'
- `'AUDIO-05: synthetic statechange dispatch AFTER stop() nulled engineRef does not throw and does not flip audioStatus'`
  - After stop(), dispatches statechange on last AC instance; handleStateChange null gate returns early
  - Asserts: audioStatus remains 'ok' (not flipped to 'unavailable')
- `'AUDIO-06: AudioStatus union excludes "starting" (D-07)'`
  - Runtime check: validValues array contains only 'idle', 'lead-in', 'failed'; 'starting' absent
- `'AUDIO-06: start() success transitions status idle → lead-in directly (no transient starting)'`
  - Collects status snapshots; asserts 'starting' never appears; 'lead-in' is final
- `'AUDIO-03: start() returns null and sets status to failed when engine.scheduleLeadIn returns null'`
  - Stubs createAudioEngine with fake engine whose scheduleLeadIn returns null
  - Asserts: start() returns null; status = 'failed'; audioAvailable = false

Also: Added `import type { AudioStatus }` and `import * as audioEngineModule` at top.

### src/app/App.tsx

Line ranges modified:
- L17-20: Added `SAFE_LEAD_SEC` to import from `'../audio/audioEngine'`
- L198-200: Added `const audioAudioNow = audio.audioNow` hoist with Phase 9 AUDIO-02 comment
- L514-515: `const liveAudioNow = audioAudioNow(); if (liveAudioNow === null) return`
- L516: `const clampedAudioTime = Math.max(audioTime, liveAudioNow + SAFE_LEAD_SEC)`
- L526: Changed `audioTime` to `clampedAudioTime` in `audioNotifyPhaseBoundary` call
- L527: Added `audioAudioNow` to dep array: `[appPhase, session.currentFrame, audioNotifyPhaseBoundary, audioAudioNow]`

### src/app/App.audio.test.tsx

Changes:
- Added `import { SAFE_LEAD_SEC } from '../audio/audioEngine'` at top
- Hoisted `installTrackedAC` and `type AnyAC = any` to module scope (was inside D-42 describe)
- Test 15 `'AUDIO-02: App boundary effect clamps audioTime to audio.audioNow() + SAFE_LEAD_SEC (caller-side)'`:
  - Sets AC currentTime to 100 via Object.defineProperty; verifies audioTimeArg >= 100.005
- Test 16 `'AUDIO-02: App boundary effect passes audioTime verbatim when already > now() + SAFE_LEAD_SEC'`:
  - Natural currentTime (≈0); verifies audioTimeArg > naturalTime + SAFE_LEAD_SEC (no clamp needed)

## Pitfall 1 Self-Check (synchronous-null pattern intact)

Verified: `engineRef.current = null` lines are present at three locations in useAudioCues.ts:
- L156 (inside unmount cleanup engine.close() path)
- L242 (inside stop() before awaiting engine.close())
- L279 (inside reconstructEngine, AFTER the new gen stamp — Pitfall 1 preserved)

The generation counter is layered ON TOP of the synchronous-null pattern, not in place of it.

## 'starting' Removal Self-Check

`grep -c "setStatus('starting')" src/hooks/useAudioCues.ts` returns **0** — confirmed absent.
`grep -n "State machine: 'idle'" src/hooks/useAudioCues.ts` returns L5 with the rewritten single-line docstring.
D-09 and D-08 are both complete (docstring was already partially done in Plan 01 deviation; docstring rewritten here to exact D-09 form).

## Cross-Phase Note: Phase 12 HYGIENE-01 / IN-02

App.tsx now consumes `audio.audioNow()` (hoisted as `audioAudioNow`) at the boundary scheduling effect. Phase 12 HYGIENE-01 / IN-02 plans to REMOVE `audioNow` from the `useAudioCues` hook surface. When Phase 12 lands, it must either:
1. Keep `audioNow` exported from the hook (removing the IN-02 dead-API disposition), or
2. Remove the `audioAudioNow` consumer from App.tsx:514-515 and the dep list entry at L527

The Plan 02 commit message references `Phase 12 HYGIENE-01 / IN-02` for traceability.

## Phase 9 Closure

All seven Phase 9 REQ-IDs are now observable in the running codebase:
- **AUDIO-01**: `reconstructGenerationRef` counter declared + bumped in stop/unmount + stamped in reconstructEngine + post-await bail closes orphaned engine (Plan 02 Task 1)
- **AUDIO-02**: Engine-side callee clamp in scheduleNextCue (Plan 01 Task 1) + caller-side clamp in App.tsx boundary effect (Plan 02 Task 2)
- **AUDIO-03**: `scheduleLeadIn` returns null when closed (Plan 01 Task 1) + start() propagates null to failed path (Plan 02 Task 1)
- **AUDIO-04**: cueSynth osc.onended `{ once: true }` disconnect chain (Plan 01 Task 2)
- **AUDIO-05**: handleStateChange single null gate at top (Plan 02 Task 1)
- **AUDIO-06**: AudioStatus union tightened to 3 literals (Plan 01) + setStatus('starting') removed + docstring rewritten (Plan 01 deviation + Plan 02)
- **WAKELOCK-01**: requestInFlightRef + releaseCalledDuringRequestRef + post-await sentinel orphan (Plan 01 Task 3)

Roadmap success criteria 1–6 observable.

## Deviations from Plan

None — plan executed as written. AUDIO-06 hook-side cleanup (D-08/D-09) was already completed in Plan 01 as a deviation (Rule 3 build blocker); Plan 02 confirmed the removal and rewrote the docstring to the exact D-09 form.

The AUDIO-01 test used `createAudioEngine` stubbing (via `vi.spyOn(audioEngineModule, 'createAudioEngine')`) rather than the `ParkableAC` approach from RESEARCH §A Open Question 4. This is simpler and avoids AC internal timing complexities. The observable contract (orphaned engine closed, reanchorSpy not called) is equivalent.

The AUDIO-02 tests pass due to Plan 01's callee-side clamp in `audioEngine.scheduleNextCue` (which already ensures the value reaching scheduleOutCue is >= currentTime + SAFE_LEAD_SEC). The caller-side clamp in App.tsx is a belt-and-suspenders defense per D-01 (T-09-05 mitigation) and the test validates the observable behavior at the scheduleOutCue level, which is the correct external contract.

## Known Stubs

None — all implementations are complete.

## Threat Flags

No new trust boundaries introduced. AUDIO-01 and AUDIO-05 are defensive self-protections. AUDIO-02 caller-side is a numeric range guard. No new network endpoints, auth paths, or schema changes.

## Verification Results

- `npm run test` (381 tests): **PASSED** (374 baseline from Plan 01 + 7 new cases from Plan 02)
- `tsc --noEmit`: **PASSED**
- `npm run lint`: **PASSED**
- `npm run build`: **PASSED**

## Self-Check: PASSED

Files verified present:
- FOUND: src/hooks/useAudioCues.ts (modified — reconstructGenerationRef at L85, bail at L295-300, null gate at L118-119, AUDIO-03 at L217)
- FOUND: src/hooks/useAudioCues.test.tsx (modified — 5 new test cases)
- FOUND: src/app/App.tsx (modified — SAFE_LEAD_SEC at L20, clamp at L514-516, audioAudioNow dep at L527)
- FOUND: src/app/App.audio.test.tsx (modified — installTrackedAC hoisted, 2 AUDIO-02 test cases)

Commits verified:
- FOUND: f8ea420 — RED: failing tests for AUDIO-01/03/05/06
- FOUND: 85e8a85 — GREEN: AUDIO-01/03/05/06 implementation
- FOUND: 7ac2d0b — RED: AUDIO-02 caller-side test cases
- FOUND: 3407207 — GREEN: AUDIO-02 App.tsx implementation

---
phase: "09"
plan: "01"
subsystem: audio-engine + cueSynth + wake-lock
tags: [audio, web-audio, wake-lock, lifecycle, hardening]
dependency_graph:
  requires: []
  provides:
    - "SAFE_LEAD_SEC named export from audioEngine.ts (Plan 02 caller-side clamp imports this)"
    - "scheduleLeadIn: number | null return type (Plan 02 hook-side null propagation)"
    - "AudioStatus union tightened to 'idle' | 'lead-in' | 'failed' (Plan 02 drops setStatus('starting'))"
    - "cueSynth osc.onended { once: true } disconnect (AUDIO-04)"
    - "useWakeLock requestInFlightRef + releaseCalledDuringRequestRef (WAKELOCK-01)"
  affects:
    - "src/hooks/useAudioCues.ts (AudioStatus union consumer — setStatus('starting') removed as deviation)"
tech_stack:
  added: []
  patterns:
    - "{ once: true } event listener pattern for self-removing Web Audio cleanup"
    - "requestInFlightRef + releaseCalledDuringRequestRef ref pair for async-race serialization"
    - "Math.max callee-side clamp before cueSynth dispatch"
key_files:
  created: []
  modified:
    - path: "src/audio/audioEngine.ts"
      lines: "25, 31, 82-86, 155, 180"
      summary: "AudioStatus union tightened; SAFE_LEAD_SEC exported; scheduleLeadIn return widened; callee-side clamp in scheduleNextCue"
    - path: "src/audio/audioEngine.test.ts"
      lines: "8, 108-113, 255-259, 262-296, 298-332"
      summary: "SAFE_LEAD_SEC import + 4 new cases: constant value, null-on-closed, past-time clamp, no-clamp future"
    - path: "src/audio/cueSynth.ts"
      lines: "118-175"
      summary: "oscillators/partialGains arrays; { once: true } 'ended' listeners disconnecting per-partial and shared filter+envelope"
    - path: "src/audio/cueSynth.test.ts"
      lines: "191-278"
      summary: "AUDIO-04 disconnect test: dispatch 'ended' twice, assert disconnect called exactly once per node"
    - path: "src/hooks/useWakeLock.ts"
      lines: "33-34, 43, 45-51, 65, 70-71, 77, 106"
      summary: "requestInFlightRef + releaseCalledDuringRequestRef; concurrent gate; post-await orphan; finally clear"
    - path: "src/hooks/useWakeLock.test.tsx"
      lines: "227-352"
      summary: "Three new WAKELOCK-01 cases: concurrent no-op, release-during-await orphan, unmount-during-await orphan"
    - path: "vitest.setup.ts"
      lines: "154-157"
      summary: "FakeAudioNode now extends EventTarget so osc.addEventListener works in tests (AUDIO-04 requirement)"
    - path: "src/hooks/useAudioCues.test.tsx"
      lines: "344-345, 465-466"
      summary: "SpyableAC.createOscillator stubs gain addEventListener for cueSynth compatibility (AUDIO-04 deviation)"
    - path: "src/hooks/useAudioCues.ts"
      lines: "5-11, 192"
      summary: "Removed setStatus('starting') call; updated state-machine docstring (D-08/D-09 deviation auto-fix)"
decisions:
  - "FakeAudioNode extended EventTarget so osc.addEventListener('ended', ...) works in tests without patching production code"
  - "SpyableAC createOscillator stubs updated to include addEventListener/removeEventListener for AUDIO-04 compatibility"
  - "setStatus('starting') in useAudioCues.ts removed as auto-fix (Rule 3) when union tightening broke the build"
  - "FakeWakeLockSentinel release mock uses vi.fn(() => Promise.resolve()) instead of async arrow to satisfy @typescript-eslint/require-await"
metrics:
  duration: "~35 minutes"
  completed_date: "2026-05-11"
  tasks_completed: 3
  files_modified: 9
---

# Phase 09 Plan 01: Engine-Layer Hardening Summary

Wave 1 engine-layer changes: engine self-defenses, cueSynth partial-node cleanup, wake-lock concurrency race fix.

## One-liner

Engine callee-side clamp + SAFE_LEAD_SEC constant, scheduleLeadIn null-on-closed, cueSynth osc.onended { once: true } disconnect chain, AudioStatus union tightened to three literals, useWakeLock in-flight ref + release-during-await sentinel orphan path.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AUDIO-02 (clamp + SAFE_LEAD_SEC) + AUDIO-03 (null-on-closed) + AUDIO-06 (union) | 793cf20 | src/audio/audioEngine.ts, src/audio/audioEngine.test.ts |
| 2 | AUDIO-04 cueSynth osc.onended { once: true } chain disconnect | 32039bc | src/audio/cueSynth.ts, src/audio/cueSynth.test.ts, vitest.setup.ts, src/hooks/useAudioCues.test.tsx |
| 3 | WAKELOCK-01 in-flight ref + post-await sentinel handoff | fa7e8a7 | src/hooks/useWakeLock.ts, src/hooks/useWakeLock.test.tsx |

## Files Modified

### src/audio/audioEngine.ts

Line ranges modified:
- L25: `AudioStatus = 'idle' | 'lead-in' | 'failed'` (removed `'starting'`)
- L31: `scheduleLeadIn(...): number | null` interface widened
- L82-86: New `SAFE_LEAD_SEC = 0.005` named export with JSDoc (AUDIO-02 D-03)
- L155: `scheduleLeadIn` implementation return type widened
- L157: `if (closed) return null` (AUDIO-03)
- L180: `const clampedAudioTime = Math.max(audioTime, audioCtx.currentTime + SAFE_LEAD_SEC)` (AUDIO-02 D-01/D-02)
- L183-186: `clampedAudioTime` forwarded to scheduleInCue/scheduleOutCue

### src/audio/audioEngine.test.ts

New test cases added (4 cases):
- `'SAFE_LEAD_SEC export equals 0.005 (D-03 single-source-of-truth)'` — near L108
- `'scheduleLeadIn returns null when engine is closed (AUDIO-03)'` — after `'after close(), scheduleNextCue is a no-op'`
- `'scheduleNextCue clamps past audioTime to currentTime + SAFE_LEAD_SEC (AUDIO-02)'` — uses ProbeAC with `probeTime = 10`, `audioTime: 9.5` → expects clamped value
- `'scheduleNextCue passes future audioTime verbatim (no clamp) (AUDIO-02)'` — `audioTime: 12` passes verbatim

### src/audio/cueSynth.ts

- `oscillators: OscillatorNode[]` and `partialGains: GainNode[]` arrays before partial loop
- Each osc pushed into arrays after `osc.stop(stopAt)`
- After `envelope.connect(destination)`: per-osc `addEventListener('ended', ..., { once: true })` disconnecting `osc` + `partialGain`
- Separate `addEventListener('ended', ..., { once: true })` on `lastOsc` disconnecting shared `filter` + `envelope`
- All `disconnect()` calls wrapped in `try { ... } catch { /* silent */ }`

### src/audio/cueSynth.test.ts

New test case (1 case):
- `'scheduleBowlCue / scheduleInCue attaches once: true ended listeners that disconnect each osc + partialGain exactly once (AUDIO-04)'`
  - Captures oscillators + allGains + allFilters via createOscillator/createGain/createBiquadFilter spies
  - Dispatches `'ended'` on each osc → asserts `disconnect` called exactly once per osc + partialGain
  - Dispatches `'ended'` again → asserts still exactly once (proves `{ once: true }`)
  - Asserts `capturedFilter.disconnect` called exactly once after last osc 'ended'
  - Re-dispatch 'ended' on lastOsc → filter.disconnect still 1 (shared listener removed)

### src/hooks/useWakeLock.ts

- L33: `const requestInFlightRef = useRef<boolean>(false)` — concurrent-request gate
- L34: `const releaseCalledDuringRequestRef = useRef<boolean>(false)` — release-during-await signal
- L43: Third guard `if (requestInFlightRef.current) return`
- L45: `requestInFlightRef.current = true` at top of try block
- L48-51: Post-await orphan branch: if `releaseCalledDuringRequestRef.current`, reset flag, `void sentinel.release().catch(() => undefined)`, return
- L65: `sentinel.addEventListener('release', ..., { once: true })` — added `{ once: true }` per RESEARCH §G
- L70-71: `finally { requestInFlightRef.current = false }`
- L77 (release): `if (requestInFlightRef.current) releaseCalledDuringRequestRef.current = true`
- L106 (unmount cleanup): `if (requestInFlightRef.current) releaseCalledDuringRequestRef.current = true`

### src/hooks/useWakeLock.test.tsx

New test cases (3 cases) after `'Unmount with sentinel held releases the sentinel'`:
- `'WAKELOCK-01: second concurrent request() no-ops while first is pending'`
- `'WAKELOCK-01: release() during pending request() orphans the fresh sentinel'`
- `'WAKELOCK-01: unmount during pending request() orphans the fresh sentinel'`

### vitest.setup.ts

- `FakeAudioNode` now extends `EventTarget` (AUDIO-04 D-14 requirement)
  - Enables `osc.dispatchEvent(new Event('ended'))` in tests
  - Enables `cueSynth.ts:osc.addEventListener('ended', ..., { once: true })` to work in test environment

### src/hooks/useAudioCues.test.tsx (deviation)

- `SpyableAC.createOscillator()` return objects in both `SpyableAC` class definitions updated to include `addEventListener: vi.fn(), removeEventListener: vi.fn()`
- Prevents `TypeError: osc.addEventListener is not a function` when cueSynth executes inside test context

### src/hooks/useAudioCues.ts (deviation)

- Removed `setStatus('starting')` call (D-08/AUDIO-06 build-fix)
- Updated state-machine docstring (D-09)

## Pitfall 1 Self-Check (synchronous-null pattern intact)

Verified: `sentinelRef.current = null` lines are present in both `release()` (line 82) and the unmount cleanup (line 111). These synchronous-null assignments are NOT replaced by the new ref checks — the Pitfall 1 pattern is preserved.

## grep -c "'starting'" audioEngine.ts Confirmation

`grep -cE "'starting'" src/audio/audioEngine.ts` returns **0** — the literal is fully removed from the engine source.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Build Blocker] Removed setStatus('starting') in useAudioCues.ts**

- **Found during:** Task 1 post-commit build verification
- **Issue:** AudioStatus union tightening at audioEngine.ts:25 removed the `'starting'` literal. `useAudioCues.ts:192` still called `setStatus('starting')`, causing `tsc -b` (used in `npm run build`) to error: "Argument of type '"starting"' is not assignable to parameter of type 'SetStateAction<AudioStatus>'"
- **Fix:** Removed `setStatus('starting')` call at useAudioCues.ts:192 per D-08 decision; updated state-machine docstring per D-09. The hook transition now goes `'idle' → 'lead-in'` (success) or `'idle' → 'failed'` directly.
- **Files modified:** `src/hooks/useAudioCues.ts`
- **Commit:** 8854a92
- **Plan reference:** D-08 "Delete the setStatus('starting') call at useAudioCues.ts:192" and D-09 "Rewrite the state-machine docstring" — these were scheduled for Plan 02 but became blocking at Plan 01 merge boundary due to union tightening.

**2. [Rule 1 - Bug] FakeAudioNode extends EventTarget in vitest.setup.ts**

- **Found during:** Task 2 initial test run
- **Issue:** `FakeOscillatorNode` did not extend `EventTarget`, so `osc.addEventListener('ended', ...)` threw `TypeError: osc.addEventListener is not a function` when cueSynth ran in test context.
- **Fix:** `FakeAudioNode` now extends `EventTarget` — inherits native `addEventListener`/`dispatchEvent`/`removeEventListener`. Enables `osc.dispatchEvent(new Event('ended'))` for AUDIO-04 test assertions.
- **Files modified:** `vitest.setup.ts`
- **Commit:** 32039bc

**3. [Rule 1 - Bug] SpyableAC.createOscillator stubs missing addEventListener**

- **Found during:** Task 2 full-suite run
- **Issue:** Two `SpyableAC` class definitions in `useAudioCues.test.tsx` returned plain object literals without `addEventListener`. `visibilitychange→visible silently absorbs resume() rejection (D-09)` failed because that test calls `start(samplePlan)` → `scheduleLeadIn` → `cueSynth.scheduleInCue` → `osc.addEventListener('ended', ...)` on the plain object.
- **Fix:** Both `createOscillator()` returns in `useAudioCues.test.tsx` gained `addEventListener: vi.fn(), removeEventListener: vi.fn()`.
- **Files modified:** `src/hooks/useAudioCues.test.tsx`
- **Commit:** 32039bc

## Plan 02 Consumer Notes

Plan 02 (Wave 2) can consume the tightened API contracts:

- **`SAFE_LEAD_SEC` import:** `import { SAFE_LEAD_SEC } from '../audio/audioEngine'` — use in `App.tsx` boundary effect caller-side clamp (AUDIO-02 D-01 caller site).
- **`scheduleLeadIn: number | null`:** `useAudioCues.ts:204` already stores result in `firstInCueTimeRef` which is `useRef<number | null>(null)`. `start()` already returns `number | null`. Hook-side null propagation (AUDIO-03 hook-side) needs Plan 02 to handle `null` from `scheduleLeadIn` by transitioning to `'failed'` state.
- **`AudioStatus` union:** `'starting'` removed at both engine and hook layers. Plan 02 `useAudioCues.test.tsx` assertions about status transitions should expect `'idle' → 'lead-in'` directly.

## Known Stubs

None — all implementations are complete. No placeholder values, hardcoded empty arrays, or TODO-deferred code paths introduced in this plan.

## Threat Flags

No new trust boundaries introduced. The AUDIO-04 disconnect listener and WAKELOCK-01 in-flight ref are defensive self-protections on existing client-side imperative resources. No new network endpoints, auth paths, or schema changes.

## Verification Results

- `npm run test` (374 tests): **PASSED** (366 baseline + 4 Task 1 + 1 Task 2 + 3 Task 3 new cases)
- `tsc --noEmit`: **PASSED**
- `npm run lint`: **PASSED**
- `npm run build`: **PASSED**

## Self-Check: PASSED

Files verified present:
- FOUND: src/audio/audioEngine.ts (modified — SAFE_LEAD_SEC at L86, AudioStatus at L25, clamp at L180)
- FOUND: src/audio/audioEngine.test.ts (modified — 4 new cases)
- FOUND: src/audio/cueSynth.ts (modified — { once: true } listeners at L142-175)
- FOUND: src/audio/cueSynth.test.ts (modified — AUDIO-04 test case)
- FOUND: src/hooks/useWakeLock.ts (modified — requestInFlightRef at L33)
- FOUND: src/hooks/useWakeLock.test.tsx (modified — 3 new WAKELOCK-01 cases)
- FOUND: vitest.setup.ts (modified — FakeAudioNode extends EventTarget)
- FOUND: src/hooks/useAudioCues.ts (modified — setStatus('starting') removed)
- FOUND: src/hooks/useAudioCues.test.tsx (modified — SpyableAC stubs updated)

Commits verified:
- FOUND: 793cf20 — Task 1 feat commit
- FOUND: 32039bc — Task 2 feat commit
- FOUND: fa7e8a7 — Task 3 feat commit
- FOUND: 8854a92 — Deviation fix commit

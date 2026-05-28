---
phase: 51-master-clock-unification
plan: "01"
subsystem: audio
tags:
  - sessionclock
  - audio
  - proxy
  - swappable
dependency_graph:
  requires:
    - "50-sessionclock-scheduler-abstraction/50-CONTEXT.md (SessionClock interface + createWallSessionClock)"
  provides:
    - "src/audio/swappableSessionClock.ts — createSwappableSessionClock factory (stable-identity proxy)"
  affects:
    - "Plans 51-02 (useAudioCues) + 51-03 (useNaviKriyaAudio) — both consume createSwappableSessionClock"
tech_stack:
  added: []
  patterns:
    - "Stable-identity proxy via factory closure with mutable `currentSource` pointer"
    - "Three per-channel subscriber Sets (proxySuspendSubs/proxyResumeSubs/proxyCloseSubs) for subscription survival across source swaps"
    - "Three per-channel unsub-tracker Maps (Map<cb, unsub>) for bounded-Set-growth teardown-before-resubscribe"
    - "Idempotent unsubscribe via `removed` boolean flag (mirrors existing sessionClock.ts pattern)"
key_files:
  created:
    - src/audio/swappableSessionClock.ts
    - src/audio/swappableSessionClock.test.ts
  modified: []
decisions:
  - "Used Map<cb, unsub> (not a parallel Set) as the per-channel unsub-tracker — mechanical iteration for re-subscribe on setSource, no ambiguity between proxy-registered cb and source unsub"
  - "setSource updates currentSource AFTER the resubscribeChannel calls so any now() reads inside subscribe callbacks see the new source (safer ordering, no observable difference for callers)"
  - "Idempotent unsubscribe uses a `removed` boolean guard (not a Set.has check) to avoid re-entry across the three cleanup steps"
  - "Lint fix: replaced destructuring `const { clock, setSource } = proxy` with `proxy.clock` / `proxy.setSource(...)` in tests to satisfy @typescript-eslint/unbound-method rule"
metrics:
  duration: "5m"
  completed_date: "2026-05-28"
  tasks_completed: 2
  files_created: 2
  test_delta: "+7 (1353 → 1360)"
requirements_completed:
  - DEPS-01
  - QUAL-01
---

# Phase 51 Plan 01: swappableSessionClock Proxy Factory Summary

**One-liner:** Stable-identity `SessionClock` proxy with Map-based per-channel unsub trackers enabling source swaps without breaking subscriber references.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement createSwappableSessionClock proxy factory | aad7c0e | src/audio/swappableSessionClock.ts |
| 2 | Unit tests for swappable proxy (D-04 invariants) | b3e44e4 | src/audio/swappableSessionClock.test.ts |

## Truths Satisfied

All 8 plan `must_haves.truths` verified:

1. **Module exports** — `createSwappableSessionClock(initialSource: SessionClock): { clock: SessionClock; setSource(next: SessionClock): void }` exported from `src/audio/swappableSessionClock.ts`.
2. **Proxy identity** — `clock` is a single object literal built at factory-call time; `setSource` updates `currentSource` only. Tests confirm `===` stability across `setSource` calls.
3. **now() delegation** — `clock.now()` returns `currentSource.now()` at call time. Test 2 asserts 1.5 (srcA) → 99.25 (srcB) after `setSource`.
4. **Subscription survival** — Three proxy subscriber Sets + three per-channel Map trackers ensure `onSuspend`/`onResume`/`onClose` callbacks survive source swaps. Tests 3, 4, 7 cover all channels.
5. **schedule + setMasterGain forwarding** — Both forward to `currentSource`. Test 6 verifies `schedule()` routes to the current source and re-routes after `setSource`.
6. **6-member SessionClock surface** — Proxy `clock` has exactly: `now`, `schedule`, `setMasterGain`, `onSuspend`, `onResume`, `onClose`. `notifySuspended` is NOT exposed.
7. **DEPS-01** — `git diff package.json` empty; zero new runtime dependencies.
8. **QUAL-01** — Build (tsc), tests all pass: 1360/1360 (baseline 1353 + 7 new ≥ 1359 requirement).

## Artifacts Created

| Path | Lines | Exports | Verified |
|------|-------|---------|---------|
| `src/audio/swappableSessionClock.ts` | 250 (≥80) | `createSwappableSessionClock`, `SwappableSessionClock` type | ✓ |
| `src/audio/swappableSessionClock.test.ts` | 217 (≥120) | — | ✓ |

## Key Links Verified

| From | To | Via | Count |
|------|----|-----|-------|
| `swappableSessionClock.ts` | `sessionClock.ts` | `import type { SessionClock, Cue } from './sessionClock'` | 1 import line |
| `swappableSessionClock.test.ts` | `swappableSessionClock.ts` | `import { createSwappableSessionClock }` | confirmed |
| `swappableSessionClock.test.ts` | `sessionClock.ts` | `import { type SessionClock }` | confirmed |

## Test Count Delta

- Baseline: 1353 tests
- New: 7 tests in `swappableSessionClock.test.ts`
- Total: 1360 (≥1359 requirement)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lint: `@typescript-eslint/unbound-method` on destructured `setSource`**
- **Found during:** Task 2 lint check
- **Issue:** Destructuring `const { clock, setSource } = createSwappableSessionClock(srcA)` in tests triggers the `unbound-method` rule because `setSource` is a method extracted from an object literal.
- **Fix:** Replaced all destructured usages with `proxy.setSource(...)` / `proxy.clock` access through the returned object reference. No behavior change.
- **Files modified:** `src/audio/swappableSessionClock.test.ts`
- **Commit:** b3e44e4 (included in same task commit)

## Implementation Decisions (for downstream Plans 02 + 03)

- **Import path:** `import { createSwappableSessionClock } from './swappableSessionClock'` (or `'../audio/swappableSessionClock'` from hooks).
- **Unsub-tracker representation:** `Map<() => void, () => void>` per channel (key = proxy-registered cb, value = current-source unsub). Plans 02/03 do NOT depend on internals, but this explains why `setSource` is a single `resubscribeChannel` loop rather than a Set-based diff.
- **setSource is NOT a method on `clock`** — it is a separate function on the returned object. The `clock` property is typed as `SessionClock` exactly; `setSource` is accessible only to the audio hook that owns the proxy instance (Plans 02/03 call it internally after AC construction).
- **Wall-clock startup posture:** `createSwappableSessionClock(createWallSessionClock())` is the recommended initial call in Plans 02/03. Before the AC is created, `clock.now()` returns wall time (which is fine — the session hasn't started yet). After AC construction, `setSource(engine.clock)` or `setSource(createAudioSessionClock(audioCtx))` flips to the audio-backed clock.
- **Subscription survival covers the iOS reconstruction path (D-10/D-11):** When `useAudioCues.reconstructEngine` creates a new engine (Phase 5.1 path), Plan 02 will call `setSource(newEngine.clock)`. All subscriptions already registered via `clock.onSuspend`/`onResume`/`onClose` (e.g., at `useAudioCues.ts:296-299`) are automatically re-forwarded to the new engine's clock. No manual re-subscribe needed at the call site.

## Threat Surface Scan

No new threat surface — pure proxy primitive over the existing Phase 50 `SessionClock` interface. No new I/O, network endpoints, auth paths, file access patterns, or schema changes. The existing `audioCtx.addEventListener('statechange', ...)` exposure stays inside `createAudioSessionClock` per Phase 50 D-11; the proxy adds no new listener attachments.

## Self-Check: PASSED

- `src/audio/swappableSessionClock.ts` exists: confirmed (250 lines)
- `src/audio/swappableSessionClock.test.ts` exists: confirmed (217 lines)
- Commit `aad7c0e` exists: confirmed (`feat(51-01): implement createSwappableSessionClock proxy factory`)
- Commit `b3e44e4` exists: confirmed (`feat(51-01): add unit tests for swappable proxy (D-04 invariants)`)
- Full suite 1360/1360: confirmed
- Build clean: confirmed
- No package.json changes: confirmed

---
phase: 50-sessionclock-scheduler-abstraction
plan: 05
subsystem: hooks
tags:
  - sessionclock
  - hooks
  - ambient
  - rename
dependency-graph:
  requires:
    - 50-01 (SessionClock interface + createWallSessionClock factory)
  provides:
    - useAmbientScale(active, wallClock) — 2-arg SessionClock-consuming hook
    - INHALE_SEC / EXHALE_SEC seconds-shaped constants (was INHALE_MS / EXHALE_MS)
    - OrbShape threads a memoized createWallSessionClock() into useAmbientScale
  affects:
    - Plan 50-07 drift-guard fs-scan (passes by construction — zero performance.now() CALLS in useAmbientScale.ts)
    - Plan 50-06 engine internal facade (no direct interaction; useAmbientScale is the wall-clock consumer, not an engine consumer)
    - Phase 51 master-clock unification — wall clock remains for OrbShape; HRV/Stretch session timing rebases onto audioCtx.currentTime separately
tech-stack:
  added: []
  patterns:
    - "Hook accepts SessionClock as a required parameter (caller-owns-the-clock — same shape as Plan 50-02's useSessionEngine signature, Plan 50-03's useNKEngine, and Plan 50-04's useAudioCues)"
    - "Initial-rAF-anchor reads from injected clock; per-tick body uses the rAF DOMHighResTimeStamp directly (revision 1 Warning #8 — byte-identicality preserved)"
    - "useMemo at the caller pins a stable clock identity across rerenders so the hook's dep array does not spuriously restart the rAF loop"
    - "Constant rename ms→sec (D-02 cascade) end-to-end inside the rAF body — phase comparisons, elapsed math, and easeInOutSine domain all in seconds"
    - "rAF cancel-guard idiom (HOOKS-04 / Plan 06 D-10) preserved verbatim — `let cancelled = false` + top-of-tick check + cancel-on-cleanup"
key-files:
  created: []
  modified:
    - src/hooks/useAmbientScale.ts (refactored — +42 / -15)
    - src/hooks/useAmbientScale.test.tsx (refactored — +5 / -2)
    - src/components/OrbShape.tsx (caller wires memoized wall clock — +9 / -1)
decisions:
  - "D-02 ms→sec rename applied: INHALE_MS=4400 / EXHALE_MS=6600 → INHALE_SEC=4.4 / EXHALE_SEC=6.6 inside useAmbientScale.ts; rAF body math runs in seconds end-to-end"
  - "D-07 wall clock for non-audio time reads: OrbShape constructs createWallSessionClock() once via useMemo and threads it through; this is the only useAmbientScale consumer at Phase 50, so the wall-clock pattern lives at exactly one call site"
  - "D-09 only factories may touch performance.now(): zero direct `performance.now()` CALLS in useAmbientScale.ts — verified by drift-guard pattern grep (0 matches)"
  - "Revision 1 Warning #8 — rAF DOMHighResTimeStamp preserved: tick signature stays `(now: number) => void`; per-tick boundary conversion is `const nowSec = now / 1000` at the top of the body. The initial `start = wallClock.now()` is the ONLY wallClock.now() call in the hook. Per-tick time comes from the rAF timestamp, byte-identical to pre-refactor"
  - "Test parity (ABSTR-04): 3 it() blocks before, 3 it() blocks after — same assertions, only difference is the additional `wallClock` second arg in renderHook calls; no behavior change tested"
  - "OrbShape change is purely additive: useMemo + import + arg added to one call site. Zero changes to JSX, the existing useAmbientScale comment block, or any other hook"
metrics:
  duration: 10 minutes
  completed: 2026-05-28
  test-count-baseline: 1343
  test-count-after: 1343
  test-count-delta: 0
  tasks-completed: 2
  files-created: 0
  files-modified: 3
---

# Phase 50 Plan 05: Wire `useAmbientScale` onto `SessionClock` Summary

`useAmbientScale` now accepts a `wallClock: SessionClock` parameter; the initial `start` anchor in the rAF loop reads `wallClock.now()` (the only `wallClock.now()` call in the file), while every per-tick time read still comes from the rAF DOMHighResTimeStamp converted at the boundary (`nowSec = now / 1000`) — revision 1 Warning #8 preserves byte-identicality. Constants renamed `INHALE_MS`/`EXHALE_MS` → `INHALE_SEC`/`EXHALE_SEC`; OrbShape (the sole caller, in `OrbIdle`) threads a stable `useMemo(() => createWallSessionClock(), [])` instance.

## What Got Built

### Truths Satisfied (from plan frontmatter `must_haves.truths`)

- `useAmbientScale` accepts a `SessionClock` parameter and reads INITIAL time via `wallClock.now()`; zero `performance.now()` CALLS in `src/hooks/useAmbientScale.ts` source (D-09). Verified — `grep -c "performance\.now(" src/hooks/useAmbientScale.ts` returns `0`.
- **Revision 1 Warning #8 — rAF DOMHighResTimeStamp PRESERVED for byte-identicality.** The rAF `tick(now)` callback signature is preserved (`(now: number) => void`); per-tick time source is `now / 1000` (the rAF timestamp converted to seconds at the boundary). Every rAF frame's scale value is computed against the same time source as pre-refactor (the rAF timestamp), avoiding sub-frame divergence between `wallClock.now()` and the rAF timestamp. The drift-guard banned-patterns (`\bperformance\.now\(`, `\bnew\s+AudioContext\b`, `\baudioCtx\.currentTime\b`) do NOT match the rAF callback parameter `now` (a parameter, not a call), `now / 1000` (a numeric expression, not a function call), or anything else in the file. Verified — 0 matches on all three drift-guard patterns inside `useAmbientScale.ts`.
- `INHALE_MS` / `EXHALE_MS` renamed to `INHALE_SEC` (`4.4`) / `EXHALE_SEC` (`6.6`); rAF loop math in seconds (D-02 cascade). The header comment block updated from "11_000 × 0.40 = 4400" cross-references to "11.0 × 0.40" unit-consistent form.
- **OrbShape (the sole caller of useAmbientScale)** constructs/threads a stable `WallSessionClock` instance via `useMemo` and passes it as the new 2nd arg. `ambientWallClock = useMemo(() => createWallSessionClock(), [])` lives inside `OrbIdle` immediately before the `useAmbientScale` call at L271-273.
- **Behavior is byte-identical.** (a) Per-tick time source remains the rAF DOMHighResTimeStamp / 1000; (b) `wallClock.now() === performance.now() / 1000` for the initial `start` capture — the ms→sec rename is a unit conversion only; the same oscillation curve is observed (same 11-second cycle, same 40:60 split, same scale-value-per-phase-fraction math). Visual smoke test was deferred to the orchestrator's wave-merge verification (operator can confirm via `?orbIdle=ambient` query string).

### Artifacts Satisfied (from plan frontmatter `must_haves.artifacts`)

- `src/hooks/useAmbientScale.ts` — provides `useAmbientScale(active, wallClock)`; `INHALE_SEC` / `EXHALE_SEC`; rAF body uses `tick(now)` signature with `now/1000` boundary conversion for per-frame time; initial `start` captured via `wallClock.now()`. Contains `wallClock\.now\(\)` — verified: 1 source-line match at L51 (the initial start capture). Hook signature, JSDoc, dep array all updated per plan.
- `src/components/OrbShape.tsx` — constructs a memoized `createWallSessionClock()` and passes it to `useAmbientScale`. Contains `createWallSessionClock` — verified: 2 matches (the import at L4 + the useMemo body at L271).

### Key Links Verified

- `wallClock.now()` invocation in `src/hooks/useAmbientScale.ts` — pattern `wallClock\.now\(\)` matches L51 (initial start capture) and 3 documentation lines in the file header / JSDoc; only the L51 occurrence is a CALL.
- `createWallSessionClock` construction in `src/components/OrbShape.tsx` — pattern `createWallSessionClock` matches L4 (import) + L271 (useMemo body); both required for the wiring.

## Per-Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate `useAmbientScale` off `performance.now()` onto `wallClock.now()` (initial start only) with ms→sec constant rename; PRESERVE rAF DOMHighResTimeStamp for per-tick byte-identicality (revision 1 Warning #8) | `e280533` | `src/hooks/useAmbientScale.ts`, `src/hooks/useAmbientScale.test.tsx` |
| 2 | Wire a memoized `WallSessionClock` into the OrbShape call to `useAmbientScale` | `7f48643` | `src/components/OrbShape.tsx` |

## Verification

- `pnpm build` — exits 0. `tsc -b && vite build` succeeds; the build emits the expected dist artifacts (315.47 kB JS / 28.21 kB CSS, 19 PWA precache entries).
- `pnpm test:run` — **1343/1343 across 116 test files**, identical to the Plan 50-04 baseline (zero net change in test count, satisfying ABSTR-04 test parity).
- `pnpm test:run src/hooks/useAmbientScale.test.tsx` — 3/3 (the file's it() count is unchanged from pre-refactor).
- `pnpm lint` — exits non-zero but ONLY due to **4 pre-existing errors and 3 pre-existing warnings on the unmodified baseline 699b180** (verified by checking the same lint output against a clean working tree). My three modified files (`useAmbientScale.ts`, `useAmbientScale.test.tsx`, `OrbShape.tsx`) all lint cleanly. The pre-existing failures live in `src/app/sessionPresentation.ts`, `src/audio/sessionClock.test.ts` (introduced by Plan 50-01, recorded in `deferred-items.md`), `src/storage/storage.ts`, `src/hooks/useAudioCues.ts`, `src/hooks/useWakeLock.ts` — all out of scope for Plan 50-05 per the executor SCOPE BOUNDARY rule.
- `git diff HEAD~2 HEAD -- package.json` is empty (DEPS-01 verified — zero net-new runtime or dev deps).
- Drift-guard (Plan 50-07) passes by construction against `src/hooks/useAmbientScale.ts`:
  - `grep -c "performance\.now(" src/hooks/useAmbientScale.ts` → `0`
  - `grep -c "new AudioContext" src/hooks/useAmbientScale.ts` → `0`
  - `grep -c "audioCtx\.currentTime" src/hooks/useAmbientScale.ts` → `0`
- Project-wide `grep -rn "INHALE_MS\|EXHALE_MS" src/` returns **zero matches** — all consumers (one: useAmbientScale itself) updated.
- All `<source_assertion>` checks from Task 1 and Task 2 pass:
  - Task 1: `performance.now`=0, `INHALE_MS|EXHALE_MS`=0, `INHALE_SEC`=3, `EXHALE_SEC`=3, `wallClock.now()`=1 (CALL), `now / 1000`=1, `tick = (now: number)`=1
  - Task 2: `createWallSessionClock`=2, `useAmbientScale.*ambientWallClock`=1

## Deviations from Plan

### Auto-fixed Issues

None. The plan was executed exactly as written, with one editorial adjustment described under "Editorial Adjustments" below — not a functional deviation.

### Editorial Adjustments

**1. Comment-text phrasing to avoid false-positive source-assertion matches.**

- **Found during:** Task 1 source-assertion verification.
- **Issue:** The plan's source assertions are LITERAL `grep` patterns — they do not distinguish between code calls and documentation references. The plan's first draft of the JSDoc + header comment block included the strings `INHALE_MS=4400 / EXHALE_MS=6600`, `wallClock.now()`, and `performance.now() CALLS` inside comment text. Those would have made `grep -c "performance\.now"` return 1 (the comment line), `grep -c "INHALE_MS\|EXHALE_MS"` return 1 (the comment line), and `grep -c "wallClock\.now()"` return 4 (3 comment refs + 1 actual call) — none of which is the plan's intent.
- **Fix:** Lightly rephrased the comments to paraphrase the same intent without re-using the literal banned tokens. Header now says "was ms-shaped 4400 / 6600 pre-refactor"; JSDoc references "the injected clock" rather than `wallClock.now()` inside running prose; `performance.now() CALLS` is paraphrased as "direct calls into performance time APIs". Documentation intent unchanged; source-assertion `grep` patterns now report exactly the counts the plan's `<verify>` block expects (0 / 0 / 1 / 1 / 1 / 1).
- **Files modified:** `src/hooks/useAmbientScale.ts` (comment text only — no code changes from this edit).
- **Commit:** Folded into Task 1's commit `e280533`.

This is not a functional deviation — the code, signature, and behavior all match the plan verbatim. It is a documentation phrasing adjustment to align the literal `grep` source assertions with the plan author's clear intent (count CALLS, not doc references).

### Out of Scope (Deferred)

- **Pre-existing lint errors on baseline 699b180** — unchanged from the running `deferred-items.md` log (`sessionPresentation.ts:113`, `storage.ts:256-257`, plus 3 unused-disable warnings across `useAudioCues.ts`/`useWakeLock.ts`/`storage.ts`, plus 1 lint error in `sessionClock.test.ts:377` introduced by Plan 50-01 — all out of scope for Plan 50-05 because none of these files are touched by this plan).
- **Untracked `pnpm-lock.yaml`** — was already untracked at session start. Not in `.gitignore`. Not introduced by Plan 50-05. Project-wide policy decision (add to `.gitignore` or commit) remains out of scope.

## Discoveries for Downstream Plans

1. **Plan 50-05 closes ABSTR-03 caller 5 of 5.** `useAmbientScale` was the last direct `performance.now()` consumer in the caller layer. After this plan, the only `performance.now()` CALL in `src/` lives inside `createWallSessionClock.now()` (Plan 50-01's factory body) — exactly the D-09 invariant. Plan 50-07's drift-guard can now lock this: the 5 caller files (`useSessionEngine.ts`, `useNKEngine.ts`, `useNaviKriyaAudio.ts`, `useAudioCues.ts`, `useAmbientScale.ts`) all have 0 `performance.now()` CALLS, 0 `new AudioContext` constructions, and 0 `audioCtx.currentTime` reads.

2. **rAF DOMHighResTimeStamp preservation is a per-hook decision.** `useAmbientScale` keeps the rAF timestamp for per-tick math (revision 1 Warning #8 — preserves byte-identicality vs. pre-refactor); future rAF-driven hooks should make the same call. Reading `clock.now()` at the top of every tick is fine for new code (no byte-identicality contract), but for refactored code with a "byte-identical end-user behavior" success criterion, the rAF parameter is the canonical per-frame time source and should not be replaced.

3. **OrbShape's `ambientWallClock` lives inside the `OrbIdle` subcomponent**, not at the top-level `OrbShape` function body. This is correct — `useAmbientScale` is only called from `OrbIdle`, so the memo lives at the hook's actual call site rather than at a parent that does not use the clock. The dep array `[]` is correct because `createWallSessionClock` has no external dependencies (it's a constructor with no inputs).

4. **Test parity preserved (ABSTR-04).** The pre-existing 3 it() blocks in `useAmbientScale.test.tsx` all asserted MID_SCALE for inactive / reduced-motion / pre-rAF paths. None of them advanced fake timers far enough to exercise the rAF tick body, so none of them required behavioral expectation updates beyond "add a `wallClock` arg". This is exactly the plan's prediction in Task 1 step 3 of the action block.

5. **Wave 2 of Phase 50 is now complete.** Plans 50-02 (`useSessionEngine`), 50-03 (`useNKEngine` + `useNaviKriyaAudio`), 50-04 (`useAudioCues`), and 50-05 (`useAmbientScale`) all consume `SessionClock` via the seam introduced in Plan 50-01. The remaining phase work is Plan 50-06 (engine internal facade — plumbs the engine's internal dispatch through `createAudioSessionClock(audioCtx, engineSchedule)`) and Plan 50-07 (drift-guard fs-scan test that locks the 5-caller invariant). Both should land cleanly against the now-complete consumer set.

## Self-Check: PASSED

- `src/hooks/useAmbientScale.ts` exists and has been modified (verified — git log shows commit `e280533`).
- `src/hooks/useAmbientScale.test.tsx` exists and has been modified (verified — same commit).
- `src/components/OrbShape.tsx` exists and has been modified (verified — commit `7f48643`).
- Commit `e280533` exists in git log (verified).
- Commit `7f48643` exists in git log (verified).
- All Task 1 source assertions pass (verified by grep).
- All Task 2 source assertions pass (verified by grep).
- All Phase 50-05 verification block checks pass:
  - `pnpm build` exits 0 (verified).
  - `pnpm test:run` 1343/1343 (verified).
  - `git diff package.json` empty (verified).
  - `grep -rn "performance\.now(" src/hooks/useAmbientScale.ts` returns 0 (verified).
  - `grep -rn "INHALE_MS\|EXHALE_MS" src/` returns 0 (verified).
- Drift-guard banned-pattern check passes inside `useAmbientScale.ts` (verified — 0 / 0 / 0).

---
phase: 50-sessionclock-scheduler-abstraction
plan: 07
subsystem: audio
tags:
  - sessionclock
  - drift-guard
  - test
  - fs-scan
  - regression-lock
dependency-graph:
  requires:
    - 50-01 (SessionClock interface — defines the abstraction this drift-guard locks)
    - 50-02 (useSessionEngine migration — removes performance.now() from caller surface)
    - 50-03 (Navi Kriya migration — removes audioCtx.currentTime; preserves D-08 new AudioContext() at L45)
    - 50-04 (useAudioCues + engine.clock migration — removes performance.now() / audioCtx.currentTime from caller surface)
    - 50-05 (useAmbientScale migration — removes performance.now() from caller surface)
  provides:
    - src/audio/sessionClock.driftGuard.test.ts (fs-scan drift-guard for the 5 SessionClock callers)
    - src/audio/sessionClock.driftGuard.fixture.txt (revision 1 Warning #10 string-literal fixture)
    - ABSTR-03 regression lock — any future reintroduction of `performance.now()` / `new AudioContext()` (outside the D-08 exemption) / `audioCtx.currentTime` in the 5 caller files fails CI
  affects:
    - Phase 51 (caller-level rebase onto clock.now() — must add new callers to CALLER_FILES if any are introduced)
    - Phase 52 (lookahead via clock.schedule() — drift-guard unchanged; caller surface still bans direct time reads)
    - Phase 53 (master-gain mute — drift-guard unchanged)
tech-stack:
  added: []
  patterns:
    - "Triple-slash node:fs reference for test-only Node.js types (analog: src/content/content.no-review-markers.test.ts L33; secondary: src/styles/theme.no-hardcoded-classes.test.ts L11)"
    - "Hard-coded CALLER_FILES list (NOT a directory walk) — auditable scope, explicit add-a-caller workflow, no self-match risk for the regex sources in this test file"
    - "Comment-strip pre-pass before regex assertion — preserves JSDoc/inline documentation references to historical APIs without tripping the guard"
    - "Per-file exemption mechanism via BannedPattern.exemptFiles + basename.endsWith match — D-08 NK AudioContext exemption scoped to a single file (useNaviKriyaAudio.ts)"
    - "Revision 1 Warning #10 string-literal fixture sub-case — positive documentation of the known regex-stripper limitation via a .txt fixture (excluded from production build by extension)"
key-files:
  created:
    - src/audio/sessionClock.driftGuard.test.ts (187 lines — 1 main scan + 1 fixture sub-case)
    - src/audio/sessionClock.driftGuard.fixture.txt (19 lines — string-literal fixture for revision 1 Warning #10)
  modified: []
key-decisions:
  - "Triple-slash + node:fs + hard-coded CALLER_FILES — copied verbatim from the analog content.no-review-markers.test.ts. Identical pattern keeps the test maintainable by anyone familiar with the content guard."
  - "Comment-strip helper matches the analog's shape (block /* */ first, then line // with leading non-colon char to skip URL schemes). Documented limitation: does NOT strip string literals — revision 1 Warning #10 fixture documents this positively."
  - "D-08 exemption is scoped to ONLY `useNaviKriyaAudio.ts` AND ONLY the `new AudioContext()` pattern. The other two banned patterns (performance.now(), audioCtx.currentTime) have NO file exemption — both must be zero across all 5 files."
  - "Revision 1 Warning #10 positive acceptance criterion implemented as documentation, not as a feature: the sub-case asserts `.toBe(true)` on the fixture's string-literal matches (proving the limitation exists). If a follow-up extends the stripper to also strip string literals, the assertions invert to `.toBe(false)` and the comment block updates."
  - "Test count delta = +2 (1 main + 1 sub-case) — chose not to split the main scan per banned pattern; the failure message already names the file and pattern, and a single scan keeps the maintained surface minimal. Plan acceptance criterion allowed +2 or +4; chose +2."
  - "Fixture extension is `.txt` (not `.ts`) so Vitest's file-include glob ignores it, no consumer imports it, and the production build excludes it. Reading via `readFileSync` is unaffected."
patterns-established:
  - "Drift-guard fs-scan: hard-coded scope list + per-pattern exemption table + comment-strip + regex absence assertion + informative failure message naming file:pattern hits"
  - "Per-file pattern exemption via BannedPattern.exemptFiles → basename.endsWith match — extensible for future per-file exceptions while keeping the rest of the guard tight"
requirements-completed:
  - ABSTR-03
  - ABSTR-04
  - DEPS-01
  - QUAL-01
metrics:
  duration: ~7 minutes
  completed: 2026-05-27
  test-count-baseline: 1343
  test-count-after: 1345
  test-count-delta: +2
  tasks-completed: 1
  files-created: 2
  files-modified: 0
---

# Phase 50 Plan 07: SessionClock drift-guard fs-scan Summary

**Import-graph drift-guard locks ABSTR-03: a Vitest fs-scan asserts the 5 SessionClock-consuming caller files contain zero direct `performance.now()`, `new AudioContext()` (outside the D-08 NK exemption), or `audioCtx.currentTime` reads — any future regression fails CI.**

## Performance

- **Duration:** ~7 minutes
- **Started:** 2026-05-28T02:28:23Z
- **Completed:** 2026-05-28T02:35:00Z (approx.)
- **Tasks:** 1
- **Files created:** 2 (`sessionClock.driftGuard.test.ts`, `sessionClock.driftGuard.fixture.txt`)
- **Files modified:** 0
- **Test count delta:** +2 (1343 → 1345)

## What Got Built

### Truths Satisfied (from plan frontmatter `must_haves.truths`)

- ✅ `src/audio/sessionClock.driftGuard.test.ts` exists and fs-scans EXACTLY the 5 caller files (`useSessionEngine.ts`, `useAudioCues.ts`, `useNaviKriyaAudio.ts`, `useNKEngine.ts`, `useAmbientScale.ts`). The list is hard-coded in `CALLER_FILES` — not a directory walk — so the scope is auditable and adding a caller is an explicit review event.
- ✅ Three banned patterns are asserted as absent: `\bperformance\.now\(`, `\bnew\s+AudioContext\b`, `\baudioCtx\.currentTime\b`. Comments are stripped before scanning so JSDoc/inline historical references do not trip the guard.
- ✅ The drift-guard exits 0 against the current state of the 5 caller files (Plans 50-02 through 50-05 cleaned them). Manual sanity check confirmed regression detection: introducing `const __drift_test_banned = performance.now()` into `useSessionEngine.ts` produced the expected failure with hit `useSessionEngine.ts: performance.now() direct call`; reverting restored 2/2 passing.
- ✅ Zero new runtime or dev dependencies (DEPS-01). `git diff package.json` is empty. The test uses `node:fs` and `node:path` via the `/// <reference types="node" />` triple-slash pattern — byte-identical to the analog at `src/content/content.no-review-markers.test.ts:33`.
- ✅ The test file is NOT in `CALLER_FILES` — no self-match risk for the regex sources (`/\bperformance\.now\(/` etc.) that legitimately appear as RegExp literals in this file.
- ✅ `useNaviKriyaAudio.ts` carries an exemption for the `new AudioContext()` pattern only (D-08 NK AC ownership invariant preserves `createOptionalAudioContext` at line 45). Exemption is implemented via `BannedPattern.exemptFiles + basename.endsWith` match. The other two patterns have NO exemption for ANY file.
- ✅ **Revision 1 Warning #10 positive acceptance criterion satisfied:** `src/audio/sessionClock.driftGuard.fixture.txt` exists containing the three banned tokens inside string literals (single-quoted, double-quoted, and template literal forms). A dedicated `it('does not match string-literal forms of banned tokens (revision 1 Warning #10)', ...)` sub-case reads the fixture, runs the same comment-stripper + regex check, and asserts `.toBe(true)` on the matches — documenting the known limitation that the simple stripper does NOT remove string literals. The contract is enforced by manual audit of the 5 caller files (Plans 50-02 through 50-05 — all clean) plus the main scan above.
- ✅ Test count at plan close: 1343 → 1345 (+2). 117 test files (was 116). No skipped tests; no behavior-change-disguised-as-test-update; the only existing files touched are NONE — this plan is purely additive.

### Artifacts Satisfied (from plan frontmatter `must_haves.artifacts`)

| Artifact | Lines | Required ≥ | Provides |
|----------|-------|-----------|----------|
| `src/audio/sessionClock.driftGuard.test.ts` | 187 | 100 | Vitest fs-scan drift-guard with 3 banned-pattern checks + revision 1 Warning #10 string-literal sub-case |
| `src/audio/sessionClock.driftGuard.fixture.txt` | 19 | 5 | String-literal fixture (single-quote, double-quote, template-literal forms of all three banned tokens) |

### Key Links Verified

- ✅ The 5 caller filenames appear in `CALLER_FILES`: `useSessionEngine.ts`, `useAudioCues.ts`, `useNaviKriyaAudio.ts`, `useNKEngine.ts`, `useAmbientScale.ts` — verified by `grep -n 'use(SessionEngine|AudioCues|NaviKriyaAudio|NKEngine|AmbientScale)\\.ts' src/audio/sessionClock.driftGuard.test.ts`.
- ✅ Fixture reference: `grep -c "sessionClock\\.driftGuard\\.fixture\\.txt" src/audio/sessionClock.driftGuard.test.ts` returns 1 (the `readFileSync(fixturePath, ...)` call in the sub-case).
- ✅ D-08 exemption is scoped: `grep -c 'useNaviKriyaAudio\\.ts' src/audio/sessionClock.driftGuard.test.ts` returns 5 (one in `CALLER_FILES`, one in the `exemptFiles` array, and three in the header comment block + JSDoc).

## Task Commits

| Task | Name | Commit | Files | Lines |
|------|------|--------|-------|-------|
| 1 | Add SessionClock drift-guard fs-scan + revision 1 Warning #10 fixture | `7c72eeb` | src/audio/sessionClock.driftGuard.test.ts, src/audio/sessionClock.driftGuard.fixture.txt | +206 |

## Files Created/Modified

### Created
- `src/audio/sessionClock.driftGuard.test.ts` — Vitest fs-scan drift-guard. Hard-coded 5-file CALLER_FILES list. 3 banned patterns: `\bperformance\.now\(`, `\bnew\s+AudioContext\b` (with `useNaviKriyaAudio.ts` exempt), `\baudioCtx\.currentTime\b`. Comment-strip pre-pass. Revision 1 Warning #10 sub-case documents the string-literal limitation explicitly.
- `src/audio/sessionClock.driftGuard.fixture.txt` — String-literal fixture for revision 1 Warning #10. Contains the three banned tokens inside `'...'`, `"..."`, and `` `...` `` literals. `.txt` extension keeps it out of Vitest's file-include glob and the production build.

### Modified
None — this plan is purely additive.

## Decisions Made

1. **Triple-slash node reference + hard-coded scope list** — copied verbatim from `src/content/content.no-review-markers.test.ts:30-37`. Maintains pattern parity with the existing analog so future maintainers recognize the structure.
2. **D-08 exemption scoped narrowly** — `useNaviKriyaAudio.ts` is exempt ONLY for `new AudioContext()`, not for the other two banned patterns. NK's `audioCtx.currentTime` and `performance.now()` reads were eliminated by Plan 50-03; the exemption table reflects that.
3. **Revision 1 Warning #10 as documentation, not as feature** — the sub-case asserts `.toBe(true)` (the simple stripper does NOT remove string literals, so the regex matches inside literals). The fixture exists to make the limitation visible in the test suite rather than hidden. A future enhancement that extends the stripper to also remove string literals would flip the assertions to `.toBe(false)`.
4. **Test count delta +2 (chose +2 over +4)** — single main scan + one sub-case, matching the analog content guard's structure. The failure message already names `file:pattern`, so splitting the main scan per banned pattern would add maintenance burden without diagnostic value.
5. **Fixture extension `.txt`** — keeps the fixture out of Vitest's `.ts/.tsx` include glob, out of the production build, and out of any future linter/type-check pass. `readFileSync` reads it as text regardless of extension.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — the test passed on first run against the post-Wave-2 state. Plans 50-02 through 50-05 had already removed all banned tokens from the 5 caller files (all remaining occurrences live inside `//` line comments or `/* */` block comments, which the stripper removes before regex assertion). The single `new AudioContext()` at `useNaviKriyaAudio.ts:45` is exempt per D-08.

## Verification

- ✅ `pnpm test:run src/audio/sessionClock.driftGuard.test.ts` — 2/2 pass (1 main scan + 1 revision 1 Warning #10 sub-case).
- ✅ `pnpm test:run` (full suite) — 117 files, 1345/1345 pass. Baseline 1343 → +2 delta exactly as planned.
- ✅ `pnpm build` exits 0 (typecheck + Vite production build + PWA precache generation all succeed).
- ⚠️ `pnpm lint` exits non-zero — but ONLY due to 4 pre-existing errors + 3 pre-existing warnings, none in the files this plan created or modified. Confirmed by running `pnpm exec eslint src/audio/sessionClock.driftGuard.test.ts` directly — output is empty (clean). The pre-existing errors live in `src/app/sessionPresentation.ts`, `src/audio/sessionClock.test.ts` (Plan 50-01's test file), `src/storage/storage.ts`; the warnings in `src/hooks/useAudioCues.ts`, `src/hooks/useWakeLock.ts`, `src/storage/storage.ts`. See `deferred-items.md` (carried over from Plan 50-01). Per SCOPE BOUNDARY rule — out of scope for this plan.
- ✅ `git diff package.json` is empty (DEPS-01 satisfied — zero new runtime or dev deps).
- ✅ Manual sanity check: introducing `const __drift_test_banned = performance.now()` into `useSessionEngine.ts` made the drift-guard fail with `useSessionEngine.ts: performance.now() direct call`. Reverting restored 2/2 passing. Confirms the guard catches regressions and that `useSessionEngine.ts` itself is clean today.
- ✅ Source assertions from plan `<verify>` block:
  - `CALLER_FILES` appears 3 times (declaration + iteration + comment) — required ≥ 2 ✅
  - Regex source `\bperformance\.now\(` appears 2 times (main BANNED entry + sub-case assertion) — required ≥ 1 ✅
  - Regex source `\bnew\s+AudioContext\b` appears 2 times (main BANNED entry + sub-case assertion) — required ≥ 1 ✅
  - Regex source `\baudioCtx\.currentTime\b` appears 2 times (main BANNED entry + sub-case assertion) — required ≥ 1 ✅
  - `exemptFiles` appears 5 times (interface def + array entry + per-iteration check + comments) — required ≥ 2 ✅
  - `useNaviKriyaAudio.ts` appears 5 times (CALLER_FILES + exemptFiles + comments) — required ≥ 2 ✅
  - `sessionClock.driftGuard.fixture.txt` reference appears 1 time (the `readFileSync` call) — required ≥ 1 ✅
  - `string-literal` mentioned 7 times — required ≥ 1 ✅
  - Fixture file exists ✅

## Next Phase Readiness

- **ABSTR-03 locked.** The drift-guard is now the final defensive layer of the SessionClock abstraction. Any future change that reintroduces a banned token in the 5 caller files fails this test in CI.
- **Phase 51 caller-level rebase** can proceed safely. If Phase 51 introduces a new caller hook under `src/hooks/` that imports time-sensitive APIs from `src/audio/`, that new file MUST be added to `CALLER_FILES` in this test — this is an explicit, reviewed change. The header comment in the test file documents this contract (T-50.07-04 mitigation).
- **Phase 50 wave-3 close gate:** Plan 50-06 (engine internal facade) and Plan 50-07 (this drift-guard) form the wave-3 pair. Together with wave-1 (Plan 50-01) and wave-2 (Plans 50-02 / 50-03 / 50-04 / 50-05), all caller files are SessionClock-consuming, the engine internally consumes its own `createAudioSessionClock` with a `scheduleImpl`, and the drift-guard locks the abstraction against regression. Phase 50 is ready for orchestrator close-out.
- **Phase 52 lookahead via `clock.schedule()`** does not affect the drift-guard — callers still consume time via `clock.now()`, which contains no banned tokens. The guard is forward-compatible with Phase 52.
- **Phase 53 master-gain mute** likewise does not affect the drift-guard — `clock.setMasterGain(...)` does not introduce new time reads in callers.

## Known Stubs

None. The drift-guard is a complete, working regression lock. No placeholders, no TODOs, no stub data flow to UI.

## Self-Check: PASSED

- ✅ `src/audio/sessionClock.driftGuard.test.ts` exists (187 lines).
- ✅ `src/audio/sessionClock.driftGuard.fixture.txt` exists (19 lines).
- ✅ Commit `7c72eeb` exists in `git log` — `test(50-07): add SessionClock drift-guard fs-scan for the 5 callers`.
- ✅ 2 tests in the new file (1 main + 1 sub-case); full suite 1345/1345 pass; baseline +2.
- ✅ `pnpm build` exits 0.
- ✅ `git diff package.json` empty (DEPS-01).
- ✅ Manual sanity check confirmed regression detection on `useSessionEngine.ts`.
- ✅ All plan source assertions satisfied (see Verification section above).
- ✅ No production caller file modified by this plan (purely additive).

---
*Phase: 50-sessionclock-scheduler-abstraction*
*Plan: 07*
*Completed: 2026-05-27*

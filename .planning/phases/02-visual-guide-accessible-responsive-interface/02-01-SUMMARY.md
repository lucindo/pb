---
phase: 02-visual-guide-accessible-responsive-interface
plan: 01
subsystem: testing
tags: [react, vitest, jsdom, reduced-motion, htmldialogelement, matchmedia, test-infrastructure, hooks]

requires:
  - phase: 01-configurable-session-timing
    provides: vitest+jsdom test harness, useSessionEngine addEventListener+cleanup pattern, single-line vitest.setup.ts
provides:
  - jsdom polyfills for HTMLDialogElement.prototype.{show, showModal, close} (Plan 04 dialog modal can now be tested)
  - jsdom polyfill for window.matchMedia (any matchMedia-driven hook can now mount in tests)
  - usePrefersReducedMotion(): boolean — reactive primitive bound to (prefers-reduced-motion: reduce)
  - +4 unit tests (49 total, was 45)
affects: [02-02-orb, 02-04-dialog, 02-03, plan-02-breathing-shape, plan-04-end-session-modal]

tech-stack:
  added: []
  patterns:
    - "jsdom polyfill block in vitest.setup.ts (gated by feature-detection guards so production browsers no-op)"
    - "matchMedia subscription hook: lazy useState initializer + useEffect with addEventListener('change') and cleanup — mirrors useSessionEngine.ts addEventListener+cleanup pattern"
    - "Modern addEventListener API only (no deprecated addListener/removeListener)"

key-files:
  created:
    - src/hooks/usePrefersReducedMotion.ts
    - src/hooks/usePrefersReducedMotion.test.ts
  modified:
    - vitest.setup.ts

key-decisions:
  - "Polyfill HTMLDialogElement and matchMedia in vitest.setup.ts (zero deps, feature-gated) rather than per-test mocks — chosen because both Plan 02 and Plan 04 need the gaps closed and per-test boilerplate would multiply"
  - "matchMedia polyfill defaults to matches:false (motion ALLOWED) so existing Phase 1 tests are unaffected; reduced-motion-specific tests opt in via vi.spyOn(window, 'matchMedia')"
  - "Used useState+useEffect for the hook rather than useSyncExternalStore — simpler, mirrors the project's existing useSessionEngine pattern, and RESEARCH §Pattern 2 explicitly recommends it"
  - "Lazy useState initializer (function form) avoids calling matchMedia at module-eval time, keeping the hook safe in any environment"

patterns-established:
  - "Pattern 1: jsdom polyfills live in vitest.setup.ts behind typeof+! guards so they no-op in any browser that natively implements the API"
  - "Pattern 2: matchMedia-subscription hooks mirror useSessionEngine's addEventListener+cleanup shape — useEffect returns a cleanup that removes the listener"
  - "Pattern 3: TDD RED commit precedes the GREEN implementation commit; RED's failure mode is 'Failed to resolve import' which proves the test cannot pass spuriously"

requirements-completed: []  # GUID-03 is foundation-only here; full delivery happens in Plan 02-02 (BreathingShape) which consumes this hook. Do NOT mark GUID-03 complete from this plan.

duration: ~8min
completed: 2026-05-09
---

# Phase 02 Plan 01: Reduced-Motion Foundation & jsdom Polyfills Summary

**vitest.setup.ts now polyfills HTMLDialogElement.{show,showModal,close} and window.matchMedia for jsdom 29.1.1; usePrefersReducedMotion(): boolean is exported with 4 unit tests covering default-false, initial-true, addEventListener/cleanup, and reactive change.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-09T10:21:23Z
- **Completed:** 2026-05-09T10:23:30Z
- **Tasks:** 2
- **Files modified:** 3 (1 modified, 2 created)
- **Test count delta:** +4 (45 → 49)
- **Suite runtime:** 1.40s (well within VALIDATION.md's 5–6s budget)

## Accomplishments

- Closed both jsdom 29.1.1 testing gaps (HTMLDialogElement no-op methods + missing matchMedia) in a single setup file with feature-detection guards that no-op in real browsers.
- Shipped `usePrefersReducedMotion(): boolean` — the only reactive OS-preference primitive Phase 02 needs; Plans 02 (orb) and 04 (modal) can now begin in parallel as Wave 2.
- TDD RED → GREEN cycle executed cleanly; RED commit proves the test would fail without the implementation.
- Phase 1's 45-test suite remained untouched; no Phase 1 regressions, no new dependencies, strict tsc still passes.

## Task Commits

Each task was committed atomically (Task 2 split into RED + GREEN per TDD discipline):

1. **Task 1: Polyfill HTMLDialogElement and matchMedia in vitest setup** — `df60521` (test)
2. **Task 2 RED: Failing test for usePrefersReducedMotion** — `15388f3` (test)
3. **Task 2 GREEN: Implement usePrefersReducedMotion hook** — `067c5de` (feat)

_Plan metadata commit follows this SUMMARY._

## Files Created/Modified

- `vitest.setup.ts` — Extended from a single-line jest-dom import to also polyfill HTMLDialogElement.prototype.{show,showModal,close} and window.matchMedia. Both polyfill blocks are gated by `typeof X !== 'undefined'` and `if (!X.prototype.method)` so they are pure no-ops in any environment that natively implements them.
- `src/hooks/usePrefersReducedMotion.ts` — New 28-line hook exporting `usePrefersReducedMotion(): boolean`. Lazy useState initializer reads `(prefers-reduced-motion: reduce).matches` at mount; useEffect subscribes via `addEventListener('change', ...)` and removes the listener on unmount. SSR/missing-matchMedia guards keep it crash-free in any environment.
- `src/hooks/usePrefersReducedMotion.test.ts` — 4 unit tests: (a) returns false by default, (b) returns true when matchMedia.matches is true at mount, (c) subscribes/cleans up via addEventListener('change'), (d) re-renders to true when the captured listener fires with matches:true.

## Decisions Made

- **Polyfills live in vitest.setup.ts (not per-test mocks).** Both Plan 02 and Plan 04 will need them across many test files; centralizing avoids per-test boilerplate and matches the project's existing convention (`@testing-library/jest-dom/vitest` is already imported here).
- **matchMedia polyfill defaults to `matches: false`.** This makes "motion ALLOWED" the default test semantics, which aligns with Phase 1's pre-existing tests (none of which interact with motion) and lets reduced-motion-specific tests opt in via `vi.spyOn(window, 'matchMedia')`.
- **`useState + useEffect` over `useSyncExternalStore`.** Simpler shape, matches the project's existing `useSessionEngine` pattern (addEventListener subscription + useEffect cleanup), and RESEARCH §Pattern 2 explicitly recommends it for this hook.
- **Lazy useState initializer (function form).** Avoids invoking `matchMedia` at module-evaluation time before the polyfill or jsdom is ready in some environments.
- **Modern `addEventListener` only.** No deprecated `addListener`/`removeListener` — D-05 implicitly accepts the modern-browser baseline (the rest of the app already does).

## Deviations from Plan

None — plan executed exactly as written. RED test failed as expected ("Failed to resolve import"), GREEN passed all 4 tests on first run, and the full suite (49/49) plus strict tsc remained clean. No auto-fixes triggered, no architectural decisions surfaced, and no out-of-scope issues were observed.

## Issues Encountered

None.

## Threat Model Compliance

All four `mitigate` dispositions in the plan's threat register are satisfied by the shipped code:

- **T-02-02 (polyfill overwriting real browser implementation):** Each polyfill is gated by `if (!HTMLDialogElement.prototype.X)` and `if (!window.matchMedia)`. No-op in any browser that natively implements the API.
- **T-02-04 (hook subscription leak):** `useEffect` returns a cleanup function that calls `mql.removeEventListener('change', onChange)`. Asserted by Test 3 of `usePrefersReducedMotion.test.ts` ("subscribes via addEventListener … and cleans up on unmount").
- **T-02-05 (test code overriding `window.matchMedia` outside its scope):** Hook test file declares `afterEach(() => vi.restoreAllMocks())`, matching Phase 1's pattern in `App.settings.test.tsx`.
- **T-02-01 (polyfill leaking into production bundle):** Accepted — `vitest.setup.ts` is referenced only by `vite.config.ts test.setupFiles` and not part of the production build. No code change needed.

## Self-Check

Verifying claims before returning to orchestrator:

- `vitest.setup.ts` modified: FOUND
- `src/hooks/usePrefersReducedMotion.ts` created: FOUND
- `src/hooks/usePrefersReducedMotion.test.ts` created: FOUND
- Commit `df60521` (Task 1, test): FOUND
- Commit `15388f3` (Task 2 RED): FOUND
- Commit `067c5de` (Task 2 GREEN): FOUND
- Full test suite: 49/49 passed
- `npx tsc --noEmit`: clean
- No new package.json dependencies: confirmed (`git diff package.json` returns empty)
- No Phase 1 test files modified: confirmed (`git diff main -- src/app/App.session.test.tsx src/app/App.settings.test.tsx` returns empty)

**Self-Check: PASSED**

## TDD Gate Compliance

- RED gate: `15388f3` (`test(02-01): add failing test for usePrefersReducedMotion hook`) — verified failing with "Failed to resolve import" before GREEN.
- GREEN gate: `067c5de` (`feat(02-01): implement usePrefersReducedMotion hook`) — all 4 tests pass.
- REFACTOR gate: not needed; the hook is at minimum viable shape (28 lines including SSR guards).

## Next Phase Readiness

- **Plan 02-02 (BreathingShape orb):** UNBLOCKED. Can `import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'` and branch the scale formula based on the boolean.
- **Plan 02-04 (End-session dialog modal):** UNBLOCKED. Can call `dialog.showModal()` / `dialog.close()` in tests and assert `dialog.open` flips correctly; `close` event dispatches automatically.
- **Plans 02 and 03 can now begin in parallel as Wave 2** per the plan's `<done>` declaration.
- No blockers, no carry-over concerns, no user setup required.

---
*Phase: 02-visual-guide-accessible-responsive-interface*
*Plan: 01*
*Completed: 2026-05-09*

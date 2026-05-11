---
phase: 07-strict-type-lint-baseline
plan: "04"
subsystem: build-toolchain
tags: [eslint, react-hooks, typescript, lint, BUILD-03]

# Dependency graph
requires:
  - phase: 07-strict-type-lint-baseline/07-01
    provides: strictNullChecks + noUncheckedIndexedAccess baseline
  - phase: 07-strict-type-lint-baseline/07-02
    provides: strictTypeChecked ESLint preset + 48 production rule fixes
  - phase: 07-strict-type-lint-baseline/07-03
    provides: 16 production singletons + 162 test-file errors + stale App.tsx:411 disable removed
provides:
  - react-hooks/exhaustive-deps enforced at error level via eslint.config.js explicit override
  - D-04 audit complete — every react-hooks/* eslint-disable in src/ has // Reason: annotation
  - BUILD-03 requirement satisfied
  - Phase 7 milestone complete (BUILD-01 Plan 01 + BUILD-02 Plans 02+03 + BUILD-03 this plan)
affects:
  - phases 8-12 (all subsequent v1.0.1 phases lint under exhaustive-deps at error level)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-04 // Reason: annotation policy: every react-hooks/* eslint-disable preceded by a // Reason: line naming the invariant"
    - "subscribe-and-reflect pattern: local state mirrors external owned state via useEffect; annotated with specific invariant reference"

key-files:
  created: []
  modified:
    - eslint.config.js
    - src/app/App.tsx
    - src/hooks/usePrefersReducedMotion.ts

key-decisions:
  - "BUILD-03: exhaustive-deps override positioned AFTER the ...reactHooks.configs.recommended.rules spread (later-wins ordering) so it overrides the recommended default of warn"
  - "D-04 annotation text is exact per PATTERNS.md — grep-stable canonical justification text used project-wide for same pattern"
  - "usePrefersReducedMotion.ts already had its // Reason: annotation in place from Plan 03 work — no change needed (verified, not re-added)"

patterns-established:
  - "exhaustive-deps at error level: all future phases must justify any disable with // Reason: annotation per D-04"
  - "subscribe-and-reflect: useEffect that mirrors external state to local state uses annotated disable, not a refactor"

requirements-completed:
  - BUILD-03

# Metrics
duration: 5min
completed: "2026-05-11"
---

# Phase 07 Plan 04: react-hooks BUILD-03 Enforcement Summary

**react-hooks/exhaustive-deps explicitly overridden to error level in eslint.config.js; all three surviving set-state-in-effect disables in src/ annotated with D-04 // Reason: policy lines; Phase 7 milestone complete**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-11T15:22:00Z
- **Completed:** 2026-05-11T15:25:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `'react-hooks/exhaustive-deps': 'error'` to eslint.config.js rules block, positioned after `...reactHooks.configs.recommended.rules` spread per later-wins Pitfall 6 ordering; `--print-config` confirms severity 2 (error)
- Added `// Reason: subscribe-and-reflect ...` annotation above each of App.tsx's two surviving set-state-in-effect disables (lines 205 and 392)
- usePrefersReducedMotion.ts already carried its `// Reason: re-seed from live MediaQueryList...` annotation from Plan 03 work — verified intact, no change needed
- D-04 audit complete: all three react-hooks/* disables in src/ now have a `// Reason:` line on the immediately preceding line
- Phase 7 milestone complete: BUILD-01 (Plan 01) + BUILD-02 (Plans 02+03) + BUILD-03 (this plan) all satisfied

## Task Commits

Each task was committed atomically:

1. **Task 1: Add react-hooks/exhaustive-deps error override to eslint.config.js** - `ff9ae65` (feat)
2. **Task 2: Add // Reason: annotations to surviving react-hooks disables per D-04** - `8c95d24` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `eslint.config.js` — added `'react-hooks/exhaustive-deps': 'error'` override between recommended.rules spread and react-refresh entry
- `src/app/App.tsx` — added two `// Reason:` annotation lines (one above line 206 disable, one above line 392 disable)
- `src/hooks/usePrefersReducedMotion.ts` — no changes (annotation was already in place from Plan 03)

## Decisions Made

- Positioned the exhaustive-deps override AFTER the spread (not before) — mandatory per later-wins ESLint flat-config ordering (Pitfall 6). Any override placed before the spread would be silently overridden by the spread's own `warn` default.
- Used exact D-04 canonical annotation text from PATTERNS.md for all three sites — ensures grep stability and consistent justification phrasing project-wide.
- usePrefersReducedMotion.ts deviation: file was already compliant from Plan 03 — no duplicate annotation added. Deviation from plan description is a no-op in the right direction.

## Deviations from Plan

### Auto-fixed Issues

None.

### Observations

- Task 2 description stated three edits (A, B, C) but `usePrefersReducedMotion.ts` (Edit C) was already compliant — `// Reason:` annotation and `// eslint-disable-next-line react-hooks/set-state-in-effect` were both present from Plan 03 Task 1 Pass A. This is the expected state per the plan's must_haves truths. Only two actual source edits were required (App.tsx lines 205 and 392).

---

**Total deviations:** 0 auto-fixed
**Impact on plan:** Plan executed as specified. The one non-deviation (usePrefersReducedMotion.ts already annotated) was the correct desired state.

## Disable Inventory (Final State)

Every surviving `// eslint-disable-next-line react-hooks/*` comment in `src/`:

| File | Disable Line | Rule | // Reason: Text |
|------|-------------|------|-----------------|
| `src/app/App.tsx` | 206 | `react-hooks/set-state-in-effect` | "subscribe-and-reflect — endDialogOpen mirrors external session.status; setting local state from this trigger effect is the documented React pattern for 'subscribe + reflect'." |
| `src/app/App.tsx` | 392 | `react-hooks/set-state-in-effect` | "subscribe-and-reflect — appPhase resets to 'idle' when session leaves running; this effect is the single write site per D-16 Phase 4 invariant." |
| `src/hooks/usePrefersReducedMotion.ts` | 27 | `react-hooks/set-state-in-effect` | "re-seed from live MediaQueryList on mount to close the stale-initial-state window; subsequent updates come from the change listener (MDN canonical pattern)." |

Total: 3 disables (2 in App.tsx, 1 in usePrefersReducedMotion.ts)

## Verification Results

| Check | Result |
|-------|--------|
| `npx eslint --print-config src/app/App.tsx` → `react-hooks/exhaustive-deps` | `2` (error) |
| `npm run lint` | Exit 0, 0 problems |
| `npx tsc --noEmit -p tsconfig.app.json` | Exit 0 |
| `npx tsc --noEmit -p tsconfig.node.json` | Exit 0 |
| `npm run build` | Exit 0 |
| `npm run test -- --run` | **363 passed** (363 total) |
| `grep -c set-state-in-effect src/app/App.tsx` | `2` |
| `grep -c set-state-in-effect src/hooks/usePrefersReducedMotion.ts` | `1` |
| D-04 node-script scan (every react-hooks disable has // Reason:) | All OK |

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 7 (07-strict-type-lint-baseline) is now complete:
- **BUILD-01** (Plan 01): `strict` + `noUncheckedIndexedAccess` + `noPropertyAccessFromIndexSignature` enabled in both tsconfigs
- **BUILD-02** (Plans 02+03): `strictTypeChecked` ESLint preset + all production + test-file TypeScript/lint errors resolved
- **BUILD-03** (Plan 04, this plan): `react-hooks/exhaustive-deps` at error level; every surviving react-hooks disable annotated per D-04

**Ready for Phases 8-12:** All v1.0.1 phases (assets, storage, audio, wake-lock, hooks, domain, UI, a11y, content, hygiene fixes) now execute on a strict TypeScript + strictTypeChecked ESLint + exhaustive-deps-at-error baseline.

## Threat Flags

None — this plan modifies one build toolchain config (one rule severity entry) and adds three comment-only annotation lines. No new runtime surface, no new auth/data flows, no schema changes.

---
*Phase: 07-strict-type-lint-baseline*
*Completed: 2026-05-11*

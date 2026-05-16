---
phase: 28-phone-install-banner
plan: "02"
subsystem: hooks, browser-apis
tags: [hooks, pwa, tdd, install-prompt, phone-detection, matchMedia]
dependency_graph:
  requires: [useBeforeInstallPrompt, useIsStandaloneOrPhone, saveInstallDismissed]
  provides: [useBeforeInstallPrompt, useIsStandaloneOrPhone, UseBeforeInstallPrompt, UseIsStandaloneOrPhone]
  affects: [src/hooks/useBeforeInstallPrompt.ts, src/hooks/useIsStandaloneOrPhone.ts]
tech_stack:
  added: []
  patterns: [matchMedia-hook-with-change-listener, useCallback-with-state-dep, local-non-standard-api-interface]
key_files:
  created:
    - src/hooks/useIsStandaloneOrPhone.ts
    - src/hooks/useIsStandaloneOrPhone.test.ts
    - src/hooks/useBeforeInstallPrompt.ts
    - src/hooks/useBeforeInstallPrompt.test.ts
  modified: []
decisions:
  - "onStandaloneChange uses event.matches not mqlStandalone.matches — ensures correct test behavior with static MQL stubs and mirrors usePrefersReducedMotion pattern"
  - "Test file uses synchronous act() wrappers for dispatchEvent calls (synchronous browser API) and async only for triggerInstall (awaited promise)"
  - "SafariNavigator and BeforeInstallPromptEvent declared as local file-level interfaces (not global augmentation) per project non-standard-API convention"
metrics:
  duration_seconds: 306
  completed_date: "2026-05-16"
  tasks_completed: 2
  files_changed: 4
---

# Phase 28 Plan 02: Detection Hooks Summary

**One-liner:** `useIsStandaloneOrPhone` (matchMedia phone + standalone detection) and `useBeforeInstallPrompt` (Android install prompt capture/replay with dismissal persistence) — the two detection hooks that gate banner visibility.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing tests for useIsStandaloneOrPhone | 16a29c1 | src/hooks/useIsStandaloneOrPhone.test.ts |
| 1 (GREEN) | Implement useIsStandaloneOrPhone detection hook | b72c91e | src/hooks/useIsStandaloneOrPhone.ts |
| 2 (RED) | Add failing tests for useBeforeInstallPrompt | 4e5515b | src/hooks/useBeforeInstallPrompt.test.ts |
| 2 (GREEN) | Implement useBeforeInstallPrompt capture hook | c4d0bf0 | src/hooks/useBeforeInstallPrompt.ts |
| 2 (fix) | Fix lint errors in test file | 2f0fa2b | src/hooks/useBeforeInstallPrompt.test.ts |

## What Was Built

### Task 1: useIsStandaloneOrPhone detection hook

`src/hooks/useIsStandaloneOrPhone.ts` exports:

- `UseIsStandaloneOrPhone` interface: `{ isStandalone: boolean; isPhone: boolean }`
- `useIsStandaloneOrPhone()` function

Key behaviors:
- `isPhone` uses `(pointer: coarse)` media query — semantically correct, excludes desktop (SC5 / RESEARCH.md Open Question 1 resolved at hook level)
- `isStandalone` OR-combines `(display-mode: standalone)` media query with `(navigator as SafariNavigator).standalone === true` — covers all iOS versions (pre-16.4 fallback via `navigator.standalone`)
- Defensive `!window.matchMedia` guard in both initializer and effect (mirrors `usePrefersReducedMotion.ts` exactly)
- Mount re-seed (IN-02 pattern) closes stale-initial-state window
- Change listeners on both MQLs with cleanup on unmount
- `SafariNavigator` declared locally (not globally) per project convention

8 tests pass covering all 6 plan behaviors plus 2 additional change-event update tests.

### Task 2: useBeforeInstallPrompt capture hook

`src/hooks/useBeforeInstallPrompt.ts` exports:

- `UseBeforeInstallPrompt` interface: `{ deferredPrompt: BeforeInstallPromptEvent | null; triggerInstall(this: void): Promise<void> }`
- `useBeforeInstallPrompt()` function

Key behaviors:
- `deferredPrompt` starts as `null` — D-08: no banner until the browser fires the event, guaranteeing a functional install button
- `useEffect([])` registers `beforeinstallprompt` listener at mount (D-07: captured immediately on page load); calls `e.preventDefault()` to suppress mini-infobar
- `appinstalled` event: clears `deferredPrompt` to null AND calls `saveInstallDismissed()` — handles install-via-browser-UI path so banner never re-appears
- `triggerInstall`: `useCallback([deferredPrompt])` — calls `prompt()`, nulls the ref (one-shot), calls `saveInstallDismissed()` only on `accepted` outcome
- `BeforeInstallPromptEvent` local interface declared with `prompt()` returning `Promise<{ outcome: 'accepted' | 'dismissed' }>` (TS 6.0.3 DOM lib gap)
- `appinstalled` cast to `keyof WindowEventMap` (also absent from TS 6.0.3 DOM lib)
- Both listeners cleaned up on unmount

8 tests pass covering all plan-specified behaviors.

## Verification

- `npm test -- --run src/hooks/useBeforeInstallPrompt.test.ts src/hooks/useIsStandaloneOrPhone.test.ts`: 16/16 pass
- `npm run build`: clean (0 type errors, 0 warnings)
- `npm test -- --run`: 980/980 pass (964 existing + 16 new; zero regressions)
- `npx eslint src/hooks/useBeforeInstallPrompt.ts src/hooks/useIsStandaloneOrPhone.ts ...`: 0 errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] onStandaloneChange used mqlStandalone.matches instead of event.matches**
- **Found during:** Task 1 GREEN phase (7/8 tests passing)
- **Issue:** The standalone change handler re-read `mqlStandalone.matches` from the stub object. In test stubs, the MQL object is static and `matches` never changes — causing the test that simulated a `change` event to fail.
- **Fix:** Changed `onStandaloneChange` to use `event.matches` (the event parameter) OR-combined with `navigator.standalone`, consistent with how `usePrefersReducedMotion` uses `event.matches` in its change handler.
- **Files modified:** `src/hooks/useIsStandaloneOrPhone.ts`
- **Commit:** b72c91e (part of GREEN phase commit)

**2. [Rule 1 - Bug] Redundant eslint-disable in useIsStandaloneOrPhone.ts**
- **Found during:** Task 1 lint check
- **Issue:** `eslint-disable-next-line react-hooks/set-state-in-effect` comment before `setIsPhone(mqlPhone.matches)` was flagged as an unused directive warning by ESLint (the rule was not triggered for that line).
- **Fix:** Removed the redundant disable comment; kept the one for `setIsStandalone` which does trigger the rule.
- **Files modified:** `src/hooks/useIsStandaloneOrPhone.ts`

**3. [Rule 1 - Bug] Async act() wrappers around synchronous dispatchEvent calls**
- **Found during:** Task 2 lint check
- **Issue:** `@typescript-eslint/require-await` flagged 7 async arrow functions in the test file that contained `window.dispatchEvent(...)` calls with no `await` expression inside.
- **Fix:** Changed all `await act(async () => { window.dispatchEvent(...) })` calls to synchronous `act(() => { window.dispatchEvent(...) })`. Only `triggerInstall()` calls remain async (they await the prompt promise).
- **Files modified:** `src/hooks/useBeforeInstallPrompt.test.ts`
- **Commit:** 2f0fa2b

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. Both hooks operate within the browser runtime (window events, matchMedia queries) per the threat model's T-28-04/T-28-05/T-28-06 register.

## Known Stubs

None — both hooks are complete implementations. The `deferredPrompt` null initial state is by design (D-08), not a stub.

## Self-Check: PASSED

- [x] `src/hooks/useIsStandaloneOrPhone.ts` exists and exports `useIsStandaloneOrPhone` and `UseIsStandaloneOrPhone`
- [x] `src/hooks/useIsStandaloneOrPhone.test.ts` exists with 8 passing tests
- [x] `src/hooks/useBeforeInstallPrompt.ts` exists and exports `useBeforeInstallPrompt` and `UseBeforeInstallPrompt`
- [x] `src/hooks/useBeforeInstallPrompt.test.ts` exists with 8 passing tests
- [x] Commits 16a29c1, b72c91e, 4e5515b, c4d0bf0, 2f0fa2b exist in git log
- [x] `grep -n "saveInstallDismissed" src/hooks/useBeforeInstallPrompt.ts` shows import + 2 call sites
- [x] Both `SafariNavigator` and `BeforeInstallPromptEvent` declared locally (no global augmentation)
- [x] `npm run build` clean; `npm test -- --run` 980/980

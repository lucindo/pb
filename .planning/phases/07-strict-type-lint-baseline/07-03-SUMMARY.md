---
phase: "07"
plan: "03"
subsystem: lint
tags: [eslint, typescript-eslint, strictTypeChecked, test-files, lint-exit-0]
dependency_graph:
  requires: [07-01, 07-02]
  provides: [lint-exit-0]
  affects: [ci, pre-commit]
tech_stack:
  added: []
  patterns:
    - "Reason comment + eslint-disable-next-line pattern (D-04) applied consistently to test files"
    - "unbound-method suppression for vi.fn mock cast assertions"
    - "require-await suppression for async stub methods matching AudioContext interface"
key_files:
  created: []
  modified:
    - src/audio/cueSynth.test.ts
    - src/hooks/useAudioCues.test.tsx
    - src/app/App.audio.test.tsx
    - src/app/App.persistence.test.tsx
    - src/app/App.session.test.tsx
    - src/app/App.wakeLock.test.tsx
    - src/app/App.dialog.test.tsx
    - src/audio/audioEngine.test.ts
    - src/components/BreathingShape.test.tsx
    - src/components/LearnDialog.test.tsx
    - src/components/MuteToggle.test.tsx
    - src/components/ResetStatsDialog.test.tsx
    - src/hooks/usePrefersReducedMotion.test.ts
    - src/hooks/useWakeLock.test.tsx
    - src/storage/settings.test.ts
    - src/storage/stats.test.ts
    - src/storage/storage.test.ts
    - vitest.setup.ts
    - src/hooks/usePrefersReducedMotion.ts
    - src/audio/audioEngine.ts
    - src/audio/cueSynth.ts
    - src/hooks/useAudioCues.ts
    - src/components/SettingsStepper.tsx
    - src/main.tsx
    - src/app/App.tsx
    - src/components/BreathingShape.tsx
decisions:
  - "Annotate unbound-method on vi.fn mock casts rather than refactor to vi.mocked() (D-08 minimal change)"
  - "Annotate require-await on async stubs that return Promise<void> via throw (no await needed)"
  - "Add braces to confusing-void-expression arrow shorthands in expect() wrappers"
  - "Double-cast as unknown as X retained with annotation (documents intent)"
metrics:
  duration: "~90 minutes (two-session: prior + this continuation)"
  completed: "2026-05-11"
  tasks_completed: 2
  files_modified: 26
---

# Phase 07 Plan 03: Lint Baseline — Production + Test File Fixes Summary

`npm run lint` exits 0 for the first time in Phase 7: 16 production-side errors fixed via minimal narrowing changes and D-04 annotations; ~162 test-file errors silenced with Reason + disable comments across 18 test/setup files.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Fix production ESLint errors | `2649854` | usePrefersReducedMotion.ts, audioEngine.ts, cueSynth.ts, useAudioCues.ts, SettingsStepper.tsx, main.tsx, App.tsx, BreathingShape.tsx |
| 2 | Fix test-file ESLint errors | `7979c9d` | cueSynth.test.ts, useAudioCues.test.tsx, App.audio.test.tsx + 15 other test/setup files |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] BreathingShape.tsx — redundant `as CSSProperties` casts**
- **Found during:** Task 1
- **Issue:** Two `as CSSProperties` casts on JSX style objects fired no-unnecessary-type-assertion. File not in plan's `files_modified`.
- **Fix:** Removed redundant casts, removed unused `CSSProperties` import.
- **Files modified:** src/components/BreathingShape.tsx
- **Commit:** 2649854 (included in Task 1 commit)

**2. [Rule 2 - Missing] usePrefersReducedMotion.ts — set-state-in-effect fires as ERROR**
- **Found during:** Task 1
- **Issue:** Plan scoped `setReduced(mql.matches)` as a Plan 04 concern, but `react-hooks/set-state-in-effect` fires as ERROR (not warn) in react-hooks v7.1.1, blocking lint-exit-0.
- **Fix:** Added `// eslint-disable-next-line react-hooks/set-state-in-effect` with Reason.
- **Files modified:** src/hooks/usePrefersReducedMotion.ts
- **Commit:** 2649854

**3. [Rule 2 - Missing] vitest.setup.ts — FakeAudioContext.resume() fires require-await**
- **Found during:** Task 2
- **Issue:** Plan noted not to touch `resume` (conditionally async), but the method has no `await` expression so the rule fires regardless.
- **Fix:** Added `// eslint-disable-next-line @typescript-eslint/require-await` with Reason.
- **Files modified:** vitest.setup.ts
- **Commit:** 7979c9d

**4. [Rule 1 - Bug] cueSynth.ts — phaseDurationSec! no-unnecessary-type-assertion after narrowing**
- **Found during:** Task 1 verification
- **Issue:** After removing `phaseDurationSec !== undefined` guard, adding `!` on the already-narrowed `phaseDurationSec` produced a `no-unnecessary-type-assertion` error.
- **Fix:** Removed the `!` entirely — TS proves definition within `if (needsSustain)`.
- **Files modified:** src/audio/cueSynth.ts
- **Commit:** 2649854

**5. [Rule 1 - Bug] App.tsx exhaustive-deps — individual props redundant with object ref**
- **Found during:** Task 1 verification
- **Issue:** First fix added `[audio, audio.audioStatus, audio.resume, audio.muted, persistedSetMuted]` but ESLint reported the individual props as redundant since `audio` already covers them.
- **Fix:** Simplified to `[audio, persistedSetMuted]`.
- **Files modified:** src/app/App.tsx
- **Commit:** 2649854

## Error Patterns Fixed (Task 2)

| Rule | Count | Fix Pattern |
|------|-------|-------------|
| `@typescript-eslint/unbound-method` | ~15 | `// Reason: vi.fn mock... + // eslint-disable-next-line` before cast |
| `@typescript-eslint/no-non-null-assertion` | ~35 | `// Reason: asserted by expect()... + // eslint-disable-next-line` |
| `@typescript-eslint/require-await` | ~12 | `// Reason: async required to match...Promise signature + disable` |
| `@typescript-eslint/no-unnecessary-type-assertion` | ~8 | `// Reason: cast documents stub shape + disable` |
| `@typescript-eslint/no-extraneous-class` | ~4 | `// Reason: test stub + disable` above class keyword in vi.stubGlobal |
| `@typescript-eslint/no-confusing-void-expression` | ~3 | Add braces: `() => { fn() }` |
| `@typescript-eslint/no-unsafe-call/member-access` | ~3 | Multi-rule disable on `(this as any)._listeners` |
| `@typescript-eslint/no-useless-constructor` | 1 | Combined disable with no-unused-vars for `_options` param |

## Verification

- `npm run lint` exits 0 (first time in Phase 7)
- `npx tsc --noEmit` exits 0
- `npx vitest run`: 363/363 tests pass
- `npm run build`: success (228KB JS bundle)

## Known Stubs

None — all changes are annotation-only or minimal narrowing fixes. No data stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes.

## Self-Check: PASSED

- Task 1 commit 2649854: verified in git log
- Task 2 commit 7979c9d: verified in git log
- SUMMARY.md: created at .planning/phases/07-strict-type-lint-baseline/07-03-SUMMARY.md
- All 26 modified files confirmed in git diff

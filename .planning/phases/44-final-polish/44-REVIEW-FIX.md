---
phase: 44-final-polish
fixed_at: 2026-05-25T04:45:00Z
review_path: .planning/phases/44-final-polish/44-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 44: Code Review Fix Report

**Fixed at:** 2026-05-25T04:45:00Z
**Source review:** .planning/phases/44-final-polish/44-REVIEW.md
**Iteration:** 1 (mega-commit per CONTEXT D-01)

**Summary:**
- Warning findings in scope: 0 (lint is clean at baseline — all Warning debt resolved in Phase 41)
- Info findings in scope: 3 fixable (see 44-REVIEW.md + 44-INFO-FINDINGS.md for the 25 obsolete-by-redesign + 1 deferred)
- Fixed: 3
- Skipped: 0 (the 25 obsolete and 1 deferred are not "skipped" — they are dispositioned)

## Fixed Issues

### IN-REASON-01: Missing `// Reason:` annotation in `useAppNavigation.ts`

**Files modified:** `src/app/useAppNavigation.ts`
**Commit:** 476caba
**Applied fix:** Added a `// Reason:` annotation preceding the `react-hooks/set-state-in-effect` eslint-disable at line 30. The annotation reads: "force navigation back to the practice surface when a session starts; setState inside effect is intentional — the session-start signal owns this transition." This satisfies the Phase 7 D-04 annotation policy ("Disables must justify themselves; new disables cannot land silently").
**Verification:** `npm run lint` exits 0 with 0 errors / 0 warnings. `npm test -- --run` passes 1155/1155 tests.

### IN-REASON-02: Missing `// Reason:` prefix in `useWakeLock.ts`

**Files modified:** `src/hooks/useWakeLock.ts`
**Commit:** 476caba
**Applied fix:** Converted the preceding `// AH-WR-01: unmount-during-await...` context comment to `// Reason (AH-WR-01): ...` form to satisfy Phase 7 D-04 policy. Added a second sentence explaining why the stale-ref warning does not apply: "The ref is a monotonic counter that is only ever mutated, never captured for later reads." This mirrors the rationale format used in `useAudioCues.ts:175-177` for the identical pattern.
**Verification:** `npm run lint` exits 0 with 0 errors / 0 warnings. `npm test -- --run` passes 1155/1155 tests.

### IN-REASON-03: Missing `// Reason:` annotation in `settings.ts` (validateStretchSettings)

**Files modified:** `src/domain/settings.ts`
**Commit:** 476caba
**Applied fix:** Added a `// Reason:` annotation before the `restrict-template-expressions` eslint-disable at line 228 (in `validateStretchSettings`). The annotation is identical to the one at line 209 (in `validateSettings`) because the same predicate-narrowing-to-never semantics apply: `isValidRatio` narrows `settings.ratio: RatioLabel` to `never` in the false branch, and the template expression is preserved verbatim for byte-identical error message format (D-09).
**Verification:** `npm run lint` exits 0 with 0 errors / 0 warnings. `npm test -- --run` passes 1155/1155 tests.

## Deferred Findings (not skipped — dispositioned in 44-INFO-FINDINGS.md)

**25 obsolete-by-redesign (IN-OBS-04..28, excluding IN-OBS-25):** Historical findings from the 2026-05-16 review against the v1.x surface. All 25 live in files deleted or structurally rewritten by Phase 41 J1-J18 (`.orb-layer` CSS classes, Square/Diamond variant code, Moss/Slate/Dusk palette tokens, `SettingsDialog`, `InstallBanner`, `StatsFooter`, `ResetStatsDialog`, `LearnDialog`, `LearnAnchor`, old `learnContent.ts` structure, old `useBreathingController` monolith). Per CONTEXT D-05(a)/(b) threshold.

**1 deferred-with-reason (IN-OBS-25, LearnPanel):** `LearnPanel.tsx` structural rework is out of scope for POLISH-01/02. Folded into 44-05 readability pass at planner's discretion.

## Per-Commit Green-Gate Evidence

```
npx tsc --noEmit -p tsconfig.app.json   # exit 0 — clean
npm run lint                            # exit 0 — 0 errors, 0 warnings (POLISH-01 close criterion)
npm test -- --run                       # exit 0 — 107 files / 1155 tests pass
npm run build                           # exit 0 — PWA 514.18 KiB (clean)
```

---

_Fixed: 2026-05-25T04:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1 (mega-commit per D-01)_

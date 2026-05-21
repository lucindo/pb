---
phase: 37-stats-ui-removal
verified: 2026-05-20T22:14:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Confirm the orphan keys `naviKriyaStatsEmptyBody` and `naviKriyaControlsPlaceholder` in `src/content/strings.ts` have no live render path (no component reads them at runtime), and decide whether they should be deleted as a post-phase cleanup."
    expected: "Zero runtime rendering of stats-empty copy; if accepted as dead-code debt, a follow-up task is created; if considered a blocker to the anti-gamification stance, they are removed now."
    why_human: "These keys are TypeScript-enforced (they appear in UiStrings interface), have no consumers in src/ outside strings.ts and strings.test.ts (grep-confirmed), and are not rendered. However, the strings ship in the production bundle and one of them ('Navi Kriya sessions will appear here after completing your first session.') reads like literal stats-surface copy. The goal says 'remove every visible stats surface' — the key has no render path so it is NOT visible, but the REVIEW flagged it as WR-01. The verifier cannot determine whether the operator considers shipped-but-unrendered stats copy a violation of the anti-gamification stance. Human judgment required."
  - test: "Confirm the drift-guard test in `src/content/content.no-stats-ui.test.ts` is considered adequate despite having no SCAN_FILES.length > 0 assertion (WR-02) and not scanning `src/content/` (WR-03)."
    expected: "Operator either accepts the current guard as sufficient for the phase goal, or adds the sanity-length assertion and/or extends scope to src/content/ before marking the phase complete."
    why_human: "The drift-guard passes currently and the forbidden tokens are genuinely absent from all scanned files. The WR-02/WR-03 weaknesses are defensive-programming gaps, not current regressions. Whether they require closure before the phase is marked passed is a product/engineering call. The verifier cannot make that call programmatically."
---

# Phase 37: Stats UI Removal — Verification Report

**Phase Goal:** Implement the spike-010 anti-gamification stance — remove every visible stats surface from the app while preserving the computation and localStorage persistence so a future deliberate decision can re-introduce a calm stats display.
**Verified:** 2026-05-20T22:14:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `StatsFooter.tsx` and `ResetStatsDialog.tsx` are gone from the app shell and from every consumer import; the "Reset stats" affordance is removed from Practice Settings (STATS-01..03). | VERIFIED | `ls src/components/` shows neither file exists. `grep -rn "StatsFooter\|ResetStatsDialog" src/app/ src/components/` (excl. drift-guard test) returns zero matches. `SettingsDialog.tsx` grep for `reset\|stats` returns zero matches. `practices.ts` exports list confirms no `resetPracticeStats`. |
| 2 | Completing a session, reloading the app, and inspecting the localStorage envelope shows `recordSession()` still incremented per-practice stats — a regression test locks this behavior (STATS-04). | VERIFIED | `src/storage/practices.test.ts` line 485: `describe('STATS-04 record-and-persist regression (CONTEXT D-05 / D-08)')` with 3 it-cases (resonant / stretch / naviKriya). Live run: 3/3 passed. `recordResonantSession`, `recordStretchSession`, `recordNaviKriyaSession` all present in `App.tsx` at call sites (lines 57–59, 708, 712, 817). `STATE_VERSION = 3` unchanged in `src/storage/storage.ts`. |
| 3 | A full audit of Idle, Running, Complete, Learn, and App Settings surfaces shows no "12 MIN TODAY · STREAK 5d" style readout or any equivalent visible stat (STATS-05). | VERIFIED | Drift-guard test `src/content/content.no-stats-ui.test.ts` PASSES (1/1, confirmed via live run). Scans `src/components/` + `src/app/` non-test files for 6 forbidden tokens: `StatsFooter`, `ResetStatsDialog`, `/MIN TODAY/i`, `/STREAK/i`, `/TOTAL TIME/i`, `/\bSESSIONS\b/`. Zero hits. Direct grep of components/app for visual stats markers also returns zero matches. |

**Score:** 5/5 requirements verified (STATS-01, STATS-02, STATS-03, STATS-04, STATS-05)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/StatsFooter.tsx` | DELETED | VERIFIED | File absent; `ls src/components/` confirms no stats-related component files |
| `src/components/ResetStatsDialog.tsx` | DELETED | VERIFIED | File absent |
| `src/components/StatsFooter.test.tsx` | DELETED | VERIFIED | File absent |
| `src/components/ResetStatsDialog.test.tsx` | DELETED | VERIFIED | File absent |
| `src/storage/format.ts` | DELETED | VERIFIED | File absent; `src/storage/index.ts` has no `from './format'` line |
| `src/storage/format.test.ts` | DELETED | VERIFIED | File absent |
| `src/app/App.tsx` | Stats-UI-free shell | VERIFIED | No `StatsFooter`, `ResetStatsDialog`, `activeStats`, `resetDialogOpen`, `onResetClick`, `confirmReset`, `cancelReset`, `STORAGE-03 listener`, or per-practice stats useState. `recordXSession` calls preserved at lines 708, 712, 817 |
| `src/content/strings.ts` | No stats/resetStatsDialog/resetStatsTitle keys | VERIFIED | grep for `readonly stats:\|readonly resetStatsDialog:\|resetStatsTitle:` returns zero matches |
| `src/storage/practices.ts` | No `resetPracticeStats` | VERIFIED | Export list confirms absence; grep returns zero matches |
| `src/storage/practices.test.ts` | STATS-04 block present, 3 it-cases | VERIFIED | Line 485: describe block exists; live run 3/3 passed |
| `src/content/content.no-stats-ui.test.ts` | STATS-05 drift-guard, ≥40 lines | VERIFIED | 113 lines; scans 2 roots; 6 forbidden tokens; live run 1/1 passed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/App.tsx` | `StatsFooter.tsx` | import (MUST NOT exist) | VERIFIED | `grep "StatsFooter" src/app/App.tsx` returns zero matches |
| `src/app/App.tsx` | `ResetStatsDialog.tsx` | import (MUST NOT exist) | VERIFIED | `grep "ResetStatsDialog" src/app/App.tsx` returns zero matches |
| `src/app/App.tsx` | `storage` (recordXSession) | import + call | VERIFIED | Lines 57–59 import, lines 708/712/817 call — persistence invariant intact |
| `src/content/content.no-stats-ui.test.ts` | `src/components/` | `collectFiles(COMPONENTS_DIR)` | VERIFIED | `COMPONENTS_DIR = resolve(__dirname, '..', 'components')` at line 53 |
| `src/content/content.no-stats-ui.test.ts` | `src/app/` | `collectFiles(APP_DIR)` | VERIFIED | `APP_DIR = resolve(__dirname, '..', 'app')` at line 54 |
| `src/storage/practices.test.ts` (STATS-04) | `recordResonantSession` / `recordStretchSession` / `recordNaviKriyaSession` | direct call in it-body | VERIFIED | Lines 487, 498, 509; live run green |

### Data-Flow Trace (Level 4)

Phase 37 is a deletion phase — it removes rendering artifacts rather than adding them. Data-flow Level 4 applies in the negative: the removed components (`StatsFooter`, `ResetStatsDialog`) had data flowing into them; verifying the goal means confirming that data flow is severed at every level.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `StatsFooter` (deleted) | `activeStats` | `App.tsx` useState (deleted) | N/A — component deleted | VERIFIED ABSENT |
| `ResetStatsDialog` (deleted) | `resetDialogOpen`, `onResetClick` | `App.tsx` useState (deleted) | N/A — component deleted | VERIFIED ABSENT |
| `App.tsx` `activeStats` selector | `resonantStats / stretchStats / naviKriyaStats` | per-practice useState (deleted) | N/A — selector deleted | VERIFIED ABSENT |
| `App.tsx` `recordXSession` calls | localStorage envelope | `src/storage/practices.ts` write | Yes — DB write confirmed via STATS-04 tests | FLOWING (intentionally preserved) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| STATS-05 drift-guard passes | `npx vitest run src/content/content.no-stats-ui.test.ts` | 1/1 passed, exit 0 | PASS |
| STATS-04 regression test passes (3 practices) | `npx vitest run src/storage/practices.test.ts -t "STATS-04"` | 3/3 passed, exit 0 | PASS |
| No StatsFooter/ResetStatsDialog in production source | `grep -rn "StatsFooter\|ResetStatsDialog" src/app/ src/components/ --include="*.ts" --include="*.tsx" | grep -v "\.test\."` | 0 matches | PASS |
| recordXSession calls preserved in App.tsx | `grep -n "recordResonantSession\|recordStretchSession\|recordNaviKriyaSession" src/app/App.tsx` | 5 matches (imports + 3 call sites) | PASS |
| STATE_VERSION unchanged | `grep STATE_VERSION src/storage/storage.ts` | `STATE_VERSION = 3 as const` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| STATS-01 | Plan 01 | `StatsFooter.tsx` removed from app shell | SATISFIED | File deleted; App.tsx grep clean |
| STATS-02 | Plan 01 | `ResetStatsDialog.tsx` removed from app shell | SATISFIED | File deleted; App.tsx grep clean |
| STATS-03 | Plan 01 + 02 | "Reset stats" affordance removed from Practice Settings | SATISFIED | SettingsDialog.tsx grep for reset/stats returns zero; `resetPracticeStats` deleted from practices.ts |
| STATS-04 | Plan 02 | `recordSession()` still computes + persists; regression test confirms | SATISFIED | STATS-04 describe block at practices.test.ts:485; 3/3 live run passed |
| STATS-05 | Plan 03 | No visible stat surface in any screen; drift-guard locks it | SATISFIED | Drift-guard live run 1/1 passed; direct grep confirms no forbidden tokens in production code |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/content/strings.ts` | 144–145, 311–312, 475–476 | Orphan keys `naviKriyaControlsPlaceholder` and `naviKriyaStatsEmptyBody` declared in `UiStrings.practice` with no consumer in any component or app file | WARNING | Dead typed interface + translated strings shipping to production bundle; one string is literal stats-empty body copy. Flagged by code review WR-01. Not a visible stat surface (zero render consumers confirmed), but undermines clean-cut intent of D-01. |
| `src/content/content.no-stats-ui.test.ts` | 57–60, 95–113 | No `SCAN_FILES.length > 0` assertion; test passes vacuously if `collectFiles` returns empty (e.g. renamed directory) | WARNING | Silent false-negative: guard could green-check while providing zero coverage. Flagged by code review WR-02. Currently producing correct results but structurally fragile. |
| `src/content/content.no-stats-ui.test.ts` | 53–60 | Scan scope excludes `src/content/` — stats copy can re-enter via i18n keys without triggering the guard | WARNING | Concrete gap given WR-01: orphan keys in `src/content/` are invisible to the drift guard. Flagged by code review WR-03. |

**Debt marker gate:** No `TBD`, `FIXME`, or `XXX` markers found in phase-modified files. Gate clear.

### Human Verification Required

#### 1. Orphan i18n keys vs. anti-gamification goal (WR-01)

**Test:** In `src/content/strings.ts`, confirm that `naviKriyaStatsEmptyBody` and `naviKriyaControlsPlaceholder` are truly unrendered (grep evidence in hand), and decide whether they must be deleted before the phase is closed.

**Expected:** Either (a) operator accepts that "every *visible* stats surface" is achieved (keys are dead code, not rendered), and the orphans are tracked as a follow-up cleanup per WR-01 recommendation; or (b) operator treats shipping of stats-shaped copy in the bundle as violating the anti-gamification stance, in which case the two keys must be deleted from the interface, EN catalog, PT-BR catalog, and `strings.test.ts` before marking the phase passed.

**Why human:** The goal states "remove every visible stats surface." These keys have zero render consumers (grep-confirmed). They are not visible. However, `naviKriyaStatsEmptyBody` contains the literal text "Navi Kriya sessions will appear here after completing your first session." — semantically stats-adjacent copy. Whether shipping this in the bundle violates the spirit of D-01 ("no orphan keys, no rot") is an operator call. The verifier cannot decide this; both interpretations are defensible against the goal text.

#### 2. Drift-guard adequacy (WR-02 + WR-03)

**Test:** Review `src/content/content.no-stats-ui.test.ts` and decide whether to add (a) a `SCAN_FILES.length > 0` sanity assertion and (b) `src/content/` as a third scanned root, before the phase is marked passed.

**Expected:** Either the guard is extended with a non-empty-scan assertion and content-scope addition; or the operator explicitly accepts the current guard as sufficient for Phase 37's scope (the three weaknesses are documented and deferred to Phase 44 POLISH scope).

**Why human:** The guard currently PASSES and all forbidden tokens are genuinely absent. WR-02/WR-03 are defensive-programming gaps, not active regressions. Whether fixing them is required to satisfy "STATS-05: no stat surface passes CI" is a judgment call. If the content scope addition is made, the WR-01 orphan keys would need to be cleaned first (since `/STREAK/i` would not match them but the conceptual overlap is real).

### Gaps Summary

No blockers found. All five STATS requirements are observably closed against the actual codebase. The three warnings (WR-01, WR-02, WR-03) identified by the code review are confirmable via grep and live test runs. They do not prevent the goal from being achieved in its literal form — every visible stats surface is removed — but they represent defensive coverage gaps that the operator should disposition before the phase is fully closed.

The status is `human_needed` because two items require operator judgment that cannot be resolved programmatically:
1. Whether shipped-but-unrendered stats copy in `strings.ts` violates the anti-gamification stance.
2. Whether the drift-guard's vacuous-pass risk requires immediate hardening vs. deferral.

---

_Verified: 2026-05-20T22:14:00Z_
_Verifier: Claude (gsd-verifier)_

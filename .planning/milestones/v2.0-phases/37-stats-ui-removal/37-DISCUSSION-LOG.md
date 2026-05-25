# Phase 37: Stats UI removal — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 37-stats-ui-removal
**Areas discussed:** i18n strings disposition, Data-layer surface, Tests retention, STATS-05 audit mechanism

---

## i18n strings disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Clean cut — delete from type + EN + PT-BR | Remove UiStrings.stats, practice.resetStatsTitle, resetStatsDialog from type and both catalogs. Re-introduction will design fresh copy. Cleanest cut. | ✓ |
| Keep in type + EN only (PT-BR optional later) | Preserve scaffolding for re-introduction in EN only; re-translate PT-BR later. Type stays intact but flags 'unused' lint. | |
| Keep both EN + PT-BR intact, mark unused | Full forward-compat. Translations maintained. Adds dead code + unused-export lint warnings; zero re-translation cost later. | |
| You decide | Claude's discretion. | |

**User's choice:** Clean cut — delete from type + EN + PT-BR
**Notes:** None — single-question turn, no follow-up needed. The Phase 26 native-speaker review work doesn't bind us here because deleting entries leaves no review markers behind.

---

## Data-layer surface

### Q1 — `resetPracticeStats` + `formatLastSession` disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Delete both — dead code, no callers | Remove resetPracticeStats from practices.ts and formatLastSession from format.ts plus their tests. STATS-04 'computation continues' satisfied by recordXSession trio + loadStats. | ✓ |
| Delete resetPracticeStats, keep formatLastSession | Reset path is product-laden; formatting is mechanical. formatLastSession is pure + tested + cheap to keep. | |
| Keep both — forward-compat for re-introduction | Part of the 'computation stays' surface. Accept dead-code lint. Saves rewriting later. | |
| You decide | Claude's discretion. | |

**User's choice:** Delete both
**Notes:** Tiger Style "no half-finished implementations" matched the user's instinct. Re-introduction designs reset semantics from scratch anyway (per-practice? global? scheduled?).

### Q2 — `loadStats` / `activeStats` subscription in App.tsx

| Option | Description | Selected |
|--------|-------------|----------|
| Prune App.tsx loadStats/activeStats too | Remove activeStats subscription since no UI consumes it. recordXSession functions internally re-read via WR-07 single-read pattern. loadStats stays exported. | ✓ |
| Keep loadStats wired in App.tsx | App.tsx keeps subscription as no-op for future re-introduction. | |
| You decide | Claude's discretion. | |

**User's choice:** Prune App.tsx loadStats/activeStats too
**Notes:** Internal record-path already self-contained per the WR-07 pattern; no consumer impact.

---

## Tests retention

### Q1 — STATS-04 regression test shape

| Option | Description | Selected |
|--------|-------------|----------|
| Unit test in storage layer | Add to practices.test.ts / stats.test.ts: per practice, call recordXSession → reload envelope → assert totals+1, elapsed+N, lastSessionAtMs set. Cheap, fast, focused. | ✓ |
| Integration test in App.test.tsx | Drive a session end-to-end via testing-library, reload, assert envelope. More expressive but slower and more fragile. | |
| Both — unit + one integration smoke | Belt-and-suspenders coverage + smoke test. More test maintenance. | |
| You decide | Claude's discretion. | |

**User's choice:** Unit test in storage layer
**Notes:** No need for React render to lock the contract.

### Q2 — Existing tests of removed code

| Option | Description | Selected |
|--------|-------------|----------|
| Delete tests with their components | StatsFooter.test.tsx + ResetStatsDialog.test.tsx deleted in same commit as components. App.dialog.test.tsx + App.persistence.test.tsx reset branches surgically stripped. | ✓ |
| Mark with .skip and TODO before deleting | Two-step: skip first to confirm CI green, then delete in follow-up. Slower, lower-risk. | |
| You decide | Claude's discretion. | |

**User's choice:** Delete tests with their components
**Notes:** Matches the Phase 36 spike-findings-hrv tightly-coupled-delete precedent.

---

## STATS-05 audit mechanism

### Q1 — Audit mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Automated drift-guard test | fs-scan test in the spirit of no-review-markers.test.ts that fails CI if 'StatsFooter', 'ResetStatsDialog', 'MIN TODAY', 'STREAK', etc. reappear in src/components/ or src/app/. Locks the anti-gamification invariant. | ✓ |
| Manual screen-by-screen audit in SUMMARY only | Document the audit in 37-SUMMARY.md. Cheaper but invariant not locked going forward. | |
| Both — manual audit + automated test | Manual documents removal moment; automated locks going forward. Maximum rigor. | |
| You decide | Claude's discretion. | |

**User's choice:** Automated drift-guard test
**Notes:** Drift-guard is the load-bearing artifact of this phase per the user.

### Q2 — Forbidden token list

| Option | Description | Selected |
|--------|-------------|----------|
| Component names + visual tokens | 'StatsFooter', 'ResetStatsDialog', plus visual regex 'MIN TODAY' / 'STREAK' / 'SESSIONS' / 'TOTAL TIME' (case-insensitive). Scoped to src/components/ + src/app/, test files excluded. | ✓ |
| Just the component names | Lighter; could miss 'NewStatsCard'-style re-introductions. | |
| Broader semantic scan including totalSessions reads in JSX | Most rigorous; flag JSX usages of activeStats / totalSessions / totalElapsedSeconds / lastSessionAtMs. Highest false-positive risk. | |
| You decide | Claude's discretion on the exact list. | |

**User's choice:** Component names + visual tokens
**Notes:** Future re-introduction will design new component names, so component-name absence isn't enough — visual tokens catch the surface-level invariant.

---

## Claude's Discretion

- **Commit grouping strategy** — single atomic vs split UI/data/i18n/tests/audit commits. Planner decides at PLAN time, biased toward Tiger Style "small atomic commits".
- **Drift-guard test filename** — naming follows the closest analog the planner finds in `src/content/no-review-markers.test.ts` (e.g., `src/app/no-stats-ui.test.ts` or `src/components/stats-ui-absence.test.ts`).

## Deferred Ideas

- **Future stats re-introduction** — Owned by a future milestone, not v2.0. When/if it happens, the introducing phase explicitly deletes the STATS-05 drift-guard test with rationale logged in its SUMMARY.
- **`StatsFooter` rounds-completed (NK) data exposure** — `roundsCompletedLabel` and `showRounds={activePractice === 'naviKriya'}` disappear with the component. A future calm stats display surfacing rounds is a fresh design exercise.

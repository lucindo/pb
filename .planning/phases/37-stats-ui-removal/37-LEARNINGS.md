---
phase: 37
phase_name: "stats-ui-removal"
project: "HRV Breathing WebApp"
generated: "2026-05-21"
counts:
  decisions: 6
  lessons: 4
  patterns: 4
  surprises: 4
missing_artifacts: []
---

# Phase 37 Learnings: stats-ui-removal

## Decisions

### D-05 — STATE_VERSION stays at 3 despite removing entire data-layer surfaces
The phase deleted `src/storage/format.ts` (5 functions), `resetPracticeStats`, and stats-shaped i18n — but `STATE_VERSION` was NOT bumped. The reads removed were read-side surfaces over an unchanged envelope; returning users see no migration.

**Rationale:** Bumping STATE_VERSION costs a migration commit + a v3→v4 chain test. Since `recordResonantSession/Stretch/NaviKriya` and the persisted envelope shape (counts + timestamps) were preserved verbatim, the read-side deletions are invisible to disk. STATS-04 regression locks the round-trip.
**Source:** 37-02-SUMMARY.md (D-05 STATE_VERSION Lock Verification section)

### D-12 — Delete the cross-tab `storage` event listener with no replacement
The single-line storage event listener that fanned StatsFooter updates across tabs was deleted with no fallback. CustomEvent dispatch paths (`useLocale`, `useVisualVariant`, `useVisualCue`, `useFavicon`) handle every other cross-tab sync.

**Rationale:** Grep-confirmed no non-stats consumer. The listener existed only to keep the StatsFooter counter live across tabs; removing the footer removed the only reason for the subscription.
**Source:** 37-01-PLAN.md, 37-SECURITY.md (T-37-08)

### D-09 / D-10 / D-11 — Three-class forbidden-token taxonomy
Drift-guard forbidden list mixes (1) case-sensitive component-name substrings (`StatsFooter`, `ResetStatsDialog`), (2) case-insensitive visual markers (`/MIN TODAY/i`, `/STREAK/i`, `/TOTAL TIME/i`), and (3) word-boundary uppercase-only (`/\bSESSIONS\b/` without `i` flag because lowercase "sessions" appears in legitimate prose).

**Rationale:** Component names are stable identifiers; visual markers may appear in any case in copy; "SESSIONS" as a stat header is uppercase by convention and uppercase-only matching avoids false positives on neutral prose.
**Source:** 37-CONTEXT.md (D-09..D-11), 37-03-SUMMARY.md

### WR-01 resolution — Delete shipped-but-unrendered stats-shaped i18n now
Verifier returned `human_needed` for the orphan keys `naviKriyaStatsEmptyBody` / `naviKriyaControlsPlaceholder` (dead, but still in the bundle). Operator chose delete-now over deferring as polish debt.

**Rationale:** Phase goal said "remove every visible stats surface." Keys with no render path are not technically visible, but one shipped literal stats-empty copy ("Navi Kriya sessions will appear here after completing your first session.") in the bundle. Removing it makes the anti-gamification stance hold at the bundle level too.
**Source:** 37-VERIFICATION.md (human_verification_resolved), 37-HUMAN-UAT.md

### WR-02 / WR-03 resolution — Harden the drift-guard now (length sanity + extend scope)
The drift-guard returned green and the forbidden tokens were genuinely absent, but the test had two defensive gaps: no `SCAN_FILES.length > 0` floor and no `src/content/` scope. Operator chose to harden in-phase instead of accepting the gaps.

**Rationale:** A broken `__dirname` resolve or renamed scan root would silently pass with zero scanned files. Adding `SCAN_FILES.length > 10` makes regressions in the test itself visible. Extending scope to `src/content/` closes the WR-01 re-entry vector structurally — if stats copy ever returns via i18n, the guard catches it without depending on a render path.
**Source:** 37-VERIFICATION.md, commit a63dae3

### Retroactive STRIDE for deletion-only phase
Plans had no `<threat_model>` blocks. Per workflow rule, `register_authored_at_plan_time: false` with empty register must NOT short-circuit — the auditor built a 10-threat register from implementation (deletion-relevant categories: Tampering, Information Disclosure, Repudiation, DoS) and verified each.

**Rationale:** Empty-by-no-planning ≠ no-threats. Even deletion phases can introduce Information Disclosure (accidental data exposure), Tampering (state user cannot exit), Repudiation (weakened audit), or DoS (cross-tab behavior change).
**Source:** 37-SECURITY.md (header + Threat Verification table)

---

## Lessons

### `tsc --noEmit` self-check is insufficient for project builds
Wave 1 executor self-reported `Self-Check: PASSED` based on `npx tsc --noEmit && npx vitest run`. Post-merge `npm run build` (which runs `tsc -b && vite build`) immediately flagged 4 unused declarations as TS6133 errors. `--noEmit` and `-b` apply different compilation settings; the project build uses `noUnusedLocals`/`noUnusedParameters` that the file-level no-emit does not enforce.

**Context:** Triggered the post-merge cleanup commit `80346ca`. Waves 2/3 executor prompts patched to require `npm run build` self-check; both downstream executors caught their own `ZERO_STATS` unused-import (Wave 2 commit `0491cf1`) before merge.
**Source:** 37-01-SUMMARY.md → post-merge cleanup commit 80346ca; 37-02-SUMMARY.md (Deviations from Plan — ZERO_STATS auto-fix)

### `human_needed` verifier state is load-bearing, not a failure
Verifier returned `human_needed` with 5/5 must-haves verified but two operator-judgment items. The state correctly distinguished "implementation complete" from "operator must decide completeness" — both WR-01 (does shipped-but-unrendered copy violate the stance?) and WR-02/WR-03 (is the drift-guard's defensive coverage sufficient?) are product calls the verifier shouldn't make alone.

**Context:** Without `human_needed`, the verifier would either pass (rubber-stamp) or fail (artificial gap). The state created room for `AskUserQuestion` and a structured resolution path that committed back into VERIFICATION.md + HUMAN-UAT.md as resolved evidence.
**Source:** 37-VERIFICATION.md (status flip human_needed → passed), 37-HUMAN-UAT.md

### Acceptance-criteria grep can over-fire on name collisions
Plan 01 acceptance criterion `grep -nE "LOCL-02|LOCL-03|STORAGE-03" src/app/App.persistence.test.tsx` returns no matches — but a pre-existing `describe('LOCL-02 — stats record on each end path', ...)` block tests `recordResonantSession` persistence (the stats-accumulation contract, not footer-gating). The `LOCL-02` name overlap was not anticipated; spirit-of-criterion needs operator interpretation.

**Context:** Plan 01 deviation section documented the variance and kept the block. Lesson: when acceptance criteria are pure greps on requirement IDs, plan author must check whether the ID is multi-purpose first.
**Source:** 37-01-SUMMARY.md (Acceptance Criteria Variance)

### Code review surfaces shipped-test defects that verification misses
The STATS-05 drift-guard test we shipped in Plan 03 had two defensive gaps (WR-02 vacuous-pass, WR-03 missing src/content/ scope) that the verification step did not flag because they weren't current regressions. Code review caught both — review is asking "what would break this in the future?", verification asks "does this work now?"

**Context:** Without the code-review-then-verify ordering, both gaps would have shipped silently. The fact that they were detected and fixed in-phase (commit `a63dae3`) is the workflow value-add.
**Source:** 37-REVIEW.md (WR-02, WR-03), 37-VERIFICATION.md (human_verification items)

---

## Patterns

### Mirror-an-analog test pattern with documented deltas
STATS-05 drift-guard was built by copying `src/content/content.no-review-markers.test.ts` (Phase 26 / I18N-07 analog) and documenting three structural deltas inline: (a) two scan roots → three, (b) `.test.ts` filter → `.test.ts|.tsx`, (c) single token → multi-token list with three match classes.

**When to use:** Any time you're locking an invariant and a sibling invariant-lock test already exists. Don't write from scratch — mirror the analog, document deltas in the file header so future readers know the shape and the divergences.
**Source:** 37-03-PLAN.md (read_first section), 37-03-SUMMARY.md, src/content/content.no-stats-ui.test.ts file header

### Pre-handoff orphan-grep section per plan
Every Plan summary in this phase ended with a "Pre-handoff for Plan N+1" section that documented a grep audit of potentially-dangling surfaces and explicit live/dead decisions for each. Plan 01 → Plan 02 carried `resetPracticeStats`/`formatLastSession`/`ZERO_STATS`/`PersistedStats` with disposition; Plan 02 → Plan 03 carried the forbidden-token zero-hit confirmation.

**When to use:** Sequential plans within a deletion or refactor phase where Plan N+1's scope depends on what Plan N actually removed. Avoids the executor of Plan N+1 having to re-grep from scratch and possibly drift from the plan's assumed state.
**Source:** 37-01-SUMMARY.md (Pre-handoff for Plan 02), 37-02-SUMMARY.md (Pre-handoff for Plan 03)

### Length-floor sanity assertion for filesystem-scanning tests
Drift-guard tests that walk the filesystem (`readdirSync` + recurse) should add `expect(SCAN_FILES.length).toBeGreaterThan(REALISTIC_FLOOR)` as a separate `it` block. A broken `__dirname`, renamed scan root, or wrong cwd produces an empty scan list and a vacuous-green test.

**When to use:** Any test where the assertion is "no file in directory X matches pattern Y." The presence of the iteration is load-bearing; if the iteration silently runs zero times the test asserts nothing. Floor should be well below realistic count but well above zero (current guard uses `> 10`).
**Source:** src/content/content.no-stats-ui.test.ts:101 (added in commit a63dae3 per WR-02 resolution)

### Orchestrator-restored shared files in worktree merges
When merging worktree branches back to main, the orchestrator backs up `.planning/STATE.md` and `.planning/ROADMAP.md` before merge and restores them after. Worktree executors are explicitly told not to modify shared files. This pattern prevents last-merge-wins overwrites of tracking state.

**When to use:** Multi-worktree parallel execution where every worktree branch off a common base would otherwise carry conflicting modifications to shared tracking files. Per-plan `executor-plan.md` auto-detects worktree mode via `.git` being a file and skips shared updates.
**Source:** execute-phase workflow step 5.5 (post-wave merge), observed across all 3 waves of phase 37

---

## Surprises

### Generator self-evaluation blind spot was concrete and material
Anthropic's harness research warns generators report `PASSED` even when integration fails. Phase 37 hit this exactly: Wave 1 executor's `tsc --noEmit + vitest run` self-check passed; the post-merge `tsc -b` immediately failed on 4 TS6133 errors. Not a hypothetical risk — it required an inline orchestrator fix-commit (`80346ca`) before tracking could advance.

**Impact:** Validated the post-merge build-and-test gate as load-bearing. Without it, 4 unused declarations would have landed on main. Waves 2/3 executor prompts patched accordingly; both later executors caught their own equivalent TS6133 (`ZERO_STATS`) before returning.
**Source:** Wave 1 post-merge build failure (commit 80346ca), Wave 2 self-caught (commit 0491cf1)

### WR-01 orphans escaped the deletion sweep because they had different key names
Plan 01 deleted the `readonly stats: { ... }` and `readonly resetStatsDialog: { ... }` interface keys and their translations cleanly. But the Navi Kriya stats-empty *body copy* lived under a different key (`naviKriyaStatsEmptyBody`) at the practice level, not under `stats:`. The deletion was scoped to API-surface names, not to string-content patterns — so it missed copy that lived under an unrelated key.

**Impact:** Required a follow-up commit (`a63dae3`) to remove the orphans. The drift-guard now scans `src/content/` so future similar orphans fail the suite, not just code review.
**Source:** 37-REVIEW.md (WR-01), commit a63dae3

### Vitest test count `it` ≠ describe
Adding one new sanity `it` block to the drift-guard test (`scans a non-empty set of production files`) bumped the project total from 1203 → 1204 tests. Vitest counts each `it`, not each `describe`. Phase 37 total trajectory: pre-phase 1255 (from v1.5 milestone) → after Wave 1 1222 (stats branch deletions) → after Wave 2 1202 (format.ts removed, STATS-04 added: net -20) → after Wave 3 1203 → after a63dae3 hardening 1204.

**Impact:** Test-count assertions in acceptance criteria need to anticipate `it`-block additions, not just file-count or describe-count.
**Source:** Post-merge test logs across all three waves; commit a63dae3 (+1 it block, +1 test count)

### `LOCL-02` was multi-purpose: same ID, two test concerns
A pre-existing `describe('LOCL-02 — stats record on each end path', ...)` block tested `recordResonantSession` persistence; the plan acceptance criterion grep was meant to find footer-gating tests with the same name. The ID `LOCL-02` carried both meanings in `App.persistence.test.tsx`.

**Impact:** Plan 01 had to deviate from the literal acceptance criterion text and keep the surviving `LOCL-02` describe. Verifier confirmed the spirit-of-criterion was satisfied. Reinforces the "acceptance-criteria grep can over-fire on name collisions" lesson.
**Source:** 37-01-SUMMARY.md (Acceptance Criteria Variance)

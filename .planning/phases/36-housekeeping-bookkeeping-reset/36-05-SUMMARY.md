---
phase: 36-housekeeping-bookkeeping-reset
plan: 05
subsystem: planning/phase-28-summary-recovery-and-drift-fix
tags: [housekeeping, summary, drift-fix, git-recovery, HOUSE-08, v1.4]
dependency_graph:
  requires:
    - 36-01-restored-v1.5-phase-dirs
    - 36-02-backfilled-validation-security-artifacts
    - 36-03-verification-status-reflips
    - 36-04-summary-requirements-completed-frontmatter
  provides:
    - HOUSE-08-closed   # 28-01 and 28-03 SUMMARYs are recovered + drift-corrected against canonical code
  affects:
    - .planning/phases/28-phone-install-banner/
tech_stack:
  added: []
  patterns:
    - "Recovery from deleted git blob via `git show <commit>^:<path>` — both 28-01 and 28-03 SUMMARYs were deleted by `f81f08f docs(phase-30): add security threat verification` and absent from HEAD until this plan"
    - "Semantics-aware drift fix (W5 hardening) — for the 28-03 `SafariNavigator` row, verified both (a) symbol presence in `src/` and (b) prose alignment with current code. Symbol survived; prose was stale. Rewrote the row."
    - "Single logical-group commit per CONTEXT D-05 commit #5 — explicit per-file `git add`, HEREDOC body, no amend"
    - "Body-content edit allowed for HOUSE-08 (unlike HOUSE-05/07 which were frontmatter-only) — 28-01 fix touched the body's `UiStrings.install` field-count line; 28-03 fix stayed in frontmatter"
key_files:
  created: []
  modified:
    - .planning/phases/28-phone-install-banner/28-01-SUMMARY.md
    - .planning/phases/28-phone-install-banner/28-03-SUMMARY.md
requirements-completed:
  - HOUSE-08
decisions:
  - "28-01 drift is the body's `exactly 7 readonly string fields` claim, NOT the `metrics.files_changed: 4` frontmatter value. Frontmatter count matches `key_files.created` (2) + `key_files.modified` (2) = 4 — no edit. Body rewritten to credit the 7 fields Phase 28-01 contributed and note the two later additions (`regionLabel` Phase 28 WR-06, `settingsLabel` Phase 29-01) that bring the canonical count to 9."
  - "28-03 `SafariNavigator` reference: symbol PRESENT in `src/` (Decision logic case #2). `grep -rn SafariNavigator src/` returns 4 hits in `src/hooks/useIsStandaloneOrPhone.ts` (interface declaration + 3 `.standalone === true` use-sites for the `isStandalone` branch). But the decision row's prose was semantically stale on three counts — see verification evidence below."
  - "Original 28-03 decision-row claim vs current code: claimed `(navigator as SafariNavigator).standalone !== undefined` per-render expression in `App.tsx` avoiding a `third hook`. Current code uses `detectIsIOS()` UA-string probe (CR-01/WR-01, commit d7561ce `fix(28): CR-01 detect iOS via user-agent instead of navigator.standalone probe`), computed in a lazy `useState` inside `useIsStandaloneOrPhone()`, returned as `isIOS` from the hook. App.tsx line 283 now destructures `isIOS` from the hook — exactly the `third hook` approach the original row claimed to avoid. Rewrote the row to describe the current mechanism (file path, hook return shape, UA probe, lazy useState, supersession note)."
  - "Recovery source is `f81f08f^` — the parent commit of the deletion, per 36-PATTERNS §16-17 placement decision option-a (edit-in-place at `.planning/phases/28-phone-install-banner/`; v1.4 archive backfill stays deferred per CONTEXT). Byte-for-byte recovery confirmed via `git show f81f08f^:… | diff -` returning empty before drift fixes were applied."
  - "Single commit `0d61f5c` atop `8d81f43` (the 36-04 metadata commit) — no amend, no force, no rewrite. 205 line additions across 2 files (recovery + fixes), zero deletions, zero `src/` touches."
metrics:
  duration: 2m
  completed: 2026-05-20
  tasks_completed: 4
  files_created: 0
  files_modified: 2
  tests_added: 0
  commits_created: 1
---

# Phase 36 Plan 05: Recover and drift-fix 28-01/28-03 SUMMARYs (HOUSE-08) Summary

**One-liner:** Closed HOUSE-08 by recovering both `28-01-SUMMARY.md` and `28-03-SUMMARY.md` from `f81f08f^` (the parent of the silent deletion in `docs(phase-30): add security threat verification`), correcting the field-count drift in 28-01 body against canonical `src/content/strings.ts` (Phase 28-01 contributed 7 fields; canonical block now carries 9 with later additions cited), and rewriting 28-03's `SafariNavigator` decision row to describe the current `detectIsIOS()` UA-string probe inside `useIsStandaloneOrPhone()` (CR-01 superseded the original per-render `.standalone` probe — symbol survived for `isStandalone`, but semantics changed). Single `docs(36):` commit `0d61f5c` atop `8d81f43`.

## What Shipped

- **HOUSE-08 closed** — both Phase 28 SUMMARYs are recovered and drift-corrected against canonical code in `main`. The deleted-blob → tracked-file transition is recorded in commit `0d61f5c`.

  | File | State pre-plan | State post-plan |
  |------|----------------|-----------------|
  | `.planning/phases/28-phone-install-banner/28-01-SUMMARY.md` | Absent from HEAD and working tree (deleted in `f81f08f`) | Tracked at HEAD; body's `UiStrings.install` field-count line updated to reflect canonical 9 fields with Phase 28-01's 7 contributions cited |
  | `.planning/phases/28-phone-install-banner/28-03-SUMMARY.md` | Absent from HEAD and working tree (deleted in `f81f08f`) | Tracked at HEAD; `decisions:` block row describing iOS detection rewritten to cite the current `detectIsIOS()` hook-based mechanism (CR-01 supersession noted) |

- **Single commit** — `0d61f5c docs(36): correct 28-01/28-03 SUMMARY drift — field count + superseded SafariNavigator ref (HOUSE-08)` atop `8d81f43`. 205 insertions, 0 deletions, 0 `src/` touches; both files entered git history as new tracked paths (the prior tracked versions died with `f81f08f`).

## Tasks Executed

| # | Task                                                                              | Status | Commit    | Notes |
|---|-----------------------------------------------------------------------------------|--------|-----------|-------|
| 1 | Recover 28-01 and 28-03 SUMMARYs from `f81f08f^`                                  | done   | `0d61f5c` (staged in Task 4) | `git show f81f08f^:.planning/phases/28-phone-install-banner/28-0{1,3}-SUMMARY.md` → file. Byte-for-byte match verified via `diff -` returning empty. |
| 2 | Fix 28-01-SUMMARY.md field-count drift                                            | done   | `0d61f5c` | Drift was in the body, not frontmatter. `metrics.files_changed: 4` matches `key_files` total (2 created + 2 modified). The stale claim was `exactly 7 readonly string fields` — canonical `UiStrings.install` block in `src/content/strings.ts:141-151` carries 9 fields. Rewrote body line to credit Phase 28-01's 7 contributions and note the two later additions (`regionLabel`/`settingsLabel`). |
| 3 | Fix 28-03-SUMMARY.md superseded `SafariNavigator` reference (semantics-aware)     | done   | `0d61f5c` | W5 hardening: confirmed (a) literal symbol presence AND (b) semantic alignment. Symbol PRESENT (still used for `isStandalone` branch); semantics STALE (iOS detection moved to UA probe in a hook). Decision logic case #2: rewrote the row to describe the current mechanism. |
| 4 | Stage and commit (D-05 commit #5)                                                 | done   | `0d61f5c` | Explicit per-file `git add`, HEREDOC body, no amend, no `src/` touches, no deletions. |

## Acceptance Criteria

All acceptance criteria from `36-05-PLAN.md` pass:

**Task 1 (Recovery):**
- ✓ `.planning/phases/28-phone-install-banner/28-01-SUMMARY.md` exists and is non-empty (4384 bytes, 92 lines)
- ✓ `.planning/phases/28-phone-install-banner/28-03-SUMMARY.md` exists and is non-empty (6762 bytes pre-edit, 113 lines)
- ✓ Each file's content matched the `f81f08f^` blob byte-for-byte at recovery time (`diff` returned empty)
- ✓ Files were not staged before Tasks 2/3 edits applied

**Task 2 (28-01 field-count fix):**
- ✓ `28-01-SUMMARY.md` exists with the field-count claim now matching canonical code (9 fields acknowledged with Phase 28-01's 7 contributions cited)
- ✓ `metrics.files_changed: 4` left unchanged — already matches `key_files.created` (2) + `key_files.modified` (2)
- ✓ No unrelated edits — single body line touched
- ✓ Pattern confirmed via `diff` against `f81f08f^` showing exactly one line changed

**Task 3 (28-03 SafariNavigator fix — W5 semantics-aware):**
- ✓ Part A — symbol presence verified: `grep -rn "SafariNavigator" src/` returns 4 hits in `src/hooks/useIsStandaloneOrPhone.ts` (line 5 interface declaration, lines 56, 83, 90 use sites). Symbol survives.
- ✓ Part B — semantics verified by reading `src/hooks/useIsStandaloneOrPhone.ts` (112 lines) and `src/components/InstallBanner.tsx` (101 lines) and `src/app/App.tsx:275-329`. Current mechanism:
  - File: `src/hooks/useIsStandaloneOrPhone.ts`
  - Function: `detectIsIOS()` at lines 17-23 — UA-string probe (`/iP(hone|od|ad)/.test(navigator.userAgent)` plus iPadOS 13+ `Macintosh` + `maxTouchPoints > 1`)
  - Memoization: lazy `useState(detectIsIOS)` at line 108 — computed once per page lifetime
  - Hook return: `{ isStandalone, isPhone, isIOS }` (line 28 interface, line 110 return)
  - Consumer: `src/app/App.tsx:283` destructures `isIOS` from `useIsStandaloneOrPhone()`
  - Trigger for change: CR-01/WR-01 (commit `d7561ce fix(28): CR-01 detect iOS via user-agent instead of navigator.standalone probe`)
- ✓ Comparison with original decision row: original claimed (1) detection via `(navigator as SafariNavigator).standalone !== undefined`; (2) per-render expression in `App.tsx`; (3) avoids a `third hook`. Current code (1) uses UA probe via `detectIsIOS()`; (2) is a memoized lazy `useState` inside a hook, not a per-render expression; (3) returns `isIOS` from `useIsStandaloneOrPhone` — exactly a `third hook`. All three claims semantically stale.
- ✓ Decision logic case #2 applied: symbol present but semantics stale → row rewritten to cite current API/hook name + current mechanism (file path, branching logic, supersession note). Literal `SafariNavigator` retained in the new prose since it still appears in the hook for the `isStandalone` branch.
- ✓ Edit confined to the single `decisions:` row in frontmatter — no body changes, no other decision rows touched (confirmed via `diff` showing exactly one frontmatter line changed)
- ✓ Replacement string accurately describes current iOS-detect implementation (file path, hook name, branching logic, lazy `useState`, supersession note)

**Task 4 (Commit):**
- ✓ HEAD commit subject matches the plan's required wording exactly: `docs(36): correct 28-01/28-03 SUMMARY drift — field count + superseded SafariNavigator ref (HOUSE-08)`
- ✓ HEAD commit touches exactly two files: `28-01-SUMMARY.md` and `28-03-SUMMARY.md` (verified via `git diff HEAD~1 --name-only | grep -c "28-0[13]-SUMMARY.md$"` = 2)
- ✓ HEAD commit is not an amend (sits atop `8d81f43`, the 36-04 metadata commit)
- ✓ `git ls-files .planning/phases/28-phone-install-banner/` shows both files tracked

**Plan `<verification>` block:**
- ✓ `28-01-SUMMARY.md` and `28-03-SUMMARY.md` exist and are tracked (Tasks 1 + 4)
- ✓ Field-count drift fixed (body line updated to reflect canonical 9 fields with 28-01's 7 contributions cited — Task 2)
- ✓ `SafariNavigator` reference: symbol present, semantics stale → row rewritten with current mechanism (Task 3, semantics-aware Decision logic case #2)
- ✓ Single commit (`0d61f5c`) lands cleanly on top of HEAD

## Key Decisions

### Task 3 verification evidence (W5 semantics check — required by acceptance criteria)

The plan's strengthened acceptance criteria explicitly require this evidence to be recorded so future readers can audit the semantics check.

**File of canonical iOS-detect implementation read in full:**
- `src/hooks/useIsStandaloneOrPhone.ts` (112 lines)

**Symbol/hook names found in current code:**
- Interface declared: `SafariNavigator` (lines 5-7) — still present in src/
- UA-probe function: `detectIsIOS()` (lines 17-23) — new (introduced by commit d7561ce, CR-01)
- Hook export: `useIsStandaloneOrPhone()` (line 47) — now returns `isIOS` alongside `isStandalone`/`isPhone`
- Hook return interface: `UseIsStandaloneOrPhone { isStandalone: boolean; isPhone: boolean; isIOS: boolean }` (lines 25-29)
- Consumer in App.tsx:283: `const { isPhone, isStandalone, isIOS } = useIsStandaloneOrPhone()`

**Per-claim comparison against the original 28-03 decision row prose:**

| Original claim | Current code reality | Verdict |
|----------------|---------------------|---------|
| Detection via `(navigator as SafariNavigator).standalone !== undefined` | Detection via `detectIsIOS()` UA-string probe — `/iP(hone|od|ad)/.test(navigator.userAgent)` plus iPadOS 13+ `Macintosh`+`maxTouchPoints>1` | STALE — mechanism changed by CR-01 (commit d7561ce). `.standalone` is unreliable on iPadOS 13+ desktop-mode Safari. |
| Per-render expression in `App.tsx` | Memoized in a lazy `useState(detectIsIOS)` inside `useIsStandaloneOrPhone` (line 108); App.tsx just destructures `isIOS` from the hook (line 283) | STALE — moved from inline expression to hook-return; computed once per page lifetime. |
| Avoids a `third hook` | Uses `useIsStandaloneOrPhone` which returns `isIOS` — exactly the `third hook` approach the original prose claimed to avoid | STALE — the decision was reversed; the hook absorbed iOS detection. |
| Literal `SafariNavigator` interface | Still declared in `useIsStandaloneOrPhone.ts` lines 5-7; still used at lines 56/83/90 for the `isStandalone` branch's `(navigator as SafariNavigator).standalone === true` check | SURVIVED — symbol used for a different purpose (`isStandalone`, not `isIOS`). |

The rewritten decision row prose accurately reflects all four points: current file path, hook name, UA-probe mechanism, lazy `useState` memoization, supersession history (CR-01/WR-01), and the `SafariNavigator` interface's surviving role in the `isStandalone` branch.

### Field-count drift was a body claim, not frontmatter

Per 36-PATTERNS §16 and the plan's Task 2 wording, the "field count" drift could have been either (a) `metrics.files_changed:` mismatch OR (b) `UiStrings.install` field count mismatch. Analysis:

- `metrics.files_changed: 4` in frontmatter — verified against `key_files.created` (2 files: `installDismissed.ts`, `installDismissed.test.ts`) + `key_files.modified` (2 files: `storage/index.ts`, `content/strings.ts`) = 4. No drift; no edit needed.
- Body's `UiStrings.install` field count claim: SUMMARY body said `exactly 7 readonly string fields: bannerText, installButton, iosStepsButton, dismiss, iosStep1, iosStep2, iosStep3`. Canonical `src/content/strings.ts:141-151` shows 9 fields — adds `regionLabel` (line 142) and `settingsLabel` (line 150). Drift.

Edited the body line only. Preserved the original 7-field list as Phase 28-01's contribution (which is historically accurate — these 7 ARE what 28-01 added), but explicitly noted the canonical block carries 9 fields today with `regionLabel` from Phase 28 WR-06 and `settingsLabel` from Phase 29-01 cited as the additions. This honors the plan's "match canonical code" instruction while preserving the SUMMARY's historical accuracy about what 28-01 itself shipped.

`regionLabel` provenance verified via `git log --all -S 'regionLabel' -- src/content/strings.ts` → `7d8f4f2 fix(28): WR-06 localize banner region aria-label via strings.regionLabel`. `settingsLabel` provenance: `34d8939 feat(29-01): add settingsLabel key to UiStrings.install in both locales`.

### Recovery source was `f81f08f^`, not a parallel archive

The recovery path was unambiguous: both 28-01 and 28-03 SUMMARYs were deleted in a single commit (`f81f08f docs(phase-30): add security threat verification`, 2026-05-17 — apparently an unrelated cleanup wave that swept v1.4 phase dirs alongside the Phase 30 SECURITY.md addition). `git show f81f08f^:.planning/phases/28-phone-install-banner/28-0{1,3}-SUMMARY.md` yields the pre-deletion blobs. Byte-for-byte recovery confirmed via `diff` returning empty before drift fixes were applied.

Per 36-PATTERNS §16-17 placement decision option-a, the recovered files live at `.planning/phases/28-phone-install-banner/` (not at a hypothetical v1.4 archive location). The v1.4 archive backfill (`.planning/milestones/v1.4-phases/`) remains explicitly deferred per CONTEXT §Deferred and out of scope for HOUSE-08.

### Body-content edit allowed for HOUSE-08 (unlike HOUSE-05/07)

HOUSE-05 and HOUSE-07 were frontmatter-only `status: human_needed → passed` flips with no body change permitted. HOUSE-08 is different — the "field count" drift lives in the body, and the plan explicitly allows body edits for HOUSE-08: "If the drift is in a body paragraph rather than a frontmatter `metrics:` field, the edit may touch the body — that is allowed for HOUSE-08 (body content correction is the explicit deliverable, unlike HOUSE-05/07 which were frontmatter-only)." The 28-01 fix used this allowance; the 28-03 fix stayed in frontmatter as the decisions row is in YAML.

## Deviations from Plan

None — plan executed exactly as written. The W5-hardened semantics-aware Decision logic case #2 applied as designed (symbol present, semantics stale → rewrite the row). The plan's `<verify>` automated commands all returned the expected exit codes.

### Auth Gates

None — no commands required authentication; all operations were local git + filesystem mutations.

## Threat Flags

None. This plan was a doc-recovery + doc-edit operation; zero new code surface, zero `src/` touches, zero new network/auth/storage/privilege surface. Both threats in the plan's `<threat_model>` were addressed:

- **T-36-05-01 (Tampering — recovered SUMMARY content):** mitigated by `git show f81f08f^:` byte-for-byte recovery + `diff` verification before any edits applied.
- **T-36-05-02 (Spoofing — drift-fix edits):** mitigated by reading the canonical `src/` files first (`src/storage/installDismissed.ts`, `src/content/strings.ts`, `src/hooks/useIsStandaloneOrPhone.ts`, `src/components/InstallBanner.tsx`, `src/app/App.tsx`) and editing the SUMMARYs to match the code, not the other way around. Task 3 specifically applied the SEMANTICS check (current mechanism), not just symbol-name substitution.

## Deferred Observations (out of scope for Phase 36)

- **v1.4 archive backfill.** Phase 28 (and 29, all v1.4) is not currently archived at `.planning/milestones/v1.4-phases/`. Per CONTEXT §Deferred ("Phase 28 archive"), this remains a future bookkeeping pass — not part of HOUSE-08 nor any HOUSE-XX requirement. The drift-corrected SUMMARYs live at `.planning/phases/28-phone-install-banner/` per 36-PATTERNS §16-17 option-a.
- **Phase 30 SUMMARY.md `f81f08f` cleanup wave.** The commit `f81f08f docs(phase-30): add security threat verification` deleted 17 Phase 28 files and 16 Phase 29 files alongside its stated purpose. Out of HOUSE-08 scope — the wider Phase 28/29 dir recovery is not part of any HOUSE-XX requirement (HOUSE-08 names only the 28-01 and 28-03 SUMMARYs explicitly). A future bookkeeping pass could fully restore the v1.4 dirs if desired.
- **Pre-existing Phase 28 dir contents.** Before this plan, `.planning/phases/28-phone-install-banner/` did not exist at all. This plan created it (via `mkdir -p`) and populated only the two SUMMARYs required by HOUSE-08. The other 31 deleted Phase 28 files remain absent from HEAD — preserving HOUSE-08's narrow scope.

## Files Modified (2 total)

| Path | Change | Drift fixed | Source |
|------|--------|-------------|--------|
| `.planning/phases/28-phone-install-banner/28-01-SUMMARY.md` | Recovered from `f81f08f^` + 1 body line edited (`UiStrings.install` field-count claim) | Field count `7 → 9` (canonical) with Phase 28-01 contribution preserved | `src/content/strings.ts:141-151` (9 fields); `git log -S regionLabel/settingsLabel` for provenance |
| `.planning/phases/28-phone-install-banner/28-03-SUMMARY.md` | Recovered from `f81f08f^` + 1 frontmatter `decisions:` row rewritten | iOS-detect mechanism semantics (file path, hook return, UA probe, lazy useState) | `src/hooks/useIsStandaloneOrPhone.ts` lines 5-7, 17-23, 47, 108-110; commit d7561ce for CR-01 supersession |

Total: 205 line additions (most are the recovery; ~6 lines net of net-edit diff vs `f81f08f^`), 0 deletions, 0 body changes outside the 28-01 field-count line, 0 other decision rows touched in 28-03, 0 `src/` touches.

## Next Plans

This plan delivers HOUSE-08. Phase 36 success criterion #2 ("28-01/28-03 SUMMARY drift is corrected against the canonical code") is now satisfied. With HOUSE-01..05, HOUSE-06, HOUSE-07, and HOUSE-08 closed, Phase 36 has 4 of the 14 HOUSE-XX requirements remaining:

- **HOUSE-09** — v1→v2→v3 chained `migrateEnvelope` regression test (commit #6, `test(36):` prefix)
- **HOUSE-10** — re-archive v1.5 phase dirs to `.planning/milestones/v1.5-phases/` (commit #7)
- **HOUSE-11..13** — drop CLAUDE.md + `.claude/skills/spike-findings-hrv/` + gitignore `.claude/` (commit #8)
- **HOUSE-14** — green-gate + push to `origin/main` (closes phase)

Per CONTEXT D-05 commit cadence, the next plan (36-06) lands the HOUSE-09 test as commit #6 with the `test(36):` prefix.

## Self-Check: PASSED

Files exist:
- `.planning/phases/28-phone-install-banner/28-01-SUMMARY.md` — FOUND
- `.planning/phases/28-phone-install-banner/28-03-SUMMARY.md` — FOUND
- `.planning/phases/36-housekeeping-bookkeeping-reset/36-05-SUMMARY.md` — FOUND (this file)

Commits exist:
- `0d61f5c` — FOUND in `git log --oneline -3` (HEAD)

Per-file content checks:
- `28-01-SUMMARY.md` — body's `UiStrings.install` field-count line cites both Phase 28-01's 7 contributions and the canonical 9 — confirmed via `grep -n "9 fields today" .planning/phases/28-phone-install-banner/28-01-SUMMARY.md`
- `28-03-SUMMARY.md` — `decisions:` row contains `detectIsIOS()` and `useIsStandaloneOrPhone.ts` references — confirmed via grep
- Both files were recovered byte-for-byte from `f81f08f^` before drift edits applied (`diff` returned empty pre-edit)

Commit-level checks:
- HEAD commit subject matches plan's required wording: `docs(36): correct 28-01/28-03 SUMMARY drift — field count + superseded SafariNavigator ref (HOUSE-08)` — confirmed via `git log -1 --format=%s`
- HEAD commit touches exactly 2 files, both ending in `28-0[13]-SUMMARY.md` — confirmed via `git diff HEAD~1 --name-only | grep -c "28-0[13]-SUMMARY.md$"` = 2
- HEAD commit is not an amend — confirmed (sits atop `8d81f43`, the 36-04 metadata commit)
- No deletions in the commit — confirmed via `git diff --diff-filter=D --name-only HEAD~1 HEAD` returns empty

W5 semantics-check evidence captured in the "Task 3 verification evidence" section above (file path of iOS-detect implementation read, symbol/hook names found, per-claim comparison against the decision row's prose).

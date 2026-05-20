---
phase: 36-housekeeping-bookkeeping-reset
plan: 07
subsystem: planning/archive
tags: [housekeeping, archive, git-mv, v1.5, HOUSE-10]
dependency_graph:
  requires:
    - 36-01-restored-v1.5-phase-dirs
    - 36-02-backfilled-validation-security-artifacts
    - 36-03-verification-status-reflips
    - 36-04-summary-requirements-completed-frontmatter
    - 36-06-house-09-chained-migration-test
  provides:
    - HOUSE-10-closed   # v1.5 phase dirs re-archived to .planning/milestones/v1.5-phases/ with rename history preserved
  affects:
    - .planning/phases/30-multi-practice-architecture-switcher/
    - .planning/phases/31-navi-kriya-engine-session/
    - .planning/phases/32-learn-localization/
    - .planning/phases/33-close-gap-practice-02-resonant-settings-read-write-split-bra/
    - .planning/phases/34-stretch-as-a-distinct-practice/
    - .planning/phases/35-flute-cue-timbre-replace-chime/
    - .planning/milestones/v1.5-phases/30-multi-practice-architecture-switcher/
    - .planning/milestones/v1.5-phases/31-navi-kriya-engine-session/
    - .planning/milestones/v1.5-phases/32-learn-localization/
    - .planning/milestones/v1.5-phases/33-close-gap-practice-02-resonant-settings-read-write-split-bra/
    - .planning/milestones/v1.5-phases/34-stretch-as-a-distinct-practice/
    - .planning/milestones/v1.5-phases/35-flute-cue-timbre-replace-chime/
tech_stack:
  added: []
  patterns:
    - "Single git mv of 6 dirs in one command — preserves per-file rename history (git log --follow continues to trace through the move) and produces 106 R entries in git status (per-file rename detection)"
    - "Archive shape mirrors v1.0-phases/ / v1.0.1-phases/ / v1.1-phases/ / v1.2-phases/ convention per CONTEXT D-02 — full artifact carry-through (PLAN/SUMMARY per plan + phase-level VALIDATION/SECURITY/VERIFICATION/RESEARCH/REVIEW/UI-SPEC/PATTERNS/HUMAN-UAT/DISCUSSION-LOG/CONTEXT/.continue-here.md where present)"
    - "Backfilled artifacts from prior plans (36-02 VALIDATIONs, 36-03 VERIFICATION re-flip, 36-04 requirements-completed) travel with the move — verified post-commit at the new archive paths"
    - "D-05 commit #7 of ~7-8 logical-group commits — `docs(36):` prefix per D-07; single test(36): commit (36-06) was the only non-docs commit in the phase so far"
    - "CONTEXT D-01 single-batch flow closes here: restored upfront (36-01) -> backfilled in place (36-02..06) -> archived at end (36-07). Working tree returns to clean for all .planning/phases/3[0-5]-* paths"
key_files:
  created: []
  moved:
    - { from: ".planning/phases/30-multi-practice-architecture-switcher/", to: ".planning/milestones/v1.5-phases/30-multi-practice-architecture-switcher/" }
    - { from: ".planning/phases/31-navi-kriya-engine-session/", to: ".planning/milestones/v1.5-phases/31-navi-kriya-engine-session/" }
    - { from: ".planning/phases/32-learn-localization/", to: ".planning/milestones/v1.5-phases/32-learn-localization/" }
    - { from: ".planning/phases/33-close-gap-practice-02-resonant-settings-read-write-split-bra/", to: ".planning/milestones/v1.5-phases/33-close-gap-practice-02-resonant-settings-read-write-split-bra/" }
    - { from: ".planning/phases/34-stretch-as-a-distinct-practice/", to: ".planning/milestones/v1.5-phases/34-stretch-as-a-distinct-practice/" }
    - { from: ".planning/phases/35-flute-cue-timbre-replace-chime/", to: ".planning/milestones/v1.5-phases/35-flute-cue-timbre-replace-chime/" }
  modified: []
requirements-completed:
  - HOUSE-10
decisions:
  - "Single git mv command for all 6 dirs (not 6 individual mv commands) — produces one atomic working-tree mutation, one staged index state, and a single commit-ready set of rename entries. Matches CONTEXT D-05 commit #7 wording verbatim (`docs(36): re-archive v1.5 phase dirs to .planning/milestones/v1.5-phases/ (HOUSE-10) -- single git mv of all 6 dirs`)."
  - "Archive shape mirrors v1.0-phases/v1.0.1-phases/v1.1-phases/v1.2-phases convention (CONTEXT D-02) — full artifact carry-through. No subset filtering, no exclusion of PATTERNS/RESEARCH/UI-SPEC/REVIEW; every file present in the working tree at move time traveled with the dir. The 30-31 dirs carry the original v1.5-era frontmatter convention (dashed: tech-stack, key-files, key-decisions); the 32-35 dirs carry the post-flip convention (underscored: tech_stack, key_files, decisions). Frontmatter convention divergence stays deferred per CONTEXT-deferred entry and 36-PATTERNS §1 -- not in HOUSE-10 scope."
  - "Phase 28 SUMMARYs (28-01-SUMMARY.md / 28-03-SUMMARY.md, restored + drift-fixed in 36-05) explicitly STAY at .planning/phases/28-phone-install-banner/ — Phase 28 is v1.4 and the v1.4-phases archive does not exist. Per CONTEXT specifics line 141 and 36-PATTERNS option (a), the v1.4 archive backfill remains deferred and out of HOUSE-10 scope. The current commit's git status post-move shows zero entries under .planning/phases/28-* (untouched)."
  - "Status vocabulary cross-check (per checker feedback): the VALIDATION.md status field uses the gsd-nyquist-auditor canonical vocabulary `draft / ready / verified / approved` — Phase 33 and Phase 35 VALIDATION.md ship `status: verified` (set by 36-02). The VERIFICATION.md status field uses the different verifier vocabulary `passed / human_needed` — Phase 31 VERIFICATION.md ships `status: passed` (re-flipped by 36-03). The verify command (Task 1 automated) asserts both vocabularies at the moved paths to confirm the prior plans' edits traveled byte-for-byte."
  - "Rename detection at the per-file level (106 R entries in git status pre-commit) reflects git's default rename-detection behavior — `git mv` stages each file with its old and new path. `git show --stat HEAD | grep -c '=>'` returns 2 only because the stat summary is truncated; the underlying commit carries rename information for every file, and `git log --follow` will trace any moved file through the rename."
metrics:
  duration: 1m
  completed: 2026-05-20
  tasks_completed: 2
  files_created: 0
  files_modified: 0
  files_moved: 106
  dirs_moved: 6
  commits_created: 1
---

# Phase 36 Plan 07: HOUSE-10 Re-archive v1.5 phase dirs Summary

**One-liner:** Closed HOUSE-10 by a single `git mv` of all 6 v1.5 phase dirs (Phases 30–35) from `.planning/phases/` to `.planning/milestones/v1.5-phases/`, preserving per-file rename history (106 R entries). Closes Phase 36 success criterion #3 ("v1.5 phase directories re-archived"). All backfilled artifacts from prior plans (Phase 33/35 VALIDATION `status: verified` from 36-02, Phase 31 VERIFICATION `status: passed` from 36-03, Phase 32/33/34/35 SUMMARY `requirements-completed:` from 36-04) traveled with the move byte-for-byte; verified post-commit at the new archive paths. Single `docs(36):` commit `55d057a` atop `99ec7f0`; working tree returns to clean for all `.planning/phases/3[0-5]-*` paths — CONTEXT D-01 single-batch restore→backfill→archive flow closes here.

## What Shipped

- **HOUSE-10 closed** — `.planning/milestones/v1.5-phases/` now carries all 6 v1.5 phase dirs:
  - `30-multi-practice-architecture-switcher/`
  - `31-navi-kriya-engine-session/`
  - `32-learn-localization/`
  - `33-close-gap-practice-02-resonant-settings-read-write-split-bra/`
  - `34-stretch-as-a-distinct-practice/`
  - `35-flute-cue-timbre-replace-chime/`

- **Single commit** — `55d057a docs(36): re-archive v1.5 phase dirs to .planning/milestones/v1.5-phases/ (HOUSE-10)` atop `99ec7f0`. 106 file renames; zero deletions; zero additions; zero source-code touches. Commit body lists the six phases and references the v1.0/v1.0.1/v1.1/v1.2 archive shape as the precedent (CONTEXT D-02).

- **D-05 commit #7 of ~7-8 logical-group commits.** The remaining commits (HOUSE-11..13 cleanup + HOUSE-14 push) ship in plans 36-08 / 36-09.

- **Single-batch flow closes** — CONTEXT D-01 ("working tree restored + dirty in the middle, clean at end") is now satisfied. `git status --porcelain` for paths under `.planning/phases/3[0-5]-*` and `.planning/milestones/v1.5-phases/` returns zero entries; the only remaining untracked file in the working tree is `.claude/scheduled_tasks.lock` (Claude Code runtime artifact, unrelated to this plan — will be covered by HOUSE-13's `.claude/` gitignore in plan 36-08).

## Tasks Executed

| # | Task | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 1 | Create archive parent dir + single git mv of all 6 v1.5 dirs | done | `55d057a` | `mkdir -p .planning/milestones/v1.5-phases/` then `git mv .planning/phases/30-* …35-* .planning/milestones/v1.5-phases/`. 106 R entries staged. Post-move source listing returns zero entries matching `^3[0-5]-`; destination listing returns exactly 6 entries. Backfilled status fields (Phase 31 VERIFICATION `status: passed`, Phase 33/35 VALIDATION `status: verified`, Phase 32/33/34/35 SUMMARY `requirements-completed:`) verified at the new archive paths. Phase 28-* dirs untouched. |
| 2 | Stage and commit the archive move (D-05 commit #7) | done | `55d057a` | `git commit` with HEREDOC body per the commit_protocol. No amend. No `git add -A`. HEAD commit subject matches the plan's required wording exactly. Working tree clean for all affected paths post-commit; only `.claude/scheduled_tasks.lock` remains (unrelated — will be covered by HOUSE-13). |

## Acceptance Criteria

All Task 1 and Task 2 acceptance criteria from `36-07-PLAN.md` pass.

**Task 1 (Move):**
- ✓ `.planning/phases/` contains zero entries matching `^3[0-5]-` (verified: `ls .planning/phases/ | grep -c '^3[0-5]-'` returns 0)
- ✓ `.planning/milestones/v1.5-phases/` contains exactly 6 dirs matching `^3[0-5]-` (verified: count returns 6; listing matches the 6 expected dir names)
- ✓ `git status --porcelain` showed 106 `R` (rename) entries pre-commit pairing each phase source path to its archive destination
- ✓ Phase 31's archived `31-VERIFICATION.md` still carries `status: passed` (verified at the new archive path — VERIFICATION vocabulary `passed`/`human_needed`)
- ✓ Phase 33's archived `33-VALIDATION.md` still carries `status: verified` (verified — VALIDATION vocabulary `draft`/`ready`/`verified`/`approved`)
- ✓ Phase 35's archived `35-VALIDATION.md` still carries `status: verified` (verified)
- ✓ Phase 32-03/33-01/34-11/35-02 archived SUMMARYs still carry `requirements-completed:` (all 4 verified — 36-04 edits traveled)
- ✓ `.planning/phases/28-phone-install-banner/` is unchanged (not part of the move — verified `ls -d` returns the path; git status shows zero entries under `.planning/phases/28-*`)

**Task 2 (Commit):**
- ✓ HEAD commit subject matches plan wording: `docs(36): re-archive v1.5 phase dirs to .planning/milestones/v1.5-phases/ (HOUSE-10)`
- ✓ HEAD commit shows rename detection (`git log --diff-filter=R HEAD~1..HEAD` returns the commit hash; the commit is rename-typed)
- ✓ HEAD commit is not an amend (sits atop `99ec7f0`, the 36-06 metadata commit)
- ✓ `git status --porcelain` for the affected path set (`.planning/phases/3[0-5]-*` and `.planning/milestones/v1.5-phases/`) returns zero entries
- ✓ Working tree clean for the v1.5 archive set (full `git status --porcelain` shows only `.claude/scheduled_tasks.lock` — unrelated runtime file)
- ✓ Zero deletions in the commit (verified: `git diff --diff-filter=D --name-only HEAD~1 HEAD` returns empty)

**Plan `<verification>` block:**
- ✓ All six v1.5 dirs land at `.planning/milestones/v1.5-phases/` (Task 1 verify)
- ✓ Source paths under `.planning/phases/3[0-5]-*` are empty (Task 1 verify)
- ✓ Backfilled artifacts (31 VERIFICATION status: passed; 33/35 VALIDATION status: verified; 32/33/34/35 requirements-completed) all traveled with the move (Task 1 verify)
- ✓ Working tree clean for the affected paths after commit (Task 2 verify)
- ✓ Single commit lands with rename tracking (Task 2 verify)

## Key Decisions

### Single `git mv` command vs 6 individual `git mv` calls

CONTEXT D-05 commit #7 wording is "single `git mv` of all 6 dirs". The plan honored this verbatim: one shell command containing all 6 source paths and the single destination dir. Pros: atomic working-tree mutation, single index state for staging, one commit-ready set of rename entries; matches the wording in CONTEXT verbatim; cleaner audit trail. The alternative (6 sequential `git mv` calls) would produce the same end-state but introduce 6 intermediate working-tree + index states with no benefit.

### Full artifact carry-through (CONTEXT D-02) — no subset filtering

`.planning/milestones/v1.1-phases/13-inner-ring-ux-symmetry/` was the closest precedent: it carries PLAN/SUMMARY per plan + every phase-level artifact (VALIDATION/SECURITY/VERIFICATION/RESEARCH/REVIEW/UI-SPEC/PATTERNS/HUMAN-UAT/DISCUSSION-LOG/CONTEXT/.continue-here.md). The plan honored this: zero files were excluded from the move. The 30-31 dirs ship with the v1.5-era dashed-frontmatter convention (`tech-stack:`, `key-files:`, `key-decisions:`); the 32-35 dirs ship with the post-flip underscored convention (`tech_stack:`, `key_files:`, `decisions:`). Convention divergence stays deferred per CONTEXT and 36-PATTERNS §1 — out of HOUSE-10 scope.

### Phase 28 SUMMARYs stay at `.planning/phases/28-phone-install-banner/`

CONTEXT specifics line 141 explicitly flags Phase 28 as v1.4 with no `.planning/milestones/v1.4-phases/` archive. 36-PATTERNS option (a) recommends leaving the 28-* dir in `.planning/phases/` and deferring the v1.4 archive backfill to a future bookkeeping pass. This plan honored that recommendation: the `git mv` command lists exactly 6 source paths (30 through 35); Phase 28 is not in the command. Verified post-commit: `ls -d .planning/phases/28-phone-install-banner` returns the path; git status shows zero changes under `.planning/phases/28-*`.

### Rename detection at the per-file level (106 R entries)

`git mv` stages each individual file with its old and new path. With git's default rename-detection enabled, `git status --porcelain` reported 106 `R` entries pre-commit (one per file moved). The commit itself preserves rename information for every file — `git log --follow` will trace any moved file through the rename to its original creation. The `git show --stat HEAD | grep -c '=>'` count of 2 is the stat-summary's display truncation, not the underlying rename count.

### Status vocabulary cross-check

Per the checker feedback noted in 36-07-PLAN.md, the VALIDATION.md and VERIFICATION.md status fields use distinct vocabularies:
- **VALIDATION.md** (gsd-nyquist-auditor): `draft / ready / verified / approved` — Phase 33/35 ship `status: verified`.
- **VERIFICATION.md** (gsd-verifier): `passed / human_needed` — Phase 31 ships `status: passed`.

The Task 1 automated verify command asserts both vocabularies at the moved paths to confirm the prior plans' edits (36-02 VALIDATION backfill; 36-03 VERIFICATION re-flip) traveled byte-for-byte through the `git mv`.

## Deviations from Plan

None — plan executed exactly as written. Both Task 1 (move) and Task 2 (commit) acceptance criteria pass without auto-fix, gap-fill, or rule-1/2/3 deviations.

### Auth Gates

None — all operations were local file moves and `git commit` / `git mv`; no commands required authentication.

## Threat Flags

None. The plan's `<threat_model>` listed three threats — all addressed:

- **T-36-07-01 (Tampering — archive contents during move):** accepted disposition. `git mv` is byte-preserving; Task 1 verify confirms the prior plans' edits (`status: verified`, `status: passed`, `requirements-completed:`) traveled with the move. Verified at the new archive paths post-commit.
- **T-36-07-02 (Information Disclosure — rename history):** accepted disposition. The new archive paths are public planning artifacts; rename history is the audit trail, not a leak.
- **T-36-07-03 (Repudiation — move vs delete+add):** mitigated. The operation used `git mv` (not `mv` + `git add`), so rename detection is preserved in `git log --follow` for every moved file. The commit shows 0 deletions (`git diff --diff-filter=D HEAD~1 HEAD` returns empty) and 0 raw additions — it is purely renames.

## Files Moved (106 total)

The single `git mv` command moved 106 files across 6 dirs. The per-dir file counts in the working tree at move time:

| Source dir | File count | Destination dir |
|------------|------------|-----------------|
| `.planning/phases/30-multi-practice-architecture-switcher/` | 18 | `.planning/milestones/v1.5-phases/30-multi-practice-architecture-switcher/` |
| `.planning/phases/31-navi-kriya-engine-session/` | 25 | `.planning/milestones/v1.5-phases/31-navi-kriya-engine-session/` |
| `.planning/phases/32-learn-localization/` | 14 | `.planning/milestones/v1.5-phases/32-learn-localization/` |
| `.planning/phases/33-close-gap-practice-02-resonant-settings-read-write-split-bra/` | 11 | `.planning/milestones/v1.5-phases/33-close-gap-practice-02-resonant-settings-read-write-split-bra/` |
| `.planning/phases/34-stretch-as-a-distinct-practice/` | 31 | `.planning/milestones/v1.5-phases/34-stretch-as-a-distinct-practice/` |
| `.planning/phases/35-flute-cue-timbre-replace-chime/` | 7 | `.planning/milestones/v1.5-phases/35-flute-cue-timbre-replace-chime/` |
| **Total** | **106** | — |

Zero source-code touches (this plan is purely a planning-doc archive move). Zero `src/` files modified. Zero deletions. Zero additions in the unified-diff sense — every change is a rename.

## Next Plans

This plan delivers HOUSE-10. Phase 36 success criterion #3 ("v1.5 phase directories re-archived to `.planning/milestones/v1.5-phases/`") is now satisfied.

With HOUSE-01..10 closed, Phase 36 has 4 of the 14 HOUSE-XX requirements remaining:

- **HOUSE-11..13** — drop root `CLAUDE.md` + `.claude/skills/spike-findings-hrv/` + `.gitignore` `.claude/` (plan 36-08, commit #8 — combined or split per planner readability call per CONTEXT D-05 alt). The pending `.claude/scheduled_tasks.lock` untracked file in the working tree will be covered by the `.claude/` gitignore line.
- **HOUSE-14** — green-gate (`tsc && lint && build && test`) + push to `origin/main` (plan 36-09). Plan 36-09 also carries the lint-debt disposition flag from 36-06 (pre-existing 53 errors / 3 warnings on main): accept-and-push, split-gate, or focused lint sweep.

Per CONTEXT D-05 commit cadence, the next plan (36-08) lands the HOUSE-11..13 cleanup; the v1.x procedural backlog closes with the HOUSE-14 push in 36-09.

## Self-Check: PASSED

Files exist:
- `.planning/phases/36-housekeeping-bookkeeping-reset/36-07-SUMMARY.md` — FOUND (this file)
- `.planning/milestones/v1.5-phases/30-multi-practice-architecture-switcher/30-04-SUMMARY.md` — FOUND (Phase 30 archived)
- `.planning/milestones/v1.5-phases/31-navi-kriya-engine-session/31-VERIFICATION.md` — FOUND (Phase 31 archived; `status: passed`)
- `.planning/milestones/v1.5-phases/32-learn-localization/32-03-SUMMARY.md` — FOUND (Phase 32 archived; `requirements-completed:` present)
- `.planning/milestones/v1.5-phases/33-close-gap-practice-02-resonant-settings-read-write-split-bra/33-VALIDATION.md` — FOUND (Phase 33 archived; `status: verified`)
- `.planning/milestones/v1.5-phases/34-stretch-as-a-distinct-practice/34-11-SUMMARY.md` — FOUND (Phase 34 archived; `requirements-completed:` present)
- `.planning/milestones/v1.5-phases/35-flute-cue-timbre-replace-chime/35-VALIDATION.md` — FOUND (Phase 35 archived; `status: verified`)
- `.planning/phases/28-phone-install-banner/` — FOUND (unchanged — not part of move)

Commits exist:
- `55d057a` — FOUND in `git log --oneline -3` (HEAD)

Per-file content checks (post-move, at archive paths):
- `31-VERIFICATION.md` contains `^status: passed$` (grep -c returns 1) — VERIFICATION vocabulary
- `33-VALIDATION.md` contains `^status: verified$` (grep -c returns 1) — VALIDATION vocabulary
- `35-VALIDATION.md` contains `^status: verified$` (grep -c returns 1) — VALIDATION vocabulary
- `32-03-SUMMARY.md` contains `^requirements-completed:` (grep -c returns 1)
- `33-01-SUMMARY.md` contains `^requirements-completed:` (grep -c returns 1)
- `34-11-SUMMARY.md` contains `^requirements-completed:` (grep -c returns 1)
- `35-02-SUMMARY.md` contains `^requirements-completed:` (grep -c returns 1)

Commit-level checks:
- HEAD commit subject matches plan's required wording exactly: `docs(36): re-archive v1.5 phase dirs to .planning/milestones/v1.5-phases/ (HOUSE-10)`
- HEAD commit is rename-typed (`git log --diff-filter=R HEAD~1..HEAD` returns the commit hash)
- HEAD commit is not an amend (sits atop `99ec7f0`, the 36-06 metadata commit)
- Zero deletions in the commit (`git diff --diff-filter=D --name-only HEAD~1 HEAD` returns empty)
- Working tree clean for all `.planning/phases/3[0-5]-*` and `.planning/milestones/v1.5-phases/` paths (only `.claude/scheduled_tasks.lock` remains untracked — unrelated runtime file, HOUSE-13 will cover it)

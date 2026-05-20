---
phase: 36-housekeeping-bookkeeping-reset
plan: 08
subsystem: planning/cleanup
tags: [housekeeping, cleanup, gitignore, claude-config, HOUSE-11, HOUSE-12, HOUSE-13]
dependency_graph:
  requires:
    - 36-07-v1.5-phase-dirs-re-archived
  provides:
    - HOUSE-11-closed   # root CLAUDE.md removed from repo
    - HOUSE-12-closed   # .claude/skills/spike-findings-hrv/ (21 tracked files) removed from repo
    - HOUSE-13-closed   # .claude/ entry in .gitignore prevents future per-project Claude Code file commits
  affects:
    - CLAUDE.md
    - .claude/skills/spike-findings-hrv/
    - .gitignore
tech_stack:
  added: []
  patterns:
    - "Single combined commit for HOUSE-11..13 per CONTEXT D-05 Claude's Discretion ('planner picks based on diff readability') — the three changes are tightly coupled (CLAUDE.md only existed to point at the removed skill; the .gitignore entry prevents the just-removed dir from being re-committed), so one commit reads cleaner than three."
    - "Commit-prefix vocabulary: `docs(36):` per CONTEXT D-07 default — the dominant change is doc/config removal, not a `chore(36):` gitignore-only split."
    - "Per-file `git rm` (CLAUDE.md, single file) then `git rm -r` (spike-findings-hrv/ dir) — no `git add -A`, no `--cached`; both index and working-tree copies are removed in one operation per HOUSE-12 wording 'remove entirely'."
    - "Ordering: append `.gitignore` first, then `git rm`s. This way the gitignore rule is active before the dir removal lands; `.claude/scheduled_tasks.lock` (the local Claude Code runtime artifact previously dangling untracked) is no longer flagged by `git status` after the commit — confirms the gate works as intended."
    - "Status vocabulary: this plan does NOT touch any *VALIDATION.md or *VERIFICATION.md frontmatter — the prior 7 plans (36-01..07) handled those vocabularies; 36-08 is purely repo content cleanup."
key_files:
  created:
    - ".planning/phases/36-housekeeping-bookkeeping-reset/36-08-SUMMARY.md"
  modified:
    - ".gitignore"
  deleted:
    - "CLAUDE.md"
    - ".claude/skills/spike-findings-hrv/SKILL.md"
    - ".claude/skills/spike-findings-hrv/references/app-icon.md"
    - ".claude/skills/spike-findings-hrv/references/audio-cues.md"
    - ".claude/skills/spike-findings-hrv/references/multi-practice-architecture.md"
    - ".claude/skills/spike-findings-hrv/references/navi-kriya-practice.md"
    - ".claude/skills/spike-findings-hrv/sources/001-multi-practice-shell/README.md"
    - ".claude/skills/spike-findings-hrv/sources/001-multi-practice-shell/index.html"
    - ".claude/skills/spike-findings-hrv/sources/002-switcher-ux/README.md"
    - ".claude/skills/spike-findings-hrv/sources/002-switcher-ux/index.html"
    - ".claude/skills/spike-findings-hrv/sources/003-navi-kriya-practice/README.md"
    - ".claude/skills/spike-findings-hrv/sources/003-navi-kriya-practice/index.html"
    - ".claude/skills/spike-findings-hrv/sources/004-countdown-beep-alternatives/README.md"
    - ".claude/skills/spike-findings-hrv/sources/004-countdown-beep-alternatives/index.html"
    - ".claude/skills/spike-findings-hrv/sources/005-session-end-sound-alternatives/README.md"
    - ".claude/skills/spike-findings-hrv/sources/005-session-end-sound-alternatives/index.html"
    - ".claude/skills/spike-findings-hrv/sources/006-app-icon-alternatives/README.md"
    - ".claude/skills/spike-findings-hrv/sources/006-app-icon-alternatives/index.html"
    - ".claude/skills/spike-findings-hrv/sources/007-three-practice-switcher/README.md"
    - ".claude/skills/spike-findings-hrv/sources/007-three-practice-switcher/index.html"
    - ".claude/skills/spike-findings-hrv/sources/008-chime-replacement-timbre/README.md"
    - ".claude/skills/spike-findings-hrv/sources/008-chime-replacement-timbre/index.html"
requirements-completed:
  - HOUSE-11
  - HOUSE-12
  - HOUSE-13
decisions:
  - "Combined single commit for HOUSE-11..13 (vs CONTEXT D-05 alt-split into `docs(36): remove …` + `chore(36): gitignore …`). Justification: the three changes are tightly coupled — `CLAUDE.md` only existed to point at the removed skill, and the new `.gitignore` line directly protects the just-removed `.claude/` namespace from being re-committed by accident. Splitting into two commits would leave the gitignore line as an orphan whose motivation is not obvious without the deletes. CONTEXT D-05 Claude's Discretion explicitly permits this single-commit shape."
  - "Ordering: `.gitignore` append first (Task 1), then `git rm` (Task 2), then stage `.gitignore` + commit (Task 3). The order matters because once `.claude/` is gitignored, subsequent `git status` calls during execution no longer surface the untracked local Claude Code files (settings.local.json, scheduled_tasks.lock, worktrees/) — clean signal during the remaining tasks. The `git rm -r` still removes both index and working-tree copies (no `--cached` flag) because HOUSE-12 wording says 'remove entirely'."
  - "Revised file count: plan 36-08 documents the spike-findings-hrv tracked file count as 21 (revised from CONTEXT-original '22'). The mismatch was flagged in the plan's objective and the actual count was sanity-checked at execute time via `git ls-files .claude/skills/spike-findings-hrv/ | wc -l` returning 21. The plan's verification thresholds (22 deleted items = 1 CLAUDE.md + 21 spike-findings) were honored exactly."
  - "`.gitignore` insertion site: a new section comment `# Claude Code per-project files` followed by `.claude/` on its own line at file tail. Matches the existing block structure (e.g., `# Editor directories and files` + entries). The entry is on its own line (not inline-appended to another entry); it is the literal `.claude/` (with trailing slash, no `*` glob, no nested-only `.claude/*`). `grep -c '^\\.claude/$' .gitignore` returns exactly 1."
  - "Local working-tree side effect (intentional): `.claude/scheduled_tasks.lock`, `.claude/settings.local.json`, `.claude/worktrees/` (Claude Code runtime artifacts not part of this plan) remain on disk after the commit. The new gitignore rule means they are no longer flagged by `git status` and cannot be staged by accident. The `git rm -r .claude/skills/spike-findings-hrv/` only removed the spike-findings sub-tree (tracked entries) — the parent `.claude/` dir itself stays on disk with its other contents, which is the desired outcome."
metrics:
  duration: 1m
  completed: 2026-05-20
  tasks_completed: 3
  files_created: 1
  files_modified: 1
  files_deleted: 22
  commits_created: 1
---

# Phase 36 Plan 08: HOUSE-11..13 Drop CLAUDE.md + spike-findings-hrv skill + gitignore .claude/ Summary

**One-liner:** Closed HOUSE-11, HOUSE-12, HOUSE-13 in a single combined commit `4a8263c docs(36): drop root CLAUDE.md + .claude/skills/spike-findings-hrv/ and gitignore .claude/ (HOUSE-11..13)` atop `38d5b61`. Removed the now-orphan root `CLAUDE.md` (whose only content was a pointer to the removed skill), `git rm -r`'d the `.claude/skills/spike-findings-hrv/` directory (21 tracked files — content already absorbed into v1.5 phases / codified in `.planning/spikes/MANIFEST.md`), and added a `.claude/` entry to `.gitignore` under a new `# Claude Code per-project files` section to prevent future per-project Claude Code files (settings.local.json, scheduled_tasks.lock, worktrees/) from being re-committed by accident. 23 files changed; 1 modification + 22 deletions; zero `src/` touches. Phase 36 success criterion #4 ("`CLAUDE.md` + spike-findings-hrv removed, `.claude/` in `.gitignore`") is now closed. CONTEXT D-05 commit #8 of ~7-8 logical-group commits. The phase's final commit (HOUSE-14 — green-gate + `git push origin main`) ships in plan 36-09.

## What Shipped

- **HOUSE-11 closed** — root `CLAUDE.md` removed from the repo. `git ls-files | grep -c '^CLAUDE\.md$'` returns 0. The file only carried a `Skill("spike-findings-hrv")` pointer (5 lines), which became dead after HOUSE-12.
- **HOUSE-12 closed** — `.claude/skills/spike-findings-hrv/` and its 21 tracked files removed from the repo. `git ls-files | grep -c '^\.claude/skills/spike-findings-hrv/'` returns 0. The skill's content was either absorbed into v1.5 phase artifacts (the spike findings were the source material for Phases 30-35) or codified in `.planning/spikes/MANIFEST.md` Requirements, which is the canonical v2.0 design contract.
- **HOUSE-13 closed** — `.gitignore` now carries a `.claude/` entry on its own line under a new `# Claude Code per-project files` section. `grep -c '^\.claude/$' .gitignore` returns exactly 1. `git check-ignore -q .claude/` exits 0. Future Claude Code per-project files (settings.local.json, scheduled_tasks.lock, worktrees/, and any new per-project artifact) cannot be re-committed by accident.
- **Single commit** — `4a8263c docs(36): drop root CLAUDE.md + .claude/skills/spike-findings-hrv/ and gitignore .claude/ (HOUSE-11..13)` atop `38d5b61`. 23 files changed: 1 modified (`.gitignore`) + 22 deletions. 3 insertions, 3974 deletions. Zero source-code touches. Not an amend.
- **D-05 commit #8 of ~7-8 logical-group commits.** The phase's final commit (HOUSE-14 green-gate + push) ships in plan 36-09.
- **Working tree clean** — `git status --porcelain` returns empty after the commit. The previously-untracked `.claude/scheduled_tasks.lock` no longer surfaces because the new `.gitignore` rule covers it.

## Tasks Executed

| # | Task | Status | Files | Notes |
|---|------|--------|-------|-------|
| 1 | Append `.claude/` to `.gitignore` (HOUSE-13) | done | `.gitignore` | Pre-check confirmed `.claude/` was not already present (`grep -c '^\.claude/$' .gitignore` returned 0 before edit, 1 after). New section comment `# Claude Code per-project files` followed by `.claude/` on its own line at file tail. All previously-present `.gitignore` entries (logs, node_modules/dist/dist-ssr, editor configs) preserved verbatim. Ordering note: appending the gitignore BEFORE the `git rm`s in Task 2 means the rule is active when Task 2 runs — but `git rm` still removes tracked entries from both index and working tree regardless of `.gitignore` (gitignore is index-aware, only affects untracked-file decisions). |
| 2 | Remove tracked CLAUDE.md and .claude/skills/spike-findings-hrv/ (HOUSE-11, HOUSE-12) | done | `CLAUDE.md`, `.claude/skills/spike-findings-hrv/**` (21 tracked files) | Sanity-checked tracked file count: `git ls-files .claude/skills/spike-findings-hrv/ \| wc -l` returned **21** (matches the plan's revised count; original CONTEXT said 22). `git rm CLAUDE.md` — single-file removal. `git rm -r .claude/skills/spike-findings-hrv/` — recursive removal, plain `git rm -r` (no `--cached`) per HOUSE-12 wording 'remove entirely'. Post-removal: `test ! -f CLAUDE.md` passed; `test ! -d .claude/skills/spike-findings-hrv` passed. Staged D-entries totaled **22** (1 CLAUDE.md + 21 spike-findings). |
| 3 | Stage `.gitignore` change and commit (D-05 commit #8) | done | `4a8263c` | `git add .gitignore` (explicit path, no `-A`). The `git rm`s in Task 2 already staged the deletes. `git commit` with HEREDOC body. Subject matches plan wording exactly: `docs(36): drop root CLAUDE.md + .claude/skills/spike-findings-hrv/ and gitignore .claude/ (HOUSE-11..13)`. Body lists the three HOUSE-XX items with their justifications. Not an amend. Post-commit: HEAD subject contains `HOUSE-11..13`, deletion count = 22, `.gitignore` modified count = 1, `git check-ignore -q .claude/` exits 0, working tree clean. |

## Acceptance Criteria

All Task 1, Task 2, and Task 3 acceptance criteria from `36-08-PLAN.md` pass.

**Task 1 (gitignore append):**
- ✓ `.gitignore` contains exactly one line that is `.claude/` (no trailing space, no `*` glob, no nested-only `.claude/*`)
- ✓ All previously-present `.gitignore` entries are preserved (logs section, `node_modules` / `dist` / `dist-ssr` / `*.local`, editor section)
- ✓ The new entry is on its own line (not inline-appended to another entry) — placed under a new `# Claude Code per-project files` section comment for readability

**Task 2 (remove tracked files):**
- ✓ `CLAUDE.md` does not exist in the working tree (`test ! -f CLAUDE.md` passed)
- ✓ `.claude/skills/spike-findings-hrv/` does not exist in the working tree (`test ! -d .claude/skills/spike-findings-hrv` passed)
- ✓ `git status --porcelain` showed one `D  CLAUDE.md` entry (staged delete) pre-commit
- ✓ `git status --porcelain | grep -c "^D.*\.claude/skills/spike-findings-hrv"` returned 21 (the 21 tracked files in the skill dir)
- ✓ No other files staged for deletion (no incidental deletes beyond the targets)

**Task 3 (commit):**
- ✓ HEAD commit subject matches plan wording exactly: `docs(36): drop root CLAUDE.md + .claude/skills/spike-findings-hrv/ and gitignore .claude/ (HOUSE-11..13)`
- ✓ HEAD commit shows `.gitignore` modified (1 file, `git diff HEAD~1 --name-status | grep -cE '^M\s*\.gitignore$'` returned 1)
- ✓ HEAD commit shows 22 deletions (1 for `CLAUDE.md` + 21 for skill files; `git diff HEAD~1 --name-status | grep -c '^D'` returned 22 ≥ 22)
- ✓ HEAD commit is not an amend (sits atop `38d5b61`, the 36-07 metadata commit)
- ✓ `git ls-files | grep -c '^CLAUDE\.md$'` returns 0
- ✓ `git ls-files | grep -c '^\.claude/skills/spike-findings-hrv/'` returns 0
- ✓ `git check-ignore -q .claude/` exits 0 (the rule is active)

**Plan `<verification>` block:**
- ✓ `.gitignore` carries `.claude/` (Task 1)
- ✓ `CLAUDE.md` and `.claude/skills/spike-findings-hrv/` are gone from working tree and index (Task 2)
- ✓ Single commit lands cleanly with 1 modify + 22 deletes (Task 3)
- ✓ `git check-ignore -q .claude/` exits 0 (the rule is active)

## Key Decisions

### Single combined commit vs split into `docs(36):` + `chore(36):` (CONTEXT D-05 Claude's Discretion)

CONTEXT D-05 proposed commit #8 as either a single combined commit OR a split into `docs(36): remove CLAUDE.md and .claude/skills/spike-findings-hrv/` + `chore(36): gitignore .claude/`. Per CONTEXT Claude's Discretion ("planner picks based on diff readability"), this plan shipped ONE combined commit because the three items are tightly coupled:

1. `CLAUDE.md` only existed to point at the spike-findings-hrv skill (HOUSE-12's removal target). Removing the skill without removing CLAUDE.md would leave the pointer dangling.
2. The new `.gitignore` line directly protects the just-removed `.claude/` namespace from being re-committed by accident. The motivation for the gitignore line is most obvious when read alongside the deletes.
3. A single commit reads cleaner than three for a coordinated cleanup — `git show 4a8263c` displays the full intent on one screen.

The alternative (3 separate commits) would have introduced 2 intermediate working-tree states with no audit-trail benefit. Splitting into 2 commits (deletes vs gitignore) would have left the gitignore as an orphan whose motivation is unclear without the context of the deletes.

### Order: gitignore first, then `git rm`s, then commit

The execution order was: (1) append `.gitignore`, (2) `git rm CLAUDE.md` + `git rm -r .claude/skills/spike-findings-hrv/`, (3) stage `.gitignore` + commit. The reasoning:

- Once `.claude/` is gitignored, subsequent `git status` calls during execution no longer surface the untracked local Claude Code files (`.claude/scheduled_tasks.lock`, `.claude/settings.local.json`, `.claude/worktrees/`). This means Task 2's post-rm `git status` output is clean and easy to interpret — exactly 22 D-entries appear.
- `git rm` (without `--cached`) still removes both the index and working-tree copies regardless of gitignore status — the rule only affects untracked-file decisions. So the ordering does NOT change behavior; it just makes the intermediate `git status` outputs cleaner.
- Plain `git rm -r .claude/skills/spike-findings-hrv/` (not `--cached`) is the correct choice per HOUSE-12 wording "remove entirely". The user-local skill files are gone from disk; the dir itself is gone. Other `.claude/*` files (scheduled_tasks.lock, settings.local.json, worktrees/) remain on disk because they were never tracked — they are now ignored.

### Revised file count: 21 tracked, not 22

The original `36-CONTEXT.md` cited "22 tracked files" for `.claude/skills/spike-findings-hrv/`. The plan revised this to 21 (sanity-checked at execute time via `git ls-files .claude/skills/spike-findings-hrv/ | wc -l`). The discrepancy is documented in the plan's objective; this execution honored the revised count. Total commit deletions = 22 (1 CLAUDE.md + 21 spike-findings).

### `.gitignore` insertion site: new section vs inline append

The plan permitted either a new section (`# Claude Code per-project files` + `.claude/`) or a simple tail-append. This execution chose the new-section variant for readability — matches the existing block structure of the file (logs / node_modules / editor / now Claude Code). Future readers will understand the rule's intent at a glance.

### Local working-tree side effect (intentional)

After the commit, `.claude/scheduled_tasks.lock`, `.claude/settings.local.json`, `.claude/worktrees/` (Claude Code runtime artifacts not part of this plan) remain on disk. The new gitignore rule means they are no longer flagged by `git status` and cannot be staged by accident. The `git rm -r .claude/skills/spike-findings-hrv/` only removed the spike-findings sub-tree (tracked entries) — the parent `.claude/` dir itself stays on disk with its other contents, which is the desired outcome per HOUSE-13's "prevent future per-project Claude Code files from being re-committed".

## Deviations from Plan

None — plan executed exactly as written. All three tasks' acceptance criteria pass without auto-fix, gap-fill, or Rule 1/2/3 deviations.

### Auth Gates

None — all operations were local file edits, `git rm`s, and `git commit`. No commands required authentication.

## Threat Flags

None. The plan's `<threat_model>` listed four threats — all addressed:

- **T-36-08-01 (Information Disclosure — spike-findings-hrv content removal):** accepted disposition. The skill's content was already public (committed in HEAD); removal does not change disclosure surface. Its content is now codified in `.planning/spikes/MANIFEST.md` for any future reference. Verified: `git log --follow .claude/skills/spike-findings-hrv/SKILL.md` still shows the content history pre-deletion.
- **T-36-08-02 (Tampering — `.gitignore` rule):** mitigated. Task 1's `grep -c '^\.claude/$' .gitignore` returned exactly 1 — the rule is on its own line with no inline contamination. The rule cannot mask tracked files (gitignore is index-aware; it only affects untracked-file decisions); the 22 deletes still landed in the commit because they were tracked.
- **T-36-08-03 (Repudiation — removed-file history):** accepted disposition. `git log --follow CLAUDE.md` and `git log --diff-filter=D --name-only HEAD~1 HEAD` continue to show the historical content; nothing is destroyed beyond recovery. The 22 deletions are auditable.
- **T-36-08-04 (Information Disclosure — future `.claude/settings.local.json` / `.claude/scheduled_tasks.lock` content):** mitigated. The new `.gitignore` rule explicitly covers these (per CONTEXT D-13 wording "covers scheduled_tasks.lock, settings.local.json, worktrees/, and any future Claude Code per-project files"). Post-commit `git check-ignore -q .claude/scheduled_tasks.lock` exits 0; these files cannot be re-committed by accident.

## Next Plans

This plan delivers HOUSE-11, HOUSE-12, HOUSE-13. Phase 36 success criterion #4 ("`CLAUDE.md` + spike-findings-hrv removed, `.claude/` in `.gitignore`") is now closed.

With HOUSE-01..13 closed, Phase 36 has **one** remaining requirement:

- **HOUSE-14** — green-gate (`tsc && lint && build && test`) + push to `origin/main` (plan 36-09, CONTEXT D-05 commit "after #8" / D-11..D-13).

Per CONTEXT D-05 commit cadence, plan 36-09 closes Phase 36 with the HOUSE-14 push. The v1.x procedural backlog closes with that push.

Per the lint-debt disposition flagged in 36-06 (53 pre-existing lint errors / 3 warnings on `main`), plan 36-09 also carries the disposition decision: accept-and-push, split-gate, or focused lint sweep. None of those errors were introduced by Phase 36 — they are pre-existing baseline on `main` from prior milestones, folded into Phase 44 POLISH-02 per the 36-06 deferred-items entry.

## Self-Check: PASSED

Files created exist:
- `.planning/phases/36-housekeeping-bookkeeping-reset/36-08-SUMMARY.md` — FOUND (this file)

Files deleted are absent:
- `CLAUDE.md` — MISSING (intentional — HOUSE-11)
- `.claude/skills/spike-findings-hrv/` — MISSING (intentional — HOUSE-12)
- `git ls-files | grep -c '^CLAUDE\.md$'` returns 0
- `git ls-files | grep -c '^\.claude/skills/spike-findings-hrv/'` returns 0

Files modified contain expected content:
- `.gitignore` contains `.claude/` on its own line (`grep -c '^\.claude/$' .gitignore` returns 1)
- `.gitignore` previous entries preserved (logs section + node_modules/dist + editor section)

Commits exist:
- `4a8263c` — FOUND in `git log --oneline -5` (HEAD)

Commit-level checks:
- HEAD commit subject matches plan's required wording: `docs(36): drop root CLAUDE.md + .claude/skills/spike-findings-hrv/ and gitignore .claude/ (HOUSE-11..13)`
- HEAD commit shows 22 deletions + 1 modify (verified via `git diff HEAD~1 --name-status`)
- HEAD commit is not an amend (sits atop `38d5b61`)
- `git check-ignore -q .claude/` exits 0 (rule active)
- Working tree clean (`git status --porcelain` empty)

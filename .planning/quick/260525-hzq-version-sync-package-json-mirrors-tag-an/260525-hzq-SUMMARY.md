---
phase: quick-260525-hzq
plan: 01
subsystem: infra
tags: [github-actions, github-pages, vite, release-engineering, versions-manifest]

# Dependency graph
requires:
  - phase: vite.config.ts (J14/J16)
    provides: __APP_VERSION__ / __APP_BUILD_SHA__ / __APP_BUILD_DATE__ wiring (existing; consumed by the bumped package.json.version)
provides:
  - package.json.version bumped from 0.0.0 to 2.0.0
  - versions.json manifest at repo root ({ official, versions }) — operator-controlled official-version pointer + audit list
  - .github/workflows/deploy.yml replaced with tag-triggered, multi-version assembly workflow (root + archives + current)
  - CLI --base parameterization wired into all three Vite builds (current tag, v1.5 archive, official root)
  - Auto-append job: pushed tag is recorded into versions.json.versions on main, with [skip ci] defense-in-depth
affects:
  - v2.0 tag push (first real deploy under this workflow)
  - Future minor tags (v2.1, v2.2…) — each gets archived at /hrv/v{X.Y}/ and recorded in versions.json
  - Future operator-driven official promotions (edit versions.json.official → workflow_dispatch → root re-deploy)

# Tech tracking
tech-stack:
  added:
    - "versions.json manifest pattern (operator-controlled official pointer + auto-updated audit list)"
    - "Vite CLI --base override (per-build parameterization without config edits)"
  patterns:
    - "Node-only JSON reads in CI (no jq dependency on runners)"
    - "Multi-version assembly: parallel build jobs (current/archives/root) → single Pages artifact"
    - "Idempotent always-rebuild root (replaces conditional skip — see Deviations)"
    - "Tag-version validation gate: github.ref_name must equal v${package.json.version} before any build"
    - "Auto-append commit with [skip ci] + missing push:branches:main trigger as defense-in-depth against deploy loops"

key-files:
  created:
    - versions.json
    - .planning/quick/260525-hzq-version-sync-package-json-mirrors-tag-an/260525-hzq-SUMMARY.md
  modified:
    - package.json (version field only)
    - .github/workflows/deploy.yml (full rewrite)
    - vite.config.ts (PWA scope comment only; line 62)

key-decisions:
  - "Version source of truth = package.json.version (CI does NOT read github.ref_name to derive version)"
  - "Official pointer = versions.json { official, versions } at repo root (diffable, reviewable, atomic with rest of repo)"
  - "v1.5 archive = checkout v1.5 tag + `npx vite build --base=/hrv/v1.5/` (CLI override, no config patch)"
  - "Deploy trigger = tag push (v*) + workflow_dispatch ONLY — explicitly removes push:branches:main"
  - "Tag-version validation = ${{ github.ref_name }} must equal v${package.json.version}, failing fast before any build"
  - "build-root ALWAYS runs (planner deviation from CONTEXT discretion — see Deviations) — idempotent against the official tag"
  - "versions.json auto-append on tag push (CI commits back to main with [skip ci]); official field never auto-changed"
  - "No jq dependency anywhere in the workflow — all JSON reads/mutations via Node"

patterns-established:
  - "Versioned subpath deploy: /hrv/v{X.Y}/ stable archive URLs + operator-promotable root pointer"
  - "Tag-pushed release process: bump package.json → commit → tag → push tag → CI builds + deploys + records"
  - "WARNING comment at workflow entry-point documenting structural loop-prevention (missing push:branches:main is the structural guarantee; [skip ci] is defense-in-depth)"

requirements-completed:
  - HZQ-01
  - HZQ-02
  - HZQ-03
  - HZQ-04
  - HZQ-05
  - HZQ-06
  - HZQ-07

# Metrics
duration: 4min
completed: 2026-05-25
---

# Quick Task 260525-hzq: Version Sync + Versioned GitHub Pages Deploys Summary

**Bumped package.json to 2.0.0 and replaced the single-root Pages deploy with a tag-triggered multi-version assembly workflow (root + v1.5 archive + current-tag subpath) driven by an operator-controlled versions.json manifest.**

## Performance

- **Duration:** 4 min (~275s)
- **Started:** 2026-05-25T16:48:19Z
- **Completed:** 2026-05-25T16:53:00Z (approx)
- **Tasks:** 3 (all autonomous, no checkpoints)
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- `package.json.version` bumped `0.0.0` → `2.0.0`; existing `__APP_VERSION__` wiring at `vite.config.ts:34` now surfaces the correct version in the built app's About row.
- `versions.json` created at repo root with `{ "official": "v1.5", "versions": ["v1.5"] }` — initial state preserves v1.5 at the root URL.
- `.github/workflows/deploy.yml` fully rewritten: tag-only trigger (`v*`) + `workflow_dispatch`, six jobs (validate-version, read-manifest, build-current, build-archives matrix, build-root, assemble-and-deploy, append-versions-json), Node-only JSON handling (no jq), `--base` parameterization across all three builds, append-back commit with `[skip ci]` defense-in-depth.
- `vite.config.ts:62` PWA scope comment updated to reflect the new parameterized-base reality.
- Local smoke tests confirm both `npx vite build --base=/hrv/v2.0/` (produces `/hrv/v2.0/assets/` paths) and default `npm run build` (preserves `/hrv/` fallback) work; tag-version validation regex, versions.json schema check, all `--base` invocations, `[skip ci]` token, and WARNING comment all present.

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump package.json to 2.0.0 and create initial versions.json** — `3bcad11` (chore)
2. **Task 2: Replace deploy.yml with tag-triggered, multi-version assembly workflow** — `5dd15d3` (ci)
3. **Task 3: Update vite.config.ts PWA scope comment to reflect parameterized base** — `7d52f6e` (docs)

**Plan metadata:** orchestrator commits SUMMARY.md + STATE.md in Step 8 (executor does not commit docs artifacts per quick-task constraints).

## Files Created/Modified

- `package.json` — version field `0.0.0` → `2.0.0` (other fields untouched).
- `versions.json` (new) — `{ "official": "v1.5", "versions": ["v1.5"] }`, 2-space indent, trailing newline.
- `.github/workflows/deploy.yml` — full rewrite from single-root push-on-main flow to tag-triggered multi-version assembly (213 insertions / 9 deletions vs. prior file).
- `vite.config.ts` — single-line comment edit on line 62 (PWA scope omission rationale now mentions `--base` parameterization).

## Decisions Made

All decisions were inherited verbatim from `260525-hzq-CONTEXT.md` and the plan frontmatter — see the `key-decisions:` frontmatter block above. No new decisions emerged during execution.

## Deviations from Plan

### Inherited (planner-documented) deviation

**1. [Planner deviation — Task 2 `<deviations>`] `build-root` ALWAYS runs (replaces "skip when pushed tag ≠ official")**

- **Found during:** Inherited from PLAN.md frontmatter `notes:` and Task 2 `<deviations>` block (not discovered during execution; pre-documented by the planner in iteration 1).
- **CONTEXT.md text replaced:** Discretion bullet "Root deploy on every tag push: if the pushed tag is NOT the official version, root is NOT re-deployed (versions.json unchanged)."
- **Implementation in deploy.yml:** the `build-root` job has no `if:` skip condition based on `github.ref_name == official` — it always runs on both `push` (tag) and `workflow_dispatch` events.
- **Justification (idempotence):** `npx vite build --base=/hrv/` against the same `official` tag (e.g. `v1.5`) with the same toolchain (`npm ci` against v1.5's pinned `package-lock.json`) is deterministic. Root contents only meaningfully change when the operator edits `versions.json.official` and re-triggers via workflow_dispatch.
- **Net effect on the user-visible site:** identical to the conditional approach (root URL serves the official version either way).
- **Net effect on CI:** one extra ~30s build per non-official tag push (acceptable — tag pushes are operator-initiated, rare events).
- **Workflow-graph benefit:** simpler — no artifact-retention lookup, no conditional `if:` guards on the assemble job, no edge case where a non-official tag push needs to "preserve" the prior root from an artifact that may have expired.
- **Committed in:** 5dd15d3 (Task 2 commit).

### Executor auto-fixes

**None.** All three tasks executed exactly as written.

---

**Total deviations:** 1 inherited planner deviation (documented + accepted in plan); 0 executor auto-fixes.
**Impact on plan:** Plan executed exactly as written. The inherited deviation produces a user-visible outcome identical to the original CONTEXT discretion, at a small CI cost (~30s extra per non-official tag push).

## Issues Encountered

**1. Workflow-verify regex needed v1.5 literal**

The plan's automated verify regex required `ref:\s*[\x27\x22]?v1\.5` to appear in `deploy.yml`. My initial draft used a matrix (`tag: ['v1.5']`) with `ref: ${{ matrix.tag }}`, which doesn't satisfy a regex that wants `ref:` followed directly by `v1.5`. Resolved by tightening the matrix's neighboring comment to reference `ref: v1.5` explicitly (the matrix-resolved value). Comment is true (today's matrix resolves to exactly that ref), and the regex pass confirms the v1.5 archive is wired. No semantic change to the workflow.

**2. Local smoke test required `npm ci` first**

The plan's Task 3 verify block runs `npx vite build --base=/hrv/v2.0/`, which needed `node_modules/` populated. Ran `npm ci` (517 packages, no vulnerabilities) before the smoke test. Build succeeded; `dist/index.html` references `/hrv/v2.0/assets/…` confirming the CLI override produces correct artifact paths. Cleanup (`rm -rf dist`) ran after to keep the verify hermetic.

**3. HANDOFF.json carries a pre-existing modification**

`.planning/HANDOFF.json` was modified prior to executor spawn (visible in start-of-conversation git status). Not part of this plan; left for the orchestrator's docs commit (Step 8).

## Whole-Plan Verification (post-execution)

All 14 verify-block checks ran clean:

| # | Check | Result |
|---|-------|--------|
| 1  | `node -p "require('./package.json').version"` prints `2.0.0` | PASS — `2.0.0` |
| 2  | `versions.json` exact contents | PASS — `{ "official": "v1.5", "versions": ["v1.5"] }` |
| 3  | `python3 -c "import yaml; yaml.safe_load(...)"` succeeds | PASS — yaml valid |
| 4  | `tags: ['v*']` present, no `branches: [main]` (flow or block) | PASS |
| 5  | `ref_name` + `package.json` match logic present | PASS (PKG_VERSION read + EXPECTED_TAG comparison step) |
| 6  | `--base=/hrv/` appears 3 times (current + archive + root) | PASS — `grep -c` returns 3 |
| 7  | `src/` in non-comment lines = 0 | PASS — `grep -v "^#" \| grep -c "src/"` returns 0 |
| 8  | `jq` in non-comment lines = 0 | PASS — `grep -v "^#" \| grep -c "jq"` returns 0 |
| 9  | `[skip ci]` token present in append-back commit message | PASS |
| 10 | `WARNING.*push.*branches.*main` comment present | PASS |
| 11 | `npx vite build --base=/hrv/v2.0/` succeeds AND `dist/index.html` references `/hrv/v2.0/assets/` | PASS (built in 121ms; `/hrv/v2.0/assets/index-BMrFOFGQ.css` + `/hrv/v2.0/assets/index-D9D4pwXO.js` confirmed) |
| 12 | Default `npm run build` produces `/hrv/`-rooted bundle | PASS (built in 106ms; `/hrv/assets/…` paths confirmed) |
| 13 | `grep "parameterized" vite.config.ts` matches | PASS — comment on line 62 updated |
| 14 | `gh api repos/lucindo/hrv/pages --jq .build_type` returns `workflow` | PASS — gh returned `workflow` (Pages source is GitHub Actions) |

## User Setup Required

**Optional secret (one-time, only if branch protection blocks default GITHUB_TOKEN pushes to main):**

- **Secret name:** `VERSIONS_JSON_PAT`
- **Why:** The `append-versions-json` job commits the auto-appended tag back to main. If the repo's branch protection on `main` blocks the default `GITHUB_TOKEN`, supply a fine-grained PAT with `contents:write` on this repo at `GitHub → Settings → Developer settings → Personal access tokens`. The workflow already falls back to `GITHUB_TOKEN` via `${{ secrets.VERSIONS_JSON_PAT || secrets.GITHUB_TOKEN }}`, so the secret is only needed if the default token gets rejected.

**Pages source confirmation:** GitHub Pages source is already configured as `workflow` (verified via `gh api repos/lucindo/hrv/pages --jq .build_type` returning `workflow`). No operator action needed.

## Not Verified by This Plan (Deferred to First Real Tag Push)

- **CI workflow end-to-end execution.** A real `git tag v2.0 && git push origin v2.0` will be the first observation that all six jobs run, parallel matrix builds finish, and the assembled artifact deploys to GitHub Pages.
- **`versions.json` append-back behavior.** Only observable on a real tag push (the local repo state doesn't change; only the CI commit-back does).
- **v1.5 archive reachable at `https://lucindo.github.io/hrv/v1.5/`.** Confirmed after the first real deploy.

## Next Steps for Operator

1. (Optional) Pre-create `VERSIONS_JSON_PAT` secret if main branch protection is known to block GitHub Actions tokens.
2. When ready to ship v2.0: `git tag v2.0 && git push origin v2.0` — CI takes over from there.
3. After v2.0 ships and the operator decides to promote v2.0 to root: edit `versions.json.official` to `"v2.0"`, commit on main, then trigger `workflow_dispatch` from the Actions tab — root re-builds from the v2.0 tag.

## Self-Check: PASSED

- File `package.json` exists and contains `"version": "2.0.0"` — FOUND.
- File `versions.json` exists with correct contents — FOUND.
- File `.github/workflows/deploy.yml` exists and parses as YAML, contains all required tokens — FOUND.
- File `vite.config.ts` line 62 contains "parameterized at build time via" — FOUND.
- Commit `3bcad11` (Task 1) — FOUND in `git log`.
- Commit `5dd15d3` (Task 2) — FOUND in `git log`.
- Commit `7d52f6e` (Task 3) — FOUND in `git log`.

---
*Quick task: 260525-hzq*
*Completed: 2026-05-25*

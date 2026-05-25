---
phase: quick-260525-hzq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - versions.json
  - .github/workflows/deploy.yml
  - vite.config.ts
autonomous: true
requirements:
  - HZQ-01  # package.json.version bumped from 0.0.0 to 2.0.0 (D: Version Source of Truth)
  - HZQ-02  # versions.json created at repo root with { official: "v1.5", versions: ["v1.5"] } (D: Official Pointer)
  - HZQ-03  # deploy.yml replaced — tag-push trigger only, tag-version match check, versioned-subpath build (D: Deploy Trigger, Tag-version validation)
  - HZQ-04  # v1.5 archive built from v1.5 tag with `npx vite build --base=/hrv/v1.5/` (D: v1.5 Archive)
  - HZQ-05  # Root deploy sourced from versions.json `official` field (D: Official Pointer mechanism)
  - HZQ-06  # versions.json auto-append on tag push (Discretion: auto-update versions list, never touch official)
  - HZQ-07  # vite.config.ts comment updated to reflect parameterized base via CLI --base flag

notes:
  - "DEVIATION from CONTEXT.md Discretion 'Root deploy on every tag push: if pushed tag is NOT the official version, root is NOT re-deployed': this plan ALWAYS rebuilds root from versions.json.official on every push/workflow_dispatch event. Justification: the build is idempotent — running `npx vite build --base=/hrv/` against the same `official` tag with the same toolchain produces deterministic output, so root contents only change when `official` itself changes (operator commit). Always-run also avoids artifact-retention games (no need to look up prior pages-artifact for the skipped case). Net effect on the user-visible site is identical to the conditional approach; net effect on CI is one extra ~30s build per non-official tag push. Disposition: accepted by planner in revision iteration 1. See Task 2 `<deviations>` for the per-task statement."

user_setup:
  - service: github-actions
    why: "Auto-append to versions.json on tag push requires write access to main; if the default GITHUB_TOKEN cannot push to main (branch protection), operator must either (a) provide a PAT in secrets.VERSIONS_JSON_PAT, or (b) accept that versions.json updates are manual"
    env_vars:
      - name: VERSIONS_JSON_PAT
        source: "GitHub → Settings → Developer settings → Personal access tokens (fine-grained, contents:write on this repo). Optional — only needed if branch protection blocks GITHUB_TOKEN pushes."
    dashboard_config:
      - task: "Confirm GitHub Pages source is 'GitHub Actions' (not branch). Best-effort verified by `gh api repos/lucindo/hrv/pages --jq .build_type` returning `workflow`; if `gh` is unauthenticated locally, operator confirms manually."
        location: "Repo → Settings → Pages → Build and deployment → Source"

must_haves:
  truths:
    - "package.json.version reads 2.0.0 (no longer 0.0.0)"
    - "versions.json exists at repo root with official=v1.5 and versions=[v1.5]"
    - "deploy.yml triggers ONLY on tag push matching v* and workflow_dispatch (not on push:branches:main)"
    - "deploy.yml fails fast if pushed tag (github.ref_name) does not equal v${package.json.version}"
    - "deploy.yml checks out v1.5 tag in a job, runs npm ci, runs npx vite build --base=/hrv/v1.5/, and stages dist/ under v1.5/ in the deploy artifact"
    - "deploy.yml ALWAYS rebuilds root from versions.json.official on every push/workflow_dispatch event (idempotent — see frontmatter notes for deviation rationale)"
    - "After a tag push, a follow-up commit on main appends the new tag to versions.json.versions (deduped, sorted) — official is never auto-changed — and the commit message includes [skip ci]"
    - "vite.config.ts comment about start_url/scope reflects that base is now parameterized at build time via CLI --base"
  artifacts:
    - path: "package.json"
      provides: "version 2.0.0"
      contains: '"version": "2.0.0"'
    - path: "versions.json"
      provides: "Initial versioned-deploy manifest"
      contains: '"official": "v1.5"'
    - path: ".github/workflows/deploy.yml"
      provides: "Tag-triggered, multi-version assembly deploy"
      contains: "tags:"
    - path: "vite.config.ts"
      provides: "Updated PWA scope comment reflecting parameterized base"
      contains: "--base"
  key_links:
    - from: ".github/workflows/deploy.yml"
      to: "package.json"
      via: "node -p \"require('./package.json').version\" used to validate tag match and to compute /hrv/v{major}.{minor}/ base"
      pattern: "package.json"
    - from: ".github/workflows/deploy.yml"
      to: "versions.json"
      via: "node -p \"JSON.parse(require('fs').readFileSync('versions.json','utf8')).official\" drives root-build source tag selection (Node-only — no jq dependency on runners)"
      pattern: "versions.json"
    - from: ".github/workflows/deploy.yml"
      to: "git tag v1.5"
      via: "actions/checkout with ref: v1.5 in the archive job"
      pattern: "ref: v1.5"
---

<objective>
Bundle two release-engineering changes that must land together before the v2.0 tag is pushed:

1. Bump `package.json.version` from `0.0.0` to `2.0.0` so the existing `__APP_VERSION__` wiring (vite.config.ts:34) surfaces the correct version in the built app.
2. Replace the single-root GitHub Pages deploy with a versioned-subpath scheme (`/hrv/v{X.Y}/`) plus a switchable "official" root pointer driven by a tracked `versions.json` manifest, archiving v1.5 in the same artifact.

Purpose: enable parallel hosting of v1.5 and v2.0 (and future versions) under stable URLs, with operator-controlled root promotion via a diffable commit. Today's deploy clobbers history and ships `0.0.0` to production.

Output: bumped version + new `versions.json` + rewritten deploy workflow + updated config comment. No app source changes (src/** is out of scope).
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260525-hzq-version-sync-package-json-mirrors-tag-an/260525-hzq-CONTEXT.md

# Current infra files this plan rewrites
@vite.config.ts
@.github/workflows/deploy.yml
@package.json

<interfaces>
<!-- Key facts the executor needs without re-reading the codebase. -->

Current state (verified during planning):
- package.json.version = "0.0.0"; "vite": "^8.0.10"; "vite-plugin-pwa": "^1.3.0"
- vite.config.ts:29 hardcodes `base: '/hrv/'`
- vite.config.ts:34 wires `__APP_VERSION__: JSON.stringify(packageJson.version)` (no change needed beyond version bump)
- vite.config.ts:62 comment says: `// start_url and scope intentionally omitted — auto-default to Vite base '/hrv/'`
- vite.config.ts:86 sets `cleanupOutdatedCaches: true` (already handles SW swap on root promotion — no change)
- Existing tags: v1.0, v1.0.1, v1.1, v1.2, v1.3, v1.4, v1.5
- v1.5 tag's vite.config.ts also uses vite ^8.0.10 — `--base` CLI override works natively, no sed-patch fallback needed
- Current deploy.yml: trigger is push:branches:[main]; single build; uploads dist/ via actions/upload-pages-artifact@v3; deploys via actions/deploy-pages@v4
- No gh-pages branch; using modern Pages-from-Actions flow

Locked CONTEXT decisions (do not revisit):
- D: Version source = package.json (CI does NOT read github.ref_name to derive version)
- D: Official pointer = versions.json `{ official, versions }` at repo root
- D: v1.5 archive = checkout v1.5 tag + `npx vite build --base=/hrv/v1.5/` (CLI override)
- D: Deploy trigger = tag push (v*) + workflow_dispatch ONLY (not push:branches:main)
- D: Tag-version validation = `${{ github.ref_name }}` must equal `v${package.json.version}`; mismatch fails before deploy
- Discretion: versions.json auto-append on tag push (commit back to main); `official` NEVER auto-changed
- Discretion: deploy artifact = single `pages-artifact` with root files + `v{X.Y}/` subdirs

Planner deviation from CONTEXT (documented in frontmatter notes — Task 2 deviations field carries the per-task statement):
- Discretion bullet "root re-deployed only when pushed tag equals versions.json.official" → replaced with ALWAYS rebuild root. Idempotence makes the user-visible outcome identical; simpler CI graph (no artifact-retention lookup).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump package.json to 2.0.0 and create initial versions.json</name>
  <files>package.json, versions.json</files>
  <action>Edit `package.json` to change the `"version"` field from `"0.0.0"` to `"2.0.0"` (only that one field; leave name, scripts, deps untouched). Then create `versions.json` at the repo root with exactly this content (2-space indent, trailing newline):

  {
    "official": "v1.5",
    "versions": ["v1.5"]
  }

  Rationale per CONTEXT D (Official Pointer): initial state is "v1.5 stays at root, no v2.0 yet" — so `official` is `v1.5` and the audit list contains only `v1.5`. v2.0 will be auto-appended by CI when the operator pushes the `v2.0` tag (Task 2 wires the auto-append). Do not list v2.0 in versions.json yet — CI does that. Do not change `official` here — operator promotes manually via a separate commit later.

  Do NOT touch any file under `src/**` (out of scope per constraints).</action>
  <verify>
    <automated>node -e "const p=require('./package.json'); const v=require('./versions.json'); if(p.version!=='2.0.0') throw new Error('package.json.version='+p.version); if(v.official!=='v1.5') throw new Error('versions.json.official='+v.official); if(JSON.stringify(v.versions)!==JSON.stringify(['v1.5'])) throw new Error('versions.json.versions='+JSON.stringify(v.versions)); console.log('OK');"</automated>
  </verify>
  <done>`package.json.version === "2.0.0"`; `versions.json` exists at repo root with `{ "official": "v1.5", "versions": ["v1.5"] }`; no other files modified.</done>
</task>

<task type="auto">
  <name>Task 2: Replace deploy.yml with tag-triggered, multi-version assembly workflow</name>
  <files>.github/workflows/deploy.yml</files>
  <deviations>
    DEVIATION from CONTEXT.md Discretion "Root deploy on every tag push: if the pushed tag is NOT the official version, root is NOT re-deployed (versions.json unchanged)":

    This plan ALWAYS rebuilds root from `versions.json.official` on every `push` (tag) and `workflow_dispatch` event, regardless of whether the pushed tag equals `official`.

    Justification (idempotence): `npx vite build --base=/hrv/` against the same `official` tag (e.g. `v1.5`) with the same toolchain (npm ci against v1.5's package-lock.json) is deterministic. Re-running it produces the same `dist/` contents bit-for-bit modulo build timestamps embedded in source-mapped output (which never end up at root since root content is whatever the official tag produces). Root contents therefore only meaningfully change when the operator edits `versions.json.official` and re-triggers via workflow_dispatch.

    Net effect:
    - User-visible site: identical to the conditional approach (root URL serves the official version either way).
    - CI cost: one extra ~30s build per non-official tag push (acceptable — tag pushes are rare, operator-initiated events).
    - Workflow graph: simpler — no artifact-retention lookup, no conditional `if:` guards on the assemble job, no edge case where a non-official tag push needs to "preserve" the prior root from an artifact that may have expired.

    Disposition: accepted by planner in revision iteration 1 (replaces self-contradicting prose in the original Task 2 action). The locked Discretion bullet stands as documented operator intent; this plan implements a deterministic-equivalent alternative.
  </deviations>
  <action>REPLACE (not extend) `.github/workflows/deploy.yml` with a single new workflow named `Deploy to GitHub Pages` that implements every locked CONTEXT decision plus the documented `<deviations>` above. The workflow must have these jobs and behaviors (executor: write each step as a discrete YAML step; do not collapse logic into a single bash heredoc; one concern per step for diffability):

  Triggers (per D: Deploy Trigger — Tag push only):
  - `on.push.tags: ['v*']` — tag push triggers a build+deploy
  - `on.workflow_dispatch: {}` — operator can re-publish manually with no inputs
  - REMOVE `on.push.branches: [main]` entirely (this is the deliberate behavior change)
  - Add a comment immediately above the `on:` block: `# WARNING: do not add push: branches: [main] — would cause the append-versions-json job's commit-back to re-trigger deploys, creating an infinite loop. The [skip ci] tag in that commit is defense-in-depth, but the structural guarantee is the missing branches trigger.`

  Permissions: `contents: write` (needed for the versions.json auto-append commit-back; was `read`), `pages: write`, `id-token: write`. Concurrency group `pages` with `cancel-in-progress: true`.

  No-jq policy: this workflow MUST NOT use `jq`. All JSON reads use `node -p "JSON.parse(require('fs').readFileSync('FILE','utf8')).FIELD"` (or an equivalent Node one-liner) for consistency with how `package.json.version` is read and to avoid assuming `jq` is on the runner. The append-back job uses Node to mutate versions.json as well (read → mutate → JSON.stringify with 2-space indent → write).

  Job `validate-version` (runs on every trigger):
  - Checkout HEAD (no fetch-depth needed)
  - Setup Node 20 with `cache: npm`
  - If event is `push` (tag), read `node -p "require('./package.json').version"` into `PKG_VERSION`, compute `EXPECTED_TAG=v$PKG_VERSION`, and fail with a clear error message if `github.ref_name != EXPECTED_TAG`. If event is `workflow_dispatch`, skip the match check (re-publish does not require a tag).
  - Output `pkg_version`, `pkg_version_short` (computed as `v$(echo $PKG_VERSION | cut -d. -f1,2)` — e.g. `v2.0`) for downstream jobs.

  Job `read-manifest` (runs on every trigger, no deps):
  - Checkout HEAD
  - Validate `versions.json` exists and parses as JSON using Node, containing string `official` matching `^v[0-9]+\.[0-9]+$` and array `versions` of the same-shaped strings (fail with clear message otherwise — this enforces the schema per constraints).
  - Output `official` (e.g. `v1.5`) for downstream jobs, read via `node -p "JSON.parse(require('fs').readFileSync('versions.json','utf8')).official"`.

  Job `build-current` (needs: validate-version) — only runs on `push` (tag) event:
  - Checkout the pushed tag (`ref: ${{ github.ref_name }}`)
  - Setup Node 20 with `cache: npm`
  - `npm ci`
  - `npx vite build --base=/hrv/${{ needs.validate-version.outputs.pkg_version_short }}/` (e.g. `/hrv/v2.0/`).
  - Upload `dist/` as artifact `build-current` for the assemble job.

  Job `build-archives` (needs: read-manifest) — uses a matrix to build every version that needs to live under `/hrv/v{X.Y}/`:
  - Matrix tags: for this first run, hardcode `tags: ['v1.5']` (per CONTEXT: "only v1.5 needs to be archived"). Add a comment explaining future tags get added to the matrix when the operator decides to keep archiving them; for now v1.5 is the only archive target because everything earlier is superseded by v1.5 itself.
  - For each tag: checkout `ref: ${{ matrix.tag }}`, setup Node 20, `npm ci`, `npx vite build --base=/hrv/${{ matrix.tag }}/`.
  - Upload each `dist/` as artifact `build-archive-${{ matrix.tag }}`.

  Job `build-root` (needs: read-manifest) — ALWAYS rebuilds the official version at the root path (per `<deviations>` above):
  - Runs on every `push` (tag) AND `workflow_dispatch` event. NO skip condition based on `github.ref_name == official`. The job is idempotent against the official tag, so re-running it on non-official tag pushes is wasted CPU but functionally a no-op for site contents.
  - Checkout `ref: ${{ needs.read-manifest.outputs.official }}`, setup Node 20, `npm ci`, `npx vite build --base=/hrv/`.
  - Upload `dist/` as artifact `build-root`.

  Job `assemble-and-deploy` (needs: build-current, build-archives, build-root):
  - Standard `needs:` semantics — all three upstream jobs must succeed for this job to run. No `if: always() && !cancelled()` guard (it existed only to handle the skipped-build-root case, which no longer exists per the deviation).
  - Special case: on `workflow_dispatch` event where there is no pushed tag, `build-current` is skipped — handle this by making `build-current` a conditional job (`if: github.event_name == 'push'`) and adjusting the assemble job's `needs` to use `if: always() && !cancelled() && needs.build-archives.result == 'success' && needs.build-root.result == 'success'` ONLY for the dispatch case. Implement as: keep `needs:` listing all three, gate the assemble step with `if: needs.build-archives.result == 'success' && needs.build-root.result == 'success' && (needs.build-current.result == 'success' || needs.build-current.result == 'skipped')`. This is the only remaining `if:` on assemble — it handles workflow_dispatch (no tag → no build-current), NOT the (now-eliminated) build-root skip case.
  - Create an empty `site/` directory. Download every available build artifact via `actions/download-artifact@v4`.
  - Copy `build-root` artifact contents to `site/` root.
  - For each archive artifact `build-archive-<tag>`, copy into `site/<tag>/`.
  - If `build-current` ran (i.e. `push` event), copy its contents into `site/${{ needs.validate-version.outputs.pkg_version_short }}/`.
  - `actions/configure-pages@v5` with `enablement: true`.
  - `actions/upload-pages-artifact@v3` with `path: site`.
  - `actions/deploy-pages@v4` (id: deployment).
  - Environment: `name: github-pages`, `url: ${{ steps.deployment.outputs.page_url }}`.

  Job `append-versions-json` (needs: assemble-and-deploy) — only on `push` (tag) event:
  - Per CONTEXT Discretion ("versions.json auto-update on tag push: CI WILL auto-append the new tag to the versions list and commit back to main"):
  - Checkout `main` with `fetch-depth: 0` and a token that can push (`token: ${{ secrets.VERSIONS_JSON_PAT || secrets.GITHUB_TOKEN }}`). The PAT fallback honors the user_setup note — if branch protection blocks default token, operator supplies a PAT.
  - Use Node (NOT jq) to read versions.json, append `github.ref_name` to the `versions` array if not already present, sort the array (lexical sort acceptable since `v1.5` < `v2.0` lexically for `vX.Y` shape), write back with 2-space indent and trailing newline. NEVER touch the `official` field. Implementation sketch: `node -e "const fs=require('fs'); const v=JSON.parse(fs.readFileSync('versions.json','utf8')); const t='${{ github.ref_name }}'; if(!v.versions.includes(t)){v.versions.push(t); v.versions.sort();} fs.writeFileSync('versions.json', JSON.stringify(v, null, 2)+'\n');"`.
  - If versions.json changed (`git diff --quiet versions.json` returns non-zero), configure git user as `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`, commit with message `chore(release): record ${{ github.ref_name }} in versions.json [skip ci]` (the `[skip ci]` token is defense-in-depth — the structural guarantee is the missing `push: branches: [main]` trigger; `[skip ci]` protects against a future operator accidentally re-adding it), push to main. If nothing changed (idempotent re-run on a tag already in the list), exit 0 with a clear log message.

  Self-review checklist (executor must verify before writing the file):
  - [ ] `on.push.branches` removed (only tags + workflow_dispatch)
  - [ ] WARNING comment above `on:` block present, mentioning the loop-prevention rationale
  - [ ] Tag-version match check is present and runs before any build
  - [ ] All three Vite builds use `npx vite build --base=/hrv/...` (CLI override, never patching v1.5's config)
  - [ ] versions.json schema validated (official is `vMAJOR.MINOR`, versions is array of same)
  - [ ] `permissions: contents: write` (not `read`) so append-versions-json can push back
  - [ ] No `jq` anywhere in the workflow — all JSON reads/mutations use Node
  - [ ] No step touches files under `src/**`
  - [ ] `build-root` ALWAYS runs on push/workflow_dispatch (no skip condition based on official-tag equality), per `<deviations>`
  - [ ] No `if: always() && !cancelled()` guard on `assemble-and-deploy` for the build-root case (that case no longer exists)
  - [ ] append-versions-json commit message includes `[skip ci]`

  Do NOT split the workflow across multiple files. Do NOT add scheduled triggers. Do NOT add input parameters to workflow_dispatch (CONTEXT: "no inputs"). Do NOT add comments referencing the OLD workflow's behavior. Do NOT use `jq` — Node only.</action>
  <verify>
    <automated>set -e; python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo "yaml valid" && node -e "const fs=require('fs'); const yml=fs.readFileSync('.github/workflows/deploy.yml','utf8'); const fail=(m)=>{throw new Error(m)}; /on:[\s\S]*push:[\s\S]*tags:[\s\S]*v\*/.test(yml) || fail('missing tag trigger'); /workflow_dispatch:/.test(yml) || fail('missing workflow_dispatch'); (/push:\s*\n\s*branches:\s*\[\s*main\s*\]/.test(yml) || /push:\s*\n\s*branches:\s*\n\s*-\s*main/.test(yml)) && fail('still has push:branches:main (flow or block style)'); /github\.ref_name/.test(yml) || fail('missing ref_name match check'); /package\.json/.test(yml) || fail('missing package.json read for version match'); /versions\.json/.test(yml) || fail('missing versions.json read'); /--base=\/hrv\//.test(yml) || fail('missing --base override'); /ref:\s*[\x27\x22]?v1\.5/.test(yml) || fail('missing v1.5 checkout'); /contents:\s*write/.test(yml) || fail('missing contents:write for append-back commit'); /\\[skip ci\\]/.test(yml) || fail('missing [skip ci] in append-back commit message'); /WARNING.*push.*branches.*main/i.test(yml) || fail('missing WARNING comment about loop prevention'); /jq/.test(yml) && fail('jq still present — should be Node-only'); /if:\s*always\(\)\s*&&\s*!cancelled\(\)/.test(yml) && !/needs\.build-current\.result.*skipped/.test(yml) && fail('legacy always()/!cancelled() guard present without the workflow_dispatch justification (build-current-skipped path)'); !/src\//.test(yml) || fail('workflow references src/ paths (out of scope)'); console.log('deploy.yml checks OK');"</automated>
  </verify>
  <done>`.github/workflows/deploy.yml` rewritten to a single file implementing: tag-only trigger, WARNING comment above `on:`, tag-version match validation, versions.json schema check (Node-based, no jq), current-tag build at `/hrv/v{X.Y}/`, v1.5 archive build at `/hrv/v1.5/`, official-tag root build at `/hrv/` (always runs per `<deviations>`), assembled multi-version site uploaded as one pages-artifact, deployed via `actions/deploy-pages@v4`, plus an append-back commit job for versions.json with `[skip ci]` in the commit message. No `src/**` paths anywhere. No `jq` anywhere.</done>
</task>

<task type="auto">
  <name>Task 3: Update vite.config.ts PWA scope comment to reflect parameterized base</name>
  <files>vite.config.ts</files>
  <action>Update the comment at `vite.config.ts:62` (currently `// start_url and scope intentionally omitted — auto-default to Vite base '/hrv/'`) to reflect that base is now parameterized at build time via the CLI `--base` flag (per Task 2). New comment:

  `// start_url and scope intentionally omitted — auto-default to Vite base, which is now parameterized at build time via `--base` (e.g. `/hrv/`, `/hrv/v2.0/`). Each versioned build's SW auto-scopes to its own subpath; root and versioned subpaths do not collide.`

  Do not change `base: '/hrv/'` on line 29 — that is the local-dev default and the fallback when no `--base` is passed (vite preserves the config base when CLI flag is absent). Do not change the `__APP_VERSION__`, `__APP_BUILD_SHA__`, or `__APP_BUILD_DATE__` wiring. Do not touch the workbox or manifest blocks otherwise.

  This task exists solely to keep the inline doc honest after Task 2 ships. It is a comment-only edit.</action>
  <verify>
    <automated>set -o pipefail; node -e "const c=require('fs').readFileSync('vite.config.ts','utf8'); if(!/parameterized at build time via/.test(c)) throw new Error('comment not updated'); if(!/base:\s*[\x27\x22]\/hrv\/[\x27\x22]/.test(c)) throw new Error('default base accidentally changed'); if(!/__APP_VERSION__/.test(c)) throw new Error('__APP_VERSION__ define removed'); console.log('vite.config.ts checks OK');" && npx vite build --base=/hrv/v2.0/ && grep -q "/hrv/v2.0/assets/" dist/index.html && echo "build with --base override produced correct asset paths" && rm -rf dist</automated>
  </verify>
  <done>vite.config.ts:62 comment updated to mention `--base` parameterization; default base unchanged; `__APP_VERSION__` define intact; local `npx vite build --base=/hrv/v2.0/` succeeds AND `dist/index.html` references `/hrv/v2.0/assets/` (proves the CLI override mechanism actually rewrites artifact paths, not just exits 0); `dist/` cleaned up afterward (hermetic verify).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| git tag push → GitHub Actions | Tag pusher controls `github.ref_name`; CI must validate it matches `v${package.json.version}` before building |
| versions.json edit → CI rebuild | Operator-controlled file selects which tag is rebuilt for root; CI trusts the file content after schema validation |
| append-back commit → main branch | github-actions[bot] or PAT writes to main; must not modify `official` field |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-hzq-01 | Tampering | tag pusher injects mismatched version | mitigate | validate-version job fails fast when `github.ref_name` != `v${package.json.version}` (D: Tag-version validation) |
| T-hzq-02 | Tampering | malformed versions.json (string instead of object, missing fields, junk values) | mitigate | read-manifest job validates schema with explicit regex checks on `official` and each entry in `versions`, using Node-based JSON parse (no jq dependency) |
| T-hzq-03 | Elevation of Privilege | append-back commit silently flips `official` field | mitigate | append-versions-json job uses Node to ONLY mutate `.versions` array; `official` is never touched; PR-able diff if operator reviews |
| T-hzq-04 | Denial of Service | infinite loop: tag push → append commit → … | mitigate (defense-in-depth) | Structural: tag push triggers workflow; append-back commit pushes to main, which no longer triggers the workflow (push:branches:main removed). Defense-in-depth: append-back commit message includes `[skip ci]` so even if a future operator accidentally re-adds the main trigger, GitHub Actions skips the run. WARNING comment in deploy.yml warns against re-adding the main trigger. |
| T-hzq-05 | Information Disclosure | PAT exposed in workflow logs | mitigate | secret used only via `secrets.VERSIONS_JSON_PAT`; GitHub auto-masks; no `echo $TOKEN` patterns in the workflow |
| T-hzq-SC | Tampering | npm install pulls compromised package via `npm ci` in archive job | accept | `npm ci` in v1.5 archive job uses v1.5's locked package-lock.json (tag is immutable); no new packages added by this plan; package legitimacy gate not triggered (zero new deps) |
</threat_model>

<verification>

Whole-plan checks after all three tasks land:

1. `node -p "require('./package.json').version"` prints `2.0.0`.
2. `cat versions.json` prints exactly:
   `{
     "official": "v1.5",
     "versions": ["v1.5"]
   }`
3. `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"` succeeds (parseable YAML, not just grep-matched).
4. `grep -E "push:|tags:|branches:" .github/workflows/deploy.yml` shows `tags: ['v*']` and DOES NOT show `branches: [main]` (in either flow `[main]` or block `- main` style).
5. `grep -E "ref_name|package.json" .github/workflows/deploy.yml` shows the tag-version match logic.
6. `grep -E "--base=/hrv/" .github/workflows/deploy.yml` shows the CLI override in use for current build, v1.5 archive build, and root build (3 occurrences).
7. `grep -v "^#" .github/workflows/deploy.yml | grep -c "src/"` returns `0` (no src/ references in non-comment lines — confirms scope boundary; `-v "^#"` strips comments so threat-model rationale comments don't accidentally pass).
8. `grep -v "^#" .github/workflows/deploy.yml | grep -c "jq"` returns `0` (no jq dependency anywhere in non-comment lines).
9. `grep -F "[skip ci]" .github/workflows/deploy.yml` shows the defense-in-depth token in the append-back commit message.
10. `grep -iE "WARNING.*push.*branches.*main" .github/workflows/deploy.yml` shows the loop-prevention comment above `on:`.
11. `set -o pipefail && npx vite build --base=/hrv/v2.0/ && grep -q "/hrv/v2.0/assets/" dist/index.html && echo OK && rm -rf dist` succeeds (proves the CLI override mechanism produces correct artifact paths; hermetic).
12. `npm run build` (default base) still works and produces a `/hrv/`-rooted bundle (proves config fallback intact); clean up with `rm -rf dist`.
13. `grep "parameterized" vite.config.ts` shows the updated comment.
14. **Best-effort, with operator fallback:** `gh api repos/lucindo/hrv/pages --jq .build_type` returns `workflow`. If `gh` is unauthenticated locally or the API call fails, operator confirms manually via Repo → Settings → Pages → Build and deployment → Source. Document the result either way in the SUMMARY.

NOT verified by this plan (deferred to first real tag push):
- CI workflow execution end-to-end (push v2.0 tag and observe results — operator does this).
- versions.json append-back behavior (only observable in CI on a real tag push).
- v1.5 archive deploy reachable at `https://lucindo.github.io/hrv/v1.5/`.
</verification>

<success_criteria>

- [ ] `package.json.version` reads `2.0.0`.
- [ ] `versions.json` exists at repo root with `{ "official": "v1.5", "versions": ["v1.5"] }`.
- [ ] `.github/workflows/deploy.yml` replaced (not extended) with the new tag-triggered, multi-version assembly workflow described in Task 2.
- [ ] Workflow parses as valid YAML (`python3 -c "import yaml; yaml.safe_load(...)"`), not just regex-matched.
- [ ] Workflow validates `${{ github.ref_name }} == v${package.json.version}` before any build.
- [ ] Workflow validates versions.json schema (`official` is `vMAJOR.MINOR` string; `versions` is array of same-shaped strings) before any build, using Node (no jq).
- [ ] Workflow uses `npx vite build --base=...` for all three build targets (current tag, v1.5 archive, official root).
- [ ] `build-root` job has NO conditional skip based on `github.ref_name == official` — always runs (per Task 2 `<deviations>`).
- [ ] Workflow appends the pushed tag to versions.json.versions on main; never modifies `official`; commit message includes `[skip ci]`.
- [ ] Workflow contains a WARNING comment above `on:` block explaining why `push: branches: [main]` must not be re-added.
- [ ] No `jq` usage anywhere in the workflow.
- [ ] `vite.config.ts` PWA scope comment updated to reflect parameterized base.
- [ ] No file under `src/**` modified by this plan.
- [ ] Local `npx vite build --base=/hrv/v2.0/` succeeds AND `dist/index.html` references `/hrv/v2.0/assets/` (smoke test for the CLI override mechanism CI depends on, with artifact-path assertion).
- [ ] GitHub Pages source confirmed as `workflow` via `gh api` (or manually by operator if `gh` unauthenticated).

</success_criteria>

<output>
Create `.planning/quick/260525-hzq-version-sync-package-json-mirrors-tag-an/260525-hzq-SUMMARY.md` when done.
</output>

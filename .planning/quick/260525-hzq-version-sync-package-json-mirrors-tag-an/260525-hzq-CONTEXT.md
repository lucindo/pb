# Quick Task 260525-hzq: Version sync + versioned GitHub Pages deploys - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Task Boundary

Two bundled changes before shipping v2.0:

1. **Version sync** — `package.json` mirrors the milestone tag. Today it is `0.0.0`; needs to become `2.0.0` for the v2.0 release. The existing `vite.config.ts` already wires `__APP_VERSION__` from `packageJson.version` (J14/J16) and exposes `__APP_BUILD_SHA__` + `__APP_BUILD_DATE__`; only the value bump is missing.

2. **Versioned GitHub Pages deploys** — replace the current single-root deploy (`/hrv/`) with a versioned-subpath scheme (`/hrv/v{X.Y}/`) plus a switchable "official" pointer at root. v1.5 must continue to be served at the root URL after v2.0 ships, until the operator explicitly promotes a newer version.

</domain>

<decisions>
## Implementation Decisions

### Version Source of Truth — package.json drives

`package.json.version` is the canonical version string. CI reads it via `node -p` (or equivalent), uses it to compute the versioned base path (`/hrv/v{major}.{minor}/`), and injects it into the build. Tags exist for archaeology and trigger deploys, but CI does NOT read `github.ref_name` to derive the version — that breaks the existing `__APP_VERSION__` wiring in `vite.config.ts:34`.

**Release process:** bump `package.json.version` → commit (`chore: bump to v2.0`) → `git tag v2.0` → push commit and tag → CI builds + deploys to `/hrv/v2.0/`.

**Tag-version validation:** CI must verify `${{ github.ref_name }}` (e.g. `v2.0`) matches `v${package.json.version}` (e.g. `v2.0` from `2.0.0`). Mismatch fails the build before deploy.

### Official Pointer — versions.json manifest

A tracked file at repo root, `versions.json`, drives which version is served at `/hrv/` root:

```json
{
  "official": "v1.5",
  "versions": ["v1.5", "v2.0"]
}
```

- `official` field selects the version served at root.
- `versions` field is an audit list (informational; deploy still archives every tag-triggered build).
- Operator edits the file, commits, pushes → CI rebuilds root from the chosen tag.
- Diffable, reviewable, atomic with the rest of the repo.

Initial state after this quick task ships: `{ "official": "v1.5", "versions": ["v1.5"] }` — v1.5 stays at root, no v2.0 yet. After v2.0 tag is pushed: `versions.json` gets a follow-up edit by the operator to add `"v2.0"` to the list (auto-added by CI optional, see Discretion below) and decide whether to promote.

### v1.5 Archive — Rebuild from tag with --base override

CI's first run will materialize `/hrv/v1.5/` by:
1. Checking out the `v1.5` tag in a separate job.
2. `npm ci`
3. `npx vite build --base=/hrv/v1.5/` (CLI override — does NOT require patching the v1.5 tree).
4. Uploading the built `dist/` into the `/hrv/v1.5/` slot of the deploy artifact.

The `--base` flag is supported by Vite 4+ (current vite is `vitest/config` based; confirm v1.5's vite version supports it; if not, plan B is a sed-patch to the checked-out vite.config). Reproducible from source.

### Deploy Trigger — Tag push only

The deploy workflow runs ONLY on `push: tags: ['v*']` and `workflow_dispatch`. Main-branch pushes do NOT trigger a deploy. This is a deliberate change from today (`push: branches: [main]`) — it makes deployment intentional, prevents `0.0.0` builds, and keeps version slots stable.

Operator-initiated re-publish (e.g. flipping `official` in versions.json) runs via `workflow_dispatch` with no inputs — the workflow re-reads versions.json, rebuilds the chosen tag, and redeploys.

### Claude's Discretion

- **versions.json location:** repo root (alongside package.json). Operator can move to `public/` if they want it served as a static asset; current decision keeps it as a build-time-consumed config file, not served.
- **PWA Service Worker scope:** each versioned build's SW auto-scopes to its base path (`/hrv/v2.0/`) via vitepwa default behavior. No SW conflict between root and versioned subpaths because each has its own scope. The currently-installed v1.5 SW at `/hrv/` continues to control root until the operator explicitly promotes a new version — at which point `cleanupOutdatedCaches: true` (already set) handles the swap.
- **History retention:** keep all tags forever. App bundle is ~500KB precache; 50 tags = 25MB; well under GH Pages' 1GB hard limit.
- **versions.json auto-update on tag push:** CI WILL auto-append the new tag to the `versions` list and commit back to main (using a PAT or `github-actions[bot]`). The `official` field is NEVER auto-changed — that's an explicit operator decision via a manual commit. This prevents stale lists without taking promotion authority from the operator.
- **Deploy artifact structure:** single `pages-artifact` containing the full `/hrv/` tree: root files (from official-version build) + `v{X.Y}/` subdirectories (one per archived version). `actions/upload-pages-artifact@v3` consumes the assembled `dist/` directory.
- **Root deploy on every tag push:** if the pushed tag is NOT the official version, root is NOT re-deployed (versions.json unchanged). This avoids unnecessary churn on the root URL.

</decisions>

<specifics>
## Specific Ideas

Current relevant code:

- `vite.config.ts:29` — `base: '/hrv/'` (hardcoded, needs to become parameterized via env or CLI override)
- `vite.config.ts:34` — `__APP_VERSION__: JSON.stringify(packageJson.version)` (keeps working; just needs package.json bump)
- `vite.config.ts:55-78` — PWA manifest with `start_url`/`scope` intentionally omitted (auto-defaults to base, which we want)
- `vite.config.ts:62` — comment says `start_url and scope intentionally omitted — auto-default to Vite base '/hrv/'`; this comment must be updated when base becomes parameterized
- `.github/workflows/deploy.yml` — current single-build flow; needs replacement with a multi-version assembly flow
- Existing tags: v1.0, v1.0.1, v1.1, v1.2, v1.3, v1.4, v1.5 — only v1.5 needs to be archived per locked decisions
- No `gh-pages` branch — modern Pages-from-Actions flow (artifact upload + `actions/deploy-pages@v4`)

## Vite base path mechanism

Two acceptable approaches; planner picks one:

(a) **Pass via env var:** `BASE_PATH=/hrv/v2.0/ npm run build` → `vite.config.ts` reads `process.env.BASE_PATH ?? '/hrv/'`.
(b) **Pass via CLI flag:** `npx vite build --base=/hrv/v2.0/` (no config change). Vite supports this natively.

(b) is cleaner — zero config edits, the only file change is `.github/workflows/deploy.yml`. Planner should prefer (b) unless it discovers a reason (a) is required.

</specifics>

<canonical_refs>
## Canonical References

- `vite.config.ts` (current vite config — base path, PWA wiring, define block)
- `.github/workflows/deploy.yml` (current deploy workflow)
- `package.json` (version field)
- Vite docs: `--base` CLI flag (https://vite.dev/config/shared-options.html#base) — supported since Vite 2; v1.5's vite version assumed to support it (verify in plan-check).
- `actions/upload-pages-artifact@v3` / `actions/deploy-pages@v4` (current deploy actions, no change needed)

</canonical_refs>

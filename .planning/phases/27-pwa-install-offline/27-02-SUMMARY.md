---
phase: 27-pwa-install-offline
plan: "02"
subsystem: infra
tags: [pwa, vite-plugin-pwa, manifest, service-worker, ios-pwa, offline]

# Dependency graph
requires: ["27-01"]
provides:
  - VitePWA() plugin registered in vite.config.ts (generateSW + autoUpdate + cleanupOutdatedCaches)
  - dist/manifest.webmanifest (name=HRV Breathing, scope=/hrv/, start_url=/hrv/, relative maskable icons)
  - dist/sw.js (Workbox-generated service worker with cleanupOutdatedCaches)
  - dist/registerSW.js (plugin-injected SW registration, no location.reload())
  - index.html iOS PWA meta tags (apple-touch-icon, apple-mobile-web-app-*, theme-color)
affects: [27-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - D-01 generateSW strategy — Workbox auto-generates sw.js from precache glob
    - D-03 autoUpdate + injectRegister auto — silent SW update, no virtual:pwa-register import
    - D-04 cleanupOutdatedCaches=true — stale shell purged on every SW activation
    - D-05 manifest name/short_name = HRV Breathing
    - D-06 theme_color=#5e81ac, background_color=#eceff4
    - D-07 scope/start_url auto-default to /hrv/ (Vite base) — explicit values omitted (fragile)
    - D-08 zero net-new UI — PWA layer is invisible to users
    - Phase 12 D-04 %BASE_URL% pattern applied to apple-touch-icon href

key-files:
  created: []
  modified:
    - vite.config.ts (VitePWA() plugin registration with full generateSW + manifest + workbox config)
    - index.html (iOS PWA meta tags + apple-touch-icon link)

key-decisions:
  - "start_url/scope omitted from manifest config — plugin auto-defaults from Vite base=/hrv/; explicit values are fragile (D-07)"
  - "No virtual:pwa-register import anywhere — injectRegister=auto injects plain registerSW.js without location.reload() listener, preserving running sessions (D-03, PWA-03)"
  - "Comment containing rel=manifest text removed from index.html comment — plan verification regex matches comment text and would false-positive"
  - "npm install run in worktree — worktree node_modules was empty (only .tmp); plan-01 packages installed from package.json"

# Metrics
duration: 1min
completed: 2026-05-16
---

# Phase 27 Plan 02: PWA Plugin Integration (vite.config.ts + index.html) Summary

**VitePWA() registered in vite.config.ts with generateSW+autoUpdate+cleanupOutdatedCaches; iOS meta tags and %BASE_URL%-based apple-touch-icon added to index.html; production build emits /hrv/-scoped manifest.webmanifest, Workbox sw.js, and registerSW.js; 959/959 tests pass**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-05-16T05:30:00Z
- **Completed:** 2026-05-16T05:31:17Z
- **Tasks:** 2
- **Files modified:** 2 (vite.config.ts, index.html)

## Accomplishments

- Registered `VitePWA()` as third plugin in `vite.config.ts` with exact CONTEXT.md-locked config (generateSW, autoUpdate, injectRegister:auto, four icons with relative srcs, cleanupOutdatedCaches)
- Production build emits `dist/manifest.webmanifest` (name=HRV Breathing, scope=/hrv/, start_url=/hrv/, relative maskable icons), `dist/sw.js` (Workbox with cleanupOutdatedCaches), and `dist/registerSW.js`
- Added iOS PWA meta tags to `index.html`: apple-touch-icon (using %BASE_URL% pattern), apple-mobile-web-app-capable, apple-mobile-web-app-title, apple-mobile-web-app-status-bar-style=black-translucent, theme-color=#5e81ac
- No `<link rel="manifest">` hand-added — plugin injects it at build time via transformIndexHtml; built dist/index.html shows both hand-authored tags and plugin-injected manifest link
- No `virtual:pwa-register` import anywhere in src/ — running breathing sessions never interrupted by SW update
- Green gate passed: tsc -b clean, ESLint 0 errors, vite build succeeded with all PWA artifacts, 959/959 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Register VitePWA() in vite.config.ts** - `80a44f5` (feat)
2. **Task 2: Add iOS PWA meta tags + Apple touch icon link to index.html** - `a7df074` (feat)

## Files Created/Modified

- `vite.config.ts` - Added VitePWA import + VitePWA() plugin registration with generateSW, autoUpdate, injectRegister:auto, includeAssets, manifest (name/short_name/description/theme_color/background_color/display/icons), workbox (globPatterns + cleanupOutdatedCaches)
- `index.html` - Added apple-touch-icon link (%BASE_URL% pattern), apple-mobile-web-app-capable, apple-mobile-web-app-title, apple-mobile-web-app-status-bar-style, theme-color meta tags

## Decisions Made

- `start_url` and `scope` intentionally omitted from `manifest` config — the plugin reads `viteConfig.base` automatically; explicit values are redundant and fragile (D-07). Verified: built manifest has `scope=/hrv/` and `start_url=/hrv/`.
- No `virtual:pwa-register` import — `injectRegister: 'auto'` handles SW registration via a plain `registerSW.js` script (no `location.reload()` listener). This ensures a running breathing session is never interrupted when a new SW activates (D-03, PWA-03).
- Comment wording adjusted: original plan comment `<!-- PWA: plugin auto-injects <link rel="manifest"> at build time — DO NOT add here -->` caused the Task 2 verification regex (`/rel="manifest"/`) to match inside the comment text. Comment reworded to omit the literal attribute string.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm install required in worktree**
- **Found during:** Task 1 (tsc -b failed with TS2307 Cannot find module 'vite-plugin-pwa')
- **Issue:** The worktree's node_modules/ contained only `.tmp/` — npm packages from Plan 01 were not available in the worktree filesystem even though package.json was up to date
- **Fix:** Ran `npm install` in the worktree root; all 516 packages installed from package.json (including vite-plugin-pwa@1.3.0 + workbox transitive deps). tsc -b then passed cleanly.
- **Files modified:** node_modules/ (runtime install, not committed)
- **Commit:** n/a (install is a worktree-local runtime action)

**2. [Rule 1 - Bug] Comment text matched manifest verification regex**
- **Found during:** Task 2 automated verification
- **Issue:** The plan's verification regex `(src.match(/rel="manifest"/g)||[]).length>0` matched the literal text `rel="manifest"` inside the HTML comment `<!-- PWA: plugin auto-injects <link rel="manifest"> at build time -->`, causing a false-positive failure
- **Fix:** Rewrote the comment to `<!-- PWA: plugin auto-injects the manifest link at build time — DO NOT add it here manually -->` — same intent, no attribute-literal text
- **Files modified:** index.html
- **Commit:** included in a7df074

## Issues Encountered

None beyond the two auto-fixed deviations above. Both were minor and resolved inline.

## Known Stubs

None. This plan delivers build-configuration changes that produce real artifacts (manifest, service worker, registered SW). No UI changes, no data flow stubs.

## Threat Surface Scan

No new trust boundaries beyond those documented in the plan's `<threat_model>`. All four STRIDE threats (T-27-04, T-27-05, T-27-06, T-27-07) are mitigated by the locked configuration values:
- T-27-04 (stale cache): `cleanupOutdatedCaches: true` ✓
- T-27-05 (stale shell post-deploy): `registerType: 'autoUpdate'` ✓
- T-27-06 (manifest scope mismatch): scope auto-defaults to /hrv/ and build-verify asserts it ✓
- T-27-07 (mid-session reload): no `virtual:pwa-register` import ✓

## Self-Check

Files created/modified:
- [x] vite.config.ts: FOUND and contains VitePWA, generateSW, autoUpdate, cleanupOutdatedCaches, HRV Breathing
- [x] index.html: FOUND and contains apple-touch-icon, apple-mobile-web-app-capable, %BASE_URL%apple-touch-icon.png, no hand-added rel="manifest"
- [x] dist/manifest.webmanifest: scope=/hrv/, start_url=/hrv/, relative icon srcs, maskable icons
- [x] dist/sw.js: exists and contains cleanupOutdatedCaches
- [x] dist/registerSW.js: exists

Commits:
- [x] 80a44f5: feat(27-02): register VitePWA() in vite.config.ts
- [x] a7df074: feat(27-02): add iOS PWA meta tags and apple-touch-icon link to index.html

## Self-Check: PASSED

---
*Phase: 27-pwa-install-offline*
*Completed: 2026-05-16*

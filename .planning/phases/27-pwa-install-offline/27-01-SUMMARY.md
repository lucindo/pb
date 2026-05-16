---
phase: 27-pwa-install-offline
plan: "01"
subsystem: infra
tags: [pwa, vite-plugin-pwa, icons, npm, devDependency]

# Dependency graph
requires: []
provides:
  - vite-plugin-pwa@^1.3.0 in devDependencies (build-time PWA plugin)
  - public/pwa-192x192.png (standard PWA icon, 192x192)
  - public/pwa-512x512.png (standard PWA icon, 512x512)
  - public/pwa-maskable-192x192.png (maskable icon, 192x192, 80% safe-zone)
  - public/pwa-maskable-512x512.png (maskable icon, 512x512, 80% safe-zone)
  - public/apple-touch-icon.png (iOS install icon, 180x180)
affects: [27-02, 27-03]

# Tech tracking
tech-stack:
  added: [vite-plugin-pwa@1.3.0 (devDependency only)]
  patterns:
    - D-02 zero-net-new-runtime-deps invariant enforced (plugin in devDependencies only)
    - orb-based install icon artwork using #5e81ac fill with #eceff4 maskable background
    - rsvg-convert SVG-to-PNG rasterization for pixel-accurate PWA icons

key-files:
  created:
    - public/pwa-192x192.png
    - public/pwa-512x512.png
    - public/pwa-maskable-192x192.png
    - public/pwa-maskable-512x512.png
    - public/apple-touch-icon.png
  modified:
    - package.json (vite-plugin-pwa added to devDependencies)
    - package-lock.json (resolved workbox transitive dep tree)

key-decisions:
  - "Used rsvg-convert (available via Homebrew) for SVG-to-PNG rasterization — no additional npm deps required"
  - "D-02 preserved: vite-plugin-pwa in devDependencies only; dependencies block unchanged (react + react-dom)"
  - "Maskable icons: r=185 orb at 512px canvas keeps within 80% safe-zone radius (~205px)"

patterns-established:
  - "PWA icon rasterization: SVG source → rsvg-convert at target dimensions → PNG in public/"
  - "D-02 invariant check: node -e validates dependencies contains exactly react + react-dom"

requirements-completed: [PWA-01, PWA-02]

# Metrics
duration: 2min
completed: 2026-05-16
---

# Phase 27 Plan 01: PWA Dependency Install & Icon Assets Summary

**vite-plugin-pwa@1.3.0 installed as build-time devDependency and five orb-based PWA icon PNGs created in public/ (192x192 standard, 512x512 standard, 192x192 maskable, 512x512 maskable, 180x180 Apple touch), all dimension-verified via PNG IHDR and green-gate passed 959/959 tests**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-16T05:23:21Z
- **Completed:** 2026-05-16T05:25:23Z
- **Tasks:** 2
- **Files modified:** 7 (package.json, package-lock.json, 5 new PNGs)

## Accomplishments

- Installed `vite-plugin-pwa@^1.3.0` (resolved to 1.3.0) as devDependency with full workbox transitive tree; `dependencies` block unchanged (react + react-dom only, D-02 invariant)
- Created all five PWA install icons from SVG sources rasterized via `rsvg-convert`: two standard (192, 512), two maskable (192, 512), one Apple touch icon (180)
- Green-gate passed: `tsc -b` clean, ESLint 0 errors, `vite build` 72 modules transformed, 959/959 Vitest tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Install vite-plugin-pwa as a devDependency** - `571a67e` (chore)
2. **Task 2: Create the five static PWA icon PNG files** - `e08763c` (feat)

## Files Created/Modified

- `package.json` - Added `"vite-plugin-pwa": "^1.3.0"` to devDependencies
- `package-lock.json` - Updated with resolved vite-plugin-pwa@1.3.0 + workbox transitive deps (516 packages)
- `public/pwa-192x192.png` - Standard PWA icon 192x192; orb fill #5e81ac fills canvas
- `public/pwa-512x512.png` - Standard PWA icon 512x512; orb fill #5e81ac fills canvas
- `public/pwa-maskable-192x192.png` - Maskable icon 192x192; #eceff4 background + #5e81ac orb within 80% safe zone
- `public/pwa-maskable-512x512.png` - Maskable icon 512x512; #eceff4 background + #5e81ac orb within 80% safe zone
- `public/apple-touch-icon.png` - iOS install icon 180x180; same orb artwork as standard icons

## Decisions Made

- Used `rsvg-convert` (already on PATH via Homebrew) for SVG-to-PNG rasterization — avoids adding npm deps for a one-time artwork task
- Icon colors: `#5e81ac` (light accent / `theme_color`) for orb fill; `#eceff4` (Nord Snow Storm 0 / `background_color`) for maskable canvas background — per RESEARCH §Code Examples + Open Question 2
- Maskable orb radius `r=185` at 512px canvas keeps the orb within the 80% safe-zone radius (~205px) with ~10% margin

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `rsvg-convert` was available on PATH, npm install completed without issues, all PNG dimensions verified via PNG IHDR check in the plan's automated verify command.

## Known Stubs

None. This plan delivers raw asset files (PNG icons + npm dependency). No UI rendering or data flow is involved.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes. The npm install adds `vite-plugin-pwa` to `devDependencies` (build-time only; T-27-01 and T-27-03 mitigations in place per plan threat model). Icons are static in-repo build artifacts (T-27-02 accepted).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02 can proceed immediately. All raw materials are in place:
- `vite-plugin-pwa` installable from `node_modules/`
- Five icon PNGs in `public/` at correct dimensions
- Plan 02 is a pure config-wiring task: add `VitePWA()` to `vite.config.ts` and PWA meta tags to `index.html`

---
*Phase: 27-pwa-install-offline*
*Completed: 2026-05-16*

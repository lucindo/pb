---
phase: 27-pwa-install-offline
plan: "03"
subsystem: infra
tags: [pwa, ios, uat, wake-lock, readme, real-device, icons]

# Dependency graph
requires:
  - phase: 27-02
    provides: "VitePWA() plugin, iOS PWA meta tags, manifest.webmanifest, sw.js, registerSW.js"
provides:
  - README.md Wake Lock limitation note (iOS < 18.4 standalone PWA, WebKit bug 254545, D-09)
  - .planning/phases/27-pwa-install-offline/27-03-iOS-UAT.md (six iOS-1..iOS-6 scenarios, all PASS)
  - Phase 27 Success Criterion 4 satisfied: named real-device iOS standalone-mode UAT deliverable
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - D-09 iOS < 18.4 Wake Lock limitation documented in README as known limitation only — no runtime detection, no warning UI
    - PWA icon dark orb-glow design (post-UAT redesign): frost-blue glowing orb on Nord Polar Night #2e3440 background

key-files:
  created:
    - .planning/phases/27-pwa-install-offline/27-03-iOS-UAT.md
  modified:
    - README.md (Wake Lock known-limitation subsection)
    - public/pwa-192x192.png (dark orb-glow redesign, commit 29425f1)
    - public/pwa-512x512.png (dark orb-glow redesign, commit 29425f1)
    - public/pwa-maskable-192x192.png (dark orb-glow redesign, commit 29425f1)
    - public/pwa-maskable-512x512.png (dark orb-glow redesign, commit 29425f1)
    - public/apple-touch-icon.png (dark orb-glow redesign, commit 29425f1)
    - public/favicon.svg (fixed stale off-palette teal color, commit 29425f1)

key-decisions:
  - "D-09: Wake Lock iOS < 18.4 gap documented in README as known limitation only — no in-app runtime detection or warning UI; session continues correctly regardless"
  - "Icon redesign (29425f1) post-initial-UAT: dark orb-glow (#2e3440 bg + frost-blue glow) replaces washed-out light orb (#5e81ac on #eceff4) that was invisible against light iOS home-screen backgrounds"
  - "iOS-3 (Wake Lock) accepted as PASS per plan's own pass criteria: screen may dim on iOS < 18.4 is documented behavior, not a regression"
  - "Device/iOS/Safari version not captured by operator — recorded as 'not captured by operator' in UAT; operator explicitly approved all six scenarios"

requirements-completed: [PWA-01, PWA-02, PWA-03]

# Metrics
duration: checkpoint-human-verify
completed: 2026-05-16
---

# Phase 27 Plan 03: README Wake Lock Note + Real-Device iOS UAT Summary

**iOS standalone-mode UAT 6/6 PASS on real device: install, offline session, audio, icon, status bar, app name — Wake Lock documented in README per D-09 (WebKit bug 254545), icons redesigned post-UAT to dark orb-glow for better home-screen visibility**

## Performance

- **Duration:** Checkpoint-gated (operator real-device UAT)
- **Started:** 2026-05-16
- **Completed:** 2026-05-16
- **Tasks:** 3 (Task 1: README doc, Task 2: production build + UAT scaffold, Task 3: operator UAT + record results)
- **Files modified:** 8 (README.md, 27-03-iOS-UAT.md, 5 PWA icon PNGs, favicon.svg — icon redesign in separate commit 29425f1)

## Accomplishments

- Added a concise Wake Lock known-limitation subsection to `README.md` documenting that the Screen Wake Lock API is unavailable in installed (Home Screen) PWA mode on iOS before 18.4 due to WebKit bug 254545; frames it as progressive enhancement (D-09 compliance — documentation only, no runtime detection or warning UI)
- Produced a clean production build confirming all PWA artifacts in `dist/` (`sw.js`, `registerSW.js`, `manifest.webmanifest`, five icon PNGs); scaffolded `27-03-iOS-UAT.md` with all six iOS-1..iOS-6 scenarios and pass criteria
- Operator ran real-device iOS standalone-mode UAT — all six scenarios PASS; home-screen name confirmed "HRV Breathing"; standalone mode confirmed (no browser chrome); fully offline session (airplane mode) with audio and orb animation confirmed; satisfies Phase 27 Success Criterion 4

## Task Commits

Each task was committed atomically:

1. **Task 1: Document iOS < 18.4 standalone Wake Lock limitation in README** - `b4aebfb` (docs)
2. **Task 2: Build production bundle + scaffold iOS UAT record** - `9298d41` (feat)
3. **Task 3: Record real-device iOS UAT results — all six scenarios pass** - `4c3ecd4` (test)

**Deviation/addition (post-UAT icon redesign):** `29425f1` (feat — "redesign PWA icons to dark orb-glow")

## Files Created/Modified

- `README.md` - Added Wake Lock known-limitation subsection: iOS < 18.4 standalone PWA mode, WebKit bug 254545, screen may dim, progressive enhancement framing, D-09 compliant (no runtime detection)
- `.planning/phases/27-pwa-install-offline/27-03-iOS-UAT.md` - Scaffolded with all six iOS-1..iOS-6 scenarios; results recorded (all PASS) after operator real-device UAT on 2026-05-16
- `public/pwa-192x192.png` - Dark orb-glow redesign (commit 29425f1): frost-blue glowing orb on Nord Polar Night #2e3440 background
- `public/pwa-512x512.png` - Dark orb-glow redesign (commit 29425f1)
- `public/pwa-maskable-192x192.png` - Dark orb-glow redesign (commit 29425f1)
- `public/pwa-maskable-512x512.png` - Dark orb-glow redesign (commit 29425f1)
- `public/apple-touch-icon.png` - Dark orb-glow redesign (commit 29425f1)
- `public/favicon.svg` - Fixed stale off-palette teal color (#0f766e) to match current palette (commit 29425f1)

## Decisions Made

- **D-09 README documentation approach:** Wake Lock iOS < 18.4 gap is documented as a known limitation only. No runtime detection or warning UI. The session runs correctly regardless; only the screen-dim behavior differs. This matches the plan's D-09 directive and THREAT-REGISTER T-27-08 mitigation.
- **iOS-3 pass criteria:** The plan explicitly states "screen dims on iOS < 18.4 (documented behavior — PASS)". Operator approved this scenario; device iOS version was not captured. Recorded as "accepted per documentation".
- **Icon redesign decision:** After initial UAT, operator observed the light orb (#5e81ac on #eceff4) was washed out against light iOS home-screen backgrounds. Icons were redesigned to a dark orb-glow aesthetic (dark #2e3440 background + frost-blue glowing orb) for better contrast. Operator re-added to home screen, confirmed improved icon, and signed off: "it worked, better icon, approved".

## Deviations from Plan

### Additions (Post-UAT)

**1. [Operator-driven addition] PWA icon redesign to dark orb-glow after initial UAT**
- **Found during:** Task 3 operator UAT (checkpoint resolution)
- **Issue:** Original icons (#5e81ac light orb on #eceff4 near-white background) were visually washed out on the iOS home screen — low contrast against neighboring app icons and the default light iOS home-screen background
- **Fix:** Redesigned all five PWA icons and the favicon.svg to use a dark Nord Polar Night (#2e3440) background with a frost-blue glowing orb; also fixed favicon.svg stale off-palette teal color (#0f766e)
- **Files modified:** public/pwa-192x192.png, public/pwa-512x512.png, public/pwa-maskable-192x192.png, public/pwa-maskable-512x512.png, public/apple-touch-icon.png, public/favicon.svg
- **Commit:** 29425f1 (feat(27): redesign PWA icons to dark orb-glow)
- **Operator confirmation:** Re-tested after redesign; operator confirmed: "it worked, better icon, approved"

---

**Total deviations:** 0 auto-fixed by executor; 1 operator-driven post-UAT addition (icon redesign, commit 29425f1)
**Impact on plan:** Icon redesign improves home-screen visual quality. No plan objective is changed; UAT re-confirmed after redesign.

## Issues Encountered

None during automated tasks. The icon redesign (post-UAT) was an operator-initiated improvement, not an issue.

## Known Stubs

None. All six UAT scenarios have recorded PASS results. README Wake Lock documentation is complete. PWA artifacts verified in production build.

## Threat Surface Scan

No new trust boundaries introduced in this plan. STRIDE threats previously documented in the plan's threat model:
- T-27-08 (Information Disclosure — undocumented iOS < 18.4 Wake Lock gap): **MITIGATED** — README section added per D-09
- T-27-09 (Tampering — SW over insecure transport during UAT): **ACCEPTED** — UAT run over HTTPS/standalone; no residual risk

## Self-Check

Files created/modified:
- [x] README.md: contains "Wake Lock", "18.4", "254545" — verified by Task 1 automated check
- [x] 27-03-iOS-UAT.md: FOUND — all six scenarios iOS-1..iOS-6 present, all marked PASS, frontmatter status=passed

Commits:
- [x] b4aebfb: docs(27-03): document iOS < 18.4 standalone Wake Lock limitation in README
- [x] 9298d41: feat(27-03): scaffold iOS UAT record and confirm production PWA build
- [x] 4c3ecd4: test(27-03): record real-device iOS UAT results — all six scenarios pass
- [x] 29425f1: feat(27): redesign PWA icons to dark orb-glow (operator-driven post-UAT addition)

## Self-Check: PASSED

---
*Phase: 27-pwa-install-offline*
*Completed: 2026-05-16*

---
phase: 29-settings-install-entry-localization
verified: 2026-05-16T18:12:00Z
status: passed
human_uat: passed 2026-05-16 — all 5 items confirmed via operator device testing (29-HUMAN-UAT.md)
score: 8/8 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/7
  gaps_closed:
    - "GAP-1: iOS install-step text unreadable on dark themes — closed by plan 29-03"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Settings install row on Android/desktop Chrome — native install prompt fires"
    expected: "Tapping the Install button in SettingsDialog on Android Chrome or desktop Chrome triggers the browser's native beforeinstallprompt install dialog"
    why_human: "Requires a real browser with a captured beforeinstallprompt event; JSDOM cannot simulate the browser install prompt lifecycle"
  - test: "Settings install row on iOS Safari — Add to Home Screen flow completes"
    expected: "Tapping 'How to install' in SettingsDialog on iOS Safari expands the three-step iOS instructions; following the steps successfully adds the app to the Home Screen"
    why_human: "Requires a real iOS Safari device; cannot simulate iOS Share sheet in JSDOM"
  - test: "Settings install row absent when standalone (installed PWA)"
    expected: "When the app is opened as an installed PWA (standalone display mode), the Settings dialog contains no install row"
    why_human: "Requires a device where the app is already installed; standalone detection (matchMedia display-mode: standalone) not reliable in JSDOM"
  - test: "Post-dismissal phone re-entry path"
    expected: "After a phone user dismisses the install banner, opening Settings still shows the install row (banner dismissal does not affect the Settings install entry)"
    why_human: "Requires real phone browser + localStorage state from a prior dismissal; cross-session state not testable programmatically"
  - test: "iOS install steps readable on all 5 themes (GAP-1 re-confirmation)"
    expected: "On each theme (Light, dark, moss, slate, dusk), opening the iOS install steps in both InstallBanner and SettingsDialog shows all three step lines with comfortable contrast against the theme background"
    why_human: "JSDOM does not resolve CSS custom properties; getComputedStyle returns the literal var() string, so resolved contrast cannot be measured programmatically. Token contrast is verified by theme.css recorded ratios (dark muted-vs-bg = 5.36) but the rendered result needs a visual check"
---

# Phase 29: Settings Install Entry & Localization Verification Report

**Phase Goal:** Users on any browser (including desktop and post-dismissal phone) can always reach an install option through SettingsDialog, and all install copy appears in the user's selected language
**Verified:** 2026-05-16T18:12:00Z
**Status:** passed (operator UAT confirmed all 5 human-verification items 2026-05-16)
**Re-verification:** Yes — after GAP-1 closure (plan 29-03)

## Re-Verification Summary

The prior VERIFICATION.md (2026-05-16T16:15) recorded 7/7 automated truths verified but logged **GAP-1** during operator manual UAT: the iOS install-step instructions were unreadable on both dark themes (`dark`, `dusk`) because steps 2 and 3 had no text-color class and inherited the near-black page default.

Plan 29-03 was executed to close GAP-1. This re-verification confirms:

- **GAP-1 is CLOSED.** Steps 2 and 3 `<li>` elements in `IosInstallSteps.tsx` now carry `text-[var(--color-breathing-muted)]`; step 1 keeps `text-[var(--color-breathing-accent-strong)]`. All three steps have explicit theme-aware tokens — zero unclassed `<li>`.
- **No regressions.** Full suite 997/997 pass (was 996; +1 for the new GAP-1 regression test). TypeScript compiles clean.
- A new observable truth (#8) is added to pin the GAP-1 fix.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | When app runs in browser and install path exists, SettingsDialog shows an install row below Language picker, above Close button | VERIFIED | `SettingsDialog.tsx` line 107: `{installable && !isStandalone && (...)}` block renders between LanguagePicker and Close button |
| 2 | Android / desktop Chrome / Edge: install row button triggers native install prompt via onInstall | VERIFIED | `SettingsDialog.tsx` line 131: `onClick={() => { void onInstall() }}`; App.tsx line 828: `onInstall={triggerInstall}`; no `isPhone` guard on install row |
| 3 | On iOS the install row shows a 'How to install' toggle that inline-expands shared iOS steps | VERIFIED | `SettingsDialog.tsx` lines 117/125: toggle with `aria-expanded={iosExpanded}`, `{iosExpanded && <IosInstallSteps id="settings-ios-steps" strings={strings.install} />}` |
| 4 | Install row absent when app is already installed (standalone) or when no install path exists | VERIFIED | Gate `installable && !isStandalone` (line 107); SettingsDialog install-row tests cover absent cases — all pass |
| 5 | IosInstallSteps is a single shared component used by both InstallBanner and SettingsDialog | VERIFIED | `InstallBanner.tsx` line 9 import, line 77 render `id="install-ios-steps"`; `SettingsDialog.tsx` line 4 import, line 125 render `id="settings-ios-steps"` |
| 6 | All install copy (banner + Settings entry) appears in user's selected language | VERIFIED | `strings.ts` line 142 `settingsLabel` in interface; en line 280 `'Install for offline use'`, pt-BR line 417 `'Instalar para uso offline'`; `content.no-review-markers.test.ts` passes |
| 7 | UiStrings.install.settingsLabel exists in interface and both locale entries | VERIFIED | `grep -n settingsLabel src/content/strings.ts` = lines 142 (interface), 280 (en), 417 (pt-BR) |
| 8 | iOS install-step text is legible on all 5 themes — every step `<li>` carries a theme-aware var(--color-breathing-*) token (GAP-1 closed) | VERIFIED | `IosInstallSteps.tsx` lines 24/29/30: step 1 = `accent-strong`, steps 2 & 3 = `muted`; `grep -c` muted=2, accent-strong=1, unclassed `<li>`=0; `theme.css` defines both tokens for all 5 themes (lines 58-59, 138-139, 199-200, 247-248, 308-309); recorded dark `muted vs bg = 5.36` clears WCAG AA 4.5 (theme.css line 127); regression test pins the contract |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/IosInstallSteps.tsx` | Shared iOS steps; all 3 `<li>` theme-aware tokens | VERIFIED | 59 lines; step 1 `accent-strong`, steps 2 & 3 `muted` (line 29-30); 0 unclassed `<li>`; props/SVG/id unchanged |
| `src/components/IosInstallSteps.test.tsx` | Unit tests + GAP-1 regression | VERIFIED | 4 it-cases (3 pre-existing + GAP-1 regression lines 41-56); all pass; asserts every `<li>` className contains `var(--color-breathing-` and the per-step contract |
| `src/components/InstallBanner.tsx` | Delegates iOS steps to IosInstallSteps | VERIFIED | Import line 9; render line 77 `id="install-ios-steps"`; consumes the GAP-1-fixed shared component |
| `src/content/strings.ts` | UiStrings.install + settingsLabel; no review marker | VERIFIED | Interface line 142; en + pt-BR values; review-marker drift test green |
| `src/components/SettingsDialog.tsx` | Install row + install props + iosExpanded state | VERIFIED | Props `isIOS/isStandalone/installable/onInstall` (lines 37-42); `iosExpanded` state line 44; gated row line 107 |
| `src/components/SettingsDialog.test.tsx` | Install-row unit tests | VERIFIED | Included in batch; 17/17 pass |
| `src/app/App.tsx` | SettingsDialog call site wired with install props | VERIFIED | Lines 825-828: `isIOS`, `isStandalone`, `installable={isIOS \|\| deferredPrompt !== null}`, `onInstall={triggerInstall}` |
| `src/styles/theme.css` | --color-breathing-muted defined for all 5 themes | VERIFIED | muted token at lines 59, 139, 200, 248, 309 (Light, dark, moss, slate, dusk); recorded dark contrast 5.36 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `App.tsx` | `SettingsDialog.tsx` | prop-drill isIOS / isStandalone / installable / onInstall | WIRED | Lines 825-828 |
| `SettingsDialog.tsx` install row | `IosInstallSteps.tsx` | render with id="settings-ios-steps" when isIOS && iosExpanded | WIRED | Line 125 |
| `SettingsDialog.tsx` install button (non-iOS) | onInstall (triggerInstall) | onClick handler | WIRED | Line 131 |
| `InstallBanner.tsx` | `IosInstallSteps.tsx` | import + render id="install-ios-steps" | WIRED | Lines 9, 77 |
| `IosInstallSteps.tsx` step 2 & 3 `<li>` | `--color-breathing-muted` token | Tailwind arbitrary-value class `text-[var(--color-breathing-muted)]` | WIRED | Lines 29-30; token defined in all 5 `theme.css` blocks — GAP-1 fix link confirmed |
| `strings.ts` UiStrings.install interface | en.install + pt-BR.install entries | as const satisfies exhaustiveness check | WIRED | Both locales have `settingsLabel` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SettingsDialog.tsx` install row | `installable`, `isIOS`, `isStandalone` | App.tsx Phase 28 hooks (`useIsStandaloneOrPhone`, `useBeforeInstallPrompt`) | Yes — browser-owned booleans | FLOWING |
| `SettingsDialog.tsx` strings.install.settingsLabel | `strings.install` | App.tsx `useLocale()` → uiStrings | Yes — real locale values | FLOWING |
| `IosInstallSteps.tsx` | `strings.iosStep1/2/3`, `id` | Parent passes `strings={strings.install}` + unique id | Yes — real localized strings | FLOWING |
| `IosInstallSteps.tsx` `<li>` color | `--color-breathing-muted` / `--color-breathing-accent-strong` | `theme.css` per-theme CSS variable blocks | Yes — token resolves per active theme | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| IosInstallSteps + GAP-1 regression | `npm test -- --run src/components/IosInstallSteps.test.tsx` | 4/4 pass | PASS |
| Install + theme suites | `npm test -- --run IosInstallSteps InstallBanner SettingsDialog theme.no-hardcoded-classes` | 38/38 pass | PASS |
| Full suite | `npm test -- --run` | 997/997 pass, 0 failures | PASS |
| TypeScript type check | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 | PASS |
| GAP-1 source assertions | `grep -c 'text-[var(--color-breathing-muted)]'` = 2; accent-strong = 1; unclassed `<li>` = 0 | matches contract | PASS |
| Token coverage | `grep color-breathing-muted src/styles/theme.css` | defined in all 5 themes | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| INSTALL-06 | 29-01, 29-02, 29-03 | User can find a persistent install option in SettingsDialog whenever the app runs in a browser, including desktop | SATISFIED | Install row gated on `installable && !isStandalone` with no `isPhone` check; present on desktop; 6 unit tests; GAP-1 (readability of the iOS path) closed by 29-03 — acceptance restored |
| INSTALL-07 | 29-01, 29-02 | User sees all install banner and Settings copy in their selected language (EN and PT-BR) | SATISFIED | `settingsLabel` in interface + both locales; PT-BR operator-reviewed; review marker removed; drift-guard test passes |

Both requirement IDs from PLAN frontmatter (29-01/29-02: INSTALL-06, INSTALL-07; 29-03: INSTALL-06) are accounted for. REQUIREMENTS.md maps INSTALL-06 and INSTALL-07 to Phase 29 (lines 49-50, both "Complete") — no orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No anti-patterns found |

No `TBD`, `FIXME`, `XXX`, `HACK`, `TODO`, `PLACEHOLDER`, or `DRAFT` markers in the 29-03 modified files (`IosInstallSteps.tsx`, `IosInstallSteps.test.tsx`). No stub returns, no empty handlers, no hardcoded color hex (the `theme.no-hardcoded-classes` guard test passes).

### Code Review Disposition (29-REVIEW.md)

The 29-03 code review found 0 critical, 1 warning, 1 info:

- **WR-01 (WARNING — not a blocker):** The `<ol>` `list-decimal` numbering markers (`::marker`) are themed only implicitly — they inherit `color` from each `<li>`. Because every `<li>` now sets a color token, the markers render correctly **today**; the concern is a future-refactor fragility, not a present defect. GAP-1 (step *text* readability) is fully closed. Reviewer's suggested centralization on `<ol>` is an optional hardening, not a goal failure. Not a gap.
- **IN-01 (INFO):** The regression test asserts class strings, not resolved color (JSDOM cannot resolve CSS variables). Accepted as a structural guard — flagged INFO, not a defect.

Neither finding blocks the phase goal. WR-01 is noted as a future-hardening opportunity.

### Human Verification Required

#### 1. Native install prompt on Android / desktop Chrome
**Test:** Open the app in Android Chrome or desktop Chrome (not installed). Open Settings. Tap the "Install" button.
**Expected:** The browser's native install dialog appears.
**Why human:** Requires a real browser with a captured `beforeinstallprompt` event; JSDOM cannot simulate the install prompt lifecycle.

#### 2. iOS Add-to-Home-Screen flow from Settings
**Test:** Open the app in iOS Safari (not installed). Open Settings. Tap "How to install"; verify the three iOS steps inline-expand; follow them.
**Expected:** App is added to the iOS Home Screen; shared `IosInstallSteps` renders identically to the banner's iOS steps.
**Why human:** Requires a real iOS Safari device.

#### 3. Install row absent in standalone mode
**Test:** Open the app as an installed PWA (standalone). Open Settings.
**Expected:** No install row appears.
**Why human:** `matchMedia('(display-mode: standalone)')` not reliable in JSDOM.

#### 4. Post-dismissal phone re-entry path
**Test:** On a phone, dismiss the install banner, then open Settings.
**Expected:** The Settings install row is still present.
**Why human:** Requires real phone browser + cross-session localStorage state.

#### 5. iOS install steps readable on all 5 themes (GAP-1 re-confirmation)
**Test:** Cycle through all five themes (Light, dark, moss, slate, dusk). On each, open the iOS install steps in both the InstallBanner and the SettingsDialog install row.
**Expected:** All three step lines are comfortably readable against the theme background — in particular on `dark` and `dusk` where the original GAP-1 defect appeared.
**Why human:** JSDOM cannot resolve CSS custom properties, so the rendered contrast cannot be measured programmatically. Token math (dark muted-vs-bg = 5.36, clears WCAG AA) is verified from `theme.css`, but the operator should visually confirm the fix resolves the originally reported defect.

### Gaps Summary

No automated gaps. GAP-1 from the prior verification is closed: the shared `IosInstallSteps` component now applies theme-aware `var(--color-breathing-muted)` to iOS steps 2 and 3 (step 1 keeps `accent-strong`), every `<li>` carries an explicit theme-aware token, both tokens are defined for all 5 themes, the recorded dark-theme muted contrast (5.36) clears WCAG AA, a regression test pins the contract, and the full suite is green (997/997) with TypeScript clean. Because `IosInstallSteps` is a single shared component, the fix corrects readability on both the `InstallBanner` and `SettingsDialog` install surfaces.

Status is `human_needed` (not `passed`) because PWA install flows — native prompt firing, iOS Add-to-Home-Screen, standalone detection, post-dismissal re-entry, and visual confirmation of the GAP-1 contrast fix — inherently require real browser/device testing. Item 5 specifically asks the operator to re-confirm the originally reported GAP-1 defect is visually resolved.

---

_Verified: 2026-05-16T18:12:00Z_
_Verifier: Claude (gsd-verifier)_

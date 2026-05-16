---
phase: 29-settings-install-entry-localization
verified: 2026-05-16T16:15:00Z
status: gaps_found
score: 7/7 must-haves verified
overrides_applied: 0
updated: 2026-05-16T16:25:00Z
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
---

# Phase 29: Settings Install Entry & Localization Verification Report

**Phase Goal:** Users on any browser (including desktop and post-dismissal phone) can always reach an install option through SettingsDialog, and all install copy appears in the user's selected language
**Verified:** 2026-05-16T16:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | When app runs in browser and install path exists, SettingsDialog shows an install row below Language picker, above Close button | VERIFIED | `SettingsDialog.tsx` lines 107-139: `{installable && !isStandalone && (<div>...)}` block renders between `<LanguagePicker>` (line 103) and Close button div (line 141) |
| 2 | Android / desktop Chrome / Edge: install row button triggers native install prompt via onInstall | VERIFIED | `SettingsDialog.tsx` line 132: `onClick={() => { void onInstall() }}` on non-iOS path; App.tsx line 828: `onInstall={triggerInstall}` (Phase 28 `useBeforeInstallPrompt`); no `isPhone` guard on install row |
| 3 | On iOS the install row shows a 'How to install' toggle that inline-expands shared iOS steps | VERIFIED | `SettingsDialog.tsx` lines 114-126: iOS branch renders toggle with `aria-controls="settings-ios-steps"` and `{iosExpanded && <IosInstallSteps id="settings-ios-steps" strings={strings.install} />}`; test `iOS path: steps expand inline` passes |
| 4 | Install row absent when app is already installed (standalone) or when no install path exists | VERIFIED | Gate condition `installable && !isStandalone` (line 107); six SettingsDialog install-row tests cover: absent when `installable=false`, absent when `isStandalone=true`; all pass |
| 5 | IosInstallSteps is a single shared component used by both InstallBanner and SettingsDialog | VERIFIED | `InstallBanner.tsx` line 9: `import { IosInstallSteps } from './IosInstallSteps'`; line 77: `<IosInstallSteps id="install-ios-steps" strings={strings} />`; `SettingsDialog.tsx` line 4: import; line 125: `<IosInstallSteps id="settings-ios-steps" .../>` |
| 6 | All install copy (banner + Settings entry) appears in user's selected language | VERIFIED | `strings.ts` line 142: `settingsLabel: string` in interface; both locales have values (EN: `'Install for offline use'`, PT-BR: `'Instalar para uso offline'`); `as const satisfies Readonly<Record<LocaleId, UiStrings>>` exhaustiveness check; `content.no-review-markers.test.ts` passes (review marker removed after operator approval) |
| 7 | UiStrings.install.settingsLabel exists in interface and both locale entries | VERIFIED | `grep -c 'settingsLabel' src/content/strings.ts` = 3 (interface + en entry + pt-BR entry) |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/IosInstallSteps.tsx` | Shared iOS install steps component (id + strings props), exports IosInstallSteps and IosInstallStepsProps, min 30 lines | VERIFIED | Exists, 56 lines, exports both, accepts `id` prop (no hardcoded DOM id), IOsShareIcon co-located |
| `src/components/IosInstallSteps.test.tsx` | Unit tests for shared iOS steps component | VERIFIED | 3 it-cases: step texts, id prop propagation, SVG aria-hidden — all pass |
| `src/components/InstallBanner.tsx` | Refactored to delegate iOS steps to IosInstallSteps | VERIFIED | Contains `IosInstallSteps` (import + render = 2 occurrences); `IOsShareIcon` removed (grep = 0) |
| `src/content/strings.ts` | UiStrings.install extended with settingsLabel; no review marker | VERIFIED | Interface has `settingsLabel: string`; en and pt-BR both have values; `TODO: native-speaker review` absent (grep = 0) |
| `src/components/SettingsDialog.tsx` | Install row + 4 new install props + iosExpanded state | VERIFIED | Props `isIOS`, `isStandalone`, `installable`, `onInstall` declared; `'install'` added to Pick union; `iosExpanded` state; install row JSX gated correctly |
| `src/components/SettingsDialog.test.tsx` | Install-row unit tests (visibility gating, Android button, iOS toggle/expand) | VERIFIED | describe block "install row (Phase 29 INSTALL-06)" with 6 it-cases; all pass |
| `src/app/App.tsx` | SettingsDialog call site extended with install props prop-drilled from existing hooks | VERIFIED | Lines 825-828: `isIOS={isIOS}`, `isStandalone={isStandalone}`, `installable={isIOS \|\| deferredPrompt !== null}`, `onInstall={triggerInstall}` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/App.tsx` | `src/components/SettingsDialog.tsx` | prop-drill isIOS / isStandalone / installable / onInstall | WIRED | `onInstall={triggerInstall}` at line 828; `installable={isIOS \|\| deferredPrompt !== null}` at line 827 |
| `src/components/SettingsDialog.tsx` install row | `src/components/IosInstallSteps.tsx` | render with id="settings-ios-steps" when isIOS && iosExpanded | WIRED | Line 125: `{iosExpanded && <IosInstallSteps id="settings-ios-steps" strings={strings.install} />}` |
| `src/components/SettingsDialog.tsx` install button (non-iOS) | onInstall prop (triggerInstall) | onClick handler | WIRED | Line 132: `onClick={() => { void onInstall() }}` |
| `src/components/InstallBanner.tsx` | `src/components/IosInstallSteps.tsx` | import + render with id="install-ios-steps" | WIRED | Line 9 import; line 77: `<IosInstallSteps id="install-ios-steps" strings={strings} />` |
| `src/content/strings.ts` UiStrings.install interface | en.install + pt-BR.install locale entries | as const satisfies exhaustiveness check | WIRED | Both locales have `settingsLabel`; `as const satisfies Readonly<Record<LocaleId, UiStrings>>` at line 420 enforces exhaustiveness |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `SettingsDialog.tsx` (install row) | `installable`, `isIOS`, `isStandalone` | App.tsx: `useIsStandaloneOrPhone()` + `useBeforeInstallPrompt()` (Phase 28 hooks) | Yes — browser-owned booleans from real detection hooks | FLOWING |
| `SettingsDialog.tsx` (strings.install.settingsLabel) | `strings.install` | App.tsx: `useLocale()` → `uiStrings` passed as `strings={uiStrings}` | Yes — real locale values from strings.ts constants | FLOWING |
| `IosInstallSteps.tsx` | `strings.iosStep1/2/3`, `id` | Parent passes `strings={strings.install}` + `id="settings-ios-steps"` | Yes — real localized strings, unique id per surface | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| IosInstallSteps renders step texts + id prop + SVG | `npm test -- --run src/components/IosInstallSteps.test.tsx` | 3/3 pass | PASS |
| InstallBanner regression (iOS steps still work via shared component) | `npm test -- --run src/components/InstallBanner.test.tsx` | (included in batch) 27/27 pass | PASS |
| SettingsDialog install-row: gating, Android, iOS toggle | `npm test -- --run src/components/SettingsDialog.test.tsx` | 17/17 pass | PASS |
| Drift-guard: no review markers in src/content/ | `npm test -- --run src/content/content.no-review-markers.test.ts` | 1/1 pass | PASS |
| Full suite | `npm test -- --run` | 996/996 pass, 0 failures | PASS |
| TypeScript type check | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| INSTALL-06 | 29-01, 29-02 | User can find a persistent install option in SettingsDialog whenever the app runs in a browser, including desktop | SATISFIED | Install row gated on `installable && !isStandalone` with NO `isPhone` check (D-10); present on desktop Chrome/Edge; 6 unit tests covering all visibility and interaction behaviors; App.tsx wires `installable={isIOS \|\| deferredPrompt !== null}` |
| INSTALL-07 | 29-01, 29-02 | User sees all install banner and Settings copy in their selected language (EN and PT-BR) | SATISFIED | `settingsLabel` in interface + both locales; PT-BR reviewed by operator (Task 4 checkpoint); review marker removed; `content.no-review-markers.test.ts` passes; 9-key pt-BR.install block fully populated |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | No anti-patterns found |

No `TBD`, `FIXME`, `XXX`, `TODO`, or `DRAFT` markers in any phase-modified file. No stub returns, no empty handlers, no hardcoded empty collections.

### Human Verification Required

#### 1. Native install prompt on Android / desktop Chrome

**Test:** Open the app in Android Chrome or desktop Chrome (not installed). Open Settings. Verify the "Install for offline use" row appears. Tap/click the "Install" button.
**Expected:** The browser's native install dialog appears (the beforeinstallprompt prompt fires).
**Why human:** Requires a real browser environment with a captured `beforeinstallprompt` event. JSDOM cannot simulate the browser install prompt lifecycle.

#### 2. iOS Add-to-Home-Screen flow from Settings

**Test:** Open the app in iOS Safari (not installed). Open Settings. Verify the "Install for offline use" row appears. Tap "How to install". Verify the three iOS steps inline-expand. Follow the steps (Share → Add to Home Screen → Add).
**Expected:** The app is successfully added to the iOS Home Screen; the shared `IosInstallSteps` component renders identically to the banner's iOS steps.
**Why human:** Requires a real iOS Safari device. Cannot simulate iOS Share sheet in JSDOM.

#### 3. Install row absent in standalone mode

**Test:** Open the app as an installed PWA (standalone display mode). Open Settings.
**Expected:** No "Install for offline use" row appears in the Settings dialog.
**Why human:** Requires a device where the app is already installed; `matchMedia('(display-mode: standalone)')` detection is not reliable in JSDOM.

#### 4. Post-dismissal phone re-entry path

**Test:** On a phone, dismiss the install banner. Then open Settings.
**Expected:** The Settings install row is still present (the `isStandalone=false` + `installable=true` gate does not use `installDismissed`; banner dismissal is a separate gate in `showBanner` only).
**Why human:** Requires real phone browser + `localStorage` state from a prior dismissal event; cross-session state is not testable programmatically.

### Gaps Summary

No automated gaps found. All 7 must-have truths are VERIFIED, all artifacts are substantive and wired, all key links are confirmed in the actual code, both INSTALL-06 and INSTALL-07 requirements are satisfied, the full test suite is green (996/996), and TypeScript compiles clean.

The 4 human verification items listed above require real browser/device testing. These are inherent to PWA install flow verification and cannot be resolved programmatically. The VALIDATION.md in the phase directory explicitly marks them as Manual-Only.

### Gaps (operator-reported during human verification)

#### GAP-1: iOS install instructions unreadable on dark themes

**Severity:** must-fix (readability defect — INSTALL-06 acceptance)
**Source:** operator manual UAT, 2026-05-16
**Status:** failed
**Symptom:** The iOS install-step instructions are difficult or impossible to read on **both** dark themes. The step text rendered by the shared `IosInstallSteps` component has insufficient contrast against the dark-theme background.
**Surfaces affected:** Both `InstallBanner` (banner iOS steps) and `SettingsDialog` (Settings iOS steps) — the readability fault is in the shared `IosInstallSteps` component, so it appears on both install surfaces.
**Suspected cause:** Hardcoded / theme-unaware text color in `IosInstallSteps.tsx`. Code review Info finding also flagged "an inconsistent color class on only the first `<li>`" — likely related.
**Fix direction:** Use theme-aware text color tokens for the step `<li>` text (and the inconsistent first-`<li>` class) so contrast holds on both light and both dark themes.

---

_Verified: 2026-05-16T16:15:00Z_
_Verifier: Claude (gsd-verifier)_

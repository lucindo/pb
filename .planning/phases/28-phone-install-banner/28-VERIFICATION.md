---
phase: 28-phone-install-banner
verified: 2026-05-16T12:18:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "On Android Chrome (phone, not installed): load the app, verify the slim banner appears below the app content while idle. Tap Install button — confirm the browser's native install dialog appears."
    expected: "Banner is visible at the bottom of the content area. Tapping Install triggers the Chrome install prompt."
    why_human: "beforeinstallprompt fires only in a real Chrome browser environment on a qualifying phone; cannot simulate in automated tests."
  - test: "On iOS Safari (phone, not installed): load the app, verify the same slim banner appears. Tap 'How to install' — verify the Share icon steps expand inline below the banner row."
    expected: "Three numbered steps appear inline, step 1 includes the inline Share glyph. No modal/overlay opens."
    why_human: "navigator.standalone detection and Safari-specific UI behavior require a real iOS device."
  - test: "On any phone browser: dismiss the banner using the x button. Reload the page (and open a new tab). Verify the banner does not reappear."
    expected: "Banner is permanently absent after dismiss — persisted in localStorage under 'hrv:install-dismissed'."
    why_human: "Persistence across real page reloads requires a real browser session."
  - test: "On a phone where the app is already installed (launched from home screen in standalone mode): verify no banner appears."
    expected: "No install banner rendered — isStandalone is true."
    why_human: "display-mode: standalone and navigator.standalone are only true in an installed PWA context."
  - test: "On a desktop browser: load the app and verify no install banner appears."
    expected: "No banner visible — isPhone is false because pointer: coarse does not match on desktop."
    why_human: "pointer: coarse media query must be validated against a real desktop browser."
  - test: "Start a breathing session on a phone. While the session is running, verify the banner is not visible. When the session ends (app returns to idle), verify the banner reappears."
    expected: "Banner hidden during appPhase !== 'idle', returns when appPhase === 'idle'."
    why_human: "Requires running the full breathing session flow in a real browser."
---

# Phase 28: Phone Install Banner Verification Report

**Phase Goal:** Phone users running the app in a browser (not installed) can discover and initiate installation through a slim, non-intrusive banner.
**Verified:** 2026-05-16T12:18:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On Android Chrome, a slim banner appears and its Install button triggers `beforeinstallprompt` | ✓ VERIFIED | `showBanner` in App.tsx AND-gates `isPhone && !isStandalone && !installDismissed && appPhase === 'idle' && deferredPrompt !== null`; InstallBanner renders `<button onClick={() => { void onInstall() }}>` wired to `triggerInstall` which calls `deferredPrompt.prompt()` |
| 2 | On iOS Safari, the same banner shows "How to install" with inline Share steps | ✓ VERIFIED | `isIOS = (navigator as SafariNavigator).standalone !== undefined`; `showBanner` includes `(isIOS || deferredPrompt !== null)`; InstallBanner iOS path renders `iosStepsButton` and expands `iosStep1/2/3` with `IOsShareIcon` SVG on tap |
| 3 | After dismiss, the banner never appears again — persisted in localStorage | ✓ VERIFIED | `handleInstallDismiss` calls `saveInstallDismissed()` + `setInstallDismissed(true)`; `loadInstallDismissed()` read at mount via lazy `useState`; `!installDismissed` in `showBanner` gate; 5 unit tests pass including round-trip and corrupt-storage silent-fallback |
| 4 | On a device where the app is already installed (standalone), no banner appears | ✓ VERIFIED | `useIsStandaloneOrPhone` returns `isStandalone: true` when `(display-mode: standalone)` matches OR `navigator.standalone === true`; `!isStandalone` gate in `showBanner` prevents rendering |
| 5 | On desktop browsers, no install banner appears | ✓ VERIFIED | `useIsStandaloneOrPhone` returns `isPhone: false` when `(pointer: coarse)` does not match; `isPhone` is the first gate in `showBanner`; desktop with mouse/trackpad reports `pointer: fine` |

**Score:** 5/5 truths verified

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Install option in SettingsDialog for desktop users (INSTALL-06) | Phase 29 | ROADMAP Phase 29 goal: "Persistent install option in SettingsDialog for all browsers" |
| 2 | All install copy in user-selected language EN + PT-BR (INSTALL-07) | Phase 29 | ROADMAP Phase 29 success criteria #3: "All install surfaces render copy in the user's active locale"; PT-BR in strings.ts is marked `// DRAFT: Phase 29 will finalize PT-BR install copy` |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/storage/installDismissed.ts` | `loadInstallDismissed` / `saveInstallDismissed` for `hrv:install-dismissed` | ✓ VERIFIED | 36 lines, exports both functions, key `'hrv:install-dismissed'`, try/catch on both read and write |
| `src/storage/installDismissed.test.ts` | 5 unit tests for round-trip and silent fallback | ✓ VERIFIED | 5 tests, all passing |
| `src/content/strings.ts` | `UiStrings.install` block in EN (final) and PT-BR (draft) | ✓ VERIFIED | Interface at line 133 with 7 `readonly string` fields; EN at line 269; PT-BR at line 404 with DRAFT comment |
| `src/hooks/useIsStandaloneOrPhone.ts` | `(pointer: coarse)` + `(display-mode: standalone)` detection | ✓ VERIFIED | Exports `useIsStandaloneOrPhone` and `UseIsStandaloneOrPhone`; both query strings present; iOS `navigator.standalone` OR-combined |
| `src/hooks/useIsStandaloneOrPhone.test.ts` | 6 plan behaviors (8 tests actual) | ✓ VERIFIED | 8 tests pass, including change listener cleanup |
| `src/hooks/useBeforeInstallPrompt.ts` | Captures `beforeinstallprompt`, exposes `triggerInstall`, calls `saveInstallDismissed` on accept + appinstalled | ✓ VERIFIED | Exports `useBeforeInstallPrompt` and `UseBeforeInstallPrompt`; both event paths call `saveInstallDismissed`; `deferredPrompt` starts null (D-08) |
| `src/hooks/useBeforeInstallPrompt.test.ts` | 8 plan behaviors | ✓ VERIFIED | 8 tests pass |
| `src/components/InstallBanner.tsx` | Slim banner UI with Android/iOS paths, inline iOS steps, dismiss | ✓ VERIFIED | 122 lines; exports `InstallBanner` and `InstallBannerProps`; `role="region"` `aria-label="Install app"`; pure presentational; all copy via `strings` prop |
| `src/components/InstallBanner.test.tsx` | 6 plan behaviors (7 tests actual) | ✓ VERIFIED | 7 tests pass |
| `src/app/App.tsx` (modified) | `showBanner` gate, hooks composed, `InstallBanner` mounted | ✓ VERIFIED | `showBanner` at line 204 is exactly the five-gate AND expression; `<InstallBanner>` between `</section>` (line 794) and `</main>` (line 823) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/storage/installDismissed.ts` | `window.localStorage` | `getItem`/`setItem` on `hrv:install-dismissed` | ✓ WIRED | Literal `'hrv:install-dismissed'` present; both accesses wrapped in try/catch |
| `src/storage/index.ts` | `installDismissed.ts` | `export * from './installDismissed'` | ✓ WIRED | Line 9 of index.ts |
| `src/content/strings.ts` | `UiStrings` interface | `readonly install` sub-object in interface + both locale objects | ✓ WIRED | Interface line 133; EN line 269; PT-BR line 404 |
| `src/hooks/useBeforeInstallPrompt.ts` | `window beforeinstallprompt` / `appinstalled` events | `addEventListener` in `useEffect` with cleanup | ✓ WIRED | Lines 56-58 register both; lines 61-63 clean up |
| `src/hooks/useBeforeInstallPrompt.ts` | `src/storage/installDismissed.ts` | `saveInstallDismissed` imported and called on `appinstalled` and `accepted` outcome | ✓ WIRED | Import at line 10; called in `onInstalled` and in `triggerInstall` `accepted` branch |
| `src/hooks/useIsStandaloneOrPhone.ts` | `window.matchMedia` | `(display-mode: standalone)` and `(pointer: coarse)` queries with change listeners | ✓ WIRED | Both query strings present; `addEventListener('change', ...)` on both MQLs |
| `src/app/App.tsx` | `InstallBanner` | Conditional render gated on `showBanner`, after `</section>` before `</main>` | ✓ WIRED | `{showBanner && <InstallBanner ... />}` at lines 798-805 |
| `src/app/App.tsx` | `useIsStandaloneOrPhone` / `useBeforeInstallPrompt` / `loadInstallDismissed` | Hooks composed at top of App; `showBanner` derived from outputs + `appPhase` | ✓ WIRED | Lines 179-180 (hooks); line 85 (lazy state); line 204 (`showBanner`) |
| `src/components/InstallBanner.tsx` | `UiStrings['install']` | `strings` prop typed `UiStrings['install']` | ✓ WIRED | `import type { UiStrings }` at line 8; `strings: UiStrings['install']` in `InstallBannerProps` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `InstallBanner.tsx` | `strings.bannerText`, `strings.installButton`, etc. | `uiStrings.install` in App.tsx → `UI_STRINGS[locale].install` in strings.ts | Yes — locale catalog with final EN copy | ✓ FLOWING |
| `App.tsx` (showBanner) | `isPhone`, `isStandalone` | `useIsStandaloneOrPhone()` → `window.matchMedia` live queries | Yes — real matchMedia values | ✓ FLOWING |
| `App.tsx` (showBanner) | `deferredPrompt` | `useBeforeInstallPrompt()` → `window addEventListener('beforeinstallprompt', ...)` | Yes — populated only when browser fires the event | ✓ FLOWING |
| `App.tsx` (showBanner) | `installDismissed` | `useState(() => loadInstallDismissed())` → `window.localStorage.getItem('hrv:install-dismissed')` | Yes — real localStorage read at mount | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 5 storage unit tests pass | `npm test -- --run src/storage/installDismissed.test.ts` | 5/5 pass | ✓ PASS |
| 16 hook unit tests pass (8 per hook) | `npm test -- --run src/hooks/useIsStandaloneOrPhone.test.ts src/hooks/useBeforeInstallPrompt.test.ts` | 16/16 pass | ✓ PASS |
| 7 component unit tests pass | `npm test -- --run src/components/InstallBanner.test.tsx` | 7/7 pass | ✓ PASS |
| Full suite: no regressions | `npm run test:run` | 987/987 pass | ✓ PASS |
| TypeScript build clean | `npm run build` | 0 errors, 0 warnings | ✓ PASS |

### Probe Execution

No conventional `scripts/*/tests/probe-*.sh` probes declared or present for this phase. Step 7c: SKIPPED (no probes declared).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INSTALL-01 | Plans 02, 03 | Phone user (not installed) sees slim dismissible banner that never blocks breathing flow | ✓ SATISFIED | `isPhone` gate + `appPhase === 'idle'` gate in `showBanner`; banner in normal document flow (not fixed/overlay) |
| INSTALL-02 | Plans 02, 03 | Android Chrome: Install button triggers native install prompt | ✓ SATISFIED | `useBeforeInstallPrompt` captures and defers prompt; `triggerInstall` replays it from `onClick`; D-08 prevents dead button |
| INSTALL-03 | Plans 02, 03 | iOS Safari: guided "Share → Add to Home Screen" steps in banner | ✓ SATISFIED | `isIOS` detection; InstallBanner iOS path with `iosStepsButton` + inline expand; IOsShareIcon SVG in step 1 |
| INSTALL-04 | Plans 01, 02, 03 | Dismiss persists across visits | ✓ SATISFIED | `saveInstallDismissed()` writes `hrv:install-dismissed`; `loadInstallDismissed()` reads at mount; `handleInstallDismiss` wires both |
| INSTALL-05 | Plans 02, 03 | Already-installed (standalone) sees no banner | ✓ SATISFIED | `useIsStandaloneOrPhone` returns `isStandalone: true` for `(display-mode: standalone)` OR `navigator.standalone === true`; `!isStandalone` in `showBanner` |
| INSTALL-06 | — | Persistent install option in SettingsDialog (all browsers incl. desktop) | DEFERRED → Phase 29 | Explicitly scoped to Phase 29 in ROADMAP and REQUIREMENTS.md traceability table |
| INSTALL-07 | — | All install copy in user's selected language | DEFERRED → Phase 29 | PT-BR values present as DRAFT (D-09); locale wiring finalization scoped to Phase 29 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/content/strings.ts` | 404 | `// DRAFT: Phase 29 will finalize PT-BR install copy` | ℹ️ Info | By design (D-09); PT-BR values are structurally complete (all 7 fields present), just not native-speaker reviewed. Does not block EN path. Handoff clearly referenced to Phase 29. |

No `TBD`, `FIXME`, or `XXX` markers in any phase-modified file. No empty handlers, no stub returns, no inline placeholder text.

### Human Verification Required

Six behaviors require a real browser + device for final validation. All five success criteria map to at least one human-verification test.

#### 1. Android Chrome Install Prompt (SC1)

**Test:** On an Android phone running Chrome, open the app in the browser. Wait for the slim banner to appear below the app. Tap the "Install" button.
**Expected:** Browser native install dialog ("Add to Home Screen") appears. After accepting, the banner never reappears on subsequent visits.
**Why human:** `beforeinstallprompt` fires only in a qualifying Android Chrome environment meeting PWA criteria; cannot be triggered in jsdom or a desktop browser.

#### 2. iOS Safari Inline Steps Expand (SC2)

**Test:** On an iPhone running Safari, open the app in the browser (not installed). Verify the slim banner appears. Tap "How to install" — verify three numbered steps appear inline below the banner row, with the Share icon glyph visible in step 1. Verify no modal/overlay opens.
**Expected:** Steps expand in document flow, Share glyph visible, no overlay. Banner collapses again if "How to install" is tapped a second time.
**Why human:** `navigator.standalone !== undefined` only true on real iOS; inline expand layout and Share glyph rendering require real device viewport.

#### 3. Dismiss Persists Across Page Reload (SC3)

**Test:** On a phone browser with the banner visible, tap the × dismiss button. Reload the page. Open a new tab to the same URL. Verify the banner is absent on all subsequent loads.
**Expected:** Banner permanently absent after dismiss; `localStorage['hrv:install-dismissed']` is `'true'`.
**Why human:** Requires real browser localStorage persistence across session; also verifies the lazy `useState` initializer path at mount.

#### 4. Standalone Mode — No Banner (SC4)

**Test:** On a phone, install the app to the home screen. Launch it from the home screen icon (standalone mode). Verify no install banner appears at any point.
**Expected:** No banner rendered; `isStandalone` is `true` because `(display-mode: standalone)` matches.
**Why human:** `display-mode: standalone` is only true when launched from the home screen in a real installed PWA context.

#### 5. Desktop — No Banner (SC5)

**Test:** Open the app in a desktop browser (Chrome, Firefox, Safari on macOS/Windows). Verify no install banner appears.
**Expected:** No banner; `isPhone` is `false` because `(pointer: coarse)` does not match a mouse/trackpad pointer.
**Why human:** `pointer: coarse` vs `pointer: fine` distinction requires a real desktop browser with an actual pointer device.

#### 6. Banner Hidden During Breathing Session

**Test:** On a phone browser (banner visible while idle), start a breathing session. Verify the banner disappears while the session runs. End the session — verify the banner reappears.
**Expected:** Banner hidden during `appPhase !== 'idle'`, visible again when app returns to idle.
**Why human:** Requires the full breathing session flow in a real browser to observe the `appPhase` transition and banner lifecycle.

### Gaps Summary

No gaps. All five phase success criteria are implemented, all 28 unit tests pass (5 storage + 8 + 8 hooks + 7 component), the TypeScript build is clean, and no regressions were introduced (987/987). The only items remaining are six human-verification tests that cannot be validated programmatically because they depend on real browser APIs (`beforeinstallprompt`, `pointer: coarse`, `display-mode: standalone`, `navigator.standalone`) that jsdom/vitest cannot simulate realistically.

INSTALL-06 and INSTALL-07 are intentionally deferred to Phase 29 as confirmed by ROADMAP.md and REQUIREMENTS.md traceability.

---

_Verified: 2026-05-16T12:18:00Z_
_Verifier: Claude (gsd-verifier)_

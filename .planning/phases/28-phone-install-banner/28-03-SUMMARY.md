---
phase: 28-phone-install-banner
plan: "03"
subsystem: components, app
tags: [component, pwa, install-banner, tdd, react, tailwind]
dependency_graph:
  requires: [loadInstallDismissed, saveInstallDismissed, UiStrings.install, useIsStandaloneOrPhone, useBeforeInstallPrompt]
  provides: [InstallBanner, InstallBannerProps, showBanner]
  affects: [src/components/InstallBanner.tsx, src/app/App.tsx]
tech_stack:
  added: []
  patterns: [pure-presentational-component, inline-svg-sub-functions, lazy-useState-initializer, composed-showBanner-gate]
key_files:
  created:
    - src/components/InstallBanner.tsx
    - src/components/InstallBanner.test.tsx
  modified:
    - src/app/App.tsx
decisions:
  - "iOS detection via (navigator as SafariNavigator).standalone !== undefined as a per-render expression in App.tsx — avoids a third hook, consistent with how the plan specifies the local SafariNavigator interface"
  - "onInstall call pattern: void onInstall() preserves the user gesture for Android install prompt (no extra async wrapper)"
  - "iosStep1 text rendered as plain <p> with Share glyph SVG inline via {' '} + <IOsShareIcon /> — matches D-06 without JSX complexity"
metrics:
  duration_seconds: 540
  completed_date: "2026-05-16"
  tasks_completed: 2
  files_changed: 3
---

# Phase 28 Plan 03: InstallBanner Component and App.tsx Integration Summary

**One-liner:** `InstallBanner` slim banner UI (Android install-prompt + iOS inline-expand steps + dismiss) wired into `App.tsx` behind the five-gate `showBanner` boolean.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing tests for InstallBanner | e9e6c19 | src/components/InstallBanner.test.tsx |
| 1 (GREEN) | Implement InstallBanner component | 369557c | src/components/InstallBanner.tsx |
| 2 | Wire InstallBanner into App.tsx | 28ce45a | src/app/App.tsx |

## What Was Built

### Task 1: InstallBanner component

`src/components/InstallBanner.tsx` exports:

- `InstallBannerProps` interface: `{ isIOS: boolean; onInstall(this: void): Promise<void>; onDismiss(this: void): void; strings: UiStrings['install'] }`
- `function InstallBanner(props: InstallBannerProps)` — pure presentational component

Key layout (28-UI-SPEC.md contract):
- Container: `role="region"` `aria-label="Install app"`, 1px top border in `--color-breathing-accent`, `bg-soft` background, `px-4 py-2 mt-6`
- Banner row: flex, `items-center`, `gap-2`: app icon (`size-8 rounded-lg`, src from `import.meta.env.BASE_URL`) + `flex-1 truncate text-sm` banner text + action button + dismiss button
- Android path: `<button>` with `strings.installButton` text, `void onInstall()` on click
- iOS path: `<button>` with `strings.iosStepsButton` text, toggles `iosExpanded` state
- Dismiss (D-04): `aria-label={strings.dismiss}`, 44×44 hit area, DismissIcon SVG
- iOS expanded steps (D-05/D-06): `aria-live="polite"` section, 3 paragraphs for step1/2/3, IOsShareIcon SVG inline in step 1
- Inline SVG helpers: `IOsShareIcon()` (18×18, 24×24 viewBox, upward-arrow + box paths) and `DismissIcon()` (16×16, 24×24 viewBox, two crossing lines, strokeWidth 2.5) — per project convention

All user-visible text flows through `strings` prop; only `aria-label="Install app"` and `alt="HRV app icon"` are inline literals (per Accessibility Contract).

7 tests pass (6 plan behaviors + iOS dismiss extracted to a separate `it`).

### Task 2: App.tsx integration

`src/app/App.tsx` modified with:

1. **Imports**: `InstallBanner`, `useIsStandaloneOrPhone`, `useBeforeInstallPrompt`, `loadInstallDismissed`, `saveInstallDismissed`
2. **State**: `const [installDismissed, setInstallDismissed] = useState<boolean>(() => loadInstallDismissed())` — lazy initializer, single synchronous read at mount (INSTALL-04)
3. **Hooks**: `useIsStandaloneOrPhone()` → `{ isPhone, isStandalone }`; `useBeforeInstallPrompt()` → `{ deferredPrompt, triggerInstall }`
4. **iOS detection**: `interface SafariNavigator extends Navigator { standalone?: boolean }` + `const isIOS = (navigator as SafariNavigator).standalone !== undefined`
5. **showBanner**: `isPhone && !isStandalone && !installDismissed && appPhase === 'idle' && (isIOS || deferredPrompt !== null)` — satisfies all 5 gates
6. **handleInstallDismiss**: `useCallback(() => { saveInstallDismissed(); setInstallDismissed(true) }, [])` — persists + unmounts banner
7. **JSX**: `{showBanner && <InstallBanner ... />}` after `</section>` before `</main>` (D-02 normal document flow)

## Verification

- `npm test -- --run src/components/InstallBanner.test.tsx`: 7/7 pass
- `npm run build`: clean (0 type errors, 0 warnings)
- `npm run test:run`: 987/987 pass (980 existing + 7 new; zero regressions)
- `npm run lint`: 0 new violations (3 pre-existing errors in `useFavicon.ts`/`useWakeLock.ts`/`App.tsx` warning unchanged)

## Manual trace against 28-UI-SPEC.md Interaction Contract

| State | Code path |
|-------|-----------|
| Hidden (session running) | `appPhase !== 'idle'` → `showBanner = false` → not rendered |
| Hidden (standalone) | `isStandalone = true` → `showBanner = false` |
| Hidden (dismissed) | `installDismissed = true` → `showBanner = false` |
| Visible — Android | `isPhone && !isStandalone && !dismissed && idle && deferredPrompt !== null && !isIOS` → banner with Install button |
| Visible — iOS (collapsed) | `isPhone && !isStandalone && !dismissed && idle && isIOS` → banner with "How to install" button |
| Visible — iOS (expanded) | Same + `iosExpanded === true` → banner row + steps section |
| Dismissed | `handleInstallDismiss` → `saveInstallDismissed()` + `setInstallDismissed(true)` → unmounts |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. T-28-07 (clickjacking) mitigated: banner in normal document flow between `</section>` and `</main>`, no `position: fixed/absolute`, no `z-index`, no `pointer-events` manipulation. T-28-08 (tampering) mitigated: `showBanner` is a pure derived boolean with no external mutation surface.

## Known Stubs

None — both artifacts are complete implementations. PT-BR install copy remains draft (per Plan 01 design decision D-09; Phase 29 will finalize).

## Self-Check: PASSED

- [x] `src/components/InstallBanner.tsx` exists and exports `InstallBanner` and `InstallBannerProps`
- [x] `src/components/InstallBanner.test.tsx` exists with 7 passing tests
- [x] `src/app/App.tsx` contains `showBanner`, `InstallBanner`, `useIsStandaloneOrPhone`, `useBeforeInstallPrompt`, `loadInstallDismissed`, `saveInstallDismissed`
- [x] Commits e9e6c19, 369557c, 28ce45a exist in git log
- [x] `npm run build` clean; `npm test -- --run` 987/987
